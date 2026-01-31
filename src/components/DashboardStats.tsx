'use client'

import { Users, Truck, ClipboardCheck, Clock } from 'lucide-react'

interface DashboardStatsProps {
  stats: {
    totalTeams: number
    totalVehicles: number
    todayScrutineering: number
    pendingReviews: number
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const statItems = [
    {
      name: 'Total Teams',
      value: stats.totalTeams,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Total Vehicles',
      value: stats.totalVehicles,
      icon: Truck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: "Today's Scrutineering",
      value: stats.todayScrutineering,
      icon: ClipboardCheck,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
    },
    {
      name: 'Pending Reviews',
      value: stats.pendingReviews,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item) => (
        <div key={item.name} className="card p-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg ${item.bgColor}`}>
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">{item.name}</p>
              <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}