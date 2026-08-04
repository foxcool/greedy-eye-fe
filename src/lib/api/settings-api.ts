// Connect-RPC endpoints for SettingsService.
// All methods use POST to /eye.v1.SettingsService/<Method>.
import { apiClient, ApiError } from './client'

const RPC = (method: string) => `/eye.v1.SettingsService/${method}`

interface Setting {
  key: string
  /** JSON text. See settings.proto: the document round-trips, the bytes do not. */
  value: string
  updatedAt?: string
}

/**
 * Read one of the caller's settings, or null when it was never written.
 *
 * The backend answers NotFound for an unset key rather than an empty value, and
 * that distinction is the point: "no dashboard yet" means show the default
 * arrangement, while an empty dashboard is a deliberate one the user built.
 * Collapsing them here would make a cleared dashboard un-clearable.
 */
export async function getSetting(key: string): Promise<unknown | null> {
  try {
    const res = await apiClient.post<{ setting?: Setting }>(RPC('GetSetting'), { key })
    const value = res.setting?.value
    return value ? (JSON.parse(value) as unknown) : null
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/** Write one of the caller's settings, replacing whatever was there. */
export async function setSetting(key: string, value: unknown): Promise<void> {
  await apiClient.post(RPC('SetSetting'), { key, value: JSON.stringify(value) })
}
