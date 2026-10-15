import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const workerId = (url.searchParams.get('worker_id') || '').trim()
    const month = url.searchParams.get('month') || ''
    if (!workerId) return NextResponse.json({ entries: [], total_hours: 0 })

    let query = supabaseAdmin()
      .from('time_entries')
      .select('*')
      .eq('worker_id', workerId)
      .order('work_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (/^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNum] = month.split('-').map(Number)
      const start = `${month}-01`
      const next = new Date(Date.UTC(year, monthNum, 1)).toISOString().slice(0, 10)
      query = query.gte('work_date', start).lt('work_date', next)
    }

    const { data, error } = await query
    if (error) throw error
    const entries = data || []
    const total_hours = entries.reduce((sum, item) => sum + Number(item.working_hours || 0), 0)
    return NextResponse.json({ entries, total_hours })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Could not load history.' }, { status: 500 })
  }
}
