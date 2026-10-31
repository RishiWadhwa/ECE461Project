import { describe, expect, it } from 'vitest'
import { ValidationError } from './errors.ts'
import { Integer } from './math.ts'
import { validateCreds, validateProjectID, validateQuantity } from './validation.ts'

function caught(fn: () => void): ValidationError {
  try {
    fn()
  } catch (err) {
    if (err instanceof ValidationError) return err
    throw err
  }
  throw new Error('expected a ValidationError')
}

describe('validateCreds (signUp)', () => {
  it('accepts a valid userID and password', () => {
    expect(() => validateCreds('testuser', 'test1234', 'signUp')).not.toThrow()
  })

  it('reports every broken field at once', () => {
    const err = caught(() => validateCreds('', '', 'signUp'))
    expect(err.messageFor('userID')).toBe('UserID is required!')
    expect(err.messageFor('password')).toBe('Password is required!')
  })

  it('rejects userIDs with characters other than letters and digits', () => {
    const err = caught(() => validateCreds('bad user!', 'password1', 'signUp'))
    expect(err.messageFor('userID')).toBe('This UserID contains invalid characters!')
    expect(err.messageFor('password')).toBeUndefined()
  })

  it('rejects a userID shorter than 5 characters', () => {
    const err = caught(() => validateCreds('abcd', 'password1', 'signUp'))
    expect(err.messageFor('userID')).toBe('UserID must be at least 5 characters!')
    expect(err.messageFor('password')).toBeUndefined()
  })

  it('rejects a userID longer than 16 characters', () => {
    const err = caught(() => validateCreds('a'.repeat(17), 'password1', 'signUp'))
    expect(err.messageFor('userID')).toBe('UserID must be at most 16 characters!')
    expect(err.messageFor('password')).toBeUndefined()
  })

  it('rejects a password shorter than 8 characters', () => {
    const err = caught(() => validateCreds('testuser', 'pass123', 'signUp'))
    expect(err.messageFor('userID')).toBeUndefined()
    expect(err.messageFor('password')).toBe('Password must be at least 8 characters!')
  })

  it('rejects a password longer than 64 characters', () => {
    const err = caught(() => validateCreds('testuser', 'p'.repeat(65), 'signUp'))
    expect(err.messageFor('userID')).toBeUndefined()
    expect(err.messageFor('password')).toBe('Password must be at most 64 characters!')
  })

  it('accepts a userID and password exactly at the minimum length', () => {
    expect(() => validateCreds('abcde', 'pass1234', 'signUp')).not.toThrow()
  })

  it('accepts a userID and password exactly at the maximum length', () => {
    expect(() => validateCreds('a'.repeat(16), 'p'.repeat(64), 'signUp')).not.toThrow()
  })
})

describe('validateCreds (signIn)', () => {
  it('only requires both fields to be filled in', () => {
    expect(() => validateCreds('bad user!', 'pw', 'signIn')).not.toThrow()
  })

  it('does not apply the sign-up length limits', () => {
    expect(() => validateCreds('a'.repeat(17), 'p'.repeat(65), 'signIn')).not.toThrow()
  })

  it('reports both empty fields at once', () => {
    const err = caught(() => validateCreds('', '', 'signIn'))
    expect(err.messageFor('userID')).toBe('UserID is required!')
    expect(err.messageFor('password')).toBe('Password is required!')
  })
})

describe('validateProjectID', () => {
  it('accepts letters and digits', () => {
    expect(() => validateProjectID('project01')).not.toThrow()
  })

  it('accepts a project ID exactly at the minimum length', () => {
    expect(() => validateProjectID('proj0001')).not.toThrow()
  })

  it.each([
    ['', 'Project ID is required!'],
    ['proj001', 'Project ID must be at least 8 characters'],
    ['project 01', 'Project ID can only contain letters and digits'],
  ])('rejects %j', (value, message) => {
    expect(caught(() => validateProjectID(value)).messageFor('projectID')).toBe(message)
  })
})

// NaN and 2.5 never reach validateQuantity: Integer.of() and Integer.valueOf() reject them first (see math.test.ts).
describe('validateQuantity', () => {
  const ten = Integer.of(10)

  it('accepts a whole number within the limit', () => {
    expect(() => validateQuantity(Integer.of(5), ten)).not.toThrow()
    expect(() => validateQuantity(Integer.of(10), ten)).not.toThrow()
  })

  it.each([
    [0, 'Quantity must be greater than 0!'],
    [-3, 'Quantity must be greater than 0!'],
    [11, 'Only 10 units available'],
  ])('rejects %d', (value, message) => {
    expect(caught(() => validateQuantity(Integer.of(value), ten)).messageFor('quantity')).toBe(message)
  })

  it('reports a parsed negative as "greater than 0"', () => {
    expect(caught(() => validateQuantity(Integer.valueOf('-3'), ten)).messageFor('quantity'))
      .toBe('Quantity must be greater than 0!')
  })
})

describe('validators return the checked value', () => {
  it('validateCreds returns the userID and password it checked', () => {
    expect(validateCreds('testuser', 'test1234', 'signIn')).toEqual({ userID: 'testuser', password: 'test1234' })
    expect(validateCreds('testuser', 'test1234', 'signUp')).toEqual({ userID: 'testuser', password: 'test1234' })
  })

  it('validateQuantity returns the same Integer', () => {
    const five = Integer.of(5)
    expect(validateQuantity(five, Integer.of(10))).toBe(five)
  })

  it('validateProjectID returns the same ID', () => {
    expect(validateProjectID('project01')).toBe('project01')
  })
})
