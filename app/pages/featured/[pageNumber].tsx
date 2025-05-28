import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { I18nTags } from '../../components/I18nTags.js';
import { Link } from '../../components/Link.js';
import {
  LinkablePuzzle,
  PuzzleResultLink,
} from '../../components/PuzzleLink.js';
import { DefaultTopBar } from '../../components/TopBar.js';
import { ConstructorPageBase } from '../../lib/constructorPage.js';
import { paginatedPuzzles } from '../../lib/paginatedPuzzles.js';
import { isUserPatron } from '../../lib/patron.js';
import { userIdToPage } from '../../lib/serverOnly.js';
import { withTranslation } from '../../lib/translation.js';
import styles from './featuredPage.module.css';

interface FeaturedPageProps {
  puzzles: (LinkablePuzzle & {
    constructorPage: ConstructorPageBase | null;
    constructorIsPatron: boolean;
  })[];
  nextPage: number | null;
  currentPage: number;
  prevPage: number | null;
}
type PageProps = FeaturedPageProps;

export const PAGE_SIZE = 20;

const gssp: GetServerSideProps<PageProps> = async ({ res, params }) => {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!params?.pageNumber || Array.isArray(params.pageNumber)) {
    return { notFound: true };
  }

  const page = parseInt(params.pageNumber);
  if (page < 1 || page.toString() !== params.pageNumber || page >= 10) {
    return { notFound: true };
  }
  const [puzzlesWithoutConstructor, hasNext] = await paginatedPuzzles(
    page,
    PAGE_SIZE,
    'f',
    true
  );
  const puzzles = await Promise.all(
    puzzlesWithoutConstructor.map(async (p) => ({
      ...p,
      constructorPage: await userIdToPage(p.authorId),
      constructorIsPatron: await isUserPatron(p.authorId),
    }))
  );
  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
  return {
    props: {
      puzzles,
      currentPage: page,
      prevPage: page > 0 ? page - 1 : null,
      nextPage: hasNext && page < 9 ? page + 1 : null,
    },
  };
};

export const getServerSideProps = withTranslation(gssp);

export default function FeaturedPageHandler(props: PageProps) {
  const { locale } = useRouter();
  const loc = locale || 'en';

  const currentPageNumber = props.currentPage;
  const title = t`Featured Puzzles | Page ${currentPageNumber} | Crosshare`;
  const description = t`Featured puzzles are puzzles selected by Crosshare that we found to be particularly fun and well constructed. Enjoy!`;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta key="og:title" property="og:title" content={title} />
        <meta
          key="og:description"
          property="og:description"
          content={description}
        />
        <meta key="description" name="description" content={description} />
        <I18nTags
          locale={loc}
          canonicalPath={`/featured/${props.currentPage}`}
        />
        {props.prevPage === 0 ? (
          <link
            rel="prev"
            href={`https://crosshare.org${loc == 'en' ? '' : '/' + loc}/`}
          />
        ) : (
          ''
        )}
        {props.prevPage ? (
          <link
            rel="prev"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/featured/${props.prevPage}`}
          />
        ) : (
          ''
        )}
        {props.nextPage !== null ? (
          <link
            rel="next"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/featured/${props.nextPage}`}
          />
        ) : (
          ''
        )}
      </Head>
      <DefaultTopBar />
      <div className={styles.page}>
        <h1 className={styles.head}>
          <Trans>Crosshare Featured Puzzles</Trans>
        </h1>
        <p>{description}</p>
        {props.puzzles.map((p, i) => (
          <PuzzleResultLink
            key={i}
            puzzle={p}
            showDate={true}
            constructorPage={p.constructorPage}
            constructorIsPatron={p.constructorIsPatron}
            showAuthor={true}
            filterTags={[]}
          />
        ))}
        {props.nextPage !== null || props.prevPage !== null ? (
          <p className="textAlignCenter">
            {props.prevPage === 0 ? (
              <Link className="marginRight2em" href="/">
                ← <Trans>Newer Puzzles</Trans>
              </Link>
            ) : (
              ''
            )}
            {props.prevPage ? (
              <Link
                className="marginRight2em"
                href={'/featured/' + props.prevPage}
              >
                ← <Trans>Newer Puzzles</Trans>
              </Link>
            ) : (
              ''
            )}
            {props.nextPage !== null ? (
              <Link href={'/featured/' + props.nextPage}>
                <Trans>Older Puzzles</Trans> →
              </Link>
            ) : (
              ''
            )}
          </p>
        ) : (
          ''
        )}
      </div>
    </>
  );
}
