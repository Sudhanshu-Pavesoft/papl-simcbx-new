import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

/**
 * Prisma results can contain Decimal instances (ModelSetting is full of them),
 * which the structured-clone algorithm used by ipcMain.handle cannot transfer.
 * A JSON round-trip converts Decimal -> string and Date -> ISO string.
 */
export function serialize<T>(value: T): T {
  if (value === null || value === undefined) return value
  return JSON.parse(JSON.stringify(value))
}
