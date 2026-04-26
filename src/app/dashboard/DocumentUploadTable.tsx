import { useState } from 'react'
import { CheckCircle2, Download, FileText, Globe, Upload, Loader2, Link } from 'lucide-react'
import type { DocumentSpec } from '@/lib/data/dashboard-documents'
import type { UploadedFile } from '@/hooks/useTeamUploads'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type DocumentUploadTableProps = {
  documents: DocumentSpec[]
  teamClass: string
  /** Map document key -> uploaded file (null if not uploaded) */
  uploadedByKey: Record<string, UploadedFile | null>
  onDownload: (storagePath: string, fileName?: string) => void
  canUpload?: boolean
  uploading?: Record<string, boolean>
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>, docKey: string) => void
  vsvSaving?: boolean
  onSaveVsvLink?: (url: string) => void
}

export function DocumentUploadTable({ 
  documents, 
  teamClass, 
  uploadedByKey, 
  onDownload,
  canUpload,
  uploading = {},
  onFileChange,
  vsvSaving,
  onSaveVsvLink
}: DocumentUploadTableProps) {
  const [vsvUrl, setVsvUrl] = useState('')
  const filtered = documents.filter(doc => !teamClass || doc.classes.includes(teamClass))
  
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <table className="w-full min-w-[800px] text-[13px]">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/30">
            <th className="px-4 py-2 text-left font-bold text-gray-400 uppercase tracking-widest text-[9px]">Document Name</th>
            <th className="px-4 py-2 text-center font-bold text-gray-400 uppercase tracking-widest text-[9px]">Class</th>
            <th className="px-4 py-2 text-left font-bold text-gray-400 uppercase tracking-widest text-[9px]">Deadline</th>
            <th className="px-4 py-2 text-center font-bold text-gray-400 uppercase tracking-widest text-[9px]">Status</th>
            <th className="px-4 py-2 text-left font-bold text-gray-400 uppercase tracking-widest text-[9px]">Current Submission</th>
            <th className="px-4 py-2 text-right font-bold text-gray-400 uppercase tracking-widest text-[9px]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {filtered.map((doc, idx) => {
            const uploaded = uploadedByKey[doc.key] ?? null
            const isLink = doc.key === 'vsv'
            const isUploading = uploading[doc.key]
            const fileInputId = `table-file-input-${doc.key}`
            
            return (
              <tr
                key={doc.key}
                className={`group hover:bg-primary/5 transition-colors duration-150 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/10'}`}
              >
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 group-hover:text-primary transition-colors">{doc.label}</span>
                    <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1.5 mt-0.5">
                      <FileText className="w-3 h-3" />
                      {doc.format || 'Any'} {doc.fileSize ? `(Max ${doc.fileSize})` : ''}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {doc.classes.includes('EV') && (
                      <Badge variant="outline" className="text-[9px] px-1.5 h-4 bg-blue-50/50 text-blue-700 border-blue-200">EV</Badge>
                    )}
                    {doc.classes.includes('CV') && (
                      <Badge variant="outline" className="text-[9px] px-1.5 h-4 bg-orange-50/50 text-orange-700 border-orange-200">CV</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span className="text-gray-600 font-semibold tabular-nums whitespace-nowrap">
                    {doc.deadline.split(' ')[0]}
                  </span>
                </td>
                <td className="px-4 py-2 text-center">
                  {uploaded ? (
                    <div className="inline-flex items-center bg-green-50 text-green-700 border border-green-100 rounded-full px-2.5 py-0.5 font-bold text-[10px]">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Submitted
                    </div>
                  ) : (
                    <div className="inline-flex items-center bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2.5 py-0.5 font-bold text-[10px]">
                      Pending
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 min-w-[200px]">
                  {isLink && canUpload && !uploaded ? (
                    <div className="flex items-center gap-2">
                       <div className="relative flex-1">
                         <Link className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                         <input
                           type="url"
                           placeholder="YouTube Link..."
                           value={vsvUrl}
                           onChange={e => setVsvUrl(e.target.value)}
                           className="w-full h-8 pl-7 pr-2 text-[11px] border border-gray-200 rounded-md focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                         />
                       </div>
                       <Button 
                         size="sm" 
                         disabled={vsvSaving || !vsvUrl.trim()}
                         onClick={() => {
                           onSaveVsvLink?.(vsvUrl)
                           setVsvUrl('')
                         }}
                         className="h-8 text-[11px] font-bold px-3"
                       >
                         {vsvSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                       </Button>
                    </div>
                  ) : uploaded ? (
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-primary/10 transition-colors">
                        {isLink ? <Globe className="w-3.5 h-3.5 text-blue-600" /> : <FileText className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <span className="truncate text-gray-700 font-semibold text-xs leading-none" title={uploaded.file_name}>
                        {uploaded.file_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs italic font-medium">No submission yet</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end items-center gap-1.5">
                    {uploaded && (
                      <Button
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                           if (isLink) window.open(uploaded.file_name, '_blank')
                           else onDownload(uploaded.storage_path, uploaded.file_name)
                        }}
                        className="h-8 text-primary hover:text-primary-600 hover:bg-primary/10 font-bold px-3"
                      >
                        {isLink ? <Globe className="w-3.5 h-3.5 mr-1.5" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                        View
                      </Button>
                    )}

                    {canUpload && !isLink && (
                      <>
                        <input 
                          type="file" 
                          id={fileInputId} 
                          className="hidden" 
                          onChange={(e) => onFileChange?.(e, doc.key)} 
                          disabled={isUploading}
                        />
                        <Button 
                          size="sm"
                          variant={uploaded ? "outline" : "default"}
                          disabled={isUploading}
                          onClick={() => document.getElementById(fileInputId)?.click()}
                          className={`h-8 font-bold px-4 shadow-sm ${!uploaded ? 'bg-primary hover:bg-primary/90' : 'border-primary/20 text-primary hover:bg-primary/5'}`}
                        >
                          {isUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5 mr-1.5" />
                              {uploaded ? 'Replace' : 'Upload'}
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    
                    {canUpload && isLink && uploaded && (
                       <Button 
                        size="sm"
                        variant="outline"
                        disabled={vsvSaving}
                        onClick={() => {
                          const newUrl = prompt('Enter new YouTube URL:', uploaded.file_name)
                          if (newUrl && newUrl !== uploaded.file_name) onSaveVsvLink?.(newUrl)
                        }}
                        className="h-8 font-bold px-4 border-primary/20 text-primary hover:bg-primary/5"
                      >
                        {vsvSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Update Link'}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
