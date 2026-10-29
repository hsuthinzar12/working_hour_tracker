import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getWorkerSession } from '@/lib/worker-auth'
const projects=new Set(['Kingdao','Creative','Namhong'])
export async function POST(request:Request){
 const worker=await getWorkerSession()
 if(!worker)return NextResponse.json({error:'Please log in.'},{status:401})
 if(worker.must_change_password)return NextResponse.json({error:'Please change your temporary password first.'},{status:403})
 try{
  const body=await request.json()
  const work_date=String(body.work_date||'').trim()
  const working_place=String(body.working_place||'').trim().slice(0,120)
  const project=String(body.project||'').trim()
  const working_hours=Number(body.working_hours)
  if(!/^\d{4}-\d{2}-\d{2}$/.test(work_date)||!working_place||!projects.has(project))return NextResponse.json({error:'Please complete required fields.'},{status:400})
  if(!Number.isFinite(working_hours)||working_hours<=0||working_hours>24)return NextResponse.json({error:'Working hours must be between 0 and 24.'},{status:400})
  const {data:place,error:placeError}=await supabaseAdmin().from('working_places').select('id').eq('project',project).eq('name',working_place).eq('is_active',true).maybeSingle()
  if(placeError)throw placeError
  if(!place)return NextResponse.json({error:'This working place is not available for the selected project.'},{status:400})
  // Reject an existing entry for the same worker/date/project/place.
  // Workers may still log separate sites or projects on the same date.
  const {data:existing,error:lookupError}=await supabaseAdmin()
    .from('time_entries').select('id')
    .eq('worker_id',worker.worker_id).eq('work_date',work_date)
    .eq('project',project).eq('working_place',working_place).limit(1)
  if(lookupError)throw lookupError
  if(existing?.length)return NextResponse.json({error:'Hours for this date, project and working place were already submitted. Please check History.'},{status:409})
  const {data,error}=await supabaseAdmin().from('time_entries').insert({worker_id:worker.worker_id,worker_name:worker.worker_name,work_date,working_place,project,working_hours}).select('*').single()
  if(error){
    if(error.code==='23505')return NextResponse.json({error:'This work entry has already been submitted.'},{status:409})
    throw error
  }
  return NextResponse.json({entry:data},{status:201})
 }catch(error){console.error(error);return NextResponse.json({error:'Could not save working hours.'},{status:500})}
}
