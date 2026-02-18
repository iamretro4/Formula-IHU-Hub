/**
 * Formula IHU 2026 competition – registration team lists by category.
 * Used to populate the signup team dropdown with Pre-Registered, Registered, Wild Card, and Waiting List options.
 */

export type RegistrationCategory = 'pre_registered' | 'registered' | 'wildcard' | 'waiting_list'

export interface RegistrationTeamOption {
  name: string
  category: RegistrationCategory
}

function toCategoryLabel(cat: RegistrationCategory): string {
  switch (cat) {
    case 'pre_registered':
      return 'Pre-Registered'
    case 'registered':
      return 'Registered'
    case 'wildcard':
      return 'Wild Card'
    case 'waiting_list':
      return 'Waiting List'
    default:
      return cat
  }
}

/** All currently registered teams for the signup dropdown. */
export const REGISTRATION_TEAMS: RegistrationTeamOption[] = [
  { name: 'IZTECH RACING', category: 'registered' },
  { name: 'T.U.IASI Racing', category: 'registered' },
  { name: 'MES Racing', category: 'registered' },
  { name: 'FRTUCY', category: 'registered' },
  { name: 'Formula Students Technical University of Crete', category: 'registered' },
  { name: 'Centaurus Racing Team', category: 'registered' },
  { name: 'ENP RACING TEAM', category: 'registered' },
  { name: 'Marseille Racing', category: 'registered' },
  { name: 'Perseus Racing', category: 'registered' },
  { name: 'FESB Racing', category: 'registered' },
  { name: 'Team Spark', category: 'registered' },
  { name: 'Trakya Racing Formula Student Team', category: 'registered' },
  { name: 'TU-Sofia Racing', category: 'registered' },
  { name: 'Pelops Racing Team', category: 'registered' },
  { name: 'Democritus Racing Team', category: 'registered' },
  { name: 'Poseidon Racing Team', category: 'registered' },
  { name: 'fufracingteam', category: 'registered' },
  { name: 'Daedalus Racing Team', category: 'registered' },
  { name: 'Green Lion Racing', category: 'registered' },
]

/** Category order for the dropdown. */
export const REGISTRATION_CATEGORY_ORDER: RegistrationCategory[] = [
  'registered',
]

export function getCategoryLabel(category: RegistrationCategory): string {
  return toCategoryLabel(category)
}

/** Group registration teams by category for optgroups. */
export function getTeamsByCategory(): Map<RegistrationCategory, string[]> {
  const map = new Map<RegistrationCategory, string[]>()
  for (const cat of REGISTRATION_CATEGORY_ORDER) {
    map.set(cat, [])
  }
  for (const t of REGISTRATION_TEAMS) {
    const list = map.get(t.category)
    if (list && !list.includes(t.name)) list.push(t.name)
  }
  return map
}
