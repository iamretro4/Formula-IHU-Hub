'use client'

import { useEffect, useState } from "react"
import {
  Megaphone,
  CalendarDays,
  Clock,
  Users2,
  Trophy,
  Flag,
  BarChart3,
  Download
} from "lucide-react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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

const documents = [
  { key: 'powertrain_selection', label: 'Powertrain Selection', classes: ['EV', 'CV'], allowedTypes: [] },
  { key: 'chassis_type', label: 'Chassis Type (CTS)', classes: ['EV', 'CV'], allowedTypes: [] },
  { key: 'fuel_order', label: 'Fuel Type Order', classes: ['CV'], allowedTypes: [] },
  { key: 'esoq', label: 'Electrical System Officer Qualification (ESOQ)', classes: ['EV'], allowedTypes: ['application/pdf'] },
  { key: 'bppv', label: 'Business Plan Pitch Video (BPPV)', classes: ['EV', 'CV'], allowedTypes: ['text/plain'] },
  { key: 'dss', label: 'Design Spec Sheet (DSS)', classes: ['EV', 'CV'], allowedTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel'] },
  { key: 'edr', label: 'Engineering Design Report (EDR)', classes: ['EV', 'CV'], allowedTypes: ['application/pdf'] },
  { key: 'team_designation', label: 'Team Member Designation', classes: ['EV', 'CV'], allowedTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel'] },
  { key: 'crd', label: 'Cost Report Documents (CRD)', classes: ['EV', 'CV'], allowedTypes: ['application/zip'] },
  { key: 'vsv', label: 'Vehicle Status Video (VSV)', classes: ['EV', 'CV'], allowedTypes: ['text/plain'] },
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
  const supabase = createClientComponentClient();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ teams: 37, vehicles: 20, events: 12, activeSessions: 4 });

  // Upload-related state
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teamClass, setTeamClass] = useState('EV');
  const [uploadFiles, setUploadFiles] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  useEffect(() => {
    fetchAnnouncements().then(setAnnouncements);
    fetchTodaysSchedule().then(setSchedule);
    setStats({ teams: 37, vehicles: 20, events: 12, activeSessions: 4 });

    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
    });
  }, []);

  useEffect(() => {
    async function fetchProfileAndUploads() {
      if (!user) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('*, team_id, team:teams(vehicle_class)')
        .eq('id', user.id)
        .single() as { data: any }

      setProfile(data);
      setTeamClass(data?.team?.vehicle_class ?? 'EV');
      fetchUploadedFiles(data?.team_id);
    }
    fetchProfileAndUploads();
  }, [user]);

  async function fetchUploadedFiles(teamId: string | null) {
    if (!teamId) {
      setUploadedFiles([]);
      return;
    }
    const { data } = await supabase
      .from('team_uploads')
      .select('*, uploaded_by (first_name, last_name)')
      .order('uploaded_at', { ascending: false });
    setUploadedFiles((data ?? []) as UploadedFile[]);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, docKey: string) {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadFiles(f => ({ ...f, [docKey]: files[0] }));
    }
  }

  async function uploadFile(docKey: string) {
    if (!uploadFiles[docKey] || !profile?.team_id) {
      alert('Please select a file first');
      return;
    }

    // Await session correctly
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData?.session) {
      alert('You must be signed in to upload files');
      return;
    }

    const file = uploadFiles[docKey]!;
    const safeFileName = sanitizeFileName(file.name);
    const path = `${profile.team_id}/${docKey}/${safeFileName}`;

    setUploading(true);

    const { error: uploadError } = await supabase.storage
      .from('team-uploads')
      .upload(path, file, {
        upsert: true,
      });

    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { error: metaError } = await supabase.from('team_uploads').upsert({
      team_id: profile.team_id,
      uploaded_by: user.id,
      document_key: docKey,
      file_name: file.name,
      storage_path: path,
      uploaded_at: new Date().toISOString(),
    } as any);

    if (metaError) {
      alert(`Metadata update failed: ${metaError.message}`);
    } else {
      alert('Upload successful');
      fetchUploadedFiles(profile.team_id);
      setUploadFiles(f => ({ ...f, [docKey]: null }));
    }
    setUploading(false);
  }

  async function downloadFile(storagePath: string) {
    const { data, error } = await supabase.storage.from('team-uploads').download(storagePath);
    if (error) {
      alert(`Download failed: ${error.message}`);
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

  return (
    <div className="p-6 space-y-8">
      {/* Welcome and Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Formula IHU Hub</h1>
          <p className="text-gray-600 mt-2">Stay up to date with live announcements and today's racing schedule.</p>
        </div>
        <div className="flex gap-4">
          <StatsCard label="Teams" value={stats.teams} icon={<Users2 className="text-primary" />} bg="bg-primary/10" />
          <StatsCard label="Vehicles" value={stats.vehicles} icon={<Flag className="text-green-500" />} bg="bg-green-50" />
          <StatsCard label="Events" value={stats.events} icon={<BarChart3 className="text-yellow-500" />} bg="bg-yellow-50" />
          <StatsCard label="Active Sessions" value={stats.activeSessions} icon={<Clock className="text-blue-500" />} bg="bg-blue-50" />
        </div>
      </div>

      {/* Uploads Section (admins and team leaders/members) */}
      {canUpload && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Upload Required Documents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documents
              .filter(doc => !teamClass || doc.classes.includes(teamClass))
              .map(doc => {
                const uploaded = uploadedFile(doc.key);
                return (
                  <div key={doc.key} className="border p-4 rounded-lg shadow-sm">
                    <label className="block font-semibold mb-2">{doc.label}</label>
                    <input
                      type="file"
                      disabled={uploading}
                      accept={doc.allowedTypes.length > 0 ? doc.allowedTypes.join(',') : undefined}
                      onChange={e => handleFileChange(e, doc.key)}
                      className="mb-2 w-full"
                    />
                    <button
                      disabled={uploading || !uploadFiles[doc.key]}
                      onClick={() => uploadFile(doc.key)}
                      className="btn btn-primary w-full"
                    >
                      {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                    {uploaded && (
                      <div className="mt-2 text-sm">
                        <span>Uploaded file: </span>
                        <button
                          className="text-blue-600 underline"
                          onClick={() => downloadFile(uploaded.storage_path)}
                        >
                          {uploaded.file_name}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Main Content: announcements/schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Live Announcements */}
        <div>
          <SectionHeader icon={<Megaphone className="text-orange-500" />} title="Live Announcements" />
          <div className="space-y-3 mt-3">
            {announcements.length === 0 ? (
              <div className="text-gray-400 text-center py-8">Nothing to announce yet.</div>
            ) : (
              announcements.map(a => (
                <div key={a.id} className="flex items-center gap-2 bg-orange-50 rounded-xl px-4 py-3 text-orange-800 shadow">
                  <Megaphone className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{a.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
        {/* Today's Schedule */}
        <div>
          <SectionHeader icon={<CalendarDays className="text-primary" />} title="Today's Schedule" />
          <div className="space-y-3 mt-3">
            {schedule.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No events scheduled for today.</div>
            ) : (
              schedule.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3 text-blue-900 shadow">
                  {entry.icon}
                  <span className="font-bold text-lg">{entry.time}</span>
                  <span className="font-medium">{entry.event}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex items-center gap-2 font-extrabold text-xl text-gray-900">
      {icon}
      {title}
    </div>
  )
}

function StatsCard({ label, value, icon, bg }: { label: string, value: number, icon: React.ReactNode, bg: string }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg shadow ${bg} min-w-[100px] min-h-[84px]`}>
      <div className="mb-1">{icon}</div>
      <div className="font-bold text-xl">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}
