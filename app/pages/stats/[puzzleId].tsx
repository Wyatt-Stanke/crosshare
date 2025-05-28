import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDocument } from 'react-firebase-hooks/firestore';
import { AuthProps, requiresAuth } from '../../components/AuthHelpers.js';
import { ErrorPage } from '../../components/ErrorPage.js';
import { Link } from '../../components/Link.js';
import { StatsPage } from '../../components/PuzzleStats.js';
import { getFromSessionOrDB } from '../../lib/dbUtils.js';
import { DBPuzzleV, PuzzleStatsT, PuzzleStatsV } from '../../lib/dbtypes.js';
import { getDocRef } from '../../lib/firebaseWrapper.js';
import { PathReporter } from '../../lib/pathReporter.js';
import { withTranslation } from '../../lib/translation.js';
import { PuzzleResult, puzzleFromDB } from '../../lib/types.js';
import { logAsyncErrors, slugify } from '../../lib/utils.js';

export const getServerSideProps = withTranslation(() => {
  return Promise.resolve({ props: {} });
});

const PuzzleStatsPage = (props: AuthProps) => {
  const router = useRouter();
  const { puzzleId } = router.query;
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!puzzleId) {
    return <div />;
  }
  if (Array.isArray(puzzleId)) {
    return <ErrorPage title="Bad Puzzle Id" />;
  }
  return <PuzzleLoader key={puzzleId} puzzleId={puzzleId} auth={props} />;
};

export default requiresAuth(PuzzleStatsPage);

// export for testing
export const PuzzleLoader = ({
  puzzleId,
  auth,
}: {
  puzzleId: string;
  auth: AuthProps;
}) => {
  const puzRef = useRef(getDocRef('c', puzzleId));
  const [doc, loading, error] = useDocument(puzRef.current);
  const [puzzle, puzzleDecodeError] = useMemo(() => {
    if (doc === undefined) {
      return [undefined, undefined];
    }
    if (!doc.exists()) {
      return [null, undefined];
    }
    const validationResult = DBPuzzleV.decode(
      doc.data({ serverTimestamps: 'previous' })
    );
    if (validationResult._tag === 'Right') {
      const puzzle = validationResult.right;
      return [puzzle, undefined];
    } else {
      console.log(PathReporter.report(validationResult).join(','));
      return [undefined, 'failed to decode puzzle'];
    }
  }, [doc]);

  if (error || puzzleDecodeError) {
    return (
      <ErrorPage title="Something Went Wrong">
        <p>{error?.message || puzzleDecodeError}</p>
      </ErrorPage>
    );
  }
  if (loading) {
    return <div>Loading...</div>;
  }
  if (!puzzle) {
    return (
      <ErrorPage title="Something Went Wrong">
        <p>Failed to load the puzzle!</p>
      </ErrorPage>
    );
  }

  const nicePuzzle: PuzzleResult = {
    ...puzzleFromDB(puzzle, puzzleId, true),
    id: puzzleId,
  };

  if (!auth.isAdmin && auth.user.uid !== nicePuzzle.authorId) {
    return (
      <ErrorPage title="Not Allowed">
        <p>You do not have permission to view this page</p>
      </ErrorPage>
    );
  }

  return <StatsLoader key={puzzleId} puzzle={nicePuzzle} />;
};

const StatsLoader = ({ puzzle }: { puzzle: PuzzleResult }) => {
  const [stats, setStats] = useState<PuzzleStatsT | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [didLoad, setDidLoad] = useState<boolean>(false);

  useEffect(() => {
    let didCancel = false;

    const fetchData = async () => {
      await getFromSessionOrDB({
        collection: 's',
        docId: puzzle.id,
        validator: PuzzleStatsV,
        ttl: 30 * 60 * 1000,
      })
        .then((s) => {
          if (didCancel) {
            return;
          }
          setStats(s);
          setDidLoad(true);
        })
        .catch((e: unknown) => {
          if (didCancel) {
            return;
          }
          console.error('error fetching stats', e);
          setError(true);
          setDidLoad(true);
        });
    };
    logAsyncErrors(fetchData)();
    return () => {
      didCancel = true;
    };
  }, [puzzle.id]);

  if (error) {
    return (
      <ErrorPage title="Error Loading Stats">
        <p>
          Either something went wrong, or we don&apos;t have stats for this
          puzzle yet. Stats are updated once per hour, and won&apos;t be
          available until after a non-author has solved the puzzle.
        </p>
        <p>
          <Link href={`/crosswords/${puzzle.id}/${slugify(puzzle.title)}`}>
            Take me to the puzzle page
          </Link>
        </p>
      </ErrorPage>
    );
  }
  if (!didLoad) {
    return <div>Loading stats...</div>;
  }

  return <StatsPage puzzle={puzzle} stats={stats} />;
};
