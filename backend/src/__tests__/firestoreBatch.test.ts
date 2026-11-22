import { describe, expect, it } from 'vitest';
import { commitInChunks, type BatchLike, type BatchOp, type FirestoreLike } from '../firestoreBatch.js';

describe('commitInChunks', () => {
  it('commits 1050 operations across 3 sequential batches of <= 400 ops', async () => {
    const batchSizes: number[] = [];

    const mockDb: FirestoreLike = {
      batch: (): BatchLike => {
        const ops: string[] = [];
        return {
          set: () => ops.push('set'),
          delete: () => ops.push('delete'),
          commit: async () => {
            batchSizes.push(ops.length);
          },
        };
      },
    };

    const operations: BatchOp[] = Array.from({ length: 1050 }, (_, i) =>
      i % 2 === 0
        ? { type: 'set', ref: { path: `doc/${i}` }, data: { idx: i } }
        : { type: 'delete', ref: { path: `doc/${i}` } }
    );

    const batches = await commitInChunks(mockDb, operations, 400);
    expect(batches).toBe(3);
    expect(batchSizes).toEqual([400, 400, 250]);
  });

  it('returns 0 when no operations are provided', async () => {
    const mockDb: FirestoreLike = {
      batch: () => {
        throw new Error('Should not create a batch');
      },
    };
    const batches = await commitInChunks(mockDb, []);
    expect(batches).toBe(0);
  });
});
