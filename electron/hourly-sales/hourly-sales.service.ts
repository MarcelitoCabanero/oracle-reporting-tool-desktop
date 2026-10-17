import {
  loadHourlyReportSources,
  insertHourlyEntries,
} from './hourly-sales.repository.js'

import type {
  CreateHourlyEntriesInput,
  CreateHourlyEntriesResult,
  HourlyDailyReport,
  HourlyDailyReportInput,
  HourlyDailyRow,
  HourlyPosSalesRow,
  HourlyQuantityTotals,
  HourlyReportSourceRow,
  HourlyReportSources,
} from './hourly-sales.types.js'

const emptyTotals = (): HourlyQuantityTotals => ({
  ring: 0,
  shell: 0,
  jpops: 0,
  total: 0,
})

function addTotals(
  left: HourlyQuantityTotals,
  right: HourlyQuantityTotals,
): HourlyQuantityTotals {
  const ring = left.ring + right.ring
  const shell = left.shell + right.shell
  const jpops = left.jpops + right.jpops

  return { ring, shell, jpops, total: ring + shell + jpops }
}

function sourceTotals(
  rows: HourlyReportSourceRow[],
): HourlyQuantityTotals {
  return rows.reduce((totals, row) => addTotals(totals, {
    ring: row.ringQty,
    shell: row.shellQty,
    jpops: row.jpopsQty,
    total: row.ringQty + row.shellQty + row.jpopsQty,
  }), emptyTotals())
}

function normalizeHourRange(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/NN/g, 'PM')
    .replace(/[\s–—-]+/g, '')
}

function formatHour(hour: number): string {
  const normalized = hour % 24
  const period = normalized === 12 ? 'NN' : normalized < 12 ? 'AM' : 'PM'
  const displayHour = normalized % 12 || 12

  return `${String(displayHour).padStart(2, '0')}:00 ${period}`
}

function createHourRanges(): string[] {
  return Array.from({ length: 24 }, (_, hour) =>
    `${formatHour(hour)} – ${formatHour(hour + 1)}`,
  )
}

function emptyRowTotals(): HourlyDailyRow {
  return {
    hourRange: '',
    opening: emptyTotals(),
    received: emptyTotals(),
    produced: emptyTotals(),
    proofingWaste: emptyTotals(),
    proofingGood: emptyTotals(),
    proofingWasteRate: 0,
    fryingWaste: emptyTotals(),
    fryingGood: emptyTotals(),
    fryingWasteRate: 0,
    toppingWaste: emptyTotals(),
    toppingGood: emptyTotals(),
    toppingWasteRate: 0,
    sold: emptyTotals(),
    ending: emptyTotals(),
  }
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator
}

function rollupHourlyReport(
  input: HourlyDailyReportInput,
  sources: HourlyReportSources,
): HourlyDailyReport {
  const retardingProducedRows = sources.produce.filter((row) =>
    row.time.trim().toUpperCase() === 'RETARDING' &&
    row.remarks !== 'Received Donuts',
  )
  const retardingReceivedRows = sources.produce.filter((row) =>
    row.time.trim().toUpperCase() === 'RETARDING' &&
    row.remarks === 'Received Donuts',
  )
  const retardingProduced = sourceTotals(retardingProducedRows)
  const retardingReceived = sourceTotals(retardingReceivedRows)
  const produceByHour = new Map<string, { produced: HourlyQuantityTotals; received: HourlyQuantityTotals }>()
  const wasteByHour = new Map<string, { proofing: HourlyQuantityTotals; frying: HourlyQuantityTotals; topping: HourlyQuantityTotals }>()
  const salesByHour = new Map<string, HourlyQuantityTotals>()

  for (const row of sources.produce) {
    if (row.time.trim().toUpperCase() === 'RETARDING') {
      continue
    }

    const key = normalizeHourRange(row.time)
    const entry = produceByHour.get(key) ?? {
      produced: emptyTotals(),
      received: emptyTotals(),
    }
    const totals = sourceTotals([row])

    if (row.remarks === 'Received Donuts') {
      entry.received = addTotals(entry.received, totals)
    } else {
      entry.produced = addTotals(entry.produced, totals)
    }

    produceByHour.set(key, entry)
  }

  for (const row of sources.waste) {
    const remark = row.remarks.trim().toLowerCase()
    if (remark !== 'proofing' && remark !== 'frying' && remark !== 'topping') {
      continue
    }

    const key = normalizeHourRange(row.time)
    const entry = wasteByHour.get(key) ?? {
      proofing: emptyTotals(),
      frying: emptyTotals(),
      topping: emptyTotals(),
    }
    entry[remark] = addTotals(entry[remark], sourceTotals([row]))
    wasteByHour.set(key, entry)
  }

  for (const row of sources.sales) {
    const key = normalizeHourRange(row.hourRange)
    const current = salesByHour.get(key) ?? emptyTotals()
    const jpopsEquivalent = row.jpopsSold * 24
    salesByHour.set(key, addTotals(current, {
      ring: row.ringSold,
      shell: row.shellSold + row.jclubSold,
      jpops: jpopsEquivalent,
      total: row.ringSold + row.shellSold + row.jclubSold + jpopsEquivalent,
    }))
  }

  let priorEnding: HourlyQuantityTotals = {
    ring: retardingProduced.ring,
    shell: retardingProduced.shell + retardingProduced.jpops,
    jpops: 0,
    total: retardingProduced.ring + retardingProduced.shell + retardingProduced.jpops,
  }

  const rows = createHourRanges().map((hourRange) => {
    const row = emptyRowTotals()
    const key = normalizeHourRange(hourRange)
    const produce = produceByHour.get(key)
    const waste = wasteByHour.get(key)

    row.hourRange = hourRange
    row.opening = { ...priorEnding }
    row.received = produce?.received ?? emptyTotals()
    row.produced = produce?.produced ?? emptyTotals()
    row.proofingWaste = waste?.proofing ?? emptyTotals()
    row.fryingWaste = waste?.frying ?? emptyTotals()
    row.toppingWaste = waste?.topping ?? emptyTotals()
    row.sold = salesByHour.get(key) ?? emptyTotals()

    const beforeProofingRing = row.opening.ring + row.received.ring + row.produced.ring
    const beforeProofingShell = row.opening.shell + row.received.shell + row.received.jpops + row.produced.shell + row.produced.jpops
    row.proofingGood = {
      ring: beforeProofingRing - row.proofingWaste.ring,
      shell: beforeProofingShell - row.proofingWaste.shell - row.proofingWaste.jpops,
      jpops: 0,
      total: beforeProofingRing + beforeProofingShell - row.proofingWaste.total,
    }
    row.proofingWasteRate = ratio(
      row.proofingWaste.total,
      row.proofingGood.total + row.proofingWaste.total,
    )

    row.fryingGood = {
      ring: row.proofingGood.ring - row.fryingWaste.ring,
      shell: row.proofingGood.shell - row.fryingWaste.shell - row.fryingWaste.jpops,
      jpops: 0,
      total: row.proofingGood.total - row.fryingWaste.total,
    }
    row.fryingWasteRate = ratio(
      row.fryingWaste.total,
      row.fryingGood.total + row.fryingWaste.total,
    )

    row.toppingGood = {
      ring: row.fryingGood.ring - row.toppingWaste.ring,
      shell: row.fryingGood.shell - row.toppingWaste.shell - row.toppingWaste.jpops,
      jpops: 0,
      total: row.fryingGood.total - row.toppingWaste.total,
    }
    row.toppingWasteRate = ratio(
      row.toppingWaste.total,
      row.toppingGood.total + row.toppingWaste.total,
    )

    row.ending = {
      ring: row.toppingGood.ring - row.sold.ring,
      shell: row.toppingGood.shell - row.sold.shell - row.sold.jpops,
      jpops: 0,
      total: row.toppingGood.total - row.sold.total,
    }
    priorEnding = row.ending

    return row
  })

  const produced = sourceTotals(sources.produce.filter((row) => row.remarks !== 'Received Donuts'))
  const received = sourceTotals(sources.produce.filter((row) => row.remarks === 'Received Donuts'))
  const sold = rows.reduce((total, row) => addTotals(total, row.sold), emptyTotals())
  const proofingWaste = rows.reduce((total, row) => addTotals(total, row.proofingWaste), emptyTotals())
  const fryingWaste = rows.reduce((total, row) => addTotals(total, row.fryingWaste), emptyTotals())
  const toppingWaste = rows.reduce((total, row) => addTotals(total, row.toppingWaste), emptyTotals())
  const totalWaste = sourceTotals(sources.waste)
  const netProducedSales: HourlyQuantityTotals = {
    ring: sold.ring - received.ring,
    shell: sold.shell + sold.jpops - received.shell - received.jpops,
    jpops: 0,
    total: sold.total - received.total,
  }
  const variance: HourlyQuantityTotals = {
    ring: produced.ring - netProducedSales.ring,
    shell: produced.shell + produced.jpops - netProducedSales.shell,
    jpops: 0,
    total: produced.total - netProducedSales.total,
  }
  const endingInventory = rows.at(-1)?.ending ?? emptyTotals()
  const tolerableVariance = produced.total * 0.03
  const tolerableWaste = produced.total * 0.01
  const excessWaste = Math.max(0, totalWaste.total - tolerableWaste)

  return {
    businessDate: input.businessDate,
    locationName: input.locationName,
    retardingProduced,
    retardingReceived,
    posSales: sources.sales.map((row): HourlyPosSalesRow => ({
      businessDate: input.businessDate,
      hourRange: row.hourRange,
      ringSold: row.ringSold,
      shellSold: row.shellSold,
      jpopsSold: row.jpopsSold,
      jclubSold: row.jclubSold,
    })),
    posWaste: sources.posWaste,
    rows,
    summary: {
      produced,
      received,
      sold,
      netProducedSales,
      variance,
      tolerableVariance,
      proofingWaste,
      fryingWaste,
      toppingWaste,
      totalWaste,
      tolerableWaste,
      excessWaste,
      excessWasteEquivalent: excessWaste * 27,
      endingInventory,
      salesAllocation: ratio(netProducedSales.total, produced.total),
      wasteAllocation: ratio(totalWaste.total, produced.total),
      varianceAllocation: ratio(variance.total, produced.total),
    },
  }
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const parsed = new Date(`${value}T00:00:00.000Z`)

  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
}

function normalizeEntryQuantity(
  value: unknown,
  entryNumber: number,
): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Entry ${entryNumber} quantities must be whole numbers.`)
  }

  return value
}

export async function createHourlyEntries(
  input: CreateHourlyEntriesInput,
): Promise<CreateHourlyEntriesResult> {
  if (input.kind !== 'produce' && input.kind !== 'waste') {
    throw new Error('Choose either Produce or Waste.')
  }

  if (!input.locationName.trim() || input.locationName.length > 50) {
    throw new Error('A valid location is required.')
  }

  if (!isValidDate(input.businessDate)) {
    throw new Error('Choose a valid business date.')
  }

  if (input.rows.length === 0 || input.rows.length > 100) {
    throw new Error('Submit between 1 and 100 entries at a time.')
  }

  const seenTimes = new Set<string>()
  const normalizedRows: CreateHourlyEntriesInput['rows'] = []
  for (const [index, row] of input.rows.entries()) {
    if (!row.time.trim() || row.time.length > 50) {
      throw new Error(`Entry ${index + 1} needs a valid time.`)
    }

    const normalizedTime = row.time.trim().toUpperCase()
    if (normalizedTime !== 'RETARDING' && seenTimes.has(normalizedTime)) {
      throw new Error(`Entry ${index + 1} repeats the ${row.time} time duration. Each duration can only be entered once.`)
    }
    if (normalizedTime !== 'RETARDING') seenTimes.add(normalizedTime)

    if (!isValidDate(row.entryDate)) {
      throw new Error(`Entry ${index + 1} needs a valid date.`)
    }

    if (!row.remarks.trim() || row.remarks.length > 50) {
      throw new Error(`Entry ${index + 1} needs valid remarks.`)
    }

    const shellQty = normalizeEntryQuantity(row.shellQty, index + 1)
    const ringQty = normalizeEntryQuantity(row.ringQty, index + 1)
    const jpopsQty = normalizeEntryQuantity(row.jpopsQty, index + 1)
    const quantities = [shellQty, ringQty, jpopsQty]

    const isReceivedDonuts = input.kind === 'produce' && row.remarks.trim() === 'Received Donuts'
    if (
      isReceivedDonuts
        ? quantities.every((quantity) => quantity === null)
        : quantities.every((quantity) => quantity === null || quantity === 0)
    ) {
      const message = isReceivedDonuts
        ? `Entry ${index + 1} received donuts must have at least one quantity field filled.`
        : `Entry ${index + 1} must have a quantity greater than zero.`
      throw new Error(message)
    }

    normalizedRows.push({
      ...row,
      shellQty,
      ringQty,
      jpopsQty,
    })
  }

  await insertHourlyEntries({
    ...input,
    rows: normalizedRows,
  })

  return {
    success: true,
    insertedCount: input.rows.length,
    message: `${input.rows.length} ${input.kind} ${input.rows.length === 1 ? 'entry' : 'entries'} saved.`,
  }
}

export async function getHourlyDailyReport(
  input: HourlyDailyReportInput,
): Promise<HourlyDailyReport> {
  if (!isValidDate(input.businessDate)) {
    throw new Error('Choose a valid business date.')
  }

  if (!input.locationName.trim() || input.locationName.length > 50) {
    throw new Error('A valid location is required.')
  }

  const sources = await loadHourlyReportSources(input)

  return rollupHourlyReport(input, sources)
}