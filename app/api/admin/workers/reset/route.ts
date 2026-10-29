import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashPassword } from '@/lib/worker-auth'
export async function POST(request:Request){
 if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized'},{status:401})
 try{
  const {id}=await request.json()
  if(typeof id!=='string')return NextResponse.json({error:'Missing worker.'},{status:400})
  const db=supabaseAdmin()
  const {data,error}=await db.from('workers').select('id,worker_id').eq('id',id).maybeSingle()
  if(error||!data)return NextResponse.json({error:'Worker not found.'},{status:404})
  const password_hash=await hashPassword(data.worker_id)
  const {error:saveError}=await db.from('workers').update({password_hash,must_change_password:true,updated_at:new Date().toISOString()}).eq('id',id)
  if(saveError)throw saveError
  return NextResponse.json({ok:true})
 }catch(error){console.error(error);return NextResponse.json({error:'Could not reset password.'},{status:500})}
}
