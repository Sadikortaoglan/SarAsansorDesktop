const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const normalizeHex = (value) => {
  const input = String(value || '').trim().replace('#', '')

  if (/^[0-9a-fA-F]{3}$/.test(input)) {
    return `#${input
      .split('')
      .map((char) => `${char}${char}`)
      .join('')}`.toLowerCase()
  }

  if (/^[0-9a-fA-F]{6}$/.test(input)) {
    return `#${input}`.toLowerCase()
  }

  throw new Error('Invalid hex color')
}

export const isValidHex = (value) => {
  try {
    normalizeHex(value)
    return true
  } catch {
    return false
  }
}

export const hexToRgb = (hexColor) => {
  const normalized = normalizeHex(hexColor)
  const numeric = Number.parseInt(normalized.slice(1), 16)

  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  }
}

export const rgbToHex = (r, g, b) => {
  const toHex = (channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export const rgbToHsl = (r, g, b) => {
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

export const hslToRgb = (h, s, l) => {
  if (s === 0) {
    const gray = Math.round(l * 255)
    return { r: gray, g: gray, b: gray }
  }

  const hueToChannel = (p, q, tInput) => {
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

const adjustLightness = (hexColor, amount) => {
  const { r, g, b } = hexToRgb(hexColor)
  const { h, s, l } = rgbToHsl(r, g, b)
  const rgb = hslToRgb(h, s, clamp(l + amount, 0, 1))
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

export const lighten = (hexColor, amount = 0.08) => adjustLightness(hexColor, Math.abs(amount))
export const darken = (hexColor, amount = 0.08) => adjustLightness(hexColor, -Math.abs(amount))

const channelToLinear = (value) => {
  const normalized = value / 255
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

const relativeLuminance = (hexColor) => {
  const { r, g, b } = hexToRgb(hexColor)
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
}

export const contrastRatio = (hexA, hexB) => {
  const lumA = relativeLuminance(hexA)
  const lumB = relativeLuminance(hexB)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}

export const contrastCheck = (foreground, background, min = 4.5) => {
  return contrastRatio(foreground, background) >= min
}

export const convertToRGBA = (hexColor, alpha) => {
  const { r, g, b } = hexToRgb(hexColor)
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`
}

export const clampSaturationAndLuminance = (hexColor, options = {}) => {
  const {
    minSaturation = 0.42,
    maxSaturation = 0.8,
    minLuminance = 0.34,
    maxLuminance = 0.6,
  } = options

  const { r, g, b } = hexToRgb(hexColor)
  const hsl = rgbToHsl(r, g, b)

  const adjusted = hslToRgb(
    hsl.h,
    clamp(hsl.s, minSaturation, maxSaturation),
    clamp(hsl.l, minLuminance, maxLuminance)
  )

  return rgbToHex(adjusted.r, adjusted.g, adjusted.b)
}
