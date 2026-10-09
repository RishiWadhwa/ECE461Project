import { describe, expect, it } from 'vitest'
import { Integer } from './math.ts'
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
