'use client'

import { useState } from 'react'
import {
  PlusIcon,
  UserGroupIcon,
  TruckIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline'
import { UserRole } from '@/lib/types/database'
import { CreateTeamModal } from './CreateTeamModal'
import { CreateVehicleModal } from './CreateVehicleModal'
import { ScheduleScrutineeringModal } from './ScheduleScrutineeringModal'

interface QuickActionsProps {
  userRole: UserRole
}

export function QuickActions({ userRole }: QuickActionsProps) {
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [showCreateVehicleModal, setShowCreateVehicleModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  const actions = [
    {
      name: 'Create Team',
      description: 'Register a new racing team',
      icon: UserGroupIcon,
      action: () => setShowCreateTeamModal(true),
      roles: [UserRole.admin, UserRole.team_leader, UserRole.team_member] as UserRole[],
      color: 'text-blue-600 bg-blue-100',
    },
    {
      name: 'Add Vehicle',
      description: 'Register a new vehicle for scrutineering',
      icon: TruckIcon,
      action: () => setShowCreateVehicleModal(true),
      roles: [UserRole.admin, UserRole.team_leader, UserRole.team_member] as UserRole[],
      color: 'text-green-600 bg-green-100',
    },
    {
      name: 'Schedule Scrutineering',
      description: 'Create a new scrutineering session',
      icon: ClipboardDocumentCheckIcon,
      action: () => setShowScheduleModal(true),
      roles: [UserRole.admin, UserRole.scrutineer] as UserRole[],
      color: 'text-indigo-600 bg-indigo-100',
    },
  ]

  const availableActions = actions.filter(action => 
    action.roles.includes(userRole)
  )

  if (availableActions.length === 0) {
    return null
  }

  return (
    <>
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="space-y-3">
          {availableActions.map((action) => (
            <button
              key={action.name}
              onClick={action.action}
              className="w-full flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${action.color}`}>
                <action.icon className="w-5 h-5" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{action.name}</p>
                <p className="text-xs text-gray-500">{action.description}</p>
              </div>
              <PlusIcon className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Modals */}
      <CreateTeamModal
        isOpen={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
      />
      <CreateVehicleModal
        isOpen={showCreateVehicleModal}
        onClose={() => setShowCreateVehicleModal(false)}
      />
      <ScheduleScrutineeringModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
      />
    </>
  )
}