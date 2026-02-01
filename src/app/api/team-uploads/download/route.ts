import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'

/** GET /api/team-uploads/download?path=...&filename=...
 * Streams the file from team-uploads storage with Content-Disposition: attachment.
 * Uses the user's session so RLS applies (only their team's files).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')
  const filename = searchParams.get('filename')

  if (!path || typeof path !== 'string' || path.trim() === '') {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 })
  }

  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.storage
      .from('team-uploads')
      .download(path.trim())

    if (error) {
      console.error('Team upload download error:', error)
      return NextResponse.json(
        { error: error.message || 'Download failed' },
        { status: error.message?.includes('not found') ? 404 : 403 }
      )
    }

    if (!data) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const downloadName =
      filename && filename.trim() !== ''
        ? filename.trim()
        : decodeURIComponent(path.split('/').pop() || 'download')

    const safeName = downloadName.replace(/"/g, '\\"')

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeName}"`,
      },
    })
  } catch (e) {
    console.error('Team upload download:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Download failed' },
      { status: 500 }
    )
  }
}
