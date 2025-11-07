import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signUpSchema } from '@/lib/validators'
import { UserRole } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = signUpSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 12)

    // Combine first and last name
    const fullName = `${validatedData.firstName} ${validatedData.lastName}`.trim()

    // Create user
    const user = await prisma.user.create({
      data: {
        name: fullName,
        email: validatedData.email,
        passwordHash,
        role: UserRole.TEAM_USER,
      }
    })

    // If user is a team lead, create a team
    if (validatedData.teamLead && validatedData.teamId) {
      await prisma.team.create({
        data: {
          name: validatedData.teamId, // or use another field if available
          contactEmail: validatedData.email,
          members: {
            connect: { id: user.id }
          }
        }
      })
    }

    return NextResponse.json(
      { 
        message: 'Account created successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Invalid input data' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
