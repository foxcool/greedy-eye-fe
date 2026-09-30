import { describe, expect, it } from 'vitest'
import { decimalStringToRaw, decimalToHolding, holdingToDecimal, rawToDecimalString } from './backend-types'

// Money on the wire is a raw integer string scaled by `decimals`. The holding
// form reads it into a text field and writes it back; a save that changes
// nothing must send back exactly what it read.
describe('raw amount <-> decimal text', () => {
  it('round-trips an 18-decimal token over 1000 units exactly', () => {
    const raw = '1234567890123456789012'
    const shown = rawToDecimalString(raw, 18)
    expect(shown).toBe('1234.567890123456789012')
    expect(decimalStringToRaw(shown, 18)).toBe(raw)
  })

  it('round-trips the digits a float would lose', () => {
    expect(decimalStringToRaw(rawToDecimalString('123456789012345678', 18), 18)).toBe('123456789012345678')
    // The old path: parseFloat then scale.
    expect(decimalToHolding(parseFloat('0.123456789012345678'), 18)).not.toBe('123456789012345678')
  })

  it('renders small, zero and whole amounts plainly', () => {
    expect(rawToDecimalString('1', 8)).toBe('0.00000001')
    expect(rawToDecimalString('0', 8)).toBe('0')
    expect(rawToDecimalString('500000000', 8)).toBe('5')
    expect(rawToDecimalString('42', 0)).toBe('42')
    expect(rawToDecimalString(undefined, 8)).toBe('0')
  })

  it('refuses rather than rounds', () => {
    expect(() => decimalStringToRaw('0.123', 2)).toThrow(/at most 2 digits/)
    expect(() => decimalStringToRaw('1e3', 8)).toThrow()
    expect(() => decimalStringToRaw('-1', 8)).toThrow()
    expect(() => decimalStringToRaw('.', 8)).toThrow()
    expect(decimalStringToRaw('1.50', 1)).toBe('15') // trailing zeros are not precision
    expect(decimalStringToRaw('.5', 2)).toBe('50')
  })

  it('never prints exponent notation from a number', () => {
    expect(decimalToHolding(1000, 18)).toBe('1000000000000000000000')
    expect(decimalToHolding(0.0114, 8)).toBe('1140000')
  })

  it('keeps holdingToDecimal as a display approximation only', () => {
    expect(holdingToDecimal('150000000', 8)).toBe(1.5)
  })
})
