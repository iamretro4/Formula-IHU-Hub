import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadToDrive } from '@/lib/google-drive';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { team_id, storage_path, file_name, document_key } = body as {
      team_id?: string;
      storage_path?: string;
      file_name?: string;
      document_key?: string;
    };

    if (!team_id || !storage_path || !file_name) {
      return NextResponse.json(
        { error: 'Missing team_id, storage_path, or file_name' },
        { status: 400 }
      );
    }
    if (!storage_path.startsWith(team_id + '/')) {
      return NextResponse.json(
        { error: 'Storage path must belong to the given team' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server missing Supabase config (service role)' },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('team-uploads')
      .download(storage_path);

    if (downloadError || !fileData) {
      console.error('Supabase storage download failed:', downloadError);
      return NextResponse.json(
        { error: 'Failed to download file from storage' },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const { data: teamRow } = await supabase
      .from('teams')
      .select('name')
      .eq('id', team_id)
      .single();

    const teamName = (teamRow as { name?: string } | null)?.name ?? team_id;

    const mimeType = getMimeType(file_name);
    console.log(`[Drive sync] Uploading "${file_name}" for team "${teamName}" (${team_id})`);
    const driveResult = await uploadToDrive({
      teamId: team_id,
      teamName,
      fileBuffer: buffer,
      fileName: file_name,
      mimeType,
    });
    console.log(`[Drive sync] Success — fileId=${driveResult.fileId}, link=${driveResult.webViewLink}`);

    return NextResponse.json({ ok: true, synced: true, fileId: driveResult.fileId });
  } catch (err) {
    console.error('Sync to Drive error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync to Drive failed' },
      { status: 500 }
    );
  }
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    zip: 'application/zip',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
  };
  return map[ext ?? ''] ?? 'application/octet-stream';
}
