import { getFromDB } from './dbUtils.js';
import {
  CommentDeletionWithIdT,
  CommentForModerationWithIdT,
  CommentWithRepliesT,
  DBPuzzleT,
  DBPuzzleV,
} from './dbtypes.js';
import { getCollection, toFirestore } from './firebaseAdminWrapper.js';
import { PuzzleReaction, ReactionT, firebaseKey } from './reactions.js';

function findCommentById(
  comments: CommentWithRepliesT[],
  id: string
): CommentWithRepliesT | null {
  for (const comment of comments) {
    if (comment.i === id) {
      return comment;
    }
    if (comment.r !== undefined) {
      const res = findCommentById(comment.r, id);
      if (res !== null) {
        return res;
      }
    }
  }
  return null;
}

export async function moderateComments(
  commentsForModeration: CommentForModerationWithIdT[],
  deletions: CommentDeletionWithIdT[],
  reactions: ReactionT[]
) {
  // Puzzles cache so we only load each once
  const puzzles: Record<string, DBPuzzleT> = {};
  async function puzzleFromCache(pid: string): Promise<DBPuzzleT | null> {
    const fromCache = puzzles[pid];
    if (fromCache) {
      return fromCache;
    } else {
      try {
        const puzzle = await getFromDB('c', pid, DBPuzzleV);
        puzzles[pid] = puzzle;
        return puzzle;
      } catch {
        return null;
      }
    }
  }

  // First merge comments
  for (const comment of commentsForModeration) {
    delete comment.approved;
    delete comment.needsModeration;
    if (comment.rejected) {
      comment.deleted = true;
      comment.removed = true;
    }
    delete comment.rejected;
    const puzzle = await puzzleFromCache(comment.pid);
    if (puzzle) {
      if (puzzle.cs === undefined) {
        puzzle.cs = [];
      }
      if (comment.rt === null) {
        if (!puzzle.cs.find((existing) => existing.i === comment.i)) {
          puzzle.cs.push(comment);
        }
      } else {
        const parent = findCommentById(puzzle.cs, comment.rt);
        if (parent === null) {
          throw new Error('parent comment not found');
        }
        if (parent.r) {
          if (!parent.r.find((existing) => existing.i === comment.i)) {
            parent.r.push(comment);
          }
        } else {
          parent.r = [comment];
        }
      }
    }
    await getCollection('cfm').doc(comment.i).delete();
  }

  // Now handle deletions
  for (const deletion of deletions) {
    const puzzle = await puzzleFromCache(deletion.pid);
    if (puzzle && puzzle.cs?.length) {
      const comment = findCommentById(puzzle.cs, deletion.cid);
      if (comment && comment.a === deletion.a) {
        comment.deleted = true;
        if (deletion.removed) {
          comment.removed = true;
        }

        // Delete any notifications generated by that comment
        const notificationsRes = await getCollection('n')
          .where('p', '==', deletion.pid)
          .where('c', '==', deletion.cid)
          .get();
        for (const notification of notificationsRes.docs) {
          await getCollection('n').doc(notification.id).delete();
        }
      }
    }
    await getCollection('deleteComment').doc(deletion.i).delete();
  }

  // Now handle reactions
  for (const reaction of reactions) {
    const puzzle = await puzzleFromCache(reaction.p);
    if (puzzle) {
      const likes = puzzle.lk || [];
      switch (reaction.k) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        case PuzzleReaction.Like:
          if (
            reaction.s &&
            !likes.includes(reaction.u) &&
            puzzle.a !== reaction.u
          ) {
            likes.push(reaction.u);
            puzzle.lk = likes;
          } else if (!reaction.s && likes.includes(reaction.u)) {
            puzzle.lk = likes.filter((uid) => uid !== reaction.u);
          }
      }
    }
    await getCollection('reaction').doc(firebaseKey(reaction)).delete();
  }

  // Now we've merged and deleted, so update the puzzles:
  for (const [puzzleId, dbPuzzle] of Object.entries(puzzles)) {
    await getCollection('c')
      .doc(puzzleId)
      .update(toFirestore({ cs: dbPuzzle.cs || [], lk: dbPuzzle.lk || [] }));
  }
}
