'use client'

import { CheckCircle2, Download } from 'lucide-react'
import type { DocumentSpec } from '@/lib/data/dashboard-documents'
import type { UploadedFile } from '@/hooks/useTeamUploads'

type DocumentUploadTableProps = {
  documents: DocumentSpec[]
  teamClass: string
  /** Map document key -> uploaded file (null if not uploaded) */
  uploadedByKey: Record<string, UploadedFile | null>
  onDownload: (storagePath: string, fileName?: string) => void
}

export function DocumentUploadTable({ documents, teamClass, uploadedByKey, onDownload }: DocumentUploadTableProps) {
  const filtered = documents.filter(doc => !teamClass || doc.classes.includes(teamClass))
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/80">
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Document</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-900">EV</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-900">CV</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Deadline</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-900">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">File</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">Format</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-900">File Size</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((doc, idx) => {
            const uploaded = uploadedByKey[doc.key] ?? null
            const isLink = doc.key === 'vsv'
            return (
              <tr
                key={doc.key}
                className={`border-b border-gray-100 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              >
                <td className="px-4 py-3 font-medium text-gray-900">{doc.label}</td>
                <td className="px-4 py-3 text-center">
                  {doc.classes.includes('EV') ? (
                    <span className="inline-flex items-center justify-center text-primary" title="EV">
                      <CheckCircle2 className="w-5 h-5" />
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {doc.classes.includes('CV') ? (
                    <span className="inline-flex items-center justify-center text-primary" title="CV">
                      <CheckCircle2 className="w-5 h-5" />
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-700">{doc.deadline}</td>
                <td className="px-4 py-3 text-center">
                  {uploaded ? (
                    <span className="inline-flex items-center justify-center text-green-600" title="Uploaded">
                      <CheckCircle2 className="w-5 h-5" />
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 max-w-[200px]">
                  {uploaded ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="truncate text-gray-900 min-w-0"
                        title={uploaded.file_name}
                      >
                        {uploaded.file_name}
                      </span>
                      {isLink ? (
                        <a
                          href={uploaded.file_name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 text-primary hover:underline"
                          title="Open link"
                        >
                          Open
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onDownload(uploaded.storage_path, uploaded.file_name)}
                          className="flex-shrink-0 inline-flex items-center gap-1 text-primary hover:underline"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className={`px-4 py-3 ${doc.format === '.pdf' ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                  {doc.format || '—'}
                </td>
                <td className="px-4 py-3 text-gray-700">{doc.fileSize || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
