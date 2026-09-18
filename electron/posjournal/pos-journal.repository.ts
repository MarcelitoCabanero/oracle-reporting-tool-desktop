import sql from 'mssql'

import { getLocalDbPool } from '../database/localdb.js'

import type {
  PosJournalRecord,
} from './pos-journal.types.js'

function formatDateTime(value: Date): string {
  return value.toISOString()
}

export async function getPosJournals(
  businessDate: string,
): Promise<PosJournalRecord[]> {
  const pool = await getLocalDbPool()

  const result = await pool
    .request()
    .input('businessDate', sql.Date, businessDate)
    .query(`
      SELECT
        posJournalLogId,
        journalId,
        checkNum,
        transDateTime,
        chkOpenDateTime,
        journalText
      FROM dbo.POS_JOURNAL_LOG
      WHERE type = 128
        AND transDateTime >= @businessDate
        AND transDateTime < DATEADD(day, 1, @businessDate)
      ORDER BY transDateTime ASC, posJournalLogId ASC
    `)

  return result.recordset.map((row) => ({
    posJournalLogId: Number(row.posJournalLogId),
    journalId: Number(row.journalId),
    checkNum: Number(row.checkNum),
    transDateTime:
      row.transDateTime instanceof Date
        ? formatDateTime(row.transDateTime)
        : String(row.transDateTime ?? ''),
    chkOpenDateTime:
      row.chkOpenDateTime instanceof Date
        ? formatDateTime(row.chkOpenDateTime)
        : String(row.chkOpenDateTime ?? ''),
    journalText: String(row.journalText ?? ''),
  }))
}

export async function getPosJournalByCheckNumber(
  checkNumber: number,
): Promise<PosJournalRecord[]> {
  const pool = await getLocalDbPool()

  const result = await pool
    .request()
    .input('checkNumber', sql.Int, checkNumber)
    .query(`
      SELECT
        posJournalLogId,
        journalId,
        checkNum,
        transDateTime,
        chkOpenDateTime,
        journalText
      FROM dbo.POS_JOURNAL_LOG
      WHERE type = 128
        AND checkNum = @checkNumber
      ORDER BY transDateTime ASC, posJournalLogId ASC
    `)

  return result.recordset.map((row) => ({
    posJournalLogId: Number(row.posJournalLogId),
    journalId: Number(row.journalId),
    checkNum: Number(row.checkNum),
    transDateTime:
      row.transDateTime instanceof Date
        ? formatDateTime(row.transDateTime)
        : String(row.transDateTime ?? ''),
    chkOpenDateTime:
      row.chkOpenDateTime instanceof Date
        ? formatDateTime(row.chkOpenDateTime)
        : String(row.chkOpenDateTime ?? ''),
    journalText: String(row.journalText ?? ''),
  }))
}
