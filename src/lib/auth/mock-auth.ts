/**
 * Mock authentication for development
 * This will be replaced with real JWT authentication in the future
 */

export interface MockUser {
  id: string
  name: string
  email: string
}

export const mockUser: MockUser = {
  id: process.env.NEXT_PUBLIC_MOCK_USER_ID || 'mock-user-123',
  name: 'Demo User',
  email: 'demo@greedyeye.local',
}

export function getCurrentUser(): MockUser {
  return mockUser
}

export function isAuthenticated(): boolean {
  return true // Always authenticated in development
}
