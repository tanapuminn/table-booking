export const ZONE_COLOR_PRESETS = [
  "#C0267A",
  "#2563EB",
  "#059669",
  "#7C3AED",
  "#D97706",
  "#0891B2",
  "#DC2626",
  "#4F46E5",
] as const

type ColorZone = { id: string; color?: string }

export function isValidZoneColor(color?: string): color is string {
  return Boolean(color && /^#[0-9A-F]{6}$/i.test(color))
}

export function getZoneColor(zoneId: string, zones: ColorZone[]) {
  const index = Math.max(0, zones.findIndex((zone) => zone.id === zoneId))
  const savedColor = zones[index]?.color
  return isValidZoneColor(savedColor)
    ? savedColor.toUpperCase()
    : ZONE_COLOR_PRESETS[index % ZONE_COLOR_PRESETS.length]
}
