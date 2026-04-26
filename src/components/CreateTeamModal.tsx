'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Modal } from './Modal'
import { teamSchema, TeamInput } from '@/lib/validators'

interface CreateTeamModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateTeamModal({ isOpen, onClose }: CreateTeamModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TeamInput>({
    resolver: zodResolver(teamSchema),
  })

  const onSubmit = async (data: TeamInput) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create team')
      }

      const team = await response.json()
      
      toast.success('Team created successfully!')
      reset()
      onClose()
      router.push(`/teams/${team.id}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create team')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Team">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="form-label">Team Name *</label>
          <input
            type="text"
            {...register('name')}
            className="form-input"
            placeholder="Enter team name"
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">University *</label>
          <input
            type="text"
            {...register('university')}
            className="form-input"
            placeholder="Enter university name"
          />
          {errors.university && (
            <p className="text-sm text-red-600 mt-1">{errors.university.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">Vehicle Class *</label>
          <select
            {...register('vehicle_class')}
            className="form-input"
          >
            <option value="EV">Electric Vehicle (EV)</option>
            <option value="CV">Combustion Vehicle (CV)</option>
          </select>
          {errors.vehicle_class && (
            <p className="text-sm text-red-600 mt-1">{errors.vehicle_class.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">Vehicle Number</label>
          <input
            type="number"
            {...register('vehicle_number', { valueAsNumber: true })}
            className="form-input"
            placeholder="Enter vehicle number"
          />
          {errors.vehicle_number && (
            <p className="text-sm text-red-600 mt-1">{errors.vehicle_number.message}</p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner mr-2" />
                Creating...
              </>
            ) : (
              'Create Team'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}