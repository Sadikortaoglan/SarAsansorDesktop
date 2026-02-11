/**
 * Utility functions for formatting elevator display names
 * Converts technical codes (O1, A2, B1) to user-friendly format
 */

export interface ElevatorDisplayInfo {
  /** Full display name: "A Blok - 1 No'lu Asansör" */
  fullName: string
  /** Short display name for calendar: "🛗 A Blok - 1" */
  shortName: string
  /** Block letter: "A", "B", "O", etc. */
  block: string
  /** Elevator number: "1", "2", etc. */
  number: string
  /** Technical code: "A1", "O1", etc. */
  technicalCode: string
}

/**
 * Parse elevator identity number (kimlikNo) to extract block and number
 * Examples:
 * - "O1" -> { block: "O", number: "1" }
 * - "A2" -> { block: "A", number: "2" }
 * - "B1" -> { block: "B", number: "1" }
 * - "ELEV-001" -> { block: "", number: "001" }
 */
export function parseElevatorCode(kimlikNo: string | undefined | null): {
  block: string
  number: string
} {
  if (!kimlikNo) {
    return { block: '', number: '' }
  }

  // Remove "ELEV-" prefix if exists
  const code = kimlikNo.replace(/^ELEV-?/i, '').trim()

  // Try to match pattern: Letter(s) + Number(s)
  // Examples: "O1", "A2", "B1", "AB12"
  const match = code.match(/^([A-Za-z]+)?(\d+)$/)

  if (match) {
    const block = match[1] || ''
    const number = match[2] || ''
    return { block: block.toUpperCase(), number }
  }

  // If no match, return as-is
  return { block: '', number: code }
}

/**
 * Format elevator display name
 * @param elevator - Elevator object with kimlikNo, bina, adres, etc.
 * @param options - Formatting options
 */
export function formatElevatorDisplayName(
  elevator: {
    kimlikNo?: string | null
    bina?: string | null
    adres?: string | null
    durak?: string | null
    asansorNo?: string | null
  },
  options: {
    /** Include building name in full format */
    includeBuilding?: boolean
    /** Include address */
    includeAddress?: boolean
    /** Show technical code as badge */
    showTechnicalCode?: boolean
  } = {}
): ElevatorDisplayInfo {
  const { block, number } = parseElevatorCode(elevator.kimlikNo)
  const technicalCode = elevator.kimlikNo || `ELEV-${elevator.durak || ''}`

  // Build block name
  const blockName = block ? `${block} Blok` : ''

  // Build number suffix
  const numberSuffix = number ? `${number} No'lu` : ''

  // Full name: "A Blok - 1 No'lu Asansör"
  let fullName = ''
  if (blockName && numberSuffix) {
    fullName = `${blockName} - ${numberSuffix} Asansör`
  } else if (blockName) {
    fullName = `${blockName} Asansör`
  } else if (numberSuffix) {
    fullName = `${numberSuffix} Asansör`
  } else {
    // Fallback to building name or technical code
    fullName = elevator.bina || technicalCode
  }

  // Short name for calendar: "🛗 A Blok - 1"
  let shortName = '🛗 '
  if (blockName && number) {
    shortName += `${blockName} - ${number}`
  } else if (blockName) {
    shortName += blockName
  } else if (number) {
    shortName += `Asansör ${number}`
  } else {
    shortName += elevator.bina || technicalCode
  }

  return {
    fullName,
    shortName,
    block,
    number,
    technicalCode,
  }
}

/**
 * Format elevator for maintenance plan display
 * Includes building name, address, and maintenance type
 */
export function formatMaintenancePlanElevator(
  plan: {
    elevatorCode?: string | null
    elevatorName?: string | null
    elevatorId?: number
    buildingName?: string | null
  },
  elevator?: {
    kimlikNo?: string | null
    bina?: string | null
    adres?: string | null
  },
  maintenanceType?: string | null
): {
  title: string
  subtitle: string
  technicalCode: string
} {
  // Try to get elevator info from plan or elevator object
  const kimlikNo = plan.elevatorCode || elevator?.kimlikNo
  const bina = plan.buildingName || elevator?.bina
  const adres = elevator?.adres

  const displayInfo = formatElevatorDisplayName({
    kimlikNo: kimlikNo || undefined,
    bina: bina || undefined,
    adres: adres || undefined,
  })

  // Title: "🛗 A Blok - 1 No'lu Asansör"
  const title = displayInfo.fullName

  // Subtitle: Building name, address, maintenance type
  const subtitleParts: string[] = []
  if (bina) subtitleParts.push(bina)
  if (adres) subtitleParts.push(adres)
  if (maintenanceType) subtitleParts.push(maintenanceType)
  const subtitle = subtitleParts.join(' • ')

  return {
    title,
    subtitle,
    technicalCode: displayInfo.technicalCode,
  }
}
