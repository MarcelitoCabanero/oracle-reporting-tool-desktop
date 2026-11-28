USE [CheckPostingDB]
GO
/****** Object:  View [dbo].[v_itemdetail]    Script Date: 11/27/2026 9:07:40 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF OBJECT_ID(N'[dbo].[v_itemdetail]', N'V') IS NOT NULL
    DROP VIEW [dbo].[v_itemdetail]
GO
CREATE VIEW [dbo].[v_itemdetail]
AS
SELECT        dbo.CHECK_DETAIL.ObjectNumber, SUM(dbo.CHECK_DETAIL.SalesCount) AS qty, SUM(dbo.CHECK_DETAIL.Total) AS amt, dbo.CHECK_DETAIL.VoidLink, dbo.CHECK_DETAIL.DetailPostingTime,
                         CASE WHEN CHECK_DETAIL.ObjectNumber BETWEEN 2111001 AND 2111100 THEN 'Ring' WHEN CHECK_DETAIL.ObjectNumber BETWEEN 2131001 AND 2141100 THEN 'Shell' WHEN CHECK_DETAIL.ObjectNumber BETWEEN
                         2431001 AND 2431015 THEN 'JClub' WHEN CHECK_DETAIL.ObjectNumber BETWEEN 2331002 AND 2331036 THEN 'Jpops' WHEN CHECK_DETAIL.ObjectNumber BETWEEN 1111001 AND
                         1354100 THEN 'Beverage' END AS Category, dbo.dts_object.itemname, dbo.dts_object.Transtype, dbo.CHECK_DETAIL.CheckID, dbo.dts_rvc.rvctype AS rvc_type
FROM            dbo.CHECK_DETAIL LEFT OUTER JOIN
                         dbo.dts_object ON dbo.CHECK_DETAIL.ObjectNumber = dbo.dts_object.itemnumber LEFT OUTER JOIN
                         dbo.dts_rvc ON dbo.CHECK_DETAIL.RevCtrID = dbo.dts_rvc.rvcid
WHERE        (dbo.CHECK_DETAIL.ObjectNumber IS NOT NULL) AND (dbo.CHECK_DETAIL.VoidLink IS NULL) AND (dbo.CHECK_DETAIL.SalesCount IS NOT NULL) AND (dbo.CHECK_DETAIL.SalesCount <> 0) OR
                         (dbo.CHECK_DETAIL.ObjectNumber IS NOT NULL) AND (dbo.CHECK_DETAIL.VoidLink IS NULL) AND (dbo.CHECK_DETAIL.SalesCount IS NOT NULL) AND (dbo.CHECK_DETAIL.Total <> 0)
GROUP BY dbo.CHECK_DETAIL.ObjectNumber, dbo.CHECK_DETAIL.VoidLink, dbo.CHECK_DETAIL.DetailPostingTime, dbo.dts_object.itemname, dbo.dts_object.Transtype, dbo.CHECK_DETAIL.CheckID, dbo.dts_rvc.rvctype
GO
/****** Object:  View [dbo].[v_donutsold]    Script Date: 11/27/2026 9:07:40 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF OBJECT_ID(N'[dbo].[v_donutsold]', N'V') IS NOT NULL
    DROP VIEW [dbo].[v_donutsold]
GO


CREATE VIEW [dbo].[v_donutsold]
AS
WITH Sales AS (
    SELECT
        CAST(DetailPostingTime AS DATE) AS DateSold,
        DATEPART(HOUR, DetailPostingTime) AS HourNum,
        SUM(CASE WHEN Category = 'Ring' THEN qty ELSE 0 END) AS RingSold,
        SUM(CASE WHEN Category = 'Shell' THEN qty ELSE 0 END) AS ShellSold,
CAST(
    ROUND(
        SUM(
            CASE
                WHEN Category = 'Jpops'
                THEN qty * 7.0 / 35
                ELSE 0
            END
        ),
        0
    ) AS INT
) AS JpopsSold,
		SUM(CASE WHEN Category = 'JClub' THEN qty ELSE 0 END) AS jclubsold
    FROM dbo.v_itemdetail
    WHERE (rvc_type <> 'FOC Waste')
    GROUP BY CAST(DetailPostingTime AS DATE), DATEPART(HOUR, DetailPostingTime)
    HAVING (SUM(qty) > 0)
)
SELECT TOP (100) PERCENT
    CASE
        WHEN s.HourNum = 0 THEN '12:00 AM – 01:00 AM'
        WHEN s.HourNum < 12 THEN FORMAT(s.HourNum, '00') + ':00 AM – ' + FORMAT(s.HourNum + 1, '00') + ':00 AM'
        WHEN s.HourNum = 12 THEN '12:00 NN – 01:00 PM'
        WHEN s.HourNum > 12 AND s.HourNum < 23 THEN FORMAT(s.HourNum - 12, '00') + ':00 PM – ' + FORMAT(s.HourNum - 11, '00') + ':00 PM'
        WHEN s.HourNum = 23 THEN '11:00 PM – 12:00 AM'
    END AS HourRange,
    DateSold, RingSold, ShellSold, JpopsSold, jclubsold
FROM Sales AS s;
GO
/****** Object:  View [dbo].[v_revenue]    Script Date: 11/27/2026 9:07:40 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF OBJECT_ID(N'[dbo].[v_revenue]', N'V') IS NOT NULL
    DROP VIEW [dbo].[v_revenue]
GO
CREATE VIEW [dbo].[v_revenue]
AS
SELECT        dbo.CHECKS.CheckID, dbo.FCR_INVOICE_DATA.MicrosChkNum AS CheckNumber, dbo.FCR_INVOICE_DATA.MicrosBsnzDate AS busidate, dbo.FCR_INVOICE_DATA.FCRBsnzDate AS busidatetime,
                         dbo.dts_ordertype.ordtypename AS order_type, dbo.dts_workstation.posname AS Workstation, dbo.FCR_INVOICE_DATA.PCWSID AS WorkstationID, dbo.FCR_INVOICE_DATA.Subtotal14 AS TotSales, dbo.CHECKS.Payment,
                         CASE WHEN FCR_INVOICE_DATA.subtotal1 = 0 AND FCRInvNumber IS NOT NULL THEN subtotal10 ELSE 0 END AS GC_sales, CASE WHEN CHECKS.SubTotal IS NOT NULL THEN CHECKS.Other ELSE 0 END AS GC_excess,
                         dbo.FCR_INVOICE_DATA.FCRInvNumber, CASE WHEN CHECKS.SplitFromCheckNum IS NULL THEN 1 ELSE 0 END AS GuestCount
FROM            dbo.FCR_INVOICE_DATA LEFT OUTER JOIN
                         dbo.dts_ordertype ON dbo.FCR_INVOICE_DATA.InvoiceType = dbo.dts_ordertype.ordtypeID LEFT OUTER JOIN
                         dbo.dts_workstation ON dbo.FCR_INVOICE_DATA.PCWSID = dbo.dts_workstation.pcwsid LEFT OUTER JOIN
                         dbo.CHECKS ON dbo.FCR_INVOICE_DATA.MicrosChkNum = dbo.CHECKS.CheckNumber AND dbo.FCR_INVOICE_DATA.Subtotal10 = dbo.CHECKS.Payment
WHERE        (dbo.CHECKS.CheckID IS NOT NULL)
GO
/****** Object:  View [dbo].[v_salesdetails]    Script Date: 11/27/2026 9:07:40 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF OBJECT_ID(N'[dbo].[v_salesdetails]', N'V') IS NOT NULL
    DROP VIEW [dbo].[v_salesdetails]
GO
CREATE VIEW [dbo].[v_salesdetails]
AS
WITH DiscountFlags AS (SELECT        cd.CheckID, MAX(CASE WHEN d .itemnumber = 13 AND d .Transtype = 'Discount' THEN 1 ELSE 0 END) AS hasLessemp, MAX(CASE WHEN d .itemnumber IN (20, 8) AND
                                                                               d .Transtype = 'Discount' THEN 1 ELSE 0 END) AS hasNationalAth, MAX(CASE WHEN d .itemnumber IN (107) AND d .Transtype = 'Discount' THEN 1 ELSE 0 END) AS hasSoloparent10,
                                                                               MAX(CASE WHEN d .itemnumber IN (30) AND d .Transtype = 'Discount' THEN 1 ELSE 0 END) AS hasSoloparent20, MAX(CASE WHEN d .itemnumber IN (31) AND
                                                                               d .Transtype = 'Discount' THEN 1 ELSE 0 END) AS hasSoloparentmax, MAX(CASE WHEN d .itemnumber IN (33) AND d .Transtype = 'Discount' THEN 1 ELSE 0 END) AS hasSoloparent5percent,
                                                                               MAX(CASE WHEN d .itemnumber IN (7, 34) AND d .Transtype = 'Discount' THEN 1 ELSE 0 END) AS hasmedalvalor, MAX(CASE WHEN d .itemnumber IN (17) AND
                                                                               d .Transtype = 'Discount' THEN 1 ELSE 0 END) AS hasflashdeal20, MAX(CASE WHEN d .itemnumber IN (18) AND d .Transtype = 'Discount' THEN 1 ELSE 0 END) AS hasflashdealmax,
                                                                               MAX(CASE WHEN d .itemnumber IN (24) AND d .Transtype = 'Discount' THEN 1 ELSE 0 END) AS hasDisc5, MAX(CASE WHEN d .itemnumber IN (106) AND d .Transtype = 'Discount' THEN 1 ELSE 0 END)
                                                                               AS hasStore50, MAX(CASE WHEN d .itemnumber IN (105) AND d .Transtype = 'Discount' THEN 1 ELSE 0 END) AS hasMall20
                                                      FROM            dbo.CHECK_DETAIL AS cd INNER JOIN
                                                                               dbo.dts_object AS d ON cd.ObjectNumber = d.itemnumber
                                                      GROUP BY cd.CheckID)
    SELECT        cd.ObjectNumber, d.itemname, ISNULL(SUM(cd.SalesCount), 0) AS qty, ISNULL(SUM(cd.Total), 0) AS amt, v.busidate AS BusinessDate, v.busidatetime AS sys_datetime,
                              ISNULL(ROUND(SUM(CASE WHEN d .Transtype = 'Item Sale' AND cd.Total > 0 AND df.hasLessemp = 1 THEN (cd.Total / 1.12) - (cd.Total / 1.12) * 0.10 WHEN d .Transtype = 'Item Sale' AND df.hasSoloparentmax = 1 AND
                              cd.total >= 2000 THEN (cd.Total / 1.12) - 400 WHEN d .Transtype = 'Item Sale' AND df.hasSoloparent20 = 1 THEN (cd.Total / 1.12) - (cd.Total / 1.12 * 0.20) WHEN d .Transtype = 'Item Sale' AND
                              df.hasSoloparent5percent = 1 THEN (cd.Total / 1.12) - (cd.Total / 1.12 * 0.05) WHEN d .Transtype = 'Item Sale' AND df.hasNationalAth = 1 THEN (cd.Total / 1.12) - (cd.Total / 1.12 * 0.20) WHEN d .Transtype = 'Item Sale' AND
                              df.hasmedalvalor = 1 THEN (cd.Total / 1.12) - (cd.Total / 1.12 * 0.20) WHEN d .Transtype = 'Item Sale' AND df.hasflashdeal20 = 1 THEN (cd.Total / 1.12) - (cd.Total / 1.12 * 0.20) WHEN d .Transtype = 'Item Sale' AND
                              df.hasflashdealmax = 1 THEN ((cd.Total - ((160.71 / v.TotSales) * cd.Total)) / 1.12) WHEN d .Transtype = 'Item Sale' AND df.hasSoloparent10 = 1 THEN (cd.Total / 1.12) - (cd.Total / 1.12 * 0.10)
                              WHEN d .Transtype = 'Item Sale' AND df.hasStore50 = 1 THEN ((cd.Total) - (cd.Total * 0.50)) / 1.12 WHEN d .Transtype = 'Item Sale' AND df.hasMall20 = 1 THEN ((cd.Total) - (cd.Total * 0.20))
                              / 1.12 WHEN d .Transtype = 'Item Sale' AND v.order_type IN ('Standard', 'Zero Rated', 'Medal of Valor') THEN cd.Total / 1.12 WHEN v.order_type IN ('PWD', 'Senior Citizen') AND
                              d .Transtype = 'Item Sale' THEN cd.Total - (cd.Total / 1.12) * 0.32 ELSE 0 END), 2), 0) AS Netsales, ISNULL(ROUND(SUM(CASE WHEN v.order_type IN ('Standard', 'National Athletes', 'Medal of Valor') AND df.hasMall20 <> 1 AND
                               df.hasStore50 <> 1 AND df.hasflashdealmax <> 1 AND d .Transtype = 'Item Sale' THEN (cd.Total / 1.12) * 0.12 WHEN v.order_type = 'Standard' AND d .Transtype = 'Item Sale' AND
                              df.hasMall20 = 1 THEN (cd.Total - (cd.Total * 0.20)) / 1.12 * 0.12 WHEN v.order_type = 'Standard' AND d .Transtype = 'Item Sale' AND df.hasStore50 = 1 THEN (cd.Total - (cd.Total * 0.50))
                              / 1.12 * 0.12 WHEN v.order_type = 'Standard' AND d .Transtype = 'Item Sale' AND df.hasflashdealmax = 1 THEN ((cd.Total - ((160.71 / v.TotSales) * cd.Total)) / 1.12) * 0.12 ELSE 0 END), 2), 0) AS taxcollected,
                              ISNULL(ROUND(SUM(CASE WHEN v.order_type = 'Standard' AND d .Transtype = 'Item Sale' AND df.hasflashdealmax = 1 THEN (cd.Total - ((160.71 / v.TotSales) * cd.Total)) / 1.12 WHEN v.order_type IN ('Standard',
                              'National Athletes', 'Medal of Valor') AND df.hasMall20 <> 1 AND df.hasStore50 <> 1 AND df.hasflashdealmax <> 1 AND d .Transtype = 'Item Sale' THEN (cd.Total / 1.12) ELSE 0 END), 2), 0) AS VatableSales,
                              ISNULL(ROUND(SUM(CASE WHEN v.order_type IN ('Senior Citizen', 'PWD', 'Zero Rated') AND d .Transtype = 'Item Sale' THEN (cd.Total / 1.12) * 0.12 ELSE 0 END), 2), 0) AS lessvat,
                              ISNULL(ROUND(SUM(CASE WHEN v.order_type = 'Senior Citizen' AND d .Transtype = 'Item Sale' THEN (cd.Total / 1.12) * 0.20 ELSE 0 END), 2), 0) AS LessSC, ISNULL(ROUND(SUM(CASE WHEN v.order_type = 'PWD' AND
                              d .Transtype = 'Item Sale' THEN (cd.Total / 1.12) * 0.20 ELSE 0 END), 2), 0) AS LessPWD, ISNULL(ROUND(SUM(CASE WHEN d .Transtype = 'Item Sale' AND df.hasLessemp = 1 THEN (cd.Total / 1.12) * 0.10 ELSE 0 END), 2), 0)
                              AS lessemp, ISNULL(ROUND(SUM(CASE WHEN d .Transtype = 'Item Sale' AND df.hasNationalAth = 1 THEN (cd.Total / 1.12) * 0.20 ELSE 0 END), 2), 0) AS lessNationalAth,
                              ISNULL(ROUND(SUM(CASE WHEN d .Transtype = 'Item Sale' AND df.hasSoloparentmax = 1 AND cd.Total >= 2000 THEN 400 WHEN d .Transtype = 'Item Sale' AND
                              df.hasSoloparent20 = 1 THEN cd.Total / 1.12 * 0.20 WHEN d .Transtype = 'Item Sale' AND df.hasSoloparent5percent = 1 THEN cd.Total / 1.12 * 0.05 WHEN d .Transtype = 'Item Sale' AND
                              df.hasSoloparent10 = 1 THEN cd.Total / 1.12 * 0.10 ELSE 0 END), 2), 0) AS lessSoloparent, ISNULL(ROUND(SUM(CASE WHEN d .Transtype = 'Item Sale' AND df.hasmedalvalor = 1 THEN (cd.Total / 1.12) * 0.20 ELSE 0 END), 2),
                              0) AS LessMedalValor, CASE WHEN d .Transtype = 'Service Charge' THEN v.GC_sales ELSE 0 END AS srvc_amt, CASE WHEN v.GC_excess IS NOT NULL AND
                              d .Transtype = 'Item Sale' THEN v.GC_excess ELSE 0 END AS GC_excess, ISNULL(ROUND(SUM(CASE WHEN d .Transtype = 'Item Sale' AND
                              df.hasflashdeal20 = 1 THEN cd.Total / 1.12 * 0.20 WHEN d .Transtype = 'item Sale' AND df.hasflashdealmax = 1 THEN (160.71 / v.TotSales) * cd.Total WHEN d .Transtype = 'Item Sale' AND
                              df.hasDisc5 = 1 THEN cd.Total / 1.12 * 0.05 WHEN d .Transtype = 'Item Sale' AND df.hasStore50 = 1 THEN cd.Total * 0.50 WHEN d .Transtype = 'Item Sale' AND df.hasMall20 = 1 THEN cd.Total * 0.20 ELSE 0 END), 2), 0)
                              AS other_disc, d.Transtype, cd.CheckID, v.CheckNumber, r.rvctype, v.order_type, emp.CheckName AS emp_name, v.Workstation, v.FCRInvNumber
     FROM            dbo.CHECK_DETAIL AS cd LEFT OUTER JOIN
                              dbo.dts_object AS d ON cd.ObjectNumber = d.itemnumber LEFT OUTER JOIN
                              dbo.v_revenue AS v ON cd.CheckID = v.CheckID LEFT OUTER JOIN
                              DiscountFlags AS df ON cd.CheckID = df.CheckID LEFT OUTER JOIN
                              dbo.EMPLOYEE AS emp ON cd.EmployeeID = emp.EmployeeID LEFT OUTER JOIN
                              dbo.dts_rvc AS r ON cd.RevCtrID = r.rvcid
     WHERE        (cd.ObjectNumber IS NOT NULL)
     GROUP BY cd.ObjectNumber, d.itemname, v.busidate, v.busidatetime, d.Transtype, cd.CheckID, r.rvctype, v.order_type, v.CheckNumber, cd.Total, d.itemnumber, emp.CheckName, v.Workstation, v.GC_excess, v.GC_sales,
                              v.FCRInvNumber
GO
/****** Object:  View [dbo].[v_menuitem_details]    Script Date: 11/27/2026 9:07:40 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF OBJECT_ID(N'[dbo].[v_menuitem_details]', N'V') IS NOT NULL
    DROP VIEW [dbo].[v_menuitem_details]
GO
CREATE VIEW [dbo].[v_menuitem_details]
AS
SELECT        v.ObjectNumber AS itemnumber, v.itemname, v.BusinessDate, ISNULL(v.qty, 0) AS qty, ISNULL(v.amt, 0) AS amt, CASE WHEN order_type IN ('Senior Citizen', 'PWD')
                         THEN 'VAT-EX' WHEN order_type = 'Zero Rated' THEN 'Zero Rated' WHEN rvctype = 'Delivery FP' THEN 'DEL-FP' WHEN rvctype = 'Delivery Grab' THEN 'DEL-GRB' WHEN rvctype = 'SM Online App' THEN 'DEL-SM' WHEN rvctype
                          IN ('Take Away', 'Drive Thru', 'Dine In', 'Normal') THEN 'Normal' WHEN rvctype = 'FOC Waste' THEN 'FOC' ELSE rvctype END AS Salestype, ISNULL(ROUND(CASE WHEN v.order_type IN ('Senior Citizen', 'PWD')
                         THEN (amt / 1.12) * 0.32 ELSE 0 END, 2), 0) AS LessDisc, v.lessemp, v.lessNationalAth, v.lessSoloparent, ROUND(CASE WHEN order_type IN ('Senior Citizen', 'PWD', 'Zero Rated') THEN amt WHEN rvctype IN ('Delivery FP',
                         'Delivery Grab', 'SM Online App', 'Take Away', 'Drive Thru', 'Dine In', 'Normal') THEN amt / 1.12 ELSE 0 END, 2) AS totalamt, v.CheckID, dbo.dts_object.Majorgroup, dbo.dts_object.Familygroup
FROM            dbo.v_salesdetails AS v LEFT OUTER JOIN
                         dbo.dts_object ON v.ObjectNumber = dbo.dts_object.itemnumber
WHERE        (v.Transtype = 'Item Sale')
GO
/****** Object:  View [dbo].[v_scpwd_details]    Script Date: 11/27/2026 9:07:40 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF OBJECT_ID(N'[dbo].[v_scpwd_details]', N'V') IS NOT NULL
    DROP VIEW [dbo].[v_scpwd_details]
GO

CREATE VIEW [dbo].[v_scpwd_details]
AS
SELECT        PL.checkNum, CASE WHEN JournalText LIKE '%PWD ID:%' THEN 'PWD' WHEN JournalText LIKE '%OSCA ID:%' THEN 'OSCA' END AS discountType,
                         LTRIM(RTRIM(CASE WHEN JournalText LIKE '%Name:%' THEN SUBSTRING(JournalText, CHARINDEX('Name:', JournalText) + LEN('Name:'), CHARINDEX(CHAR(13), JournalText + CHAR(13), CHARINDEX('Name:', JournalText))
                         - (CHARINDEX('Name:', JournalText) + LEN('Name:'))) END)) AS scpwd_name, LTRIM(RTRIM(CASE WHEN JournalText LIKE '%PWD ID:%' THEN SUBSTRING(JournalText, CHARINDEX('PWD ID:', JournalText) + LEN('PWD ID:'),
                         CHARINDEX(CHAR(13), JournalText + CHAR(13), CHARINDEX('PWD ID:', JournalText)) - (CHARINDEX('PWD ID:', JournalText) + LEN('PWD ID:'))) WHEN JournalText LIKE '%OSCA ID:%' THEN SUBSTRING(JournalText,
                         CHARINDEX('OSCA ID:', JournalText) + LEN('OSCA ID:'), CHARINDEX(CHAR(13), JournalText + CHAR(13), CHARINDEX('OSCA ID:', JournalText)) - (CHARINDEX('OSCA ID:', JournalText) + LEN('OSCA ID:'))) END)) AS scpwd_id,
                         vr.Payment, CONVERT(char(10), PL.transDateTime, 23) AS businessdate, ROUND(CASE WHEN vr.order_type IN ('Senior Citizen', 'PWD') THEN vr.Payment / 0.8 * 1.12 ELSE 0 END, 2) AS GrossSale,
                         ROUND(CASE WHEN vr.order_type IN ('Senior Citizen', 'PWD') THEN vr.Payment / 0.8 * 0.12 ELSE 0 END, 2) AS lessVat, ROUND(CASE WHEN vr.order_type IN ('Senior Citizen', 'PWD') THEN vr.Payment / 0.8 * 0.20 ELSE 0 END,
                         2) AS lessDisc, vr.WorkStation
FROM            dbo.POS_JOURNAL_LOG AS PL LEFT OUTER JOIN
                         dbo.v_revenue AS vr ON PL.checkNum = vr.CheckNumber
WHERE        (PL.type = 128)
GO
/****** Object:  View [dbo].[v_summary_ROF]    Script Date: 11/27/2026 9:07:40 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF OBJECT_ID(N'[dbo].[v_summary_ROF]', N'V') IS NOT NULL
    DROP VIEW [dbo].[v_summary_ROF]
GO

CREATE VIEW [dbo].[v_summary_ROF]
AS

WITH cte_sales AS
(
    SELECT
        BusinessDate                                    AS busidate,
        ISNULL(SUM(netsales),     0)                   AS netsales,
        ISNULL(SUM(taxcollected), 0)                   AS vat,
        ISNULL(SUM(netsales), 0)
            + ISNULL(SUM(taxcollected), 0)             AS netsales_vat,
        ISNULL(SUM(srvc_amt),     0)                   AS gc_sales
    FROM   dbo.v_salesdetails
    WHERE  Transtype IN ('Item Sale', 'Service Charge')
    GROUP  BY BusinessDate
),

cte_cash AS
(
    SELECT
        busidate,
        locationname,
        ISNULL(SUM(actualamt), 0)                      AS cash,

        -- Concatenate non-empty cash remarks: "cashiername: remark | ..."
        STUFF((
            SELECT ' | ' + c2.cashiername + ': ' + c2.remarks
            FROM   dbo.dts_rof_cash c2
            WHERE  c2.busidate     = c.busidate
              AND  c2.locationname = c.locationname
              AND  c2.remarks      <> ''
            FOR XML PATH(''), TYPE
        ).value('.', 'NVARCHAR(MAX)'), 1, 3, '')       AS cash_remarks

    FROM   dbo.dts_rof_cash c
    GROUP  BY busidate, locationname
),

cte_noncash AS
(
    SELECT
        busidate,
        locationname,
        ISNULL(SUM(actualtender), 0)                   AS noncash,

        -- Concatenate non-empty noncash remarks: "tendername: remark | ..."
        STUFF((
            SELECT ' | ' + nc2.tendername + ': ' + nc2.remarks
            FROM   dbo.dts_rof_noncash nc2
            WHERE  nc2.busidate     = nc.busidate
              AND  nc2.locationname = nc.locationname
              AND  nc2.remarks      <> ''
            FOR XML PATH(''), TYPE
        ).value('.', 'NVARCHAR(MAX)'), 1, 3, '')       AS noncash_remarks

    FROM   dbo.dts_rof_noncash nc
    GROUP  BY busidate, locationname
)

SELECT
    c.busidate,
    c.locationname,
    ISNULL(s.netsales_vat, 0)                          AS netsales_vat,
    ISNULL(s.vat,          0)                          AS vat,
    ISNULL(s.netsales,     0)                          AS netsales,
    ISNULL(s.gc_sales,     0)                          AS gc_sales,
    ISNULL(c.cash,         0)                          AS cash,
    ISNULL(nc.noncash,     0)                          AS noncash,
    ROUND((
        ISNULL(s.netsales_vat, 0)
        + ISNULL(s.gc_sales,  0))
        - ISNULL(c.cash,      0)
        - ISNULL(nc.noncash,  0),
    2)                                                 AS variance,
    ISNULL(c.cash_remarks,    '')                      AS cash_remarks,
    ISNULL(nc.noncash_remarks,'')                      AS noncash_remarks

FROM        cte_cash    AS c
LEFT JOIN   cte_sales   AS s  ON  s.busidate      = c.busidate
LEFT JOIN   cte_noncash AS nc ON  nc.busidate     = c.busidate
                              AND nc.locationname = c.locationname
GO
/****** Object:  View [dbo].[v_menuitem_details_foc]    Script Date: 11/27/2026 9:07:40 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF OBJECT_ID(N'[dbo].[v_menuitem_details_foc]', N'V') IS NOT NULL
    DROP VIEW [dbo].[v_menuitem_details_foc]
GO

CREATE VIEW [dbo].[v_menuitem_details_foc] AS
-- All Item Sale transactions from v_salesdetails
SELECT
    v.ObjectNumber AS itemnumber,
    v.itemname,
    v.BusinessDate,
    ISNULL(v.qty, 0) AS qty,
    ISNULL(v.amt, 0) AS amt,
    CASE
        WHEN order_type IN ('Senior Citizen', 'PWD') THEN 'VAT-EX'
        WHEN order_type = 'Zero Rated' THEN 'Zero Rated'
        WHEN rvctype = 'Delivery FP' THEN 'DEL-FP'
        WHEN rvctype = 'Delivery Grab' THEN 'DEL-GRB'
        WHEN rvctype = 'SM Online App' THEN 'DEL-SM'
        WHEN rvctype IN ('Take Away', 'Drive Thru', 'Dine In', 'Normal') THEN 'Normal'
        ELSE rvctype
    END AS Salestype,
    ISNULL(ROUND(CASE
        WHEN v.order_type IN ('Senior Citizen', 'PWD') THEN (amt / 1.12) * 0.32
        ELSE 0
    END, 2), 0) AS LessDisc,
    v.lessemp,
    v.lessNationalAth,
    v.lessSoloparent,
    ROUND(CASE
        WHEN order_type IN ('Senior Citizen', 'PWD', 'Zero Rated') THEN amt
        WHEN rvctype IN ('Delivery FP', 'Delivery Grab', 'SM Online App', 'Take Away', 'Drive Thru', 'Dine In', 'Normal') THEN amt / 1.12
        ELSE 0
    END, 2) AS totalamt,
    v.CheckID,
    dbo.dts_object.Majorgroup,
    dbo.dts_object.Familygroup
FROM
    dbo.v_salesdetails AS v
    LEFT OUTER JOIN dbo.dts_object ON v.ObjectNumber = dbo.dts_object.itemnumber
WHERE
    v.Transtype = 'Item Sale'

UNION ALL

-- Additional FOC Waste transactions (as FOC type)
SELECT
    cd.ObjectNumber AS itemnumber,
    d.itemname,
    CAST(cd.DetailPostingTime AS DATE) AS BusinessDate,
    cd.SalesCount AS qty,
    cd.Total AS amt,
    'FOC' AS Salestype,
    0 AS LessDisc,
    NULL AS lessemp,
    NULL AS lessNationalAth,
    NULL AS lessSoloparent,
    cd.Total AS totalamt,
    cd.CheckID AS CheckID,
    d.Majorgroup,
    d.Familygroup
FROM
    CHECK_DETAIL cd
    LEFT JOIN dts_object d ON cd.ObjectNumber = d.itemnumber
    LEFT JOIN dbo.dts_rvc r ON cd.RevCtrID = r.rvcid
WHERE
    r.rvctype = 'FOC Waste'
    AND d.itemnumber <> 1101  ;
    -- Ensure we don't duplicate if already in v_salesdetails
GO
/****** Object:  View [dbo].[v_menuitem_summary]    Script Date: 11/27/2026 9:07:40 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF OBJECT_ID(N'[dbo].[v_menuitem_summary]', N'V') IS NOT NULL
    DROP VIEW [dbo].[v_menuitem_summary]
GO

CREATE VIEW [dbo].[v_menuitem_summary]
AS
SELECT        itemnumber, itemname, BusinessDate, SUM(qty) AS qty, SUM(amt) AS grossamt, ROUND(SUM(LessDisc) + SUM(lessemp) + SUM(lessNationalAth) + SUM(lessSoloparent), 2) AS itemdiscount,
                         CASE WHEN Salestype = 'VAT-EX' THEN SUM(amt) - (SUM(LessDisc) + SUM(lessEmp) + SUM(lessNationalAth) + SUM(lessSoloparent)) ELSE ROUND(SUM(amt) / 1.12, 2) END AS Netsales, Salestype, Majorgroup,
                         Familygroup
FROM            dbo.v_menuitem_details_foc
GROUP BY BusinessDate, itemnumber, itemname, Salestype, Majorgroup, Familygroup
GO
/****** Object:  View [dbo].[v_invoice]    Script Date: 11/27/2026 9:07:40 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF OBJECT_ID(N'[dbo].[v_invoice]', N'V') IS NOT NULL
    DROP VIEW [dbo].[v_invoice]
GO

CREATE VIEW [dbo].[v_invoice]
AS
SELECT        dbo.CHECKS.CheckNumber, dbo.CHECKS.CheckID, dbo.FCR_INVOICE_DATA.FCRInvNumber
FROM            dbo.CHECKS LEFT OUTER JOIN
                         dbo.FCR_INVOICE_DATA ON dbo.CHECKS.CheckNumber = dbo.FCR_INVOICE_DATA.MicrosChkNum
GO
/****** Object:  View [dbo].[v_TenderReference]    Script Date: 11/27/2026 9:07:40 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
IF OBJECT_ID(N'[dbo].[v_TenderReference]', N'V') IS NOT NULL
    DROP VIEW [dbo].[v_TenderReference]
GO


CREATE VIEW [dbo].[v_TenderReference] AS
WITH TenderTypes AS (
    SELECT 'DEBIT CARD' AS TenderType
    UNION ALL
    SELECT 'GRAB FOOD'
    UNION ALL
    SELECT 'FOOD PANDA'
    UNION ALL
    SELECT 'MASTER CARD'
    UNION ALL
    SELECT 'VISA'
    UNION ALL
    SELECT 'AMEX'
    UNION ALL
    SELECT 'JCB'
    UNION ALL
    SELECT 'DINERS'
    UNION ALL
    SELECT 'UNION PAY'
    UNION ALL
    SELECT 'GCASH'
    UNION ALL
    SELECT 'BDO PAY'
    UNION ALL
    SELECT 'WECHAT'
    UNION ALL
    SELECT 'GRAB PAY'
    UNION ALL
    SELECT 'ALIPAY'
    UNION ALL
    SELECT 'QR PH'
    UNION ALL
    SELECT 'SM Online Pay'
	UNION ALL
    SELECT 'GC'
	UNION ALL
    SELECT 'PLUXEE'
)
SELECT
    p.checkNum,
    t.TenderType,
    tl.TenderLine,
    tl.Amount,
    tl.Reference,
    CONVERT(char(10), p.transDateTime, 23) AS businessdate
FROM POS_JOURNAL_LOG p
CROSS APPLY TenderTypes t
-- Extract TenderLine once per tender type
CROSS APPLY (
    SELECT
        -- TenderLine: substring after tender type (amount + reference)
        LTRIM(RTRIM(
            SUBSTRING(
                p.JournalText,
                PATINDEX('%' + t.TenderType + ' %[0-9]%', p.JournalText) + LEN(t.TenderType) + 1,
                50
            )
        )) AS TenderLine,
        -- Amount: first word in TenderLine
        LEFT(
            LTRIM(RTRIM(
                SUBSTRING(
                    p.JournalText,
                    PATINDEX('%' + t.TenderType + ' %[0-9]%', p.JournalText) + LEN(t.TenderType) + 1,
                    50
                )
            )),
            CHARINDEX(' ', LTRIM(RTRIM(
                SUBSTRING(
                    p.JournalText,
                    PATINDEX('%' + t.TenderType + ' %[0-9]%', p.JournalText) + LEN(t.TenderType) + 1,
                    50
                )
            )) + ' ') - 1
        ) AS Amount,
        -- Reference: last word in TenderLine
        RIGHT(
            LTRIM(RTRIM(
                SUBSTRING(
                    p.JournalText,
                    PATINDEX('%' + t.TenderType + ' %[0-9]%', p.JournalText) + LEN(t.TenderType) + 1,
                    50
                )
            )),
            CHARINDEX(' ', REVERSE(
                LTRIM(RTRIM(
                    SUBSTRING(
                        p.JournalText,
                        PATINDEX('%' + t.TenderType + ' %[0-9]%', p.JournalText) + LEN(t.TenderType) + 1,
                        50
                    )
                ))
            ) + ' ') - 1
        ) AS Reference
) tl
WHERE p.JournalText LIKE '%' + t.TenderType + '%'
      AND p.type = 128
      AND PATINDEX('%' + t.TenderType + ' %[0-9]%', p.JournalText) > 0;
GO