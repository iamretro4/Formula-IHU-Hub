'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Modal } from './Modal'
import { vehicleSchema, VehicleInput } from '@/lib/validators'
import { logger } from '@/lib/utils/logger'

interface CreateVehicleModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Team {
  id: string
  name: string
}

export function CreateVehicleModal({ isOpen, onClose }: CreateVehicleModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const router = useRouter()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
  })

  // Load teams when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTeams()
    }
  }, [isOpen])

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      if (response.ok) {
        const data = await response.json()
        setTeams(data)
      }
    } catch (error) {
      logger.error('Failed to load teams', error, { context: 'create_vehicle_modal' })
    }
  }

  const onSubmit = async (data: VehicleInput) => {
    if (!selectedTeamId) {
      toast.error('Please select a team')
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          teamId: selectedTeamId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create vehicle')
      }

      const vehicle = await response.json()
      
      toast.success('Vehicle created successfully!')
      reset()
      setSelectedTeamId('')
      onClose()
      router.push(`/vehicles/${vehicle.id}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create vehicle')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    setSelectedTeamId('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Vehicle" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Vehicle Name *</label>
            <input
              type="text"
              {...register('name')}
              className="form-input"
              placeholder="Lightning Bolt MK-IV"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">Team *</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="form-input"
              required
            >
              <option value="">Select a team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Vehicle Type *</label>
            <select {...register('type')} className="form-input">
              <option value="">Select type</option>
              <option value="Electric Formula">Electric Formula</option>
              <option value="Combustion Formula">Combustion Formula</option>
              <option value="Solar Electric">Solar Electric</option>
              <option value="Hybrid">Hybrid</option>
            </select>
            {errors.type && (
              <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">Chassis Number</label>
            <input
              type="text"
              {...register('chassisNumber')}
              className="form-input"
              placeholder="LB-2024-001"
            />
          </div>

          <div>
            <label className="form-label">Year</label>
            <input
              type="number"
              {...register('year', { valueAsNumber: true })}
              className="form-input"
              placeholder="2024"
              min="2020"
              max="2030"
            />
            {errors.year && (
              <p className="text-sm text-red-600 mt-1">{errors.year.message}</p>
            )}
          </div>
        </div>

        {/* Battery Specifications */}
        <div className="border-t pt-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Battery Specifications (Optional)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Battery Type</label>
              <input
                type="text"
                {...register('batterySpec.type')}
                className="form-input"
                placeholder="Lithium-Ion"
              />
            </div>

            <div>
              <label className="form-label">Voltage</label>
              <input
                type="text"
                {...register('batterySpec.voltage')}
                className="form-input"
                placeholder="400V"
              />
            </div>

            <div>
              <label className="form-label">Capacity</label>
              <input
                type="text"
                {...register('batterySpec.capacity')}
                className="form-input"
                placeholder="85kWh"
              />
            </div>

            <div>
              <label className="form-label">Number of Cells</label>
              <input
                type="number"
                {...register('batterySpec.cells', { valueAsNumber: true })}
                className="form-input"
                placeholder="7104"
              />
            </div>

            <div>
              <label className="form-label">Chemistry</label>
              <select {...register('batterySpec.chemistry')} className="form-input">
                <option value="">Select chemistry</option>
                <option value="NMC">NMC (Nickel Manganese Cobalt)</option>
                <option value="LFP">LFP (Lithium Iron Phosphate)</option>
                <option value="NCA">NCA (Nickel Cobalt Aluminum)</option>
                <option value="LTO">LTO (Lithium Titanate)</option>
              </select>
            </div>
          </div>
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
              'Create Vehicle'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}