import { z } from 'zod'

// User validation schemas
export const signUpSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  fatherName: z.string().min(1, 'Father’s name is required'),
  phone: z.string().min(1, 'Phone is required'),
  emergencyContact: z.string().min(1, 'Emergency contact is required'),
  ehicNumber: z.string().optional(), // Optional
  teamId: z.string().optional(), // Optional - can be assigned later by admin
  campsiteStaying: z.boolean().optional(), // match DB column default false
  teamLead: z.boolean().optional(),        // match DB column default false
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})



export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// Team validation schemas
export const teamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  country: z.string().optional(),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().optional(),
})

// Vehicle validation schemas
export const vehicleSchema = z.object({
  name: z.string().min(2, 'Vehicle name must be at least 2 characters'),
  type: z.string().min(2, 'Vehicle type is required'),
  chassisNumber: z.string().optional(),
  year: z.number().int().min(2020).max(2030).optional(),
  batterySpec: z.object({
    type: z.string().optional(),
    voltage: z.string().optional(),
    capacity: z.string().optional(),
    cells: z.number().optional(),
    chemistry: z.string().optional(),
  }).optional(),
})

// Scrutineering validation schemas
export const scrutineeringSchema = z.object({
  vehicleId: z.string().cuid(),
  scheduledAt: z.string().datetime(),
  location: z.string().optional(),
  notes: z.string().optional(),
})

export const scrutineerItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string().optional(),
  category: z.string(),
  status: z.enum(['UNKNOWN', 'PASS', 'FAIL']),
  value: z.string().optional(),
  remarks: z.string().optional(),
})

// File upload validation
export const fileUploadSchema = z.object({
  name: z.string(),
  size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  type: z.string(),
})

// Comment validation
export const commentSchema = z.object({
  text: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment too long'),
  vehicleId: z.string().cuid().optional(),
  scrutineeringId: z.string().cuid().optional(),
})

// Notification validation
export const notificationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type TeamInput = z.infer<typeof teamSchema>
export type VehicleInput = z.infer<typeof vehicleSchema>
export type ScrutineeringInput = z.infer<typeof scrutineeringSchema>
export type ScrutineerItemInput = z.infer<typeof scrutineerItemSchema>
export type FileUploadInput = z.infer<typeof fileUploadSchema>
export type CommentInput = z.infer<typeof commentSchema>
export type NotificationInput = z.infer<typeof notificationSchema>