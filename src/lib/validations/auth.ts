// =====================================================
// Formula IHU Hub - Authentication & Validation
// File: src/lib/validations/auth.ts
// =====================================================

import { z } from "zod"

// ------------------------------------
// Role definitions
// ------------------------------------
const userRoles = [
  "admin", "scrutineer", "team_leader", "inspection_responsible", "team_member",
  "design_judge_software", "design_judge_mechanical", "design_judge_electronics",
  "design_judge_overall", "bp_judge", "cm_judge", "track_marshal", "viewer",
  "engineering_design",
] as const

// ------------------------------------
// Zod schemas
// ------------------------------------
export const registerSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    fatherName: z.string().min(1, "Father name is required"),
    phone: z.string().min(1, "Phone number is required"),
    emergencyContact: z.string().min(1, "Emergency contact is required"),
    campsiteStaying: z.boolean(),
    ehicNumber: z.string().min(1, "EHIC number is required"),
    role: z.enum(userRoles),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export const profileCompletionSchema = z.object({
  teamId: z.string().uuid().optional(),
  additionalInfo: z.string().optional(),
})

export type RegisterFormData = z.infer<typeof registerSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type ProfileCompletionData = z.infer<typeof profileCompletionSchema>
