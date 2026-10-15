import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, adminToken } from '@/lib/admin-auth'

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: '' }))
  const expected = process.env.ADMIN_PASSWORD || ''
  if (!expected || String(password) !== expected) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })
  return response
}
