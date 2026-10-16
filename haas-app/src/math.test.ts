import { describe, expect, it } from 'vitest'
import { Double, Float, Integer } from './math.ts'
import { NumberFormatError } from './errors.ts'

/** Runs fn and returns the reason of the NumberFormatError it throws. */
function reasonOf(fn: () => unknown): string {
  try {
    fn()
  } catch (err) {
    if (err instanceof NumberFormatError) return err.reason
    throw err
  }
  throw new Error('expected a NumberFormatError')
}

describe('Integer.of', () => {
  it.each([0, 5, -3, Number.MAX_SAFE_INTEGER])('wraps %d', (n) => {
    expect(Integer.of(n).intValue()).toBe(n)
  })

  it.each([2.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])('rejects %d', (n) => {
    expect(() => Integer.of(n)).toThrow(NumberFormatError)
  })

  it.each([
    [2.5, 'invalid'],
    [Number.NaN, 'invalid'],
    [Number.POSITIVE_INFINITY, 'invalid'],
    [Number.MAX_SAFE_INTEGER + 1, 'outOfRange'],
  ])('classifies %d as %s', (n, reason) => {
    expect(reasonOf(() => Integer.of(n))).toBe(reason)
  })
})

describe('Integer.valueOf', () => {
  it.each([
    ['5', 5],
    ['12', 12],
    ['0', 0],
    ['-3', -3],
    ['+4', 4],
    ['007', 7],
    [' 12 ', 12],
  ])('parses %j', (text, expected) => {
    expect(Integer.valueOf(text).intValue()).toBe(expected)
  })

  it.each(['', '   ', '1e0', '1e3', '2.5', '0x10', 'abc', '5abc', '1 2', '9007199254740992'])(
    'rejects %j',
    (text) => {
      expect(() => Integer.valueOf(text)).toThrow(NumberFormatError)
    },
  )

  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    ['2.5', 'decimal'],
    ['5.0', 'decimal'],
    ['.5', 'decimal'],
    ['7.', 'decimal'],
    ['1e3', 'invalid'],
    ['0x10', 'invalid'],
    ['abc', 'invalid'],
    ['-', 'invalid'],
    ['9007199254740992', 'outOfRange'],
    ['99999999999999999', 'outOfRange'],
    ['9'.repeat(400), 'outOfRange'],
  ])('classifies %j as %s', (text, reason) => {
    expect(reasonOf(() => Integer.valueOf(text))).toBe(reason)
  })

  it('describes the input, not the form it came from', () => {
    expect(() => Integer.valueOf('')).toThrow('Empty string')
    expect(() => Integer.valueOf('1e3')).toThrow('For input string: "1e3"')
  })
})

describe('Integer instance methods', () => {
  it('compareTo orders by value', () => {
    expect(Integer.of(3).compareTo(Integer.of(5))).toBeLessThan(0)
    expect(Integer.of(5).compareTo(Integer.of(5))).toBe(0)
    expect(Integer.of(7).compareTo(Integer.of(5))).toBeGreaterThan(0)
  })

  it('prints as its number in strings and JSON', () => {
    expect(`${Integer.of(42)}`).toBe('42')
    expect(JSON.stringify({ quantity: Integer.of(5) })).toBe('{"quantity":5}')
  })
})

describe('Double.valueOf', () => {
  it.each([
    ['2.5', 2.5],
    ['-3', -3],
    ['.5', 0.5],
    ['7.', 7],
    [' 0.1 ', 0.1],
  ])('parses %j', (text, expected) => {
    expect(Double.valueOf(text).doubleValue()).toBe(expected)
  })

  it.each(['', '  ', '1e0', '2.5E3', '0x10', 'Infinity', 'NaN', '.', '1.2.3', '2.5abc'])('rejects %j', (text) => {
    expect(() => Double.valueOf(text)).toThrow(NumberFormatError)
  })

  it('rejects non-finite numbers', () => {
    expect(() => Double.of(Number.NaN)).toThrow(NumberFormatError)
    expect(() => Double.of(Number.POSITIVE_INFINITY)).toThrow(NumberFormatError)
  })

  it('classifies failures', () => {
    expect(reasonOf(() => Double.valueOf(''))).toBe('empty')
    expect(reasonOf(() => Double.valueOf('1e0'))).toBe('invalid')
    expect(reasonOf(() => Double.of(Number.NaN))).toBe('invalid')
  })
})

describe('Float', () => {
  it('rounds to 32-bit precision', () => {
    expect(Float.valueOf('0.1').floatValue()).toBe(Math.fround(0.1))
    expect(Float.valueOf('0.1').floatValue()).not.toBe(0.1)
  })

  it.each(['1e0', '3.5f', '', '0x1'])('rejects %j', (text) => {
    expect(() => Float.valueOf(text)).toThrow(NumberFormatError)
  })

  it('rejects values beyond the float range', () => {
    expect(() => Float.of(3.5e38)).toThrow(NumberFormatError)
    expect(() => Float.valueOf('9'.repeat(40))).toThrow(NumberFormatError)
  })

  it('classifies too-large values as outOfRange and non-finite ones as invalid', () => {
    expect(reasonOf(() => Float.of(3.5e38))).toBe('outOfRange')
    expect(reasonOf(() => Float.valueOf('9'.repeat(40)))).toBe('outOfRange')
    expect(reasonOf(() => Float.of(Number.NaN))).toBe('invalid')
    expect(reasonOf(() => Float.valueOf('3.5f'))).toBe('invalid')
  })

  it('prints and serializes as its number', () => {
    expect(`${Float.of(1.5)}`).toBe('1.5')
    expect(JSON.stringify({ x: Double.of(2.5) })).toBe('{"x":2.5}')
  })
})
