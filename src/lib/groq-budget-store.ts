import "server-only";
import { connectToDatabase } from "@/lib/db";
import { GroqTokenLedger, type QuotaCollection, type QuotaSnapshot } from "@/lib/groq-budget";
import { AiTokenBudget } from "@/models/ai-token-budget";

let indexPromise: Promise<unknown> | null = null;

const collection: QuotaCollection = {
  updateOne: (filter, update, options) => AiTokenBudget.collection.updateOne(filter, update, options),
  async findByIds(ids) {
    return await AiTokenBudget.find({ _id: { $in: ids } })
      .select("_id modelId accountedTokens reservedTokens blocked lastReservedAt")
      .lean() as QuotaSnapshot[];
  },
};

async function ensureIndexes() {
  let indexes: Awaited<ReturnType<typeof AiTokenBudget.collection.indexes>>;
  try {
    indexes = await AiTokenBudget.collection.indexes();
  } catch (error) {
    if ((error as { code?: number }).code !== 26) throw error;
    indexes = [];
  }
  const hasTtl = indexes.some((index) => Object.keys(index.key).length === 1 && index.key.purgeAt === 1 && index.expireAfterSeconds === 0);
  const hasReservationId = indexes.some((index) => Object.keys(index.key).length === 1 && index.key["reservations.id"] === 1 && index.unique === true && Object.keys(index.partialFilterExpression ?? {}).length === 1 && Object.keys(index.partialFilterExpression?.["reservations.id"] ?? {}).length === 1 && index.partialFilterExpression?.["reservations.id"]?.$exists === true);
  await Promise.all([
    hasTtl ? Promise.resolve() : AiTokenBudget.collection.createIndex({ purgeAt: 1 }, { expireAfterSeconds: 0 }),
    hasReservationId ? Promise.resolve() : AiTokenBudget.collection.createIndex({ "reservations.id": 1 }, { unique: true, partialFilterExpression: { "reservations.id": { $exists: true } } }),
  ]);
}

export async function getGroqTokenLedger(limit: number) {
  await connectToDatabase();
  if (!indexPromise) {
    indexPromise = ensureIndexes();
  }
  try {
    await indexPromise;
  } catch (error) {
    indexPromise = null;
    throw error;
  }
  return new GroqTokenLedger(collection, limit);
}
