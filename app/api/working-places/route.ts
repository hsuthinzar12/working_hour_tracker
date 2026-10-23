import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const projects = new Set(['Kingdao', 'Creative', 'Namhong'])

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const project = String(
      url.searchParams.get('project') || ''
    ).trim()

    if (!projects.has(project)) {
      return NextResponse.json(
        { error: 'Invalid project.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin()
      .from('working_places')
      .select('id, project, name')
      .eq('project', project)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      places: data || []
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Could not load working places.' },
      { status: 500 }
    )
  }
}