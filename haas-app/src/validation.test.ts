import { describe, expect, it } from 'vitest'
import { ValidationError } from './errors.ts'
import { Integer } from './math.ts'
import { passwordRules, projectIDRules, userIDRules, validateCreds, validateProjectID, validateQuantity } from './validation.ts'

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
  it('accepts PROJ followed by digits', () => {
    expect(() => validateProjectID('PROJ0001')).not.toThrow()
    expect(() => validateProjectID('PROJ123456')).not.toThrow()
  })

  it('accepts any letter case and returns the ID in uppercase, like the backend', () => {
    expect(validateProjectID('proj0001')).toBe('PROJ0001')
  })

  it.each([
    ['', 'Project ID is required!'],
    ['PROJ001', 'Project ID must be at least 8 characters'],
    ['project01', 'Project ID must be PROJ followed by at least 3 digits'],
    ['PROJ00A1', 'Project ID must be PROJ followed by at least 3 digits'],
    ['PROJ 001', 'Project ID must be PROJ followed by at least 3 digits'],
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

  it('validateProjectID returns the same ID when it is already uppercase', () => {
    expect(validateProjectID('PROJ0001')).toBe('PROJ0001')
  })
})

describe('blank input counts as missing', () => {
  it('rejects a whitespace-only password on sign-up', () => {
    expect(caught(() => validateCreds('testuser', '        ', 'signUp')).messageFor('password'))
      .toBe('Password is required!')
  })

  it('rejects whitespace-only fields on sign-in', () => {
    const err = caught(() => validateCreds('   ', '   ', 'signIn'))
    expect(err.messageFor('userID')).toBe('UserID is required!')
    expect(err.messageFor('password')).toBe('Password is required!')
  })

  it('rejects a whitespace-only project ID', () => {
    expect(caught(() => validateProjectID('    ')).messageFor('projectID')).toBe('Project ID is required!')
  })

  // Only entirely blank input is rejected: a password may contain spaces, including at either end.
  it('accepts a password with spaces inside and around it', () => {
    expect(() => validateCreds('testuser', '  pass word  ', 'signUp')).not.toThrow()
    expect(validateCreds('testuser', '  pass word  ', 'signUp').password).toBe('  pass word  ')
  })
})

describe('requirement checklists', () => {
  const met = (rules: { met: boolean }[]) => rules.map((r) => r.met)
  const accepted = (check: () => unknown) => {
    try { check(); return true } catch { return false }
  }

  it('userIDRules reports length and characters separately, at the edges', () => {
    expect(met(userIDRules('abcd'))).toEqual([false, true])
    expect(met(userIDRules('abcde'))).toEqual([true, true])
    expect(met(userIDRules('a'.repeat(16)))).toEqual([true, true])
    expect(met(userIDRules('a'.repeat(17)))).toEqual([false, true])
    expect(met(userIDRules('abc def'))).toEqual([true, false])
  })

  it('passwordRules checks the length range, and a blank password does not count', () => {
    expect(met(passwordRules('1234567'))).toEqual([false])
    expect(met(passwordRules('12345678'))).toEqual([true])
    expect(met(passwordRules('a'.repeat(65)))).toEqual([false])
    expect(met(passwordRules(' '.repeat(8)))).toEqual([false])
  })

  it('projectIDRules explains what is missing as PROJ0001 is typed', () => {
    expect(met(projectIDRules('PRO'))).toEqual([false, false, false])
    expect(met(projectIDRules('PROJ'))).toEqual([true, false, false])
    expect(met(projectIDRules('PROJ001'))).toEqual([true, true, false])
    expect(met(projectIDRules('proj0001'))).toEqual([true, true, true])
    expect(met(projectIDRules('PROJ00A1'))).toEqual([true, false, true])
  })

  // The checklist and the validators must never disagree about what is acceptable.
  it.each(['', 'abcd', 'abcde', 'a'.repeat(16), 'a'.repeat(17), 'abc_def', 'abc def'])(
    'userIDRules are all met exactly when sign-up accepts the userID %j', (id) => {
      expect(userIDRules(id).every((r) => r.met)).toBe(accepted(() => validateCreds(id, 'password1', 'signUp')))
    })

  it.each(['', '1234567', '12345678', ' '.repeat(8), 'a'.repeat(64), 'a'.repeat(65)])(
    'passwordRules are all met exactly when sign-up accepts the password %j', (pw) => {
      expect(passwordRules(pw).every((r) => r.met)).toBe(accepted(() => validateCreds('alice1', pw, 'signUp')))
    })

  it.each(['', 'PROJ', 'PROJ001', 'PROJ0001', 'proj0001', 'PROJ00A1', 'PROJ 0001', 'ABCD0001'])(
    'projectIDRules are all met exactly when validateProjectID accepts %j', (id) => {
      expect(projectIDRules(id).every((r) => r.met)).toBe(accepted(() => validateProjectID(id)))
    })
})
