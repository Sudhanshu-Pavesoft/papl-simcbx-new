import type { DbResult } from '@shared/ipc.types'

export class ApiError extends Error {}

/**
 * Unwraps the { ok, data | error } envelope returned by all auth/db/report
 * IPC handlers. Throws ApiError on failure so existing .catch() call sites
 * keep working the same way tRPC rejections did.
 */
export async function unwrap<T>(promise: Promise<DbResult<T>>): Promise<T> {
  const res = await promise
  if (!res.ok) throw new ApiError(res.error ?? 'Unknown error')
  return res.data as T
}

export const api = window.api
