import { Trans, t } from '@lingui/macro';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { I18nTags } from '../../components/I18nTags.js';
import { Link } from '../../components/Link.js';
import {
  LinkablePuzzle,
  PuzzleResultLink,
  toLinkablePuzzle,
} from '../../components/PuzzleLink.js';
import { DefaultTopBar } from '../../components/TopBar.js';
import { ConstructorPageBase } from '../../lib/constructorPage.js';
import { isUserPatron } from '../../lib/patron.js';
import { getMiniForDate, userIdToPage } from '../../lib/serverOnly.js';
import { withTranslation } from '../../lib/translation.js';
import { puzzleFromDB } from '../../lib/types.js';
import { notEmpty } from '../../lib/utils.js';

export interface DailyMiniProps {
  puzzles: [number, LinkablePuzzle, ConstructorPageBase | null, boolean][];
  year: number;
  month: number;
  olderLink?: string;
  newerLink?: string;
}
type PageProps = DailyMiniProps;

const gssp: GetServerSideProps<PageProps> = async ({ res, params }) => {
  const slug = params?.slug;
  let year: number;
  let month: number;
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!slug) {
    const today = new Date();
    year = today.getUTCFullYear();
    month = today.getUTCMonth();
  } else if (Array.isArray(slug) && slug.length === 2 && slug[0] && slug[1]) {
    year = parseInt(slug[0]);
    month = parseInt(slug[1]) - 1;
  } else {
    return { notFound: true };
  }
  const props = await propsForDailyMini(year, month);
  if (!props) {
    return { notFound: true };
  }
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200');
  return { props: props };
};

export const getServerSideProps = withTranslation(gssp);

async function puzzlesListForMonth(
  year: number,
  month: number,
  maxDay: number
): Promise<[number, LinkablePuzzle, ConstructorPageBase | null, boolean][]> {
  return Promise.all(
    [...Array(maxDay).keys()]
      .reverse()
      .map(
        async (
          day
        ): Promise<
          [number, LinkablePuzzle, ConstructorPageBase | null, boolean] | null
        > => {
          const dbpuzzle = await getMiniForDate(new Date(year, month, day + 1));
          if (dbpuzzle === null) {
            return null;
          }
          const puzzle = puzzleFromDB(dbpuzzle, dbpuzzle.id);
          const cp = await userIdToPage(dbpuzzle.a);
          const isPatron = await isUserPatron(dbpuzzle.a);
          return [
            day + 1,
            toLinkablePuzzle({ ...puzzle, id: dbpuzzle.id }),
            cp,
            isPatron,
          ];
        }
      )
  ).then((a) => a.filter(notEmpty));
}

async function propsForDailyMini(
  year: number,
  month: number
): Promise<PageProps | null> {
  const today = new Date();

  let lastDay = new Date(year, month + 1, 0).getUTCDate();
  if (year === today.getUTCFullYear() && month === today.getUTCMonth()) {
    lastDay = today.getUTCDate();
  }
  const puzzles = await puzzlesListForMonth(year, month, lastDay);
  if (!puzzles.length) {
    return null;
  }
  return {
    year: year,
    month: month,
    puzzles: puzzles,
    ...(today.getUTCFullYear() !== year || today.getUTCMonth() !== month
      ? {
          newerLink:
            month + 1 === 12 ? `${year + 1}/1` : `${year}/${month + 2}`,
        }
      : null),
    ...(month === 0 && year > 2020
      ? { olderLink: `${year - 1}/12` }
      : year > 2020 || month >= 4
        ? { olderLink: `${year}/${month}` }
        : null),
  };
}

export default function DailyMiniPage(props: PageProps) {
  const { locale } = useRouter();
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const loc = locale || 'en';

  const description = t({
    message: `Crosshare features a free daily mini crossword every day of the week.
  These puzzles are a great way to give your brain a bite-sized challenge, and to
  learn how crosswords work before taking on larger puzzles.

  Mini puzzles are most often 5x5, but can be other sizes as well - sometimes
  the weekend minis are a bit larger. Any small sized puzzle you publish publicly to Crosshare
  will be eligible for selection as a daily mini!`,
  });

  const date = new Date(props.year, props.month, 1).toLocaleString(loc, {
    month: 'long',
    year: 'numeric',
  });
  const title = t({
    message: `Daily Mini Puzzles for ${date}`,
    comment: 'The variable is a month and year like noviembre de 2021',
  });
  return (
    <>
      <Head>
        <title>{`${title} | Crosshare crosswords`}</title>
        <meta key="og:title" property="og:title" content={title} />
        <meta key="description" name="description" content={description} />
        <meta
          key="og:description"
          property="og:description"
          content={description}
        />
        <I18nTags
          locale={loc}
          canonicalPath={`/dailyminis/${props.year}/${props.month + 1}`}
        />
        {props.olderLink ? (
          <link
            rel="prev"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/dailyminis/${props.olderLink}`}
          />
        ) : (
          ''
        )}
        {props.newerLink ? (
          <link
            rel="next"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/dailyminis/${props.newerLink}`}
          />
        ) : (
          ''
        )}
      </Head>
      <DefaultTopBar />
      <div className="margin1em">
        <h2>
          <Trans comment="the variable is a month and year like 'noviembre de 2021'">
            Crosshare Daily Mini Puzzles for {date}
          </Trans>
        </h2>
        <div className="marginBottom2em">{description}</div>
        {props.puzzles.map(([day, puzzle, cp, isPatron]) => {
          const displayDate = new Date(
            props.year,
            props.month,
            day
          ).toLocaleDateString(loc);
          return (
            <PuzzleResultLink
              key={day}
              puzzle={puzzle}
              showAuthor={true}
              constructorPage={cp}
              constructorIsPatron={isPatron}
              title={t`Daily Mini for ${displayDate}`}
              filterTags={[]}
            />
          );
        })}
        <p className="textAlignCenter paddingBottom1em">
          {props.newerLink ? (
            <Link
              className="marginRight1em"
              href={'/dailyminis/' + props.newerLink}
            >
              <Trans>Newer Minis</Trans>
            </Link>
          ) : (
            ''
          )}
          {props.olderLink ? (
            <Link href={'/dailyminis/' + props.olderLink}>
              <Trans>Older Minis</Trans>
            </Link>
          ) : (
            ''
          )}
        </p>
      </div>
    </>
  );
}
