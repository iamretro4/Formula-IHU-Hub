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
  ExternalLink
} from "lucide-react"
import getSupabaseClient from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'

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

type UserProfile = {
  id: string
  team_id: string | null
  app_role: string | null
  team?: {
    vehicle_class: string
  }
}

type UploadedFile = {
  id: string
  team_id: string
  uploaded_by: string
  document_key: string
  file_name: string
  storage_path: string
  uploaded_at: string
}

type DocumentSpec = {
  key: string
  label: string
  classes: string[]
  allowedTypes: string[]
  deadline: string
  submission: string
  format: string
  fileSize: string
}

const documents: DocumentSpec[] = [
  { key: 'bpefs', label: 'Business Plan Executive & Financial Summary (BPEFS)', classes: ['EV', 'CV'], allowedTypes: ['application/pdf'], deadline: '25/05/2026 14:00:00', submission: 'Formula IHU Portal', format: '.pdf', fileSize: '' },
  { key: 'tvsd', label: 'Technical Vehicle System Documentation (TVSD)', classes: ['EV', 'CV'], allowedTypes: ['application/pdf'], deadline: '25/05/2026 14:00:00', submission: 'Formula IHU Portal', format: '.pdf', fileSize: '50MB' },
  { key: 'esoq', label: 'Electrical System Officer Qualification (ESOQ)', classes: ['EV', 'CV'], allowedTypes: ['application/pdf'], deadline: '02/06/2026 23:59:59', submission: 'Formula IHU Portal', format: '.pdf', fileSize: '50MB' },
  { key: 'tmd', label: 'Team Member Designation (TMD)', classes: ['EV', 'CV'], allowedTypes: [], deadline: '02/07/2026 23:59:59', submission: 'Formula IHU Portal', format: '', fileSize: '' },
  { key: 'vsv', label: 'Vehicle Status Video (VSV)', classes: ['EV', 'CV'], allowedTypes: ['text/plain'], deadline: '02/07/2026 23:59:59', submission: 'Formula IHU Portal', format: 'Youtube Link', fileSize: '50MB' },
  { key: 'crd', label: 'Cost Report Documents (CRD)', classes: ['EV', 'CV'], allowedTypes: ['application/zip'], deadline: '15/07/2026 23:59:59', submission: 'Formula IHU Portal', format: '.zip', fileSize: '50MB' },
]

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
  const { user: authUser, loading: authLoading } = useAuth();
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseClient> | null>(null);

  // Initialize supabase client safely
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

  // Upload-related state
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teamClass, setTeamClass] = useState('EV');
  const [uploadFiles, setUploadFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // Redirect if not authenticated - but wait for AuthContext to finish loading
  useEffect(() => {
    if (!authLoading && !authUser) {
      // Redirect to signin if not authenticated
      router.replace('/auth/signin')
    }
  }, [authUser, authLoading, router])

  useEffect(() => {
    // Don't load data if not authenticated
    if (!authUser) return;

    fetchAnnouncements().then(setAnnouncements);
    fetchTodaysSchedule().then(setSchedule);
    setStats({ teams: 37, vehicles: 20, events: 12, activeSessions: 4 });

    // Use authUser directly instead of calling getUser again
    setUser(authUser);
  }, [authUser]);

  const fetchUploadedFiles = useCallback(async (teamId: string | null) => {
    if (!teamId || !supabase) {
      setUploadedFiles([]);
      return;
    }
    try {
      const { data } = await supabase
        .from('team_uploads' as any)
        .select('*, uploaded_by (first_name, last_name)')
        .eq('team_id', teamId)
        .order('uploaded_at', { ascending: false });
      setUploadedFiles((data ?? []) as unknown as UploadedFile[]);
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
      setUploadedFiles([]);
    }
  }, [supabase]);

  useEffect(() => {
    async function fetchProfileAndUploads() {
      if (!user || !supabase) return;

      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('*, team_id, team:teams(vehicle_class)')
          .eq('id', user.id)
          .single() as { data: any }

        setProfile(data);
        setTeamClass(data?.team?.vehicle_class ?? 'EV');
        await fetchUploadedFiles(data?.team_id ?? null);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    }
    fetchProfileAndUploads();
  }, [user, supabase, fetchUploadedFiles]);

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
    if (!uploadFiles[docKey] || !profile?.team_id || !supabase) {
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
    const docSpec = documents.find(d => d.key === docKey);
    const maxBytes = docSpec?.fileSize === '50MB' ? 50 * 1024 * 1024 : undefined;
    if (maxBytes != null && file.size > maxBytes) {
      toast.error(`File size must be at most 50MB. Your file is ${formatFileSize(file.size)}.`);
      return;
    }
    const safeFileName = sanitizeFileName(file.name);
    const path = `${profile.team_id}/${docKey}/${safeFileName}`;

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
      if (!profile.team_id) {
        toast.error('You must be assigned to a team to upload files', { id: uploadToast });
        setUploading(u => ({ ...u, [docKey]: false }));
        return;
      }

              const { error: metaError } = await supabase.from('team_uploads' as any).upsert(
        {
          team_id: profile.team_id,
          uploaded_by: user.id,
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
        await fetchUploadedFiles(profile.team_id);
        setUploadFiles(f => ({ ...f, [docKey]: null }));
        // Sync to Google Drive (fire-and-forget; each team has its own subfolder)
        fetch('/api/sync-upload-to-drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_id: profile.team_id,
            storage_path: path,
            file_name: file.name,
            document_key: docKey,
          }),
        }).catch(() => {});
      }
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: uploadToast });
    } finally {
      setUploading(u => ({ ...u, [docKey]: false }));
    }
  }

  async function downloadFile(storagePath: string) {
    if (!supabase) {
      toast.error('Connection not available');
      return;
    }
    const { data, error } = await supabase.storage.from('team-uploads').download(storagePath);
    if (error) {
      toast.error(`Download failed: ${error.message}`);
      return;
    }
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = storagePath.split('/').pop() || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function uploadedFile(docKey: string): UploadedFile | null {
    return uploadedFiles.find(f => f.document_key === docKey) || null;
  }

  const canUpload = user && (
    !profile?.app_role || profile?.app_role === 'team_leader' || profile?.app_role === 'team_member' || profile?.app_role === 'admin'
  );

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

      {/* Uploads Section (admins and team leaders/members) */}
      {canUpload && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 pb-3 border-b-2 border-gray-200">
            <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl shadow-md ring-2 ring-primary/10">
              <CloudUpload className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Upload Required Documents</h2>
              <p className="text-sm text-gray-600 mt-1">Upload your team&rsquo;s required documentation</p>
            </div>
          </div>

          {/* Document requirements table: Document | EV | CV | Deadline | Submission | Format | File Size */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Document</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">EV</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">CV</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Deadline</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Submission</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Format</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">File Size</th>
                </tr>
              </thead>
              <tbody>
                {documents
                  .filter(doc => !teamClass || doc.classes.includes(teamClass))
                  .map((doc, idx) => (
                    <tr
                      key={doc.key}
                      className={`border-b border-gray-100 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{doc.label}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center text-primary" title="Expert Verification">
                          <CheckCircle2 className="w-5 h-5" />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center text-primary" title="Committee Verification">
                          <CheckCircle2 className="w-5 h-5" />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{doc.deadline}</td>
                      <td className="px-4 py-3">
                        <a
                          href="#"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                          onClick={(e) => { e.preventDefault(); }}
                        >
                          {doc.submission}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                      <td className={`px-4 py-3 ${doc.format === '.pdf' ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                        {doc.format || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{doc.fileSize || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents
              .filter(doc => !teamClass || doc.classes.includes(teamClass))
              .map(doc => {
                const uploaded = uploadedFile(doc.key);
                const file = uploadFiles[doc.key];
                const isUploading = uploading[doc.key];
                const isDraggedOver = dragOver === doc.key;
                const fileInputId = `file-input-${doc.key}`;
                
                return (
                  <Card 
                    key={doc.key} 
                    className={`transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                      isDraggedOver ? 'ring-2 ring-primary ring-offset-2 bg-primary/5 scale-[1.02]' : ''
                    } ${uploaded ? 'border-green-300 bg-green-50/50 shadow-sm' : 'border-gray-200'}`}
                    onDragOver={(e) => handleDragOver(e, doc.key)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, doc.key)}
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
                      {/* File Input Area */}
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
                            <div className="flex flex-col items-center gap-2">
                              {getFileIcon(file.name)}
                              <span className="text-sm font-medium text-gray-700 text-center px-2 truncate max-w-full">
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

                        {/* Upload Button */}
                        <Button
                          disabled={isUploading}
                          onClick={() => {
                            if (!file) {
                              // If no file selected, trigger file input
                              document.getElementById(fileInputId)?.click();
                            } else {
                              // If file selected, upload it
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

                        {/* Remove File Button */}
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

                      {/* Uploaded File Display */}
                      {uploaded && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {uploaded.file_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Uploaded {new Date(uploaded.uploaded_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => downloadFile(uploaded.storage_path)}
                              className="flex-shrink-0"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
          </div>
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
