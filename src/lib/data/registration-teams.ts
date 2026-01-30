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

/** All teams grouped by registration category for the signup dropdown. */
export const REGISTRATION_TEAMS: RegistrationTeamOption[] = [
  // --- Pre-Registered (from first array) ---
  { name: 'Aristotle University Racing Team Electric', category: 'pre_registered' },
  { name: 'Poseidon Racing Team', category: 'pre_registered' },
  { name: 'Prom Racing', category: 'pre_registered' },
  { name: 'Centaurus Racing Team', category: 'pre_registered' },
  { name: 'Perseus Racing', category: 'pre_registered' },
  { name: 'Democritus Racing Team', category: 'pre_registered' },
  { name: 'UoP Racing Team', category: 'pre_registered' },
  // --- Pre-Registered (from second array) ---
  { name: 'Aristotle Racing Team', category: 'pre_registered' },
  { name: 'Formula Students Technical University of Crete', category: 'pre_registered' },
  { name: 'Minautor Racing Team', category: 'pre_registered' },
  { name: 'Pelops Racing Team', category: 'pre_registered' },
  { name: 'fufracingteam', category: 'pre_registered' },
  { name: 'FRTUCY', category: 'pre_registered' },
  { name: 'Daedalus Racing Team', category: 'pre_registered' },
  // --- Registered (first array) ---
  { name: 'BCN eMotorsport', category: 'registered' },
  { name: 'Joanneum Racing Graz', category: 'registered' },
  { name: 'High-Voltage Motorsports e.V.', category: 'registered' },
  { name: 'TU Istanbul Racing', category: 'registered' },
  { name: 'Formula Electric Belgium', category: 'registered' },
  { name: 'STUBA Green Team', category: 'registered' },
  { name: 'YTU Racing', category: 'registered' },
  { name: 'Deefholt Dynamics e.V.', category: 'registered' },
  { name: 'NTHU Racing', category: 'registered' },
  { name: 'TGU RACING', category: 'registered' },
  { name: 'DTU - Self Driving Car', category: 'registered' },
  { name: 'ART TU Cluj-Napoca', category: 'registered' },
  { name: 'Team Octane Racing Electric', category: 'registered' },
  { name: 'AMZ Racing', category: 'registered' },
  { name: 'Rennteam Uni Stuttgart', category: 'registered' },
  // --- Registered (second array) ---
  { name: 'BME Motorsport', category: 'registered' },
  { name: 'Tampere Formula Student', category: 'registered' },
  { name: 'Trakya Racing Formula Student Team', category: 'registered' },
  { name: 'UGATU Racing Team', category: 'registered' },
  { name: 'OzU Racing', category: 'registered' },
  { name: 'MES Racing', category: 'registered' },
  { name: 'BlueStreamline', category: 'registered' },
  { name: 'PGRacing Team', category: 'registered' },
  { name: 'Universitas Indonesia Racing Team', category: 'registered' },
  { name: 'ENP RACING TEAM', category: 'registered' },
  { name: 'Formula Student ONPU', category: 'registered' },
  { name: 'UPB Drive', category: 'registered' },
  { name: 'Universidad Europea de Madrid', category: 'registered' },
  { name: 'NFS Team', category: 'registered' },
  { name: 'DEU Formula Racing Team', category: 'registered' },
  // --- Wild Card ---
  { name: 'IZTECH RACING', category: 'wildcard' },
  // --- Waiting List (first array) ---
  { name: 'TU Brno Racing', category: 'waiting_list' },
  { name: 'ARUS', category: 'waiting_list' },
  { name: 'Baltic Racing Team', category: 'waiting_list' },
  { name: 'ESTACA FORMULA TEAM', category: 'waiting_list' },
  { name: 'TUfast Racing Team E-technology', category: 'waiting_list' },
  { name: 'Raceyard E', category: 'waiting_list' },
  { name: 'Dynamics e.V.', category: 'waiting_list' },
  { name: 'BGRacing', category: 'waiting_list' },
  { name: 'greenBEAR', category: 'waiting_list' },
  { name: 'UniPR Racing Team', category: 'waiting_list' },
  { name: 'BlueStreamlinEV', category: 'waiting_list' },
  { name: 'UniNa Corse', category: 'waiting_list' },
  { name: 'E-Traxx', category: 'waiting_list' },
  { name: 'Rennstall Esslingen', category: 'waiting_list' },
  { name: 'ENI Metz Racing Team', category: 'waiting_list' },
  { name: 'BME Formula Racing Team', category: 'waiting_list' },
  { name: 'FESB Racing', category: 'waiting_list' },
  { name: 'PUT Motorsport', category: 'waiting_list' },
  { name: 'UPC ecoRacing', category: 'waiting_list' },
  { name: 'Team wob-racing.', category: 'waiting_list' },
  { name: 'T.U.C. Racing e.V.', category: 'waiting_list' },
  { name: 'Formula Student Team Weingarten', category: 'waiting_list' },
  { name: 'BRS Motorsport', category: 'waiting_list' },
  { name: 'Bauman Racing Team', category: 'waiting_list' },
  { name: 'Green Lion Racing', category: 'waiting_list' },
  { name: 'AU Dolphins', category: 'waiting_list' },
  { name: 'HofSpanung Motorsport e.V.', category: 'waiting_list' },
  { name: 'FS Team Tallinn', category: 'waiting_list' },
  { name: 'Team Starcraft', category: 'waiting_list' },
  { name: 'Elefant Racing Bayreuth', category: 'waiting_list' },
  { name: 'UGRacing', category: 'waiting_list' },
  { name: 'Team Spark', category: 'waiting_list' },
  { name: 'Team Ojas Racing', category: 'waiting_list' },
  { name: 'Scuderia Mensa HS RheinMain Racing', category: 'waiting_list' },
  { name: 'Racetech Racing Team TU Bergakademie Freiberg e.V.', category: 'waiting_list' },
  { name: 'TecnoCampus Motorsports', category: 'waiting_list' },
  { name: 'Dynamics UPC Manresa', category: 'waiting_list' },
  { name: 'UMD Racing e.V.', category: 'waiting_list' },
  { name: 'Riteh Racing Team', category: 'waiting_list' },
  { name: 'RUB Motorsport', category: 'waiting_list' },
  { name: 'ION Racing UiS', category: 'waiting_list' },
  { name: 'Aixtreme Racing', category: 'waiting_list' },
  { name: 'Formula Student FEUP', category: 'waiting_list' },
  { name: 'STES Racing Electric', category: 'waiting_list' },
  { name: 'METU Formula Racing', category: 'waiting_list' },
  { name: 'KOU Racing', category: 'waiting_list' },
  { name: 'HFS Racing Team', category: 'waiting_list' },
  { name: 'SUAS Racing', category: 'waiting_list' },
  { name: 'e-Tech Racing', category: 'waiting_list' },
  { name: 'UH Racing', category: 'waiting_list' },
  { name: 'Team Crack Platoon', category: 'waiting_list' },
  { name: 'HSNR Racing', category: 'waiting_list' },
  { name: 'Ignition Racing Team electric', category: 'waiting_list' },
  { name: 'E-Motion Rennteam Aalen e.V.', category: 'waiting_list' },
  { name: 'Blue Flash Mobility Concepts', category: 'waiting_list' },
  { name: 'UWB eRacing Team Pilsen', category: 'waiting_list' },
  { name: 'Leiria Academic Racing Team', category: 'waiting_list' },
  { name: 'Team Advantix', category: 'waiting_list' },
  { name: 'e.gnition Hamburg', category: 'waiting_list' },
  { name: 'Paul Ifrim', category: 'waiting_list' },
  // --- Waiting List (second array) ---
  { name: 'UPT Racing Team', category: 'waiting_list' },
  { name: 'Turon Motorsport', category: 'waiting_list' },
  { name: 'T.U.IASI Racing', category: 'waiting_list' },
  { name: 'ESTU Racing', category: 'waiting_list' },
  { name: 'NED Racers Formula Student', category: 'waiting_list' },
  { name: 'Formula UEM', category: 'waiting_list' },
  { name: 'Togliatti Racing Team', category: 'waiting_list' },
  { name: 'Marseille Racing', category: 'waiting_list' },
  { name: 'UJI Motorsport', category: 'waiting_list' },
  { name: 'TU-Sofia Racing', category: 'waiting_list' },
  { name: 'CRT Universidad de Córdoba', category: 'waiting_list' },
  { name: 'NUST Formula Student Team', category: 'waiting_list' },
  { name: 'SAU FORMULA', category: 'waiting_list' },
  { name: 'Cukurova Racing', category: 'waiting_list' },
  { name: 'Kingston racing', category: 'waiting_list' },
]

/** Category order for the dropdown. */
export const REGISTRATION_CATEGORY_ORDER: RegistrationCategory[] = [
  'pre_registered',
  'registered',
  'wildcard',
  'waiting_list',
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
