// Shared type definitions
export type { UserProfile, Team, Booking } from './database'

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

