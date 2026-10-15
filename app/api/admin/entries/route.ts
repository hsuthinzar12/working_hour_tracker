import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

function monthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null
  const [year, monthNum] = month.split('-').map(Number)
  return { start: `${month}-01`, next: new Date(Date.UTC(year, monthNum, 1)).toISOString().slice(0, 10) }
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const url = new URL(request.url)
    const month = url.searchParams.get('month') || ''
    const project = url.searchParams.get('project') || ''
    const place = url.searchParams.get('place') || ''
    const search = url.searchParams.get('search') || ''
    const range = monthRange(month)

    let query = supabaseAdmin().from('time_entries').select('*').order('work_date', { ascending: false }).order('created_at', { ascending: false })
    if (range) query = query.gte('work_date', range.start).lt('work_date', range.next)
    if (project) query = query.eq('project', project)
    if (place) query = query.eq('working_place', place)
    if (search) query = query.or(`worker_id.ilike.%${search.replaceAll(',', '')}%,worker_name.ilike.%${search.replaceAll(',', '')}%`)

    const { data, error } = await query.limit(5000)
    if (error) throw error
    return NextResponse.json({ entries: data || [] })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Could not load admin data.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Missing record id.' }, { status: 400 })
    const { error } = await supabaseAdmin().from('time_entries').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Could not delete record.' }, { status: 500 })
  }
}
