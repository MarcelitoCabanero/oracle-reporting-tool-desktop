Imports System.ComponentModel
Imports OfficeOpenXml
Imports System.IO
Public Class frm_hourly_POS
    Dim cls_hourlyPOS As New cls_hourlyPOS
    Dim resultData As DataTable
    Private Sub frm_hourly_POS_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        dtFrom.Value = Date.Now
        dtto.Value = Date.Now
        AddHandler BackgroundWorker1.DoWork, AddressOf BackgroundWorker1_DoWork
        AddHandler BackgroundWorker1.RunWorkerCompleted, AddressOf BackgroundWorker1_RunWorkerCompleted
        GunaProgressIndicator1.Visible = False
        GunaProgressIndicator1.AutoStart = False
    End Sub
    Private Sub btngenerate_Click_1(sender As Object, e As EventArgs) Handles btngenerate.Click
        If Not BackgroundWorker1.IsBusy Then
            GunaProgressIndicator1.Visible = True
            GunaProgressIndicator1.Start()
            btngenerate.Enabled = False
            btnExportToExcel.Enabled = False
            BackgroundWorker1.RunWorkerAsync()
        End If
    End Sub

    Private Sub BackgroundWorker1_DoWork(sender As Object, e As DoWorkEventArgs)
        Dim fromDate As Date = dtFrom.Value.Date
        Dim toDate As Date = dtto.Value.Date.AddDays(1)

        resultData = cls_hourlyPOS.GetHourlyData(fromDate, toDate)
    End Sub
    Private Sub BackgroundWorker1_RunWorkerCompleted(sender As Object, e As RunWorkerCompletedEventArgs)
        GunaProgressIndicator1.Stop()
        GunaProgressIndicator1.Visible = False
        btngenerate.Enabled = True
        btnExportToExcel.Enabled = True

        If e.Error IsNot Nothing Then
            MessageBox.Show("Error: " & e.Error.Message)
            Return
        End If

        ' Now bind the data to the grid (UI thread)
        LoadGridWithData(resultData)
    End Sub
    Private Sub LoadGridWithData(data As DataTable)
        dgvHourly.Columns.Clear()
        dgvHourly.Rows.Clear()

        With dgvHourly
            .Columns.Add("itemcode", "MenuItem Number")
            .Columns.Add("itemname", "MenuItem Name")
            .Columns.Add("Category", "Category")
            .Columns.Add("TotalQty", "Sales Count")
            .Columns.Add("totalamt", "Gross Amount")
            .Columns.Add("HourOfDay", "Hour")
            .Columns.Add("BusinessDate", "Business Date")

            .SelectionMode = DataGridViewSelectionMode.CellSelect
            .AllowUserToAddRows = False
            .ColumnHeadersDefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter

            For i As Integer = 0 To .ColumnCount - 1
                .Columns(i).Width = 120
                .Columns(i).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
                .Columns(i).SortMode = DataGridViewColumnSortMode.NotSortable
                .Columns(i).ReadOnly = True
            Next

            .Theme = Guna.UI2.WinForms.Enums.DataGridViewPresetThemes.Ember
            .ThemeStyle.HeaderStyle.BackColor = Color.FromArgb(246, 220, 172)
            .ThemeStyle.RowsStyle.BackColor = Color.FromArgb(251, 246, 226)
            .ThemeStyle.AlternatingRowsStyle.BackColor = Color.White
            .ThemeStyle.HeaderStyle.HeaightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize
            .ThemeStyle.HeaderStyle.BorderStyle = DataGridViewHeaderBorderStyle.Single
            .ThemeStyle.HeaderStyle.ForeColor = Color.Black
            .ThemeStyle.HeaderStyle.Font = New Font("Tahoma", 10.5!, FontStyle.Regular)
            .ThemeStyle.RowsStyle.Font = New Font("Tahoma", 10.5!, FontStyle.Regular)
            .ThemeStyle.RowsStyle.SelectionForeColor = Color.Black
        End With

        ' Populate rows
        Dim lastCategory As String = ""
        Dim subtotalCount As Integer = 0
        Dim subtotalAmount As Decimal = 0

        For Each row As DataRow In data.Rows
            Dim currentCategory As String = row("Category").ToString()
            If lastCategory <> "" AndAlso lastCategory <> currentCategory Then
                dgvHourly.Rows.Add("", "Subtotal", lastCategory, subtotalCount.ToString(), FormatNumber(subtotalAmount, 2), "", "")
                subtotalCount = 0
                subtotalAmount = 0
            End If

            Dim totalAmt As Decimal = If(IsDBNull(row("TotalAmt")), 0D, Convert.ToDecimal(row("TotalAmt")))

            dgvHourly.Rows.Add(
                row("itemcode").ToString(),
                row("itemname").ToString(),
                row("Category").ToString(),
                row("TotalQty").ToString(),
                FormatNumber(totalAmt, 2),
                row("HourOfDay").ToString(),
                row("BusinessDate").ToString()
            )

            subtotalCount += CInt(row("TotalQty"))
            subtotalAmount += totalAmt
            lastCategory = currentCategory
        Next

        If lastCategory <> "" Then
            dgvHourly.Rows.Add("", "Subtotal", lastCategory, subtotalCount.ToString(), FormatNumber(subtotalAmount, 2), "", "")
        End If

        ' Style subtotals
        For Each row As DataGridViewRow In dgvHourly.Rows
            If row.Cells("itemname").Value.ToString() = "Subtotal" Then
                row.DefaultCellStyle.Font = New Font(dgvHourly.Font, FontStyle.Bold)
                row.DefaultCellStyle.BackColor = Color.Orange
            End If
        Next
    End Sub

    Private Sub btnExportToExcel_Click(sender As Object, e As EventArgs) Handles btnExportToExcel.Click
        ExportToExcel_EPPlus(dgvHourly)
    End Sub
    Private Sub ExportToExcel_EPPlus(dgv As DataGridView)
        If dgv.Rows.Count = 0 Then
            MessageBox.Show("No data to export.", "Export", MessageBoxButtons.OK, MessageBoxIcon.Information)
            Exit Sub
        End If

        Dim sfd As New SaveFileDialog()
        sfd.Filter = "Excel Files (*.xlsx)|*.xlsx"
        sfd.FileName = "Hourly_POS_Report.xlsx"

        If sfd.ShowDialog() = DialogResult.OK Then
            ' ✅ Set EPPlus license properly for version 8+
            ExcelPackage.LicenseContext = OfficeOpenXml.LicenseContext.NonCommercial

            Using package As New OfficeOpenXml.ExcelPackage()
                Dim ws = package.Workbook.Worksheets.Add("Hourly POS")

                ' Add headers
                For col = 0 To dgv.Columns.Count - 1
                    ws.Cells(1, col + 1).Value = dgv.Columns(col).HeaderText
                Next

                ' Add data
                For row = 0 To dgv.Rows.Count - 1
                    For col = 0 To dgv.Columns.Count - 1
                        ws.Cells(row + 2, col + 1).Value = dgv.Rows(row).Cells(col).Value?.ToString()
                    Next
                Next

                ' Format headers
                Using headerRange = ws.Cells(1, 1, 1, dgv.Columns.Count)
                    headerRange.Style.Font.Bold = True
                    headerRange.Style.Fill.PatternType = OfficeOpenXml.Style.ExcelFillStyle.Solid
                    headerRange.Style.Fill.BackgroundColor.SetColor(Color.LightGray)
                End Using

                ws.Cells.AutoFitColumns()

                package.SaveAs(New FileInfo(sfd.FileName))
            End Using

            MessageBox.Show("Export successful!", "Export to Excel", MessageBoxButtons.OK, MessageBoxIcon.Information)
        End If
    End Sub


End Class