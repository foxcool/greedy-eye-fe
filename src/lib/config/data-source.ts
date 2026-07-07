/**
 * Data source mode.
 *
 * USE_BACKEND — real backend is configured; all data comes from it.
 * DEMO_MODE — no backend at all: the app is a self-contained demo running on
 * mock data. Mock data must never render outside demo mode — an empty state
 * is honest, fake numbers are not.
 */
export const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === 'true'
export const DEMO_MODE = !USE_BACKEND
