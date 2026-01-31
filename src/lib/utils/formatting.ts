// src/lib/utils/formatting.ts
import { UserRole } from '@/lib/types/database'

const EVENT_TIMEZONE = 'Europe/Athens'

/** Today's date in event timezone (yyyy-MM-dd) for date inputs. */
export function todayInEventTz(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: EVENT_TIMEZONE })
}

// Format user roles for display
export function formatUserRole(role: UserRole): string {
  const roleMap: Record<UserRole, string> = {
    admin: 'Administrator',
    scrutineer: 'Scrutineer',
    team_leader: 'Team Leader',
    inspection_responsible: 'Inspection Responsible',
    team_member: 'Team Member',
    design_judge_software: 'Design Judge - Software',
    design_judge_mechanical: 'Design Judge - Mechanical',
    design_judge_electronics: 'Design Judge - Electronics',
    design_judge_overall: 'Design Judge - Overall',
    bp_judge: 'Business Plan Judge',
    cm_judge: 'Cost & Manufacturing Judge',
    engineering_design: 'Engineering Design Judge', // Added this entry
    track_marshal: 'Track Marshal',
    viewer: 'Viewer',
  }
  
  return roleMap[role] || role
}

// Format vehicle class for display
export function formatVehicleClass(vehicleClass: string): string { // Changed to string as VehicleClass enum is not explicitly defined
  return vehicleClass === 'EV' ? 'Electric Vehicle' : 'Combustion Vehicle'
}

// Format team code for display
export function formatTeamCode(code: string): string {
  return code.toUpperCase()
}

// Format phone numbers
export function formatPhoneNumber(phone: string): string {
  // Simple formatting - you can enhance this
  return phone.replace(/(\+\d{2})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4')
}

// Format EHIC numbers
export function formatEHICNumber(ehic: string): string {
  return ehic.toUpperCase()
}