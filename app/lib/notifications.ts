import { Timestamp } from 'firebase-admin/firestore';
import { CommentWithRepliesT, DBPuzzleT, FollowersV } from './dbtypes.js';
import { firestore, getCollection } from './firebaseAdminWrapper.js';
import {
  NewPuzzleNotificationT,
  NotificationT,
  PuzzleWithID,
  commentNotification,
  featuredNotification,
  newPuzzleNotification,
  replyNotification,
} from './notificationTypes.js';
import { PathReporter } from './pathReporter.js';

function checkComments(
  after: CommentWithRepliesT[],
  before: CommentWithRepliesT[] | undefined,
  puzzle: PuzzleWithID,
  parent?: CommentWithRepliesT
): NotificationT[] {
  const notifications: NotificationT[] = [];
  for (const comment of after) {
    const beforeComment = before?.find(
      (beforeComment) => beforeComment.i === comment.i
    );
    if (!comment.deleted && !beforeComment) {
      // Don't notify on your own comment
      if (comment.a !== puzzle.a) {
        notifications.push(commentNotification(comment, puzzle));
      }
      // If it's your puzzle we already notified as a comment (not reply) above
      if (parent && comment.a !== parent.a && parent.a !== puzzle.a) {
        notifications.push(replyNotification(comment, parent, puzzle));
      }
    } else if (beforeComment && comment.r) {
      notifications.push(
        ...checkComments(comment.r, beforeComment.r, puzzle, comment)
      );
    }
  }
  return notifications;
}

async function notificationsForPuzzleCreation(
  puzzle: DBPuzzleT,
  puzzleId: string
): Promise<NewPuzzleNotificationT[]> {
  console.log('checking for puzzle creation', `followers/${puzzle.a}`);
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (puzzle.pv) {
    return [];
  }
  const followersRes = await getCollection('followers').doc(puzzle.a).get();
  if (!followersRes.exists) {
    console.log('no followers doc');
    return [];
  }

  const validationResult = FollowersV.decode(followersRes.data());
  if (validationResult._tag !== 'Right') {
    console.error('could not decode followers for', puzzle.a);
    console.error(PathReporter.report(validationResult).join(','));
    return [];
  }
  const followers = validationResult.right.f;
  if (!followers) {
    console.log('no followers');
    return [];
  }
  console.log(followers.length, 'followers');
  return followers.map((followerId) =>
    newPuzzleNotification({ ...puzzle, id: puzzleId }, followerId)
  );
}

export async function notificationsForPuzzleChange(
  before: DBPuzzleT | null,
  after: DBPuzzleT,
  puzzleId: string
): Promise<NotificationT[]> {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (before === null || (before.pv === true && !after.pv)) {
    return notificationsForPuzzleCreation(after, puzzleId);
  }

  const withID = { ...after, id: puzzleId };
  const notifications = [];
  if (after.cs) {
    notifications.push(...checkComments(after.cs, before.cs, withID));
  }

  if (after.f && !before.f) {
    notifications.push(featuredNotification(withID, null));
  } else if (after.dmd && !before.dmd) {
    notifications.push(
      featuredNotification(withID, `the daily mini for ${after.dmd}`)
    );
  }

  return notifications;
}

export async function cleanNotifications() {
  const today = new Date();
  const cleanOlder = new Date(new Date().setDate(today.getDate() - 20));
  const db = firestore();
  const collectionRef = db
    .collection('n')
    .where('t', '<', Timestamp.fromDate(cleanOlder));
  const query = collectionRef.limit(500);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(
  db: FirebaseFirestore.Firestore,
  query: FirebaseFirestore.Query,
  resolve: (value: unknown) => void
) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve(0);
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  console.log('deleting batch');
  await batch.commit();

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  process.nextTick(() => deleteQueryBatch(db, query, resolve));
}
