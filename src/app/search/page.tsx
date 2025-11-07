'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Search, Users, Car, ClipboardCheck } from 'lucide-react'
import { Database } from '@/lib/types/database'
import Link from 'next/link'

type Team = Database['public']['Tables']['teams']['Row']
type Vehicle = {
  id: string
  name?: string
  team_id?: string
  chassis_number?: string
  status?: string
  teams?: { name: string; code: string } | null
}
type Booking = Database['public']['Tables']['bookings']['Row'] & {
  teams?: { name: string; code: string } | null
  inspection_types?: { name: string } | null
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{
    teams: Team[]
    vehicles: Vehicle[]
    bookings: Booking[]
  }>({
    teams: [],
    vehicles: [],
    bookings: [],
  })

  useEffect(() => {
    if (query.trim()) {
      performSearch(query)
    } else {
      setResults({ teams: [], vehicles: [], bookings: [] })
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return

    setLoading(true)
    try {
      const searchTerm = `%${searchQuery}%`

      // Search teams
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .or(`name.ilike.${searchTerm},code.ilike.${searchTerm}`)
        .limit(10)

      // Search vehicles
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('*, teams(name, code)')
        .or(`name.ilike.${searchTerm},chassis_number.ilike.${searchTerm}`)
        .limit(10)

      // Search bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*, teams(name, code), inspection_types(name)')
        .or(`notes.ilike.${searchTerm}`)
        .limit(10)

      setResults({
        teams: teams || [],
        vehicles: vehicles || [],
        bookings: bookings || [],
      })
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`)
      performSearch(query)
    }
  }

  const totalResults = results.teams.length + results.vehicles.length + results.bookings.length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="text-gray-600 mt-1">Find teams, vehicles, and bookings</p>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search teams, vehicles, or scrutineering..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
            className="w-full pl-10 pr-4 py-2"
          />
        </div>
      </form>

      {loading && <LoadingSpinner text="Searching..." />}

      {!loading && query && (
        <div className="space-y-6">
          {totalResults === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No results found for &quot;{query}&quot;
              </CardContent>
            </Card>
          ) : (
            <>
              {results.teams.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Teams ({results.teams.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.teams.map((team) => (
                        <Link
                          key={team.id}
                          href={`/teams/${team.id}`}
                          className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{team.name}</p>
                              <p className="text-sm text-gray-600">{team.code}</p>
                            </div>
                            {team.university && <Badge>{team.university}</Badge>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {results.vehicles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="w-5 h-5" />
                      Vehicles ({results.vehicles.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.vehicles.map((vehicle) => (
                        <Link
                          key={vehicle.id}
                          href={`/vehicles/${vehicle.id}`}
                          className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{vehicle.name}</p>
                              <p className="text-sm text-gray-600">     
                                {vehicle.teams?.name} {vehicle.chassis_number && `- ${vehicle.chassis_number}`}
                              </p>
                            </div>
                            <Badge variant="outline">{vehicle.status}</Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {results.bookings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardCheck className="w-5 h-5" />
                      Bookings ({results.bookings.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.bookings.map((booking) => (
                        <Link
                          key={booking.id}
                          href={`/scrutineering/live/${booking.id}`}
                          className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {booking.teams?.name} - {booking.inspection_types?.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(booking.date).toLocaleDateString()} at {booking.start_time}
                              </p>
                            </div>
                            <Badge variant="secondary">{booking.status}</Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {!query && (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            Enter a search query to find teams, vehicles, or bookings
          </CardContent>
        </Card>
      )}
    </div>
  )
}

