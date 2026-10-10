import { describe, expect, it } from 'vitest'
import { Double, Float, Integer } from './math.ts'
import { NumberFormatError } from './errors.ts'

describe('Integer.of', () => {
  it.each([0, 5, -3, Number.MAX_SAFE_INTEGER])('wraps %d', (n) => {
    expect(Integer.of(n).intValue()).toBe(n)
  })

  it.each([2.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])('rejects %d', (n) => {
    expect(() => Integer.of(n)).toThrow(NumberFormatError)
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

  it('prints and serializes as its number', () => {
    expect(`${Float.of(1.5)}`).toBe('1.5')
    expect(JSON.stringify({ x: Double.of(2.5) })).toBe('{"x":2.5}')
  })
})
