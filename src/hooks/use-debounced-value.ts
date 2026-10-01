import { useEffect, useState } from 'react'

// useDebouncedValue follows value once it has stopped changing for delayMs —
// a search box asks the server per pause, not per keystroke.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return settled
}
