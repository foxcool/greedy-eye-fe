import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// Any request a test did not mock is a bug in the test, not a flaky network:
// refuse it instead of letting it hang or hit localhost:8080.
vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
  throw new Error(`unmocked fetch in test: ${String(input)}`)
}))
