import { lightFormat } from 'date-fns/lightFormat';
import { serverTimestamp, setDoc } from 'firebase/firestore';
import NextJSRouter from 'next/router';
import { FormEvent, ReactNode, useCallback, useState } from 'react';
import { DBPuzzleT } from '../lib/dbtypes.js';
import { getDocRef } from '../lib/firebaseWrapper.js';
import { STORAGE_KEY, slugify } from '../lib/utils.js';
import { Button, ButtonAsLink } from './Buttons.js';
import { DisplayNameForm, useDisplayName } from './DisplayNameForm.js';
import { Emoji } from './Emoji.js';
import { Overlay } from './Overlay.js';
import { PublishWarningsList } from './PublishWarningsList.js';

export function PublishOverlay(props: {
  id: string;
  toPublish: DBPuzzleT;
  warnings: string[];
  cancelPublish: () => void;
}) {
  const [inProgress, setInProgress] = useState(false);
  const [done, setDone] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const displayName = useDisplayName();

  const doPublish = useCallback(
    (event: FormEvent) => {
      event.preventDefault();

      if (inProgress || done) {
        return;
      }
      setInProgress(true);

      console.log('Uploading');

      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);
      const toPublish = {
        ...props.toPublish,
        n: displayName || 'Anonymous Crossharer',
        p: serverTimestamp(),
      };

      setDoc(getDocRef('c', props.id), toPublish)
        .then(async () => {
          console.log('Uploaded', props.id);
          localStorage.removeItem(STORAGE_KEY);
          setDone(true);
          await NextJSRouter.push(
            `/crosswords/${props.id}/${slugify(toPublish.t)}`
          );
        })
        .catch((e: unknown) => {
          console.error('error publishing', e);
        });
    },
    [props.id, inProgress, done, displayName, props.toPublish]
  );

  let contents: ReactNode;
  if (done) {
    contents = (
      <>
        <h2>Published Successfully! Redirecting...</h2>
      </>
    );
  } else if (inProgress) {
    contents = (
      <>
        <h2>Uploading your puzzle...</h2>
      </>
    );
  } else {
    contents = (
      <>
        {editingDisplayName || !displayName ? (
          <DisplayNameForm
            onCancel={() => {
              setEditingDisplayName(false);
            }}
          />
        ) : (
          <h3>
            {props.toPublish.gc ? (
              <>
                by <i>{props.toPublish.gc}</i>, published by{' '}
                <i>{displayName}</i>
              </>
            ) : (
              <>
                by <i>{displayName}</i>
              </>
            )}{' '}
            (
            <ButtonAsLink
              onClick={() => {
                setEditingDisplayName(true);
              }}
              text="change your display name"
            />
            )
          </h3>
        )}
        <p>
          Thanks for constructing a puzzle! <Emoji symbol="😎" />
        </p>
        {!(props.toPublish.pv === undefined || props.toPublish.pv === false) &&
        props.toPublish.pvu === undefined ? (
          <p>This puzzle will be posted as private.</p>
        ) : null}
        {props.toPublish.pvu && props.toPublish.pvu.toMillis() > Date.now() ? (
          <p>
            This puzzle will be posted as private until{' '}
            {lightFormat(props.toPublish.pvu.toDate(), "M/d/y' at 'h:mma")}.
          </p>
        ) : null}
        <p className="colorError">
          All puzzles are reviewed and subject to removal at any time for any
          reason (e.g. if the content is deemed offensive or if it is found to
          be copyright infringement)
        </p>
        {props.warnings.length ? (
          <>
            <p className="colorError">Warnings:</p>
            <PublishWarningsList warnings={props.warnings} />
          </>
        ) : (
          ''
        )}

        <Button
          onClick={doPublish}
          disabled={editingDisplayName || !displayName}
          text="Publish Puzzle"
        />
      </>
    );
  }
  return (
    <Overlay closeCallback={props.cancelPublish}>
      <h2>Publishing &lsquo;{props.toPublish.t}&rsquo;</h2>
      {contents}
    </Overlay>
  );
}
