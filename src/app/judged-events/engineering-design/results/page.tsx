'use client'

import { useEffect, useState } from 'react'
import getSupabaseClient from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Download } from 'lucide-react'
import { Database } from '@/lib/types/database'

type Team = {
  id: string
  name: string
  code: string
}

type Result = {
  team_id: string
  total_score: number
  teams?: Team
}

export default function EngineeringDesignResultsPage() {
  const supabase = getSupabaseClient()
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<Result[]>([])

  useEffect(() => {
    async function fetchResults() {
      try {
        setLoading(true)
        // Fetch results from the database
        const { data, error } = await supabase
          .from('judged_event_scores')
          .select(`
            team_id,
            total_score,
            teams(id, name, code)
          `)
          .eq('event_id', 'engineering-design') // Assuming there's an event_id field
          .order('total_score', { ascending: false })

        if (error) throw error
        setResults((data as any) || [])
      } catch (error) {
        console.error('Error fetching results:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [supabase])

  const handleExport = async () => {
    try {
      // Create CSV content
      const headers = ['Rank', 'Team Code', 'Team Name', 'Total Score']
      const rows = results.map((result, index) => [
        (index + 1).toString(),
        result.teams?.code || '',
        result.teams?.name || '',
        result.total_score.toString(),
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', 'engineering-design-results.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting results:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Engineering Design Results</h1>
          <p className="text-gray-600 mt-1">View and export engineering design event results</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No results available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Rank</th>
                    <th className="text-left p-3 font-semibold">Team Code</th>
                    <th className="text-left p-3 font-semibold">Team Name</th>
                    <th className="text-left p-3 font-semibold">Total Score</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={result.team_id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">{result.teams?.code || 'N/A'}</td>
                      <td className="p-3">{result.teams?.name || 'N/A'}</td>
                      <td className="p-3 font-semibold">{result.total_score.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

