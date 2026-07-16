import { ipcMain } from 'electron'
import type { DbResult } from '@shared/ipc.types'

/**
 * Registers an ipcMain.handle channel whose handler result is wrapped in the
 * { ok, data | error } envelope. Thrown errors become { ok: false, error }.
 */
export function handleWithEnvelope<Args extends unknown[], T>(
  channel: string,
  handler: (...args: Args) => Promise<T> | T
): void {
  ipcMain.handle(channel, async (_event, ...args: unknown[]): Promise<DbResult<T>> => {
    try {
      const data = await handler(...(args as Args))
      return { ok: true, data }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[ipc:${channel}]`, message)
      return { ok: false, error: message }
    }
  })
}
