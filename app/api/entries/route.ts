import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const projects = new Set(['Kingdao', 'Creative', 'Namhong'])

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const worker_id = String(body.worker_id || '').trim().slice(0, 40)
    const worker_name = String(body.worker_name || '').trim().slice(0, 100)
    const work_date = String(body.work_date || '').trim()
    const working_place = String(body.working_place || '').trim().slice(0, 120)
    const project = String(body.project || '').trim()
    const working_hours = Number(body.working_hours)

    if (!worker_id || !worker_name || !working_place || !/^\d{4}-\d{2}-\d{2}$/.test(work_date)) {
      return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 })
    }
    if (!projects.has(project)) {
      return NextResponse.json({ error: 'Invalid project.' }, { status: 400 })
    }
    if (!Number.isFinite(working_hours) || working_hours <= 0 || working_hours > 24) {
      return NextResponse.json({ error: 'Working hours must be between 0 and 24.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin()
      .from('time_entries')
      .insert({ worker_id, worker_name, work_date, working_place, project, working_hours })
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ entry: data }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Could not save working hours.' }, { status: 500 })
  }
}
