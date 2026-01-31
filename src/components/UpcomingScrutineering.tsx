'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { ClipboardCheck, MapPin, User } from 'lucide-react'

interface UpcomingScrutineeringItem {
  id: string
  scheduledAt: Date
  location: string | null
  vehicle: {
    name: string
    team: {
      name: string
    }
  }
  scrutineer: {
    name: string | null
  } | null
}

interface UpcomingScrutineeringProps {
  scrutineering: UpcomingScrutineeringItem[]
}

export function UpcomingScrutineering({ scrutineering }: UpcomingScrutineeringProps) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Scrutineering</h3>
        <Link
          href="/scrutineering"
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          View all
        </Link>
      </div>

      {scrutineering.length === 0 ? (
        <div className="text-center py-8">
          <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No upcoming scrutineering sessions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {scrutineering.map((session) => (
            <div
              key={session.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900">
                      {session.vehicle.name}
                    </h4>
                    <span className="text-sm text-gray-500">
                      by {session.vehicle.team.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <ClipboardCheck className="w-4 h-4" />
                      <span>{format(new Date(session.scheduledAt), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                    
                    {session.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{session.location}</span>
                      </div>
                    )}
                    
                    {session.scrutineer?.name && (
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{session.scrutineer.name}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <Link
                  href={`/scrutineering/${session.id}`}
                  className="btn-secondary text-sm"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}