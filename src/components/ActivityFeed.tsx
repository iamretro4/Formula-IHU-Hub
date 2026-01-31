'use client'

import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, ClipboardCheck, Users } from 'lucide-react'

interface Activity {
  id: string
  text: string
  createdAt: Date
  author: {
    name: string | null
    role: string
  }
  vehicle?: {
    name: string
  } | null
  scrutineering?: {
    vehicle: {
      name: string
    }
  } | null
}

interface ActivityFeedProps {
  activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getActivityIcon = (activity: Activity) => {
    if (activity.scrutineering) {
      return ClipboardCheck
    }
    if (activity.vehicle) {
      return MessageSquare
    }
    return Users
  }

  const getActivityColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-purple-600 bg-purple-100'
      case 'bp_judge':
      case 'cm_judge':
      case 'design_judge_software':
      case 'design_judge_mechanical':
      case 'design_judge_electronics':
      case 'design_judge_overall':
        return 'text-blue-600 bg-blue-100'
      case 'scrutineer':
        return 'text-green-600 bg-green-100'
      case 'team_leader':
      case 'team_member':
        return 'text-orange-600 bg-orange-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      
      {activities.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No recent activity</p>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity)
            const colorClasses = getActivityColor(activity.author.role)
            
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${colorClasses}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.author.name || 'Unknown User'}
                    </p>
                    <span className="text-xs text-gray-500 capitalize">
                      {activity.author.role.toLowerCase().replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.text}
                  </p>
                  {(activity.vehicle || activity.scrutineering) && (
                    <p className="text-xs text-gray-500 mt-1">
                      Vehicle: {activity.vehicle?.name || activity.scrutineering?.vehicle.name}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}