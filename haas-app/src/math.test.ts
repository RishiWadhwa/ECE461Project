import { describe, expect, it } from 'vitest'
import { IntMath } from './math.ts'
import { ValidationError } from './errors.ts'
import { validateQuantity } from './validation.ts'

describe('IntMath.parseInt', () => {
  it.each([
    ['5', 5],
    ['12', 12],
    ['0', 0],
    ['-3', -3],
  ])('parses %j', (text, expected) => {
    expect(IntMath.parseInt(text)).toBe(expected)
  })

  it.each(['', '   ', ' 12 ', '12 ', ' 12', '1e0', '007', '00', '-0', '-07', '2.5', '0x10', '+4', 'abc', '5abc'])(
    'rejects %j',
    (text) => {
      expect(IntMath.parseInt(text)).toBeNaN()
    },
  )

  it('lets validation report a negative as "greater than 0"', () => {
    try {
      validateQuantity(IntMath.parseInt('-3'), 10)
      throw new Error('expected a ValidationError')
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError)
      expect((err as ValidationError).messageFor('quantity')).toBe('Quantity must be greater than 0!')
    }
  })
})
