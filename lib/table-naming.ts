type NamedTable = {
  zone: string
  name: string
}

export function getNextTableName(zone: string, tables: NamedTable[]): string {
  const highestSuffix = tables.reduce((highest, table) => {
    if (table.zone !== zone || !table.name.startsWith(zone)) return highest

    const suffix = table.name.slice(zone.length)
    if (!/^\d+$/.test(suffix)) return highest

    return Math.max(highest, Number(suffix))
  }, 0)

  return `${zone}${highestSuffix + 1}`
}
