import { NextResponse } from 'next/server'
import { getWorkerSession } from '@/lib/worker-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const projects = new Set(['Kingdao','Creative','Namhong'])

export async function GET(request:Request){
  const worker=await getWorkerSession()
  if(!worker)return NextResponse.json({error:'Please log in.'},{status:401})
  if(worker.must_change_password)return NextResponse.json({error:'Please change your password first.'},{status:403})
  try{
    const params=new URL(request.url).searchParams
    const date=String(params.get('date')||'')
    const project=String(params.get('project')||'')
    const working_place=String(params.get('working_place')||'')
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!projects.has(project)||!working_place||working_place.length>120){
      return NextResponse.json({error:'Invalid date, project, or working place.'},{status:400})
    }
    const {data,error}=await supabaseAdmin().from('time_entries')
      .select('id,project,working_place,working_hours')
      .eq('worker_id',worker.worker_id).eq('work_date',date).limit(100)
    if(error)throw error
    const entries=data||[]
    return NextResponse.json({
      duplicate: entries.some(x=>x.project===project&&x.working_place===working_place),
      same_day_entries: entries,
    })
  }catch(error){
    console.error('Duplicate check error:',error)
    return NextResponse.json({error:'Could not check existing hours.'},{status:500})
  }
}
