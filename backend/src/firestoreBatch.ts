export interface BatchDocRef {
  path?: string;
}

export interface BatchLike {
  set(ref: BatchDocRef, data: Record<string, unknown>): void;
  delete(ref: BatchDocRef): void;
  commit(): Promise<unknown>;
}

export interface FirestoreLike {
  batch(): BatchLike;
}

export type BatchOp =
  | { type: 'set'; ref: BatchDocRef; data: Record<string, unknown> }
  | { type: 'delete'; ref: BatchDocRef };

export const FIRESTORE_SAFE_BATCH_LIMIT = 400;

/**
 * Commits Firestore batch writes/deletes in sequential chunks so large backups,
 * resets, or account erases never hit Firestore's 500-operation batch limit.
 */
export const commitInChunks = async (
  db: FirestoreLike,
  operations: BatchOp[],
  chunkSize: number = FIRESTORE_SAFE_BATCH_LIMIT
): Promise<number> => {
  if (operations.length === 0) return 0;

  const size = Math.max(1, Math.min(500, chunkSize));
  let batchesCommitted = 0;

  for (let i = 0; i < operations.length; i += size) {
    const chunk = operations.slice(i, i + size);
    const batch = db.batch();

    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data);
      } else {
        batch.delete(op.ref);
      }
    }

    await batch.commit();
    batchesCommitted++;
  }

  return batchesCommitted;
};
