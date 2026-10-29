import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

const projects = new Set(['Kingdao', 'Creative', 'Namhong'])

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { data, error } = await supabaseAdmin()
      .from('working_places')
      .select('*')
      .order('project', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return NextResponse.json({ places: data || [] })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Could not load working places.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const project = String(body.project || '').trim()
    const name = String(body.name || '').trim().replace(/\s+/g, ' ').slice(0, 120)

    if (!projects.has(project)) return NextResponse.json({ error: 'Invalid project.' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'Working place name is required.' }, { status: 400 })

    const { data, error } = await supabaseAdmin()
      .from('working_places')
      .insert({ project, name, is_active: true })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'This working place already exists for the selected project.' }, { status: 409 })
      throw error
    }
    return NextResponse.json({ place: data }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Could not add working place.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const id = String(body.id || '').trim()
    const is_active = Boolean(body.is_active)
    if (!id) return NextResponse.json({ error: 'Missing working place id.' }, { status: 400 })

    const { data, error } = await supabaseAdmin()
      .from('working_places')
      .update({ is_active })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ place: data })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Could not update working place.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const id = String(body.id || '').trim()
    if (!id) return NextResponse.json({ error: 'Missing working place id.' }, { status: 400 })

    const { error } = await supabaseAdmin().from('working_places').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Could not delete working place.' }, { status: 500 })
  }
}
