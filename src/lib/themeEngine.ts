const DEFAULT_BRAND_COLOR = '#4f6ef7'
const LIGHT_SURFACE_HEX = '#ffffff'
const DARK_SURFACE_HEX = '#202634'

export interface GeneratedTheme {
  primary: string
  primaryHover: string
  primaryActive: string
  primaryLight: string
  primaryBorder: string
  buttonBg: string
  buttonHover: string
  sidebarActiveBg: string
  linkColor: string
  primaryRgb: string
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const normalizeHex = (value: string): string => {
  const hex = value.trim().replace('#', '')

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex
      .split('')
      .map((char) => `${char}${char}`)
      .join('')}`.toLowerCase()
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return `#${hex}`.toLowerCase()
  }

  throw new Error('Invalid hex color format')
}

export const isValidHex = (value: string): boolean => {
  try {
    normalizeHex(value)
    return true
  } catch {
    return false
  }
}

export const hexToRgb = (hexColor: string) => {
  const normalized = normalizeHex(hexColor)
  const numeric = Number.parseInt(normalized.slice(1), 16)

  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  }
}

export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (channel: number) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const rgbToHsl = (r: number, g: number, b: number) => {
  const red = r / 255
  const green = g / 255
  const blue = b / 255

  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min

  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)

    switch (max) {
      case red:
        h = ((green - blue) / delta + (green < blue ? 6 : 0)) / 6
        break
      case green:
        h = ((blue - red) / delta + 2) / 6
        break
      default:
        h = ((red - green) / delta + 4) / 6
        break
    }
  }

  return { h, s, l }
}

const hslToRgb = (h: number, s: number, l: number) => {
  if (s === 0) {
    const gray = Math.round(l * 255)
    return { r: gray, g: gray, b: gray }
  }

  const hueToChannel = (p: number, q: number, tInput: number) => {
    let t = tInput
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  return {
    r: Math.round(hueToChannel(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToChannel(p, q, h) * 255),
    b: Math.round(hueToChannel(p, q, h - 1 / 3) * 255),
  }
}

const adjustLightness = (hexColor: string, amount: number) => {
  const { r, g, b } = hexToRgb(hexColor)
  const { h, s, l } = rgbToHsl(r, g, b)
  const rgb = hslToRgb(h, s, clamp(l + amount, 0, 1))
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

export const lighten = (hexColor: string, amount = 0.08) => adjustLightness(hexColor, Math.abs(amount))

export const darken = (hexColor: string, amount = 0.08) => adjustLightness(hexColor, -Math.abs(amount))

const channelToLinear = (value: number) => {
  const normalized = value / 255
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

const relativeLuminance = (hexColor: string) => {
  const { r, g, b } = hexToRgb(hexColor)
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
}

export const contrastRatio = (hexA: string, hexB: string): number => {
  const lumA = relativeLuminance(hexA)
  const lumB = relativeLuminance(hexB)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}

export const contrastCheck = (foreground: string, background: string, min = 4.5): boolean => {
  return contrastRatio(foreground, background) >= min
}

export const convertToRGBA = (hexColor: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hexColor)
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`
}

const clampToSaaSRange = (hexColor: string) => {
  const { r, g, b } = hexToRgb(hexColor)
  const hsl = rgbToHsl(r, g, b)

  const adjusted = hslToRgb(
    hsl.h,
    clamp(hsl.s, 0.46, 0.82),
    clamp(hsl.l, 0.34, 0.58)
  )

  return rgbToHex(adjusted.r, adjusted.g, adjusted.b)
}

const ensureAccessiblePrimary = (hexColor: string) => {
  let candidate = clampToSaaSRange(hexColor)
  let guard = 0

  while (!contrastCheck(candidate, LIGHT_SURFACE_HEX, 4.5) && guard < 20) {
    candidate = darken(candidate, 0.03)
    guard += 1
  }

  guard = 0
  while (!contrastCheck(candidate, DARK_SURFACE_HEX, 3) && guard < 20) {
    candidate = lighten(candidate, 0.02)
    guard += 1
  }

  return candidate
}

export const generateThemeFromBrand = (hexColor?: string | null): GeneratedTheme => {
  const safeInput = hexColor && isValidHex(hexColor) ? hexColor : DEFAULT_BRAND_COLOR
  const primary = ensureAccessiblePrimary(safeInput)
  const primaryHover = darken(primary, 0.08)
  const primaryActive = darken(primary, 0.12)

  const { r, g, b } = hexToRgb(primary)

  return {
    primary,
    primaryHover,
    primaryActive,
    primaryLight: convertToRGBA(primary, 0.12),
    primaryBorder: convertToRGBA(primary, 0.30),
    buttonBg: primary,
    buttonHover: primaryHover,
    sidebarActiveBg: convertToRGBA(primary, 0.12),
    linkColor: primary,
    primaryRgb: `${r}, ${g}, ${b}`,
  }
}

export const applyTenantTheme = (brandColor?: string | null): void => {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const isDark = document.body.classList.contains('dark')
  const theme = generateThemeFromBrand(brandColor)
  const darkAwarePrimaryLight = convertToRGBA(theme.primary, isDark ? 0.2 : 0.12)

  root.style.setProperty('--color-primary', theme.primary)
  root.style.setProperty('--color-primary-rgb', theme.primaryRgb)
  root.style.setProperty('--color-primary-hover', theme.primaryHover)
  root.style.setProperty('--color-primary-active', theme.primaryActive)
  root.style.setProperty('--color-primary-light', darkAwarePrimaryLight)
  root.style.setProperty('--color-primary-border', theme.primaryBorder)
  root.style.setProperty('--button-bg', theme.buttonBg)
  root.style.setProperty('--button-hover', theme.buttonHover)
  root.style.setProperty('--sidebar-active-bg', theme.sidebarActiveBg)
  root.style.setProperty('--sidebar-active-border', theme.primary)
  root.style.setProperty('--link-color', theme.linkColor)
}

export const extractTenantBrandColor = (payload: Record<string, any> | undefined): string | null => {
  if (!payload) return null

  const tenantObject = payload.tenant && typeof payload.tenant === 'object' ? payload.tenant : undefined

  return (
    payload.brandColor ||
    payload.primaryColor ||
    payload.tenantBrandColor ||
    payload.tenantColor ||
    tenantObject?.brandColor ||
    tenantObject?.primaryColor ||
    null
  )
}
