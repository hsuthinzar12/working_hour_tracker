import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashPassword,loginName } from '@/lib/worker-auth'

export async function GET(){
 if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized'},{status:401})
 try{
  const {data,error}=await supabaseAdmin().from('workers').select('id,worker_id,worker_name,is_active,must_change_password').order('worker_name').limit(2000)
  if(error)throw error
  return NextResponse.json({workers:data||[]})
 }catch(error){console.error(error);return NextResponse.json({error:'Could not load workers.'},{status:500})}
}
export async function POST(request:Request){
 if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized'},{status:401})
 try{
  const body=await request.json()
  // Single-worker creation from the manual form. CSV batch imports retain their existing behavior.
  if(body?.worker){
   if(typeof body.worker.id!=='string'||typeof body.worker.name!=='string')return NextResponse.json({error:'Enter a worker name and ID.'},{status:400})
   const worker_id=body.worker.id.trim()
   const worker_name=body.worker.name.trim().replace(/\s+/g,' ')
   if(!worker_id||!worker_name)return NextResponse.json({error:'Worker name and ID are required.'},{status:400})
   if(worker_id.length>60||worker_name.length>120)return NextResponse.json({error:'Worker ID must be 60 characters or fewer; name must be 120 characters or fewer.'},{status:400})
   const password_hash=await hashPassword(worker_id)
   const {data,error}=await supabaseAdmin().from('workers').insert({
    worker_id,worker_name,login_name:loginName(worker_name),password_hash,
    is_active:true,must_change_password:true
   }).select('id,worker_id,worker_name,is_active,must_change_password').single()
   if(error){
    if(error.code==='23505')return NextResponse.json({error:'This Worker ID already exists. Use a different ID or edit the existing account.'},{status:409})
    throw error
   }
   return NextResponse.json({ok:true,worker:data},{status:201})
  }
  const input=body.workers as Array<{id:string;name:string}>
  if(!Array.isArray(input)||input.length<1||input.length>25)return NextResponse.json({error:'Send between 1 and 25 workers per batch.'},{status:400})
  const workers=input.map(x=>({worker_id:String(x.id||'').trim().slice(0,60),worker_name:String(x.name||'').trim().replace(/\s+/g,' ').slice(0,120)}))
  if(workers.some(x=>!x.worker_id||!x.worker_name)||new Set(workers.map(x=>x.worker_id)).size!==workers.length)return NextResponse.json({error:'Each worker must have a unique ID and a name.'},{status:400})
  const db=supabaseAdmin()
  const {data:existing,error:lookupError}=await db.from('workers').select('worker_id,password_hash,is_active,must_change_password').in('worker_id',workers.map(x=>x.worker_id))
  if(lookupError)throw lookupError
  const byId=new Map((existing||[]).map(x=>[x.worker_id,x]))
  const rows=[]
  for(const worker of workers){
   const old=byId.get(worker.worker_id)
   rows.push({worker_id:worker.worker_id,worker_name:worker.worker_name,login_name:loginName(worker.worker_name),password_hash:old?.password_hash||(await hashPassword(worker.worker_id)),is_active:old?.is_active??true,must_change_password:old?.must_change_password??true,updated_at:new Date().toISOString()})
  }
  const {error}=await db.from('workers').upsert(rows,{onConflict:'worker_id'})
  if(error)throw error
  return NextResponse.json({ok:true,count:workers.length,created:workers.length-(existing||[]).length})
 }catch(error){console.error(error);return NextResponse.json({error:'Could not import workers.'},{status:500})}
}
export async function PATCH(request:Request){
 if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized'},{status:401})
 try{
  const body=await request.json()
  if(typeof body.id!=='string'||typeof body.is_active!=='boolean')return NextResponse.json({error:'Invalid request.'},{status:400})
  const {error}=await supabaseAdmin().from('workers').update({is_active:body.is_active,updated_at:new Date().toISOString()}).eq('id',body.id)
  if(error)throw error
  return NextResponse.json({ok:true})
 }catch(error){console.error(error);return NextResponse.json({error:'Could not update worker.'},{status:500})}
}

// Delete the worker's login account only. Time entries are stored independently
// by worker_id/worker_name and must be kept for history, reports and exports.
export async function DELETE(request:Request){
 if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized'},{status:401})
 try{
  const body=await request.json()
  if(typeof body?.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(body.id))return NextResponse.json({error:'Invalid worker account ID.'},{status:400})
  const {data,error}=await supabaseAdmin().from('workers').delete().eq('id',body.id).select('id').maybeSingle()
  if(error)throw error
  if(!data)return NextResponse.json({error:'Worker not found. It may already have been removed.'},{status:404})
  return NextResponse.json({ok:true})
 }catch(error){console.error(error);return NextResponse.json({error:'Could not delete worker account.'},{status:500})}
}
