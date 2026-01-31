/**
 * Required document specs for dashboard uploads (Formula IHU 2026).
 */

export type DocumentSpec = {
  key: string
  label: string
  classes: string[]
  allowedTypes: string[]
  deadline: string
  submission: string
  format: string
  fileSize: string
}

export const DASHBOARD_DOCUMENTS: DocumentSpec[] = [
  { key: 'bpefs', label: 'Business Plan Executive & Financial Summary (BPEFS)', classes: ['EV', 'CV'], allowedTypes: ['application/pdf'], deadline: '25/05/2026 14:00:00', submission: 'Formula IHU Portal', format: '.pdf', fileSize: '' },
  { key: 'tvsd', label: 'Technical Vehicle System Documentation (TVSD)', classes: ['EV', 'CV'], allowedTypes: ['application/pdf'], deadline: '25/05/2026 14:00:00', submission: 'Formula IHU Portal', format: '.pdf', fileSize: '50MB' },
  { key: 'esoq', label: 'Electrical System Officer Qualification (ESOQ)', classes: ['EV'], allowedTypes: ['application/pdf'], deadline: '02/06/2026 23:59:59', submission: 'Formula IHU Portal', format: '.pdf', fileSize: '50MB' },
  { key: 'vsv', label: 'Vehicle Status Video (VSV)', classes: ['EV', 'CV'], allowedTypes: [], deadline: '02/07/2026 23:59:59', submission: 'Formula IHU Portal', format: 'YouTube link', fileSize: '—' },
  { key: 'crd', label: 'Cost Report Documents (CRD)', classes: ['EV', 'CV'], allowedTypes: ['application/zip'], deadline: '15/07/2026 23:59:59', submission: 'Formula IHU Portal', format: '.zip', fileSize: '50MB' },
]
