import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyPassword,makeWorkerToken,WORKER_COOKIE,workerCookieOptions, type Worker } from '@/lib/worker-auth'

export async function POST(request:Request){
 try{
  const body=await request.json()
  const workerId=typeof body.workerId==='string'?body.workerId.trim():''
  const password=typeof body.password==='string'?body.password:''
  if(!workerId||!password||workerId.length>60||password.length>128)return NextResponse.json({error:'Enter your Worker ID and password.'},{status:400})
  // Worker IDs are unique in the workers table; no need to search by long worker names.
  const {data,error}=await supabaseAdmin().from('workers').select('id,worker_id,worker_name,password_hash,is_active,must_change_password').eq('worker_id',workerId).eq('is_active',true).maybeSingle()
  if(error)throw error
  if(!data||!(await verifyPassword(password,data.password_hash)))return NextResponse.json({error:'Worker ID or password is incorrect.'},{status:401})
  const matched=data as Worker
  const response=NextResponse.json({worker:{name:matched.worker_name,id:matched.worker_id,must_change_password:matched.must_change_password}})
  response.cookies.set(WORKER_COOKIE,makeWorkerToken(matched),workerCookieOptions)
  return response
 }catch(error){console.error('Worker login error:',error);return NextResponse.json({error:'Could not sign in. Try again.'},{status:500})}
}
