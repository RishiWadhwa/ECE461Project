import { describe, expect, it } from 'vitest'
import { ValidationError } from './errors.ts'
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

  it('rejects a userID shorter than 3 characters', () => {
    const err = caught(() => validateCreds('ab', 'password1', 'signUp'))
    expect(err.messageFor('userID')).toBe('UserID must be at least 3 characters!')
    expect(err.messageFor('password')).toBeUndefined()
  })

  it('rejects a password shorter than 8 characters', () => {
    const err = caught(() => validateCreds('testuser', 'pass123', 'signUp'))
    expect(err.messageFor('userID')).toBeUndefined()
    expect(err.messageFor('password')).toBe('Password must be at least 8 characters!')
  })

  it('accepts a userID and password exactly at the minimum length', () => {
    expect(() => validateCreds('abc', 'pass1234', 'signUp')).not.toThrow()
  })
})

describe('validateCreds (signIn)', () => {
  it('only requires both fields to be filled in', () => {
    expect(() => validateCreds('bad user!', 'pw', 'signIn')).not.toThrow()
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

describe('validateQuantity', () => {
  it('accepts a whole number within the limit', () => {
    expect(() => validateQuantity(5, 10)).not.toThrow()
    expect(() => validateQuantity(10, 10)).not.toThrow()
  })

  it.each([
    [Number.NaN, 'Quantity must be a number!'],
    [2.5, 'Quantity must be a whole number, not a double!'],
    [0, 'Quantity must be greater than 0!'],
    [-3, 'Quantity must be greater than 0!'],
    [11, 'Only 10 units available'],
  ])('rejects %d', (value, message) => {
    expect(caught(() => validateQuantity(value, 10)).messageFor('quantity')).toBe(message)
  })
})
