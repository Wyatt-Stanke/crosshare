import { Timestamp, query, setDoc, updateDoc, where } from 'firebase/firestore';
import * as t from 'io-ts';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useRef } from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { requiresAdmin } from '../../../components/AuthHelpers.js';
import { Button } from '../../../components/Buttons.js';
import { EditableText } from '../../../components/EditableText.js';
import { ErrorPage } from '../../../components/ErrorPage.js';
import { useSnackbar } from '../../../components/Snackbar.js';
import { DefaultTopBar } from '../../../components/TopBar.js';
import { ArticleT, ArticleV } from '../../../lib/article.js';
import {
  getDocRef,
  getValidatedCollection,
} from '../../../lib/firebaseWrapper.js';
import { markdownToHast } from '../../../lib/markdown/markdown.js';
import { logAsyncErrors } from '../../../lib/utils.js';

export default requiresAdmin(() => {
  const router = useRouter();
  const { slug } = router.query;
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!slug) {
    return <div />;
  }
  if (Array.isArray(slug)) {
    return <ErrorPage title="Bad Article Id" />;
  }
  return <ArticleLoader key={slug} slug={slug} />;
});

const ArticleLoader = ({ slug }: { slug: string }) => {
  const { showSnackbar } = useSnackbar();

  const articleQuery = useRef(
    query(
      getValidatedCollection(
        'a',
        t.intersection([
          ArticleV,
          t.type({
            i: t.string,
          }),
        ]),
        'i'
      ),
      where('s', '==', slug)
    )
  );
  const [articles, loading, error] = useCollectionData(articleQuery.current);
  if (loading) {
    return <div>loading...</div>;
  }
  if (error) {
    return (
      <ErrorPage title="Something Went Wrong">
        <p>{error.message || 'Missing / invalid article'}</p>
      </ErrorPage>
    );
  }
  const article: (ArticleT & { i: string }) | undefined = articles?.[0];
  if (!article) {
    return (
      <div>
        <h1>No article exists</h1>
        <Button
          onClick={logAsyncErrors(async () => {
            const newArticle: ArticleT = {
              s: slug,
              t: 'New Article',
              c: 'article content',
              f: false,
            };
            await setDoc(getDocRef('a', slug), {
              ...newArticle,
              ua: Timestamp.now(),
            }).then(() => {
              showSnackbar('Article created');
            });
          })}
          text="Create"
        />
      </div>
    );
  }
  return <ArticleEditor key={slug} article={article} articleId={article.i} />;
};

const ArticleEditor = ({
  article,
  articleId,
}: {
  article: ArticleT;
  articleId: string;
}) => {
  const { showSnackbar } = useSnackbar();
  return (
    <>
      <Head>
        <title>{`Editing | ${article.t} | Crosshare`}</title>
      </Head>
      <DefaultTopBar />
      <div className="margin1em">
        <p>
          Note: changes may take up to an hour to appear on the site - we cache
          pages to keep Crosshare fast!
        </p>
        <h3>Title</h3>
        <EditableText
          title="Title"
          className="marginBottom1em"
          text={article.t}
          hast={markdownToHast({ text: article.t })}
          maxLength={300}
          handleSubmit={(newTitle) =>
            updateDoc(getDocRef('a', articleId), {
              t: newTitle,
              ua: Timestamp.now(),
            })
          }
        />
        <h3>Content</h3>
        <EditableText
          textarea={true}
          title="Content"
          className="marginBottom1em"
          text={article.c}
          hast={markdownToHast({ text: article.c })}
          maxLength={1000000}
          handleSubmit={(post) =>
            updateDoc(getDocRef('a', articleId), {
              c: post,
              ua: Timestamp.now(),
            })
          }
        />
        <h3>Featured</h3>
        <p>
          <label>
            <input
              className="marginRight1em"
              type="checkbox"
              checked={article.f}
              onChange={logAsyncErrors(async (e) => {
                await updateDoc(getDocRef('a', articleId), {
                  f: e.target.checked,
                  ua: Timestamp.now(),
                }).then(() => {
                  showSnackbar('updated');
                });
              })}
            />{' '}
            Featured
          </label>
        </p>
      </div>
    </>
  );
};
