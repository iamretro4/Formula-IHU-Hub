'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Modal } from './Modal'
import { scrutineeringSchema, ScrutineeringInput } from '@/lib/validators'
import { logger } from '@/lib/utils/logger'

interface ScheduleScrutineeringModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Vehicle {
  id: string
  name: string
  team: {
    name: string
  }
}

interface User {
  id: string
  name: string | null
}

export function ScheduleScrutineeringModal({ isOpen, onClose }: ScheduleScrutineeringModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [scrutineers, setScrutineers] = useState<User[]>([])
  const [selectedScrutineerId, setSelectedScrutineerId] = useState('')
  const router = useRouter()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ScrutineeringInput>({
    resolver: zodResolver(scrutineeringSchema),
  })

  // Load vehicles and scrutineers when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const [vehiclesResponse, scrutineersResponse] = await Promise.all([
        fetch('/api/vehicles'),
        fetch('/api/users?role=SCRUTINEER'),
      ])

      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json()
        setVehicles(vehiclesData)
      }

      if (scrutineersResponse.ok) {
        const scrutineersData = await scrutineersResponse.json()
        setScrutineers(scrutineersData)
      }
    } catch (error) {
      logger.error('Failed to load data', error, { context: 'schedule_scrutineering_modal' })
    }
  }

  const onSubmit = async (data: ScrutineeringInput) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/scrutineering', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          scrutineerId: selectedScrutineerId || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to schedule scrutineering')
      }

      const scrutineering = await response.json()
      
      toast.success('Scrutineering scheduled successfully!')
      reset()
      setSelectedScrutineerId('')
      onClose()
      router.push(`/scrutineering/${scrutineering.id}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to schedule scrutineering')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    setSelectedScrutineerId('')
    onClose()
  }

  // Generate time slots for today and tomorrow
  const generateTimeSlots = () => {
    const slots = []
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    for (const date of [today, tomorrow]) {
      for (let hour = 9; hour <= 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotTime = new Date(date)
          slotTime.setHours(hour, minute, 0, 0)
          
          // Only show future slots
          if (slotTime > new Date()) {
            slots.push({
              value: slotTime.toISOString(),
              label: slotTime.toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
            })
          }
        }
      }
    }
    
    return slots.slice(0, 20) // Limit to next 20 slots
  }

  const timeSlots = generateTimeSlots()

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Schedule Scrutineering Session" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="form-label">Vehicle *</label>
          <select {...register('vehicleId')} className="form-input">
            <option value="">Select a vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} - {vehicle.team.name}
              </option>
            ))}
          </select>
          {errors.vehicleId && (
            <p className="text-sm text-red-600 mt-1">{errors.vehicleId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Scheduled Time *</label>
            <select {...register('scheduledAt')} className="form-input">
              <option value="">Select time slot</option>
              {timeSlots.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
            {errors.scheduledAt && (
              <p className="text-sm text-red-600 mt-1">{errors.scheduledAt.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">Location</label>
            <select {...register('location')} className="form-input">
              <option value="">Select location</option>
              <option value="Bay A1">Bay A1</option>
              <option value="Bay A2">Bay A2</option>
              <option value="Bay B1">Bay B1</option>
              <option value="Bay B2">Bay B2</option>
              <option value="Bay C1">Bay C1</option>
              <option value="Bay C2">Bay C2</option>
              <option value="Outdoor Area 1">Outdoor Area 1</option>
              <option value="Outdoor Area 2">Outdoor Area 2</option>
            </select>
          </div>
        </div>

        <div>
          <label className="form-label">Assign Scrutineer</label>
          <select
            value={selectedScrutineerId}
            onChange={(e) => setSelectedScrutineerId(e.target.value)}
            className="form-input"
          >
            <option value="">Assign later</option>
            {scrutineers.map((scrutineer) => (
              <option key={scrutineer.id} value={scrutineer.id}>
                {scrutineer.name || 'Unnamed Scrutineer'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Notes</label>
          <textarea
            {...register('notes')}
            className="form-input"
            rows={3}
            placeholder="Any special requirements or notes for this scrutineering session..."
          />
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
                Scheduling...
              </>
            ) : (
              'Schedule Session'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}