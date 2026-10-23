import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdmin } from '@/lib/admin-auth'

const projects = new Set(['Kingdao', 'Creative', 'Namhong'])

export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin()
    .from('working_places')
    .select('*')
    .order('project')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ places: data || [] })
}

export async function POST(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const project = String(body.project || '').trim()
  const name = String(body.name || '').trim()

  if (!projects.has(project) || !name) {
    return NextResponse.json(
      { error: 'Invalid project or name.' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin()
    .from('working_places')
    .insert({
      project,
      name,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ place: data })
}

export async function PATCH(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const id = String(body.id || '')
  const is_active = Boolean(body.is_active)

  const { data, error } = await supabaseAdmin()
    .from('working_places')
    .update({ is_active })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ place: data })
}

export async function DELETE(request: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const id = String(body.id || '')

  const { error } = await supabaseAdmin()
    .from('working_places')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}