'use client'

import { useCallback, useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import {
  Megaphone,
  CalendarDays,
  Clock,
  Users2,
  Trophy,
  Flag,
  BarChart3,
  Download,
  Upload,
  FileText,
  File,
  CheckCircle2,
  X,
  Loader2,
  CloudUpload,
  FileCheck,
  ExternalLink,
  ShieldAlert
} from "lucide-react"
import getSupabaseClient from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useTeamUploads, type UploadedFile } from '@/hooks/useTeamUploads'
import { DASHBOARD_DOCUMENTS } from '@/lib/data/dashboard-documents'
import { DocumentUploadTable } from './DocumentUploadTable'

type Announcement = {
  id: number
  message: string
}

type ScheduleEntry = {
  time: string
  event: string
  icon: React.ReactNode
}

type Stats = {
  teams: number
  vehicles: number
  events: number
  activeSessions: number
}

const fetchAnnouncements = async (): Promise<Announcement[]> => [
  { id: 1, message: "Technical Inspection starts at 08:30." },
  { id: 2, message: "Driver's meeting at 09:00 near the paddock tent." },
  { id: 3, message: "Today's weather is sunny, 24°C." }
];

const fetchTodaysSchedule = async (): Promise<ScheduleEntry[]> => [
  { time: "08:30", event: "Technical Inspection", icon: <Flag className="text-green-500" /> },
  { time: "09:00", event: "Driver's Meeting", icon: <Users2 className="text-blue-500" /> },
  { time: "10:30", event: "Dynamic Events Begin", icon: <Trophy className="text-yellow-500" /> }
];

function sanitizeFileName(name: string) {
  return encodeURIComponent(name);
}

export default function DashboardPage() {
  const router = useRouter();
  const { user: authUser, profile: authProfile, loading: authLoading } = useAuth();
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseClient> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        setSupabase(getSupabaseClient());
      } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
      }
    }
  }, []);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ teams: 37, vehicles: 20, events: 12, activeSessions: 4 });

  const [uploadFiles, setUploadFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [vsvLinkUrl, setVsvLinkUrl] = useState('');
  const [vsvSaving, setVsvSaving] = useState(false);

  const { uploadedFiles, teamClass, refetch: fetchUploadedFiles } = useTeamUploads(authProfile?.team_id ?? null, supabase);

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace('/auth/signin');
    }
  }, [authUser, authLoading, router]);

  useEffect(() => {
    if (!authUser) return;
    fetchAnnouncements().then(setAnnouncements);
    fetchTodaysSchedule().then(setSchedule);
  }, [authUser]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, docKey: string) {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadFiles(f => ({ ...f, [docKey]: files[0] }));
    }
  }

  function handleDragOver(e: React.DragEvent, docKey: string) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(docKey);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
  }

  function handleDrop(e: React.DragEvent, docKey: string) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setUploadFiles(f => ({ ...f, [docKey]: files[0] }));
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  function getFileIcon(fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(ext || '')) return <FileText className="w-5 h-5 text-red-500" />;
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return <FileText className="w-5 h-5 text-green-500" />;
    if (['zip', 'rar', '7z'].includes(ext || '')) return <File className="w-5 h-5 text-purple-500" />;
    if (['mp4', 'avi', 'mov', 'wmv'].includes(ext || '')) return <File className="w-5 h-5 text-blue-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  }

  async function uploadFile(docKey: string) {
    if (!uploadFiles[docKey] || !authProfile?.team_id || !supabase) {
      toast.error('Please select a file first');
      return;
    }

    // Validate user with server
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      toast.error('You must be signed in to upload files');
      return;
    }

    const file = uploadFiles[docKey]!;
    const docSpec = DASHBOARD_DOCUMENTS.find(d => d.key === docKey);
    const maxBytes = docSpec?.fileSize === '50MB' ? 50 * 1024 * 1024 : undefined;
    if (maxBytes != null && file.size > maxBytes) {
      toast.error(`File size must be at most 50MB. Your file is ${formatFileSize(file.size)}.`);
      return;
    }
    const safeFileName = sanitizeFileName(file.name);
    const path = `${authProfile.team_id}/${docKey}/${safeFileName}`;

    setUploading(u => ({ ...u, [docKey]: true }));
    const uploadToast = toast.loading(`Uploading ${file.name}...`);

    try {
      const { error: uploadError } = await supabase.storage
        .from('team-uploads')
        .upload(path, file, {
          upsert: true,
        });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`, { id: uploadToast });
        setUploading(u => ({ ...u, [docKey]: false }));
        return;
      }

      // Ensure we have a valid team_id
      if (!authProfile.team_id) {
        toast.error('You must be assigned to a team to upload files', { id: uploadToast });
        setUploading(u => ({ ...u, [docKey]: false }));
        return;
      }

              const { error: metaError } = await supabase.from('team_uploads' as any).upsert(
        {
          team_id: authProfile.team_id,
          uploaded_by: authUser!.id,
          document_key: docKey,
          file_name: file.name,
          storage_path: path,
          uploaded_at: new Date().toISOString(),
        } as any,
        { onConflict: 'team_id,document_key' }
      );

      if (metaError) {
        toast.error(`Metadata update failed: ${metaError.message}`, { id: uploadToast });
      } else {
        toast.success('Upload successful!', { id: uploadToast });
        await fetchUploadedFiles();
        setUploadFiles(f => ({ ...f, [docKey]: null }));
        // Sync to Google Drive (background; each team has its own subfolder)
        fetch('/api/sync-upload-to-drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_id: authProfile.team_id,
            storage_path: path,
            file_name: file.name,
            document_key: docKey,
          }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              console.error('Drive sync failed:', res.status, body);
            }
          })
          .catch((err) => {
            console.error('Drive sync network error:', err);
          });
      }
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: uploadToast });
    } finally {
      setUploading(u => ({ ...u, [docKey]: false }));
    }
  }

  async function saveVsvLink() {
    const url = vsvLinkUrl.trim();
    if (!url) {
      toast.error('Please enter a YouTube link');
      return;
    }
    if (!supabase || !authUser || !authProfile?.team_id) {
      toast.error('Unable to save: missing session or team');
      return;
    }
    setVsvSaving(true);
    const saveToast = toast.loading('Saving YouTube link...');
    try {
      const { error } = await supabase.from('team_uploads' as any).upsert(
        {
          team_id: authProfile.team_id,
          uploaded_by: authUser!.id,
          document_key: 'vsv',
          file_name: url,
          storage_path: `${authProfile.team_id}/vsv/link`,
          uploaded_at: new Date().toISOString(),
        } as any,
        { onConflict: 'team_id,document_key' }
      );
      if (error) {
        toast.error(`Failed to save link: ${error.message}`, { id: saveToast });
      } else {
        toast.success('YouTube link saved', { id: saveToast });
        setVsvLinkUrl('');
        await fetchUploadedFiles();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save link', { id: saveToast });
    } finally {
      setVsvSaving(false);
    }
  }

  function downloadFile(storagePath: string, fileName?: string) {
    const params = new URLSearchParams({ path: storagePath });
    if (fileName?.trim()) params.set('filename', fileName.trim());
    const url = `/api/team-uploads/download?${params.toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function uploadedFile(docKey: string): UploadedFile | null {
    return uploadedFiles.find(f => f.document_key === docKey) || null;
  }

  const canUpload = authUser && (
    authProfile?.app_role === 'team_leader' || authProfile?.app_role === 'admin'
  );

  const isTeamMember = authUser && authProfile?.app_role === 'team_member';

  // Team members can view the documents section (status + downloads) but not upload
  const canViewDocuments = canUpload || isTeamMember;

  // Show loading or nothing if not authenticated
  // Add timeout to prevent infinite loading
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  useEffect(() => {
    if (authLoading) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 3000); // 3 second timeout
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [authLoading]);

  if (authLoading && !loadingTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authUser && !authLoading) {
    // Show loading while redirecting
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 bg-gradient-to-br from-gray-50 via-white to-gray-50/50 min-h-screen animate-fade-in">
      {/* Welcome and Quick Stats */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
              Welcome back! 👋
            </h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base md:text-lg">
              Stay up to date with live announcements and today&rsquo;s racing schedule.
            </p>
          </div>
        </div>
        {/* Temporarily hidden: counters
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard label="Teams" value={stats.teams} icon={<Users2 className="w-6 h-6 text-primary" />} bg="bg-gradient-to-br from-primary/10 to-primary/5" borderColor="border-primary/20" />
          <StatsCard label="Vehicles" value={stats.vehicles} icon={<Flag className="w-6 h-6 text-green-600" />} bg="bg-gradient-to-br from-green-50 to-green-100/50" borderColor="border-green-200" />
          <StatsCard label="Events" value={stats.events} icon={<BarChart3 className="w-6 h-6 text-amber-600" />} bg="bg-gradient-to-br from-amber-50 to-amber-100/50" borderColor="border-amber-200" />
          <StatsCard label="Active Sessions" value={stats.activeSessions} icon={<Clock className="w-6 h-6 text-blue-600" />} bg="bg-gradient-to-br from-blue-50 to-blue-100/50" borderColor="border-blue-200" />
        </div>
        */}
      </div>

      {/* Uploads Section (admins, team leaders, and team members for viewing) */}
      {canViewDocuments && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 pb-3 border-b-2 border-gray-200">
            <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl shadow-md ring-2 ring-primary/10">
              <CloudUpload className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {canUpload ? 'Upload Required Documents' : 'Required Documents'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {canUpload
                  ? "Upload your team\u2019s required documentation"
                  : "View your team\u2019s document submission status"}
              </p>
            </div>
          </div>

          {/* Notice for team members */}
          {isTeamMember && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Upload restricted to Team Leaders</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Only team leaders can upload or update documents. Contact your team leader if a document needs to be submitted or replaced.
                </p>
              </div>
            </div>
          )}

          <DocumentUploadTable
            documents={DASHBOARD_DOCUMENTS}
            teamClass={teamClass}
            uploadedByKey={Object.fromEntries(
              DASHBOARD_DOCUMENTS.map(d => [d.key, uploadedFile(d.key)])
            )}
            onDownload={(path, fileName) => downloadFile(path, fileName)}
          />

          {canUpload && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DASHBOARD_DOCUMENTS
              .filter(doc => !teamClass || doc.classes.includes(teamClass))
              .map(doc => {
                const uploaded = uploadedFile(doc.key);
                const file = uploadFiles[doc.key];
                const isUploading = uploading[doc.key];
                const isDraggedOver = dragOver === doc.key;
                const fileInputId = `file-input-${doc.key}`;
                
                const isVsv = doc.key === 'vsv';
                return (
                  <Card 
                    key={doc.key} 
                    className={`transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                      !isVsv && isDraggedOver ? 'ring-2 ring-primary ring-offset-2 bg-primary/5 scale-[1.02]' : ''
                    } ${uploaded ? 'border-green-300 bg-green-50/50 shadow-sm' : 'border-gray-200'}`}
                    onDragOver={isVsv ? undefined : (e) => handleDragOver(e, doc.key)}
                    onDragLeave={isVsv ? undefined : handleDragLeave}
                    onDrop={isVsv ? undefined : (e) => handleDrop(e, doc.key)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        {uploaded ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <FileText className="w-5 h-5 text-gray-400" />
                        )}
                        {doc.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isVsv ? (
                        /* VSV: YouTube link input */
                        <div className="space-y-3">
                          <input
                            type="url"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={vsvLinkUrl}
                            onChange={e => setVsvLinkUrl(e.target.value)}
                            disabled={vsvSaving}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                          />
                          <Button
                            disabled={vsvSaving || !vsvLinkUrl.trim()}
                            onClick={saveVsvLink}
                            className="w-full"
                            variant="default"
                          >
                            {vsvSaving ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                Save YouTube link
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        /* File Input Area */
                        <div className="space-y-3">
                          <label
                            htmlFor={fileInputId}
                            className={`
                              relative flex flex-col items-center justify-center w-full h-32 
                              border-2 border-dashed rounded-lg cursor-pointer
                              transition-all duration-200
                              ${isDraggedOver 
                                ? 'border-primary bg-primary/5' 
                                : file 
                                  ? 'border-green-300 bg-green-50' 
                                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                              }
                              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                          >
                            <input
                              id={fileInputId}
                              type="file"
                              disabled={isUploading}
                              accept={doc.allowedTypes.length > 0 ? doc.allowedTypes.join(',') : undefined}
                              onChange={e => handleFileChange(e, doc.key)}
                              className="hidden"
                            />
                            {file ? (
                              <div className="flex flex-col items-center gap-2 w-full min-w-0 px-2">
                                {getFileIcon(file.name)}
                                <span
                                  className="text-sm font-medium text-gray-700 text-center truncate w-full min-w-0"
                                  title={file.name}
                                >
                                  {file.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatFileSize(file.size)}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                <Upload className={`w-8 h-8 ${isDraggedOver ? 'text-primary' : 'text-gray-400'}`} />
                                <div className="text-center">
                                  <span className="text-sm font-medium text-gray-700">
                                    Click to upload or drag and drop
                                  </span>
                                  {doc.allowedTypes.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Accepted: {doc.allowedTypes.map(t => t.split('/').pop()).join(', ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </label>

                          <Button
                            disabled={isUploading}
                            onClick={() => {
                              if (!file) {
                                document.getElementById(fileInputId)?.click();
                              } else {
                                uploadFile(doc.key);
                              }
                            }}
                            className="w-full"
                            variant={uploaded ? "outline" : file ? "default" : "secondary"}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Uploading...
                              </>
                            ) : file ? (
                              <>
                                <Upload className="w-4 h-4" />
                                Upload File
                              </>
                            ) : (
                              <>
                                <File className="w-4 h-4" />
                                Select File
                              </>
                            )}
                          </Button>

                          {file && !isUploading && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUploadFiles(f => ({ ...f, [doc.key]: null }))}
                              className="w-full text-gray-600 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                              Remove File
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Uploaded File Display */}
                      {uploaded && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border border-green-200 min-w-0">
                            <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                              <FileCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <p className="text-sm font-medium text-gray-900 truncate" title={uploaded.file_name}>
                                  {uploaded.file_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {isVsv ? 'Link saved' : 'Uploaded'} {new Date(uploaded.uploaded_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {isVsv ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(uploaded.file_name, '_blank', 'noopener,noreferrer')}
                                className="flex-shrink-0"
                                title="Open link"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => downloadFile(uploaded.storage_path, uploaded.file_name)}
                                className="flex-shrink-0"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
          </div>
          )}
        </div>
      )}

      {/* Temporarily hidden: Live Announcements and Today's Schedule
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-4 bg-gradient-to-r from-orange-50/50 to-transparent border-b border-gray-100">
            <SectionHeader icon={<Megaphone className="w-6 h-6 text-orange-500" />} title="Live Announcements" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {announcements.length === 0 ? (
                <div className="text-gray-400 text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Megaphone className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Nothing to announce yet.</p>
                </div>
              ) : (
                announcements.map(a => (
                  <div key={a.id} className="flex items-start gap-4 bg-gradient-to-r from-orange-50 via-orange-50/80 to-orange-50/50 rounded-xl px-5 py-4 shadow-sm border border-orange-200/60 hover:shadow-md hover:border-orange-300 transition-all duration-200 group animate-fade-in">
                    <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="font-medium text-gray-800 leading-relaxed pt-1">{a.message}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-gray-100">
            <SectionHeader icon={<CalendarDays className="w-6 h-6 text-primary" />} title="Today's Schedule" />
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {schedule.length === 0 ? (
                <div className="text-gray-400 text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No events scheduled for today.</p>
                </div>
              ) : (
                schedule.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-4 bg-gradient-to-r from-primary/5 via-primary/5 to-primary/5 rounded-xl px-5 py-4 shadow-sm border border-primary/20 hover:shadow-md hover:border-primary/30 transition-all duration-200 group animate-fade-in">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors flex-shrink-0">
                      {entry.icon}
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-lg text-primary block mb-1">{entry.time}</span>
                      <span className="font-medium text-gray-700">{entry.event}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      */}
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <h3 className="font-bold text-xl text-gray-900">{title}</h3>
    </div>
  )
}

function StatsCard({ label, value, icon, bg, borderColor }: { label: string, value: number, icon: React.ReactNode, bg: string, borderColor?: string }) {
  return (
    <Card className={`${bg} border ${borderColor || 'border-gray-200'} shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.03] group`}>
      <CardContent className="p-5">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-3 transform group-hover:scale-110 transition-transform duration-300">{icon}</div>
          <div className="font-bold text-3xl text-gray-900 mb-1">{value}</div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</div>
        </div>
      </CardContent>
    </Card>
  )
}
