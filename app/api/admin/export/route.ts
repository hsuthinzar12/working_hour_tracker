import { isAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

function csvCell(value: unknown) {
  const s = String(value ?? '')
  return `"${s.replaceAll('"', '""')}"`
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response('Unauthorized', { status: 401 })
  const url = new URL(request.url)
  const month = url.searchParams.get('month') || ''
  let query = supabaseAdmin().from('time_entries').select('*').order('work_date', { ascending: true })
  if (/^\d{4}-\d{2}$/.test(month)) {
    const [year, monthNum] = month.split('-').map(Number)
    const next = new Date(Date.UTC(year, monthNum, 1)).toISOString().slice(0, 10)
    query = query.gte('work_date', `${month}-01`).lt('work_date', next)
  }
  const { data, error } = await query.limit(10000)
  if (error) return new Response('Could not export', { status: 500 })
  const header = ['Date','Worker ID','Worker Name','Working Place','Project','Working Hours']
  const lines = [header.map(csvCell).join(',')]
  for (const x of data || []) {
    lines.push([x.work_date,x.worker_id,x.worker_name,x.working_place,x.project,x.working_hours].map(csvCell).join(','))
  }
  return new Response('\uFEFF' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="Working_Hour_Report_${month || 'All'}.csv"`
    }
  })
}
