import type { Hint } from '../useHints.ts'

interface Props {
  /** Also the id the input names in aria-describedby. */
  id: string
  hints: Hint[]
  open: boolean
}

// A checklist under a field: a green check once a rule is met, a dot until then. It is always in the page and
// opens and closes with a CSS height transition (.hints in index.css), so the box around the field grows and
// shrinks smoothly and nothing below jumps.
export default function FieldHints({ id, hints, open }: Props) {
  return (
    <div id={id} className={open ? 'hints open' : 'hints'} aria-hidden={!open}>
      <ul className="hints-list" aria-live="polite">
        {hints.map((h) => (
          <li key={h.label} className={h.met ? 'hint hint-met' : 'hint'}>
            <span className="hint-mark" aria-hidden="true">{h.met ? '✓' : '•'}</span>
            {h.label}
            {h.met !== undefined && <span className="sr-only">{h.met ? ' (met)' : ' (not met yet)'}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
