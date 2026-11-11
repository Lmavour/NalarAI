import { randomUUID } from "node:crypto";
import { GROQ_DAILY_TOKEN_LIMIT, GROQ_MODELS, type GroqModel, type TokenUsage } from "@/lib/ai-config";

const MAX_DAILY_RESERVATIONS = 4096;
const WRITE_CONCERN = { w: "majority" as const, j: true, wtimeout: 5000 };

export type QuotaSnapshot = {
  _id: string;
  modelId: GroqModel;
  accountedTokens: number;
  reservedTokens: number;
  blocked: boolean;
  lastReservedAt: Date;
};

export type QuotaCollection = {
  updateOne: (filter: Record<string, unknown>, update: Record<string, unknown>, options: { upsert: boolean; writeConcern: typeof WRITE_CONCERN }) => Promise<{ acknowledged: boolean; modifiedCount: number }>;
  findByIds: (ids: string[]) => Promise<QuotaSnapshot[]>;
};

export type GroqReservation = {
  dayId: string;
  utcDay: string;
  model: GroqModel;
  id: string;
  amount: number;
};

export function getQuotaDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function validateUsage(usage: TokenUsage) {
  if (![usage.inputTokens, usage.outputTokens, usage.totalTokens].every((value) => Number.isSafeInteger(value) && value >= 0) || usage.inputTokens + usage.outputTokens !== usage.totalTokens) {
    throw new Error("Token usage must contain consistent nonnegative integers");
  }
}

/** The database, not process memory, owns reservations and their terminal history. */
export class GroqTokenLedger {
  constructor(private readonly collection: QuotaCollection, private readonly limit = GROQ_DAILY_TOKEN_LIMIT) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > GROQ_DAILY_TOKEN_LIMIT) throw new Error("Invalid Groq daily token limit");
  }

  async reserve(models: GroqModel[], amount: number, now = new Date(), id: string = randomUUID()): Promise<GroqReservation | null> {
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("Reservation amount must be a positive integer");
    if (!id || id.length > 128) throw new Error("Reservation ID must contain 1-128 characters");
    if (models.some((model) => !GROQ_MODELS.includes(model))) throw new Error("Invalid Groq model");
    if (amount > this.limit || models.length === 0) return null;
    const utcDay = getQuotaDay(now);
    const uniqueModels = [...new Set(models)];
    const ids = uniqueModels.map((model) => `groq:${model}:${utcDay}`);
    const purgeAt = new Date(Date.parse(`${utcDay}T00:00:00.000Z`) + 31 * 24 * 60 * 60 * 1000);

    for (const [index, dayId] of ids.entries()) {
      const initialize = () => this.collection.updateOne({ _id: dayId }, { $setOnInsert: {
        provider: "groq", modelId: uniqueModels[index], utcDay,
        accountedTokens: 0, reservedTokens: 0, measuredInputTokens: 0, measuredOutputTokens: 0,
        reservationCount: 0, reservations: [], blocked: false, lastReservedAt: new Date(0), purgeAt,
      } }, { upsert: true, writeConcern: WRITE_CONCERN });
      let initialized;
      try {
        initialized = await initialize();
      } catch (error) {
        const duplicate = error as { code?: number; keyPattern?: { _id?: number }; keyValue?: { _id?: string } };
        if (duplicate.code !== 11000 || (duplicate.keyPattern?._id !== 1 && duplicate.keyValue?._id !== dayId)) throw error;
        initialized = await initialize();
      }
      if (!initialized.acknowledged) throw new Error("Budget initialization was not acknowledged");
    }

    const candidates = await this.collection.findByIds(ids);
    if (candidates.some((row) => !uniqueModels.includes(row.modelId) || row._id !== `groq:${row.modelId}:${utcDay}`)) throw new Error("Quota model identity is inconsistent");
    candidates.sort((a, b) =>
      (a.accountedTokens + a.reservedTokens) - (b.accountedTokens + b.reservedTokens)
      || a.lastReservedAt.getTime() - b.lastReservedAt.getTime()
      || uniqueModels.indexOf(a.modelId) - uniqueModels.indexOf(b.modelId));

    for (const candidate of candidates) {
      let result;
      try {
        result = await this.collection.updateOne({
        _id: candidate._id,
        provider: "groq",
        modelId: candidate.modelId,
        utcDay,
        blocked: false,
        reservationCount: { $lt: MAX_DAILY_RESERVATIONS },
        "reservations.id": { $ne: id },
        $expr: { $and: [
          { $gte: ["$accountedTokens", 0] },
          { $gte: ["$reservedTokens", 0] },
          { $lte: [{ $add: ["$accountedTokens", "$reservedTokens", amount] }, this.limit] },
        ] },
      }, {
        $inc: { reservedTokens: amount, reservationCount: 1 },
        $push: { reservations: { id, amount, state: "reserved", createdAt: now } },
        $set: { lastReservedAt: now },
        }, { upsert: false, writeConcern: WRITE_CONCERN });
      } catch (error) {
        const duplicate = error as { code?: number; keyPattern?: Record<string, number> };
        if (duplicate.code === 11000 && duplicate.keyPattern?.["reservations.id"] === 1) return null;
        throw error;
      }
      if (!result.acknowledged) throw new Error("Budget reservation was not acknowledged");
      if (result.modifiedCount === 1) return { dayId: candidate._id, utcDay, model: candidate.modelId, id, amount };
    }
    return null;
  }

  async settle(reservation: GroqReservation, usage: TokenUsage | null, now = new Date()) {
    if (usage) validateUsage(usage);
    const charged = usage?.totalTokens ?? reservation.amount;
    const overrun = charged > reservation.amount;
    const result = await this.collection.updateOne({
      _id: reservation.dayId,
      reservedTokens: { $gte: reservation.amount },
      reservations: { $elemMatch: { id: reservation.id, amount: reservation.amount, state: "reserved" } },
    }, {
      $inc: {
        reservedTokens: -reservation.amount,
        accountedTokens: charged,
        measuredInputTokens: usage?.inputTokens ?? 0,
        measuredOutputTokens: usage?.outputTokens ?? 0,
      },
      $set: {
        "reservations.$.state": overrun ? "overrun" : usage ? "settled" : "charged",
        "reservations.$.chargedTokens": charged,
        "reservations.$.settledAt": now,
        ...(usage ? { "reservations.$.inputTokens": usage.inputTokens, "reservations.$.outputTokens": usage.outputTokens } : {}),
        ...(overrun ? { blocked: true, overrunTokens: charged - reservation.amount } : {}),
      },
    }, { upsert: false, writeConcern: WRITE_CONCERN });
    if (!result.acknowledged) throw new Error("Budget settlement was not acknowledged");
    if (overrun && result.modifiedCount === 1) throw new Error("Groq usage exceeded its reservation; model quarantined");
    return result.modifiedCount === 1;
  }
}
