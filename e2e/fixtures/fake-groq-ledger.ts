import { isDeepStrictEqual } from "node:util";
import type { QuotaCollection, QuotaSnapshot } from "../../src/lib/groq-budget";

export type FakeQuotaReservation = {
  id: string;
  amount: number;
  state: "reserved" | "settled" | "charged" | "overrun";
  createdAt: Date;
  settledAt?: Date;
  chargedTokens?: number;
  inputTokens?: number;
  outputTokens?: number;
};

export type FakeQuotaDocument = QuotaSnapshot & {
  provider: "groq";
  utcDay: string;
  measuredInputTokens: number;
  measuredOutputTokens: number;
  reservationCount: number;
  reservations: FakeQuotaReservation[];
  overrunTokens?: number;
  purgeAt: Date;
};

type WriteResult = Awaited<ReturnType<QuotaCollection["updateOne"]>>;
export type FakeQuotaWrite = {
  filter: Record<string, unknown>;
  update: Record<string, unknown>;
  options: Parameters<QuotaCollection["updateOne"]>[2];
  committed: boolean;
  result?: Partial<WriteResult>;
};
export type FakeQuotaWriteHook = (write: FakeQuotaWrite) => Partial<WriteResult> | void;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) {
    throw new Error("Expected a Mongo object");
  }
  return value as Record<string, unknown>;
}

function fieldValues(value: unknown, path: string[]): unknown[] {
  if (!path.length) return [value];
  if (Array.isArray(value)) return value.flatMap((entry) => fieldValues(entry, path));
  if (!value || typeof value !== "object") return [undefined];
  return fieldValues(record(value)[path[0]], path.slice(1));
}

function expression(value: unknown, document: unknown): unknown {
  if (typeof value === "string" && value.startsWith("$")) return fieldValues(document, value.slice(1).split("."))[0];
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(record(value));
  if (entries.length !== 1 || !Array.isArray(entries[0][1])) throw new Error("Unsupported Mongo expression");
  const [operator, operands] = entries[0] as [string, unknown[]];
  if (operator === "$and") return operands.every((operand) => expression(operand, document) === true);
  const evaluated = operands.map((operand) => expression(operand, document));
  if (!evaluated.every((operand): operand is number => typeof operand === "number")) throw new Error("Expected numeric expression operands");
  if (operator === "$add") return evaluated.reduce((sum, operand) => sum + operand, 0);
  if (evaluated.length !== 2) throw new Error("Expected two comparison operands");
  if (operator === "$gte") return evaluated[0] >= evaluated[1];
  if (operator === "$lte") return evaluated[0] <= evaluated[1];
  throw new Error(`Unsupported Mongo expression: ${operator}`);
}

function matches(document: unknown, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([field, predicate]) => {
    if (field === "$expr") return expression(predicate, document) === true;
    if (field.startsWith("$")) throw new Error(`Unsupported Mongo filter: ${field}`);
    const values = fieldValues(document, field.split("."));
    if (!predicate || typeof predicate !== "object" || predicate instanceof Date) {
      return values.some((value) => isDeepStrictEqual(value, predicate));
    }
    return Object.entries(record(predicate)).every(([operator, operand]) => {
      if (operator === "$ne") return values.every((value) => !isDeepStrictEqual(value, operand));
      if (operator === "$elemMatch") return values.some((value) => Array.isArray(value) && value.some((entry) => matches(entry, record(operand))));
      if (operator === "$lt") return values.some((value) => typeof value === "number" && typeof operand === "number" && value < operand);
      if (operator === "$gte") return values.some((value) => typeof value === "number" && typeof operand === "number" && value >= operand);
      throw new Error(`Unsupported Mongo field filter: ${operator}`);
    });
  });
}

function duplicateKey(field: "_id" | "reservations.id", value: string) {
  return Object.assign(new Error(`E11000 duplicate key: ${field}`), {
    code: 11000,
    keyPattern: { [field]: 1 },
    keyValue: { [field]: value },
  });
}

/** Synchronous hooks keep each filter/update/index check atomic across concurrent callers. */
export class FakeQuotaCollection implements QuotaCollection {
  readonly documents = new Map<string, FakeQuotaDocument>();
  readonly writes: FakeQuotaWrite[] = [];
  failBeforeWrite?: FakeQuotaWriteHook;
  failAfterWrite?: FakeQuotaWriteHook;

  async updateOne(filter: FakeQuotaWrite["filter"], update: FakeQuotaWrite["update"], options: FakeQuotaWrite["options"]): Promise<WriteResult> {
    const write: FakeQuotaWrite = { filter: structuredClone(filter), update: structuredClone(update), options: structuredClone(options), committed: false };
    this.writes.push(write);
    const before = this.failBeforeWrite?.(write);
    if (before !== undefined) {
      write.result = before;
      // Deliberately permit missing driver acknowledgement fields in fault injection.
      return before as WriteResult;
    }

    const current = [...this.documents.values()].find((document) => matches(document, filter));
    let result: WriteResult = { acknowledged: true, modifiedCount: 0 };
    if (current || options.upsert) {
      const id = current?._id ?? filter._id;
      if (typeof id !== "string") throw new Error("Fake quota writes require a string _id");
      if (!current && this.documents.has(id)) throw duplicateKey("_id", id);
      const next: Record<string, unknown> = current ? record(structuredClone(current)) : { _id: id };
      const elementFilter = filter.reservations ? record(record(filter.reservations).$elemMatch) : null;
      const position = elementFilter && current ? current.reservations.findIndex((entry) => matches(entry, elementFilter)) : -1;

      for (const [operator, fields] of Object.entries(update)) {
        if (operator === "$setOnInsert" && current) continue;
        for (const [field, value] of Object.entries(record(fields))) {
          if (operator === "$set" || operator === "$setOnInsert") {
            if (field.startsWith("reservations.$.")) {
              if (position < 0 || !Array.isArray(next.reservations)) throw new Error("No positional reservation match");
              record(next.reservations[position])[field.slice("reservations.$.".length)] = structuredClone(value);
            } else {
              if (field.includes(".")) throw new Error(`Unsupported Mongo update path: ${field}`);
              next[field] = structuredClone(value);
            }
          } else if (operator === "$inc") {
            const previous = next[field] ?? 0;
            if (typeof previous !== "number" || typeof value !== "number") throw new Error("Expected numeric $inc");
            next[field] = previous + value;
          } else if (operator === "$push") {
            if (!Array.isArray(next[field])) throw new Error("Expected array $push target");
            if (value && typeof value === "object" && Object.keys(record(value)).some((key) => key.startsWith("$"))) throw new Error("Unsupported Mongo $push modifier");
            (next[field] as unknown[]).push(structuredClone(value));
          } else {
            throw new Error(`Unsupported Mongo update: ${operator}`);
          }
        }
      }

      const candidate = next as FakeQuotaDocument;
      const reservationIds = new Set(candidate.reservations.map((entry) => entry.id));
      for (const document of this.documents.values()) {
        if (document._id === id) continue;
        const duplicate = document.reservations.find((entry) => reservationIds.has(entry.id));
        if (duplicate) throw duplicateKey("reservations.id", duplicate.id);
      }
      if (!isDeepStrictEqual(current, candidate)) {
        this.documents.set(id, candidate);
        write.committed = true;
        result = { acknowledged: true, modifiedCount: current ? 1 : 0 };
      }
    }
    write.result = result;
    const after = this.failAfterWrite?.(write);
    if (after !== undefined) {
      write.result = after;
      return after as WriteResult;
    }
    return result;
  }

  async findByIds(ids: string[]): Promise<QuotaSnapshot[]> {
    return ids.flatMap((id) => {
      const document = this.documents.get(id);
      if (!document) return [];
      const { _id, modelId, accountedTokens, reservedTokens, blocked, lastReservedAt } = document;
      return [structuredClone({ _id, modelId, accountedTokens, reservedTokens, blocked, lastReservedAt })];
    });
  }
}
