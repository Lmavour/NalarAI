export type DatabaseConnectionCache<T> = {
  connection: T | null;
  promise: Promise<T> | null;
};

export class DatabaseUnavailableError extends Error {
  readonly code = "DATABASE_UNAVAILABLE";

  constructor() {
    super("Database service is temporarily unavailable");
    this.name = "DatabaseUnavailableError";
  }
}

const NETWORK_ERRORS = new Set([
  "MongooseServerSelectionError", "MongoServerSelectionError", "MongoNetworkError",
  "MongoNetworkTimeoutError", "MongoTopologyClosedError", "MongoServerClosedError",
  "MongoNotConnectedError", "MongoClientClosedError", "MongoPoolClearedError",
]);

export function isDatabaseUnavailable(error: unknown): error is Error {
  return error instanceof Error && (error instanceof DatabaseUnavailableError || error.name.startsWith("Mongo") || error.name.startsWith("Mongoose"));
}

type ConnectionOptions<T> = {
  connect: () => Promise<T>;
  isConnected: (connection: T) => boolean;
  reset: () => Promise<void>;
  report?: (details: { name: string; attempt: number; retrying: boolean }) => void;
};

/** Cache only ready connections and share one bounded connection-establishment attempt. */
export async function resolveDatabaseConnection<T>(cache: DatabaseConnectionCache<T>, options: ConnectionOptions<T>): Promise<T> {
  if (cache.connection && options.isConnected(cache.connection)) return cache.connection;
  if (cache.connection) {
    cache.connection = null;
    cache.promise = null;
  }
  if (cache.promise) return cache.promise;

  const pending = (async () => {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await options.reset();
        const connection = await options.connect();
        if (!options.isConnected(connection)) throw new DatabaseUnavailableError();
        cache.connection = connection;
        return connection;
      } catch (error) {
        const retrying = attempt === 1 && error instanceof Error && (error instanceof DatabaseUnavailableError || NETWORK_ERRORS.has(error.name));
        options.report?.({ name: error instanceof Error ? error.name : "UnknownError", attempt, retrying });
        if (!retrying) throw new DatabaseUnavailableError();
      }
    }
    throw new DatabaseUnavailableError();
  })();
  cache.promise = pending;

  try {
    return await pending;
  } finally {
    // Only this attempt may clear its slot; coalesced callers cannot erase a newer retry.
    if (cache.promise === pending) cache.promise = null;
  }
}
