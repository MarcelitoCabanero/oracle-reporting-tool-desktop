import sql from 'mssql'
import { getLocalDbPool } from '../database/localdb.js'
export async function loadScPwd(input:{dateFrom:string;dateTo:string;type:string}){
 const p=await getLocalDbPool(); const r=await p.request().input('from',sql.Date,input.dateFrom).input('to',sql.Date,input.dateTo).input('type',sql.VarChar,input.type).query(`
 SELECT MicrosChkNum checkNumber,MicrosBsnzDate businessDate,CASE invoicetype WHEN 2 THEN 'OSCA' WHEN 3 THEN 'PWD' END discountType,subtotal14 grossSale,TaxTtl2 lessVat,CASE invoicetype WHEN 2 THEN TaxTtl3 WHEN 3 THEN TaxTtl4 END lessDisc,subtotal10 netSales,uwid_name workstation,sc_pwd_id discountId,sc_pwd_name discountName FROM (
 SELECT f.MicrosChkNum,f.MicrosBsnzDate,f.invoicetype,f.subtotal14,f.TaxTtl2,f.TaxTtl3,f.TaxTtl4,f.subtotal10,uw.posname uwid_name,f.ExtraField1 sc_pwd_id,f.ExtraField2 sc_pwd_name FROM dbo.FCR_INVOICE_DATA f LEFT JOIN dbo.dts_workstation uw ON f.PCWSID=uw.pcwsid WHERE f.invoicetype IN(2,3) AND f.MicrosBsnzDate>=@from AND f.MicrosBsnzDate<DATEADD(day,1,@to)
 UNION ALL SELECT f.MicrosChkNum,f.MicrosBsnzDate,f.invoicetype,f.subtotal14,f.TaxTtl2,f.TaxTtl3,f.TaxTtl4,f.subtotal10,uw.posname,f.ExtraField3,f.ExtraField4 FROM dbo.FCR_INVOICE_DATA f LEFT JOIN dbo.dts_workstation uw ON f.PCWSID=uw.pcwsid WHERE f.invoicetype IN(2,3) AND f.MicrosBsnzDate>=@from AND f.MicrosBsnzDate<DATEADD(day,1,@to)
 UNION ALL SELECT f.MicrosChkNum,f.MicrosBsnzDate,f.invoicetype,f.subtotal14,f.TaxTtl2,f.TaxTtl3,f.TaxTtl4,f.subtotal10,uw.posname,f.ExtraField5,f.ExtraField6 FROM dbo.FCR_INVOICE_DATA f LEFT JOIN dbo.dts_workstation uw ON f.PCWSID=uw.pcwsid WHERE f.invoicetype IN(2,3) AND f.MicrosBsnzDate>=@from AND f.MicrosBsnzDate<DATEADD(day,1,@to)) x WHERE sc_pwd_id IS NOT NULL AND (@type='ALL' OR CASE invoicetype WHEN 2 THEN 'OSCA' WHEN 3 THEN 'PWD' END=@type) ORDER BY MicrosBsnzDate,MicrosChkNum`)
 return r.recordset
}
