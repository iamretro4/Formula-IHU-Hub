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
  ShieldAlert,
  Zap,
  LayoutDashboard
} from "lucide-react"
import getSupabaseClient from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  evTeams: number
  cvTeams: number
}

type TeamInfo = {
  name: string
  university: string
  vehicle_number: number | null
  vehicle_class: 'EV' | 'CV'
}


const fetchTodaysSchedule = async (): Promise<ScheduleEntry[]> => [
  { time: "08:30", event: "Technical Inspection", icon: <Flag className="text-green-500" /> },
  { time: "09:00", event: "Driver's Meeting", icon: <Users2 className="text-blue-500" /> },
  { time: "10:30", event: "Dynamic Events Begin", icon: <Trophy className="text-yellow-500" /> }
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

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
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ evTeams: 0, cvTeams: 0 });
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);

  const [uploadFiles, setUploadFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [vsvSaving, setVsvSaving] = useState(false);

  const { uploadedFiles, teamClass, refetch: fetchUploadedFiles } = useTeamUploads(authProfile?.team_id ?? null, supabase);

  // Derive dynamic announcements from document deadlines
  const upcomingDeadlines = DASHBOARD_DOCUMENTS
    .filter(doc => !teamClass || doc.classes.includes(teamClass))
    .map(doc => ({
      ...doc,
      dateObj: (() => {
        try {
          const [datePart, timePart] = doc.deadline.split(' ');
          const [day, month, year] = datePart.split('/').map(Number);
          const [hours, minutes, seconds] = timePart.split(':').map(Number);
          return new Date(year, month - 1, day, hours, minutes, seconds);
        } catch (e) { return new Date(8640000000000000); }
      })()
    }))
    .filter(doc => doc.dateObj > new Date() && !uploadedFiles.some(f => f.document_key === doc.key))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
    .slice(0, 2);

  const deadlineAnnouncements = upcomingDeadlines.map(doc => ({
    id: doc.key,
    message: `Upcoming: ${doc.label.split('(')[0].trim()} due ${doc.deadline.split(' ')[0]}`
  }));

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace('/auth/signin');
    }
  }, [authUser, authLoading, router]);

  useEffect(() => {
    if (!authUser || !supabase) return;
    // We can still fetch other announcements if needed, but we'll prioritize deadlines
    fetchTodaysSchedule().then(setSchedule);

    // Fetch team information and competition stats
    const fetchDashboardData = async () => {
      try {
        // 1. Fetch current user's team information
        if (authProfile?.team_id) {
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('name, university, vehicle_number, vehicle_class')
            .eq('id', authProfile.team_id)
            .single();
          
          if (!teamError && teamData) {
            setTeamInfo(teamData as TeamInfo);
          }
        }

        // 2. Fetch competition stats
        const { data: allTeams, error: allTeamsError } = await supabase
          .from('teams')
          .select('vehicle_class, name');
        
        if (!allTeamsError && allTeams) {
          const filteredTeams = allTeams.filter(t => t.name !== 'Marseille Racing' && t.name !== 'Marsaille Racing');
          const evCount = filteredTeams.filter(t => t.vehicle_class === 'EV').length;
          const cvCount = filteredTeams.filter(t => t.vehicle_class === 'CV').length;
          setStats({ evTeams: evCount, cvTeams: cvCount });
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };

    fetchDashboardData();
  }, [authUser, authProfile, supabase]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, docKey: string) {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadFiles(f => ({ ...f, [docKey]: files[0] }));
      // Automatically trigger upload when file is selected for better UX
      // Wait for state to settle then call upload
      setTimeout(() => uploadFile(docKey, files[0]), 100);
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
      uploadFile(docKey, files[0]);
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

  async function uploadFile(docKey: string, providedFile?: File) {
    const file = providedFile || uploadFiles[docKey];
    if (!file || !authProfile?.team_id || !supabase) {
      toast.error('Please select a file first');
      return;
    }

    // Validate user with server
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      toast.error('You must be signed in to upload files');
      return;
    }

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

  async function saveVsvLink(url: string) {
    if (!url || !url.trim()) {
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
          file_name: url.trim(),
          storage_path: `${authProfile.team_id}/vsv/link`,
          uploaded_at: new Date().toISOString(),
        } as any,
        { onConflict: 'team_id,document_key' }
      );
      if (error) {
        toast.error(`Failed to save link: ${error.message}`, { id: saveToast });
      } else {
        toast.success('YouTube link saved', { id: saveToast });
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
    <div className="p-4 sm:p-5 md:p-6 space-y-6 bg-slate-50/50 min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-0.5">
              {getGreeting()}, <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">{authProfile?.first_name || 'User'}</span>!
            </h1>
            <p className="text-gray-400 font-bold uppercase text-[8px] tracking-[0.3em] leading-none">
              Hub ID: {authProfile?.team_id?.slice(0, 8) || 'GLOBAL'}
            </p>
          </div>
        </div>

        {/* Compact Alerts Ribbon */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 px-3 rounded-lg border border-gray-200 overflow-hidden min-w-0">
          <div className="flex items-center gap-1.5 pr-2 border-r border-gray-300 flex-shrink-0">
            <Megaphone className="w-3 h-3 text-indigo-500" />
            <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">Intel</span>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar scroll-smooth">
            {deadlineAnnouncements.length > 0 ? (
              deadlineAnnouncements.map(a => (
                <div key={a.id} className="flex items-center gap-1.5 whitespace-nowrap">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-gray-700">{a.message}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span className="text-[10px] font-bold text-emerald-600">All Systems Nominal</span>
              </div>
            )}
            {schedule.map((s, idx) => (
              <div key={idx} className="flex items-center gap-1.5 whitespace-nowrap">
                <Clock className="w-2.5 h-2.5 text-gray-400" />
                <span className="text-[9px] font-black text-indigo-600">{s.time}</span>
                <span className="text-[10px] font-bold text-gray-500">{s.event}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Team Designation Card */}
        <div className="overflow-hidden">
          {teamInfo ? (
            <Card className="h-full bg-slate-900 border-none shadow-md relative group rounded-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-50" />
              <CardContent className="p-3 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white shadow-md">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">Designation</div>
                    <h2 className="text-base font-black text-white tracking-tight truncate">{teamInfo.name}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      teamInfo.vehicle_class === 'EV' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'
                    }`}>
                      {teamInfo.vehicle_class}
                    </span>
                    <span className="text-lg font-black text-white leading-none">
                      {teamInfo.vehicle_class === 'EV' ? 'E' : 'C'}{teamInfo.vehicle_number || '??'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full bg-slate-100 border-dashed border-2 border-slate-200 flex items-center justify-center p-3">
               <p className="text-xs font-bold text-slate-400">Awaiting Profile Sync...</p>
            </Card>
          )}
        </div>

        {/* Global Operational Stats */}
        <div>
          <Card className="h-full border-gray-100 shadow-md bg-white overflow-hidden rounded-xl ring-1 ring-gray-100">
            <CardContent className="p-0 h-full">
              <div className="grid grid-cols-2 h-full">
                <div className="p-2.5 flex items-center gap-3 border-r border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-gray-900 tabular-nums">{stats.evTeams}</div>
                    <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Electric</div>
                  </div>
                </div>
                <div className="p-2.5 flex items-center gap-3 bg-slate-50/30 hover:bg-slate-50/60 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-md">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-gray-900 tabular-nums">{stats.cvTeams}</div>
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Combustion</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Protocol Documentation */}
      {canViewDocuments && (
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-white shadow-lg">
                <CloudUpload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                  Document Uploads
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-0.5 rounded-full border border-gray-100 ml-2">Submissions portal</span>
                </h2>
              </div>
            </div>
            
            {isTeamMember && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-100">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Surveillance Only</span>
              </div>
            )}
          </div>

          <DocumentUploadTable
            documents={DASHBOARD_DOCUMENTS}
            teamClass={teamClass}
            uploadedByKey={Object.fromEntries(
              DASHBOARD_DOCUMENTS.map(d => [d.key, uploadedFile(d.key)])
            )}
            onDownload={(path, fileName) => downloadFile(path, fileName)}
            canUpload={canUpload}
            uploading={uploading}
            onFileChange={handleFileChange}
            vsvSaving={vsvSaving}
            onSaveVsvLink={saveVsvLink}
          />
        </div>
      )}
    </div>
  )
}
