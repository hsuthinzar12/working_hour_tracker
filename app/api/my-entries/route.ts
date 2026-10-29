import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getWorkerSession } from '@/lib/worker-auth'
export async function GET(request:Request){
 const worker=await getWorkerSession()
 if(!worker)return NextResponse.json({error:'Please log in.'},{status:401})
 if(worker.must_change_password)return NextResponse.json({error:'Please change your temporary password first.'},{status:403})
 try{
  const month=new URL(request.url).searchParams.get('month')||''
  let query=supabaseAdmin().from('time_entries').select('*').eq('worker_id',worker.worker_id).order('work_date',{ascending:false}).order('created_at',{ascending:false})
  if(/^\d{4}-(0[1-9]|1[0-2])$/.test(month)){
   const [year,m]=month.split('-').map(Number)
   const next=new Date(Date.UTC(year,m,1)).toISOString().slice(0,10)
   query=query.gte('work_date',`${month}-01`).lt('work_date',next)
  }
  const {data,error}=await query.limit(1000)
  if(error)throw error
  const entries=data||[]
  return NextResponse.json({entries,total_hours:entries.reduce((sum,item)=>sum+Number(item.working_hours||0),0)})
 }catch(error){console.error(error);return NextResponse.json({error:'Could not load history.'},{status:500})}
}
