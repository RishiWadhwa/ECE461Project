import { useState } from 'react'

/** One line of a field's checklist. `met` is left out for a neutral line that only states the format. */
export interface Hint {
  label: string
  met?: boolean
}

/**
 * Tracks focus for one field and says whether its checklist should be showing: while the field has focus, or
 * while it holds text that still breaks a rule. It hides when the field is empty and unfocused, or when every
 * rule is met and the field is unfocused. Spread `bind` onto the input.
 */
export function useHints(value: string, hints: Hint[]) {
  const [focused, setFocused] = useState(false)
  const open = focused || (value !== '' && hints.some((h) => h.met === false))
  return { open, bind: { onFocus: () => setFocused(true), onBlur: () => setFocused(false) } }
}
