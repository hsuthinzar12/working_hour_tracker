import { NextResponse } from 'next/server'
import { WORKER_COOKIE,workerCookieOptions } from '@/lib/worker-auth'
export async function POST(){const r=NextResponse.json({ok:true});r.cookies.set(WORKER_COOKIE,'',{...workerCookieOptions,maxAge:0});return r}
