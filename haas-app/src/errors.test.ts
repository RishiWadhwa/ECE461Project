import { describe, expect, it } from 'vitest'
import { ApiError, AppError, ValidationError, errorMessage } from './errors.ts'

describe('ValidationError', () => {
  it('uses the single issue as its message', () => {
    const err = new ValidationError([{ object: 'userID', message: 'UserID is required.' }])
    expect(err.message).toBe('UserID is required.')
    expect(err).toBeInstanceOf(AppError)
  })

  it('joins several issues and finds the message for one field', () => {
    const err = new ValidationError([
      { object: 'userID', message: 'UserID is required.' },
      { object: 'password', message: 'Password is needed!' },
    ])
    expect(err.message).toBe('Error: UserID is required.; Password is needed!')
    expect(err.messageFor('password')).toBe('Password is needed!')
    expect(err.messageFor('quantity')).toBeUndefined()
  })
})

describe('ApiError', () => {
  it.each([
    [401, 'isAuth'],
    [403, 'isAuth'],
    [404, 'isNotFound'],
    [409, 'isConflict'],
    [503, 'isServer'],
  ] as const)('status %i -> %s()', (status, helper) => {
    expect(new ApiError(status, 'x')[helper]()).toBe(true)
  })

  it('does not treat a 400 as auth, not-found, conflict, or server', () => {
    const err = new ApiError(400, 'Invalid quantity')
    expect([err.isAuth(), err.isNotFound(), err.isConflict(), err.isServer()]).toEqual([false, false, false, false])
  })
})

describe('errorMessage', () => {
  it('returns the message of any Error and the fallback otherwise', () => {
    expect(errorMessage(new ApiError(409, 'Taken'), 'fallback')).toBe('Taken')
    expect(errorMessage(new Error('boom'), 'fallback')).toBe('boom')
    expect(errorMessage('not an error', 'fallback')).toBe('fallback')
  })
})
