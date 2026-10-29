type NamedTable = {
  zone: string
  name: string
}

export function getNextTableName(zone: string, tables: NamedTable[]): string {
  const usedSuffixes = new Set<number>()

  tables.forEach((table) => {
    if (table.zone !== zone || !table.name.startsWith(zone)) return

    const suffix = table.name.slice(zone.length)
    if (!/^\d+$/.test(suffix)) return

    const value = Number(suffix)
    if (value > 0) usedSuffixes.add(value)
  })

  let nextSuffix = 1
  while (usedSuffixes.has(nextSuffix)) nextSuffix += 1

  return `${zone}${nextSuffix}`
}
