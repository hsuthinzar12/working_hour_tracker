import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getWorkerSession,hashPassword,verifyPassword,makeWorkerToken,WORKER_COOKIE,workerCookieOptions } from '@/lib/worker-auth'
export async function POST(request:Request){
 try{
  const worker=await getWorkerSession()
  if(!worker)return NextResponse.json({error:'Please sign in again.'},{status:401})
  const body=await request.json()
  const oldPassword=String(body.oldPassword||'')
  const newPassword=String(body.newPassword||'')
  if(!(await verifyPassword(oldPassword,worker.password_hash)))return NextResponse.json({error:'Current password is incorrect.'},{status:400})
  if(newPassword.length<8||newPassword.length>128||newPassword===worker.worker_id||newPassword===oldPassword) return NextResponse.json({error:'Use a new password of at least 8 characters, different from your Worker ID.'},{status:400})
  const hash=await hashPassword(newPassword)
  const {data,error}=await supabaseAdmin().from('workers').update({password_hash:hash,must_change_password:false,updated_at:new Date().toISOString()}).eq('id',worker.id).eq('password_hash',worker.password_hash).select('id').maybeSingle()
  if(error)throw error
  if(!data)return NextResponse.json({error:'Password was changed elsewhere. Please sign in again.'},{status:409})
  const response=NextResponse.json({ok:true})
  response.cookies.set(WORKER_COOKIE,makeWorkerToken({...worker,password_hash:hash,must_change_password:false}),workerCookieOptions)
  return response
 }catch(error){console.error('Worker password change error:',error);return NextResponse.json({error:'Could not change password.'},{status:500})}
}
