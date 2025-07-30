import { Dispatch, FormEvent, useContext, useState } from 'react';
import { PrefillSquares } from '../lib/types.js';
import { STORAGE_KEY, clsx } from '../lib/utils.js';
import { NewPuzzleAction } from '../reducers/builderReducer.js';
import { AuthContext } from './AuthContext.js';
import { PrefillIcon, PuzzleSizeIcon } from './Icons.js';
import {Button} from './Buttons.js';
import styles from './NewPuzzleForm.module.css';

interface SizeSelectProps {
  cols: number | null;
  rows: number | null;
  current: string;
  setCols: (s: number) => void;
  setRows: (s: number) => void;
  setCurrent: (s: string) => void;
  label: string;
}

const SizeSelectInput = (props: SizeSelectProps) => {
  return (
    <label className={clsx(styles.selectLabel, 'fontSize1-5em')}>
      <input
        className="marginRight1em"
        type="radio"
        name="size"
        value={props.label}
        checked={props.current === props.label}
        onChange={(e) => {
          if (e.currentTarget.value !== props.label) return;
          props.setCols(props.cols || 0);
          props.setRows(props.rows || 0);
          props.setCurrent(props.label);
        }}
      />
      <span className={styles.icon}>
        <PuzzleSizeIcon
          width={props.cols || undefined}
          height={props.rows || undefined}
        />
      </span>
      {props.label}
      {props.label === 'Custom' && props.current === props.label ? (
        <>
          <input
            type="text"
            className={clsx(styles.sizeInput, 'marginLeft1em')}
            value={props.cols || ''}
            placeholder="Columns"
            onChange={(e) => {
              props.setCols(parseInt(e.target.value));
            }}
          />
          <span className="marginLeft0-5em marginRight0-5em">x</span>
          <input
            type="text"
            className={styles.sizeInput}
            width="3em"
            value={props.rows || ''}
            placeholder="Rows"
            onChange={(e) => {
              props.setRows(parseInt(e.target.value));
            }}
          />
        </>
      ) : (
        ''
      )}
    </label>
  );
};

interface PrefillSelectProps {
  current: PrefillSquares;
  option: PrefillSquares;
  setCurrent: (s: PrefillSquares) => void;
}

const labelForPrefill = (p: PrefillSquares) => {
  switch (p) {
    case PrefillSquares.OddOdd:
      return 'Odd/Odd';
    case PrefillSquares.EvenEven:
      return 'Even/Even';
    case PrefillSquares.OddEven:
      return 'Odd/Even';
    case PrefillSquares.EvenOdd:
      return 'Even/Odd';
  }
};

const PrefillSelectInput = (props: PrefillSelectProps) => {
  return (
    <label className={clsx(styles.selectLabel, 'fontSize1-5em')}>
      <input
        className="marginRight1em"
        type="radio"
        name="prefill"
        value={props.option}
        checked={props.current === props.option}
        onChange={(e) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
          if (parseInt(e.currentTarget.value) !== props.option) return;
          props.setCurrent(props.option);
        }}
      />
      <span className={styles.icon}>
        <PrefillIcon type={props.option} />
      </span>
      {labelForPrefill(props.option)}
    </label>
  );
};

export function NewPuzzleForm(props: {
  dispatch: Dispatch<NewPuzzleAction>;
  hideWarning?: boolean;
  onCreate?: () => void;
}) {
  const [cols, setCols] = useState(5);
  const [rows, setRows] = useState(5);
  const [current, setCurrent] = useState('Mini');
  const [customRows, setCustomRows] = useState<number | null>(null);
  const [customCols, setCustomCols] = useState<number | null>(null);
  const [prefill, setPrefill] = useState<PrefillSquares | undefined>(undefined);
  const authContext = useContext(AuthContext);

  let errorMsg = '';
  if (!customRows || !customCols) {
    errorMsg = 'Both a width and a height must be specified for custom sizes';
  } else if (customRows < 2 || customCols < 2) {
    errorMsg = 'Must have at least two rows and columns';
  } else if (customRows > 25 || customCols > 25) {
    errorMsg = 'Cannot have more than 25 rows or columns';
  }

  function startPuzzle(event: FormEvent) {
    event.preventDefault();

    // Clear current puzzle
    localStorage.removeItem(STORAGE_KEY);

    props.dispatch({
      type: 'NEWPUZZLE',
      cols,
      rows,
      prefill,
      commentsDisabled: authContext.prefs?.disableCommentsByDefault,
    });

    props.onCreate?.();
  }

  return (
    <>
      <h2>Start a new puzzle</h2>
      {props.hideWarning ? (
        ''
      ) : (
        <p className="colorError">
          WARNING: all progress on your current puzzle will be permanently lost.
          If you want to keep it, please publish the current puzzle or export a
          .puz file first.
        </p>
      )}
      <form onSubmit={startPuzzle}>
        <div /* eslint-disable-line */
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <SizeSelectInput
            cols={5}
            rows={5}
            label="Mini"
            current={current}
            setCols={setCols}
            setRows={setRows}
            setCurrent={setCurrent}
          />
          <SizeSelectInput
            cols={11}
            rows={11}
            label="Midi"
            current={current}
            setCols={setCols}
            setRows={setRows}
            setCurrent={setCurrent}
          />
          <SizeSelectInput
            cols={15}
            rows={15}
            label="Full"
            current={current}
            setCols={setCols}
            setRows={setRows}
            setCurrent={setCurrent}
          />
          <SizeSelectInput
            cols={customCols}
            rows={customRows}
            label="Custom"
            current={current}
            setCols={(n) => {
              setCols(n);
              setCustomCols(n);
            }}
            setRows={(n) => {
              setRows(n);
              setCustomRows(n);
            }}
            setCurrent={setCurrent}
          />
          {current === 'Custom' && errorMsg ? (
            <p className="colorError">{errorMsg}</p>
          ) : (
            ''
          )}
          <div>
            <label>
              <input
                className="marginRight1em"
                type="checkbox"
                checked={prefill !== undefined}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPrefill(PrefillSquares.OddOdd);
                  } else {
                    setPrefill(undefined);
                  }
                }}
              />{' '}
              Prefill black squares for UK/cryptic style
            </label>
            {prefill !== undefined ? (
              <>
                <PrefillSelectInput
                  current={prefill}
                  option={PrefillSquares.OddOdd}
                  setCurrent={setPrefill}
                />
                <PrefillSelectInput
                  current={prefill}
                  option={PrefillSquares.EvenEven}
                  setCurrent={setPrefill}
                />
                <PrefillSelectInput
                  current={prefill}
                  option={PrefillSquares.OddEven}
                  setCurrent={setPrefill}
                />
                <PrefillSelectInput
                  current={prefill}
                  option={PrefillSquares.EvenOdd}
                  setCurrent={setPrefill}
                />
              </>
            ) : (
              ''
            )}
          </div>
        </div>

        <Button
          type="submit"
          text="Create New Puzzle"
          disabled={current === 'Custom' && errorMsg !== ''}
        />
      </form>
    </>
  );
}
