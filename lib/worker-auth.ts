import { createHmac, createHash, randomBytes, scrypt as rawScrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'

const scrypt = promisify(rawScrypt)
export const WORKER_COOKIE = 'wht_worker'
export type Worker = { id:string; worker_id:string; worker_name:string; password_hash:string; is_active:boolean; must_change_password:boolean }
export function loginName(value:string) { return value.trim().replace(/\s+/g,' ').toLocaleLowerCase() }

export async function hashPassword(password:string):Promise<string> {
  const salt=randomBytes(16).toString('hex')
  const hash=await scrypt(password,salt,64) as Buffer
  return `scrypt$${salt}$${hash.toString('hex')}`
}
export async function verifyPassword(password:string,stored:string):Promise<boolean> {
  const [alg,salt,digest]=stored.split('$')
  if(alg!=='scrypt'||!salt||!digest||!/^[a-f0-9]{128}$/i.test(digest))return false
  const given=await scrypt(password,salt,64) as Buffer
  return timingSafeEqual(given,Buffer.from(digest,'hex'))
}
function signingKey(){
 const secret=process.env.ADMIN_SESSION_SECRET
 if(!secret||secret.length<24)throw new Error('ADMIN_SESSION_SECRET is required')
 return `worker-session-v1:${secret}`
}
function version(passwordHash:string){return createHash('sha256').update(passwordHash).digest('hex').slice(0,24)}
export function makeWorkerToken(worker:Worker):string {
 const body=Buffer.from(JSON.stringify({sub:worker.id,v:version(worker.password_hash),exp:Math.floor(Date.now()/1000)+60*60*24*14})).toString('base64url')
 const sig=createHmac('sha256',signingKey()).update(body).digest('base64url')
 return `${body}.${sig}`
}
export const workerCookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge:60*60*24*14}
export async function getWorkerSession():Promise<Worker|null> {
 try {
  const store=await cookies()
  const token=store.get(WORKER_COOKIE)?.value||''
  const [body,sig]=token.split('.')
  if(!body||!sig||body.length>1500)return null
  const expected=createHmac('sha256',signingKey()).update(body).digest()
  const actual=Buffer.from(sig,'base64url')
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null
  const payload=JSON.parse(Buffer.from(body,'base64url').toString('utf8')) as {sub?:string,v?:string,exp?:number}
  if(!payload.sub||!payload.exp||payload.exp<Math.floor(Date.now()/1000))return null
  const {data,error}=await supabaseAdmin().from('workers').select('id,worker_id,worker_name,password_hash,is_active,must_change_password').eq('id',payload.sub).maybeSingle()
  if(error||!data||!data.is_active||version(data.password_hash)!==payload.v)return null
  return data as Worker
 }catch{return null}
}
