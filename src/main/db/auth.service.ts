import type { PortalUser } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma, serialize } from './prisma'

export const errors = {
  ERR_LOGIN_INVALID_USER: 'ERR_LOGIN_INVALID_USER', // User does not exist in DB
  ERR_LOGIN_INVALID_PASSWORD: 'ERR_LOGIN_INVALID_PASSWORD' // Password does not match
}

/**
 * Single-window desktop app: the logged-in user lives in the main process
 * (replaces the old JWT). Cleared on logout / app restart.
 */
let currentUser: PortalUser | null = null

export function getSessionUser(): PortalUser | null {
  return currentUser
}

export function logout(): void {
  currentUser = null
}

export async function login(username: string, password: string): Promise<PortalUser> {
  const user = await prisma.portalUser.findUnique({
    where: { userName: username },
    include: { login: true }
  })

  if (!user?.login?.password) {
    throw new Error(errors.ERR_LOGIN_INVALID_USER)
  }

  const passwordMatch = await bcrypt.compare(password, user.login.password)
  if (!passwordMatch) {
    throw new Error(errors.ERR_LOGIN_INVALID_PASSWORD)
  }

  const { login: _login, ...portalUser } = user
  currentUser = portalUser
  return serialize(portalUser)
}
