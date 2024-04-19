import { useState, FormEvent } from 'react';

import { ConstructorPageT } from '../lib/constructorPage';
import { Markdown } from './Markdown';
import { getDocRef } from '../lib/firebaseWrapper';
import { Button } from './Buttons';
import { Overlay } from './Overlay';
import { deleteField, serverTimestamp, updateDoc } from 'firebase/firestore';
import { markdownToHast } from '../lib/markdown/markdown';
import { LengthLimitedInput, LengthView } from './Inputs';

interface BioEditorProps {
  constructorPage: ConstructorPageT;
  addProfilePic: () => void;
  addCoverPic: () => void;
}

const BIO_LENGTH_LIMIT = 1500;
const PAYPAL_LENGTH_LIMIT = 140;
const SIG_LENGTH_LIMIT = 500;
const SHARE_BUTTONS_LENGTH_LIMIT = 120;
const ASYNC_ERROR = 'Error thrown asynchronously while editing bio';

export const BioEditor = (props: BioEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigOpen, setIsSigOpen] = useState(false);
  const [isShareButtonsOpen, setIsShareButtonsOpen] = useState(false);
  const [showPaypalEditor, setShowPaypalEditor] = useState(false);
  const [bioText, setBioText] = useState(props.constructorPage.b);
  const [sigText, setSigText] = useState(props.constructorPage.sig ?? '');
  const [shareButtonsText, setShareButtonsText] = useState(
    props.constructorPage.st ?? ''
  );
  const [paypalEmail, setPaypalEmail] = useState(
    props.constructorPage.pp ?? ''
  );
  const [paypalText, setPaypalText] = useState(props.constructorPage.pt ?? '');
  const [submitting, setSubmitting] = useState(false);

  function deleteTipButton() {
    console.log('Removing tip button');
    updateDoc(getDocRef('cp', props.constructorPage.id), {
      pp: deleteField(),
      pt: deleteField(),
      m: true,
      t: serverTimestamp(),
    })
      .then(() => {
        console.log('Updated');
        setIsOpen(false);
      })
      .catch((err: unknown) => {
        console.error(ASYNC_ERROR, err);
      });
  }

  function deleteSig() {
    console.log('Removing sig');
    updateDoc(getDocRef('cp', props.constructorPage.id), {
      sig: deleteField(),
      m: true,
      t: serverTimestamp(),
    })
      .then(() => {
        console.log('Updated');
        setIsOpen(false);
      })
      .catch((err: unknown) => {
        console.error(ASYNC_ERROR, err);
      });
  }

  function deleteShareButtonsText() {
    console.log('Removing share button text');
    updateDoc(getDocRef('cp', props.constructorPage.id), {
      st: deleteField(),
      m: true,
      t: serverTimestamp(),
    })
      .then(() => {
        console.log('Updated');
        setIsOpen(false);
      })
      .catch((err: unknown) => {
        console.error(ASYNC_ERROR, err);
      });
  }

  function deleteBio() {
    console.log('Removing bio');
    updateDoc(getDocRef('cp', props.constructorPage.id), {
      b: '',
      m: true,
      t: serverTimestamp(),
    })
      .then(() => {
        console.log('Updated');
        setIsOpen(false);
      })
      .catch((err: unknown) => {
        console.error(ASYNC_ERROR, err);
      });
  }

  function submitPaypalInfo(event: FormEvent) {
    event.preventDefault();
    if (
      !paypalText.trim() ||
      paypalEmail === '' ||
      !paypalEmail.includes('@')
    ) {
      return;
    }
    setSubmitting(true);
    console.log('Submitting new paypal info');
    updateDoc(getDocRef('cp', props.constructorPage.id), {
      pp: paypalEmail,
      pt: paypalText.trim(),
      m: true,
      t: serverTimestamp(),
    })
      .then(() => {
        console.log('Updated');
        setShowPaypalEditor(false);
        setSubmitting(false);
      })
      .catch((err: unknown) => {
        console.error(ASYNC_ERROR, err);
      });
  }

  function submitEdit(event: FormEvent) {
    event.preventDefault();
    const textToSubmit = bioText.trim();
    console.log('Submitting bio');
    updateDoc(getDocRef('cp', props.constructorPage.id), {
      b: textToSubmit,
      m: true,
      t: serverTimestamp(),
    })
      .then(() => {
        console.log('Updated');
        setIsOpen(false);
      })
      .catch((err: unknown) => {
        console.error(ASYNC_ERROR, err);
      });
  }

  function submitSigEdit(event: FormEvent) {
    event.preventDefault();
    const textToSubmit = sigText.trim();
    if (!textToSubmit) {
      return;
    }
    console.log('Submitting sig');
    updateDoc(getDocRef('cp', props.constructorPage.id), {
      sig: textToSubmit,
      m: true,
      t: serverTimestamp(),
    })
      .then(() => {
        console.log('Updated');
        setIsSigOpen(false);
      })
      .catch((err: unknown) => {
        console.error(ASYNC_ERROR, err);
      });
  }

  function submitShareButtonsEdit(event: FormEvent) {
    event.preventDefault();
    const textToSubmit = shareButtonsText.trim();
    if (!textToSubmit) {
      return;
    }
    console.log('Submitting share button text');
    updateDoc(getDocRef('cp', props.constructorPage.id), {
      st: textToSubmit,
      m: true,
      t: serverTimestamp(),
    })
      .then(() => {
        console.log('Updated');
        setIsShareButtonsOpen(false);
      })
      .catch((err: unknown) => {
        console.error(ASYNC_ERROR, err);
      });
  }

  return (
    <div
      css={{
        marginBottom: '1em',
        ['p:last-of-type']: {
          marginBottom: '0.25em',
        },
        '& h4': {
          marginTop: '1.5em',
        },
      }}
    >
      <h4>Bio</h4>
      {isOpen ? (
        <>
          <div
            css={{
              backgroundColor: 'var(--secondary)',
              borderRadius: '0.5em',
              padding: '1em',
              marginTop: '1em',
            }}
          >
            <h4>Live Preview:</h4>
            <Markdown hast={markdownToHast({ text: bioText })} />
          </div>
          <form className="margin1em0" onSubmit={submitEdit}>
            <label css={{ width: '100%', margin: 0 }}>
              Enter new bio text:
              <textarea
                css={{ width: '100%', display: 'block', height: '5em' }}
                value={bioText}
                onChange={(e) => {
                  setBioText(e.target.value.substring(0, BIO_LENGTH_LIMIT));
                }}
              />
            </label>
            <div
              css={{
                textAlign: 'right',
                color:
                  BIO_LENGTH_LIMIT - bioText.length > 10
                    ? 'var(--default-text)'
                    : 'var(--error)',
              }}
            >
              {bioText.length}/{BIO_LENGTH_LIMIT}
            </div>
            <Button type="submit" className="marginRight0-5em" text="Save" />
            <Button
              boring={true}
              className="marginRight0-5em"
              onClick={() => {
                setIsOpen(false);
              }}
              text="Cancel"
            />
          </form>
        </>
      ) : (
        <>
          <p>
            Your bio appears on the top of your blog page - use it to introduce
            yourself to solvers!
          </p>
          {props.constructorPage.b ? (
            <>
              <Button
                className="marginRight1-5em"
                onClick={() => {
                  setIsOpen(true);
                }}
                text="Edit bio"
              />
              <Button boring={true} onClick={deleteBio} text="Delete bio" />
            </>
          ) : (
            <Button
              onClick={() => {
                setIsOpen(true);
              }}
              text="Add bio"
            />
          )}
        </>
      )}

      <h4>Pics</h4>
      <p>
        Your profile pic appears on your puzzle pages and your blog page. Your
        cover pic is a large photo that appears at the top of your blog page.
      </p>
      <Button
        className="marginRight1-5em"
        onClick={props.addProfilePic}
        text="Edit profile pic"
      />
      <Button onClick={props.addCoverPic} text="Edit cover pic" />

      <h4>Tips</h4>
      <p>
        A tip button appears on your puzzle pages and your blog page and is a
        way for solvers to give you a little cash to show their appreciation for
        your puzzles!
      </p>
      {props.constructorPage.pp && props.constructorPage.pt ? (
        <>
          <Button
            className="marginRight1-5em"
            onClick={() => {
              setShowPaypalEditor(true);
            }}
            text="Edit tip button"
          />
          <Button
            boring={true}
            onClick={deleteTipButton}
            text="Delete tip button"
          />
        </>
      ) : (
        <Button
          onClick={() => {
            setShowPaypalEditor(true);
          }}
          text="Add tip button"
        />
      )}

      <h4>Signature</h4>
      {isSigOpen ? (
        /* Todo share this w/ bio editor above */
        <>
          <div
            css={{
              backgroundColor: 'var(--secondary)',
              borderRadius: '0.5em',
              padding: '1em',
              marginTop: '1em',
            }}
          >
            <h4>Live Preview:</h4>
            <Markdown inline={true} hast={markdownToHast({ text: sigText })} />
          </div>
          <form className="margin1em0" onSubmit={submitSigEdit}>
            <label css={{ width: '100%', margin: 0 }}>
              Enter new signature:
              <textarea
                css={{ width: '100%', display: 'block', height: '5em' }}
                value={sigText}
                onChange={(e) => {
                  setSigText(e.target.value.substring(0, SIG_LENGTH_LIMIT));
                }}
              />
            </label>
            <div
              css={{
                textAlign: 'right',
                color:
                  SIG_LENGTH_LIMIT - sigText.length > 10
                    ? 'var(--default-text)'
                    : 'var(--error)',
              }}
            >
              {sigText.length}/{SIG_LENGTH_LIMIT}
            </div>
            <Button
              type="submit"
              className="marginRight0-5em"
              disabled={sigText.trim().length === 0}
              text="Save"
            />
            <Button
              boring={true}
              className="marginRight0-5em"
              onClick={() => {
                setIsSigOpen(false);
              }}
              text="Cancel"
            />
          </form>
        </>
      ) : (
        <>
          <p>
            A sig appears on each of your puzzle pages. You can use it to link
            to your social media accounts or give other important information
            about your puzzles.
          </p>
          {props.constructorPage.sig ? (
            <>
              <Button
                className="marginRight1-5em"
                onClick={() => {
                  setIsSigOpen(true);
                }}
                text="Edit sig"
              />
              <Button boring={true} onClick={deleteSig} text="Delete sig" />
            </>
          ) : (
            <Button
              onClick={() => {
                setIsSigOpen(true);
              }}
              text="Add sig"
            />
          )}
        </>
      )}
      {showPaypalEditor ? (
        <Overlay
          closeCallback={() => {
            setShowPaypalEditor(false);
          }}
        >
          <form onSubmit={submitPaypalInfo}>
            <div>
              <label>
                <p>Paypal email address:</p>
                <input
                  type="text"
                  value={paypalEmail}
                  onChange={(e) => {
                    setPaypalEmail(e.target.value.trim());
                  }}
                />
              </label>
            </div>
            <div className="marginTop2em">
              <label className="width100">
                <p>Message to show in paypal dialogue:</p>
                <input
                  className="width100"
                  type="text"
                  value={paypalText}
                  onChange={(e) => {
                    setPaypalText(
                      e.target.value.substring(0, PAYPAL_LENGTH_LIMIT)
                    );
                  }}
                />
                <div
                  css={{
                    textAlign: 'right',
                    color:
                      PAYPAL_LENGTH_LIMIT - paypalText.length > 10
                        ? 'var(--default-text)'
                        : 'var(--error)',
                  }}
                >
                  {paypalText.length}/{PAYPAL_LENGTH_LIMIT}
                </div>
              </label>
            </div>
            <Button type="submit" text="Save" disabled={submitting} />
          </form>
        </Overlay>
      ) : (
        ''
      )}
      <h4>Social sharing buttons</h4>
      {isShareButtonsOpen ? (
        <>
          <form className="margin1em0" onSubmit={submitShareButtonsEdit}>
            <p>
              Enter the text that will show up in share dialogs on sites that
              support custom text (the variable <strong>{'{time}'}</strong> will
              get replaced with the sharer&apos;s solve time and{' '}
              <strong>{'{title}'}</strong> with the puzzle&apos;s title):
            </p>
            <div className="margin1em0">
              <LengthLimitedInput
                css={{ width: '50%' }}
                updateValue={setShareButtonsText}
                maxLength={SHARE_BUTTONS_LENGTH_LIMIT}
                value={shareButtonsText}
              />
              <LengthView
                maxLength={SHARE_BUTTONS_LENGTH_LIMIT}
                value={shareButtonsText}
              />
            </div>
            <Button
              type="submit"
              className="marginRight0-5em"
              disabled={shareButtonsText.trim().length === 0}
              text="Save"
            />
            <Button
              boring={true}
              className="marginRight0-5em"
              onClick={() => {
                setIsShareButtonsOpen(false);
              }}
              text="Cancel"
            />
          </form>
        </>
      ) : (
        <>
          <p>
            If enabled, sharing buttons for popular social media sites will
            appear after a user solves one of your puzzles. You can customize
            the text that will be used for shares.
          </p>
          {props.constructorPage.st ? (
            <>
              <Button
                className="marginRight1-5em"
                onClick={() => {
                  setIsShareButtonsOpen(true);
                }}
                text="Edit sharing text"
              />
              <Button
                boring={true}
                onClick={deleteShareButtonsText}
                text="Remove sharing buttons"
              />
            </>
          ) : (
            <Button
              onClick={() => {
                setShareButtonsText(
                  `I solved ${props.constructorPage.n}'s puzzle "{title}" in {time}!`
                );
                setIsShareButtonsOpen(true);
              }}
              text="Add sharing buttons"
            />
          )}
        </>
      )}
    </div>
  );
};
