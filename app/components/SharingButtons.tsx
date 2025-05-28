import { mix } from 'color2k';
import type { CSSProperties, ReactNode } from 'react';
import {
  FaEnvelope,
  FaFacebook,
  FaRegClipboard,
  FaTwitter,
} from 'react-icons/fa';
import styles from './SharingButtons.module.css';
import { useSnackbar } from './Snackbar.js';

enum Network {
  Facebook,
  Twitter,
  Email,
  Clipboard,
}

function linkName(network: Network): string {
  switch (network) {
    case Network.Facebook:
      return 'Facebook';
    case Network.Twitter:
      return 'Twitter';
    case Network.Email:
      return 'Email';
    case Network.Clipboard:
      return 'Copy';
  }
}

function colors(network: Network): string {
  switch (network) {
    case Network.Facebook:
      return '#3b5998';
    case Network.Twitter:
      return '#55acee';
    case Network.Email:
      return '#777777';
    case Network.Clipboard:
      return '#777777';
  }
}

function url(network: Network, path: string, text: string): string {
  const urlToShare = encodeURIComponent('https://crosshare.org' + path);
  const textToShare = encodeURIComponent(text);
  switch (network) {
    case Network.Facebook:
      return 'https://facebook.com/sharer/sharer.php?u=' + urlToShare;
    case Network.Twitter:
      return (
        'https://twitter.com/intent/tweet/?text=' +
        textToShare +
        '&url=' +
        urlToShare
      );
    case Network.Email:
      return 'mailto:?subject=' + textToShare + '&body=' + urlToShare;
    case Network.Clipboard:
      return '#';
  }
}

function icon(network: Network): ReactNode {
  switch (network) {
    case Network.Facebook:
      return <FaFacebook className="verticalAlignTextBottom" />;
    case Network.Twitter:
      return <FaTwitter className="verticalAlignTextBottom" />;
    case Network.Email:
      return <FaEnvelope className="verticalAlignTextBottom" />;
    case Network.Clipboard:
      return <FaRegClipboard className="verticalAlignTextBottom" />;
  }
}

interface SharingButtonProps extends SharingButtonsProps {
  network: Network;
}

function SharingButton({ network, path, text }: SharingButtonProps) {
  const { showSnackbar } = useSnackbar();

  return (
    <a
      style={
        {
          '--share-link-bg': mix(colors(network), 'black', 0.3),
          '--share-link-bg-hover': mix(colors(network), 'black', 0.4),
        } as CSSProperties
      }
      className={styles.link}
      href={url(network, path, text)}
      onClick={(e) => {
        if (network !== Network.Clipboard) {
          return;
        }
        e.preventDefault();

        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
        if (navigator.clipboard) {
          navigator.clipboard
            .writeText(`${text} https://crosshare.org${path}`)
            .then(
              function () {
                showSnackbar('Copied to clipboard');
              },
              function (err: unknown) {
                console.error('Could not copy text: ', err);
              }
            );
        } else {
          console.error('No navigator.clipboard');
        }
      }}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={linkName(network)}
    >
      {icon(network)}
      <span className={styles.linkName}>{linkName(network)}</span>
    </a>
  );
}

interface SharingButtonsProps {
  path: string;
  text: string;
}

export function SharingButtons(props: SharingButtonsProps) {
  return (
    <div className={styles.buttonWrap}>
      <b className={styles.shareText}>Share:</b>
      <SharingButton network={Network.Facebook} {...props} />
      <SharingButton network={Network.Twitter} {...props} />
      <SharingButton network={Network.Email} {...props} />
      <SharingButton network={Network.Clipboard} {...props} />
    </div>
  );
}
