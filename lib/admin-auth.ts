import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'wht_admin'

function secret() {
  return process.env.ADMIN_SESSION_SECRET || ''
}

export function adminToken() {
  const password = process.env.ADMIN_PASSWORD || ''
  return createHmac('sha256', secret()).update(`working-hour-admin:${password}`).digest('hex')
}

export async function isAdmin() {
  if (!process.env.ADMIN_PASSWORD || !secret()) return false
  const store = await cookies()
  const received = store.get(ADMIN_COOKIE)?.value || ''
  const expected = adminToken()
  if (!received || received.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  } catch {
    return false
  }
}
