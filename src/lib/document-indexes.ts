type IndexRecord = { name?: string; key: Record<string, unknown>; unique?: boolean };
export type DocumentIndexCollection = {
  updateMany: (filter: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>;
  createIndex: (keys: Record<string, number>, options?: { unique: boolean }) => Promise<unknown>;
  indexes: () => Promise<IndexRecord[]>;
  dropIndex: (name: string) => Promise<unknown>;
};

/** Replace only the old owned file-hash uniqueness constraint after the new one exists. */
export async function ensureDocumentModeIndexes(collection: DocumentIndexCollection) {
  await collection.updateMany({ extractionMode: { $exists: false } }, { $set: { extractionMode: "text" } });
  await collection.createIndex({ userId: 1, sha256: 1, extractionMode: 1 }, { unique: true });
  const indexes = await collection.indexes();
  for (const index of indexes) {
    if (index.unique === true && Object.keys(index.key).length === 2 && index.key.userId === 1 && index.key.sha256 === 1 && index.name) {
      try { await collection.dropIndex(index.name); }
      catch (error) { if ((error as { code?: number }).code !== 27) throw error; }
    }
  }
  await collection.createIndex({ userId: 1, createdAt: -1 });
}
