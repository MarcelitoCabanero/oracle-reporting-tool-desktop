Imports System.ComponentModel
Imports System.IO
Public Class frm_hourly
    Implements IScalable

    Private ReadOnly _cls_dpmf As New cls_dpmf
    Private _resultData_produce As DataTable
    Private _resultData_waste As DataTable
    Private _resultData_sold As DataTable
    Private _posWaste As DataTable
    Public Sub ApplyScale(factor As Single) Implements IScalable.ApplyScale
        SplitContainer1.SplitterDistance = CInt(Me.Width * 0.37)

        Dim scaledColWidth As Integer = CInt(120 * factor)
        Dim scaledFont As New Font("Tahoma", Math.Max(7.0F, 10.5F * factor), FontStyle.Regular)

        ' Cast each grid explicitly to Guna2DataGridView to access ThemeStyle
        For Each dgv As Guna.UI2.WinForms.Guna2DataGridView In
        {dgpProduceDonut, dgvWaste, dgvDonutsold}

            For Each col As DataGridViewColumn In dgv.Columns
                col.Width = scaledColWidth
            Next
            dgv.ThemeStyle.HeaderStyle.Font = scaledFont
            dgv.ThemeStyle.RowsStyle.Font = scaledFont
        Next
    End Sub
    Private Sub frm_hourly_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        ' Apply responsive scaling via shared helper
        ScaleHelper.AutoScale(Me)

        ' UI Setup
        GunaProgressIndicator1.Anchor = AnchorStyles.None
        GunaProgressIndicator1.Visible = False
        GunaProgressIndicator1.AutoStart = False

        SplitContainer1.IsSplitterFixed = False
        SplitContainer1.SplitterDistance = CInt(Me.Width * 0.37)

        dtFrom.Value = Date.Now
        dtTo.Value = Date.Now

        CenterProgress()
    End Sub
    Private Sub Form1_Resize(sender As Object, e As EventArgs) Handles Me.Resize
        CenterProgress()
        SplitContainer1.SplitterDistance = CInt(Me.Width * 0.37)
    End Sub

    Private Sub CenterProgress()
        GunaProgressIndicator1.Left = (Me.ClientSize.Width - GunaProgressIndicator1.Width) \ 2
        GunaProgressIndicator1.Top = (Me.ClientSize.Height - GunaProgressIndicator1.Height) \ 2
    End Sub
    Private Async Sub btngenerate_Click(sender As Object, e As EventArgs) Handles btngenerate.Click
        SetBusy(True)

        Try
            Dim fromDate As Date = dtFrom.Value.Date
            Dim toDate As Date = dtTo.Value.Date

            ' Run all data loads concurrently on thread pool
            Await Task.Run(Sub()
                               _resultData_produce = _cls_dpmf.loadProduceDonut(fromDate, toDate)
                               _resultData_waste = _cls_dpmf.loadWasteDonut(fromDate, toDate)
                               _resultData_sold = _cls_dpmf.loadSoldDonut(fromDate, toDate)
                               _posWaste = _cls_dpmf.loadPOSwaste(fromDate, toDate)
                           End Sub)

            ' Back on UI thread — bind grids
            LoadGridProduceDonut(_resultData_produce)
            LoadGridWasteDonut(_resultData_waste, _posWaste)
            LoadGridSoldDonut(_resultData_sold)

        Catch ex As Exception
            MessageBox.Show("Error loading data: " & ex.Message, "Error",
                            MessageBoxButtons.OK, MessageBoxIcon.Error)
        Finally
            SetBusy(False)
        End Try
    End Sub
    Private Sub SetBusy(busy As Boolean)
        btngenerate.Enabled = Not busy
        If busy Then
            GunaProgressIndicator1.Visible = True
            GunaProgressIndicator1.Start()
            CenterProgress()
        Else
            GunaProgressIndicator1.Stop()
            GunaProgressIndicator1.Visible = False
        End If
    End Sub
    Private Sub ApplyGridTheme(dgv As Guna.UI2.WinForms.Guna2DataGridView,
                              Optional colWidth As Integer = 120)
        With dgv
            .SelectionMode = DataGridViewSelectionMode.CellSelect
            .AllowUserToAddRows = False
            .ColumnHeadersDefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter

            For i As Integer = 0 To .ColumnCount - 1
                .Columns(i).Width = colWidth
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
    End Sub
    Private Function AddTotalRow(dgv As DataGridView, label As String,
                                 values() As Object,
                                 Optional backColor As Color = Nothing) As DataGridViewRow
        Dim rowData(values.Length) As Object
        rowData(0) = label
        values.CopyTo(rowData, 1)

        Dim idx As Integer = dgv.Rows.Add(rowData)
        Dim row As DataGridViewRow = dgv.Rows(idx)

        Dim bg As Color = If(backColor = Nothing, Color.FromArgb(246, 220, 172), backColor)
        row.DefaultCellStyle.BackColor = bg
        row.DefaultCellStyle.Font = New Font("Tahoma", 10.5!, FontStyle.Bold)
        Return row
    End Function
    Private Sub LoadGridProduceDonut(data As DataTable)
        dgpProduceDonut.Columns.Clear()
        dgpProduceDonut.Rows.Clear()

        dgpProduceDonut.Columns.Add("time_mixing", "Time Mixing")
        dgpProduceDonut.Columns.Add("ring_qty", "Ring Qty")
        dgpProduceDonut.Columns.Add("shell_qty", "Shell Qty")
        dgpProduceDonut.Columns.Add("jpops_qty", "Jpops Qty")
        dgpProduceDonut.Columns.Add("remarks", "Remarks")

        ApplyGridTheme(dgpProduceDonut)

        Dim producedRing, producedShell, producedJpops As Integer
        Dim receivedRing, receivedShell, receivedJpops As Integer

        For Each row As DataRow In data.Rows
            Dim ring As Integer = CInt(Val(row("ring_qty")))
            Dim shell As Integer = CInt(Val(row("shell_qty")))
            Dim jpops As Integer = CInt(Val(row("jpops_qty")))
            Dim remark As String = row("remarks").ToString()

            If remark = "Received Donuts" Then
                receivedRing += ring
                receivedShell += shell
                receivedJpops += jpops
            Else
                producedRing += ring
                producedShell += shell
                producedJpops += jpops
            End If

            dgpProduceDonut.Rows.Add(row("time_mixing").ToString(), ring, shell, jpops, remark)
        Next

        AddTotalRow(dgpProduceDonut, "TOTAL PRODUCED",
                    {producedRing, producedShell, producedJpops, ""})
        AddTotalRow(dgpProduceDonut, "TOTAL RECEIVED",
                    {receivedRing, receivedShell, receivedJpops, ""})

        ' Labels — negate received (it leaves the store)
        lblrvc_ring.Text = (receivedRing * -1).ToString()
        lblrvc_shell.Text = (receivedShell * -1).ToString()
        lblrvc_jpops.Text = (receivedJpops * -1).ToString()
        lblrvc_totqty.Text = ((receivedRing + receivedShell + receivedJpops) * -1).ToString()
    End Sub

    Private Sub LoadGridWasteDonut(data As DataTable, posWaste As DataTable)
        dgvWaste.Columns.Clear()
        dgvWaste.Rows.Clear()

        dgvWaste.Columns.Add("time_waste", "Time Waste")
        dgvWaste.Columns.Add("ring_qty", "Ring Qty")
        dgvWaste.Columns.Add("shell_qty", "Shell Qty")
        dgvWaste.Columns.Add("jpops_qty", "Jpops Qty")
        dgvWaste.Columns.Add("remarks", "Remarks")

        ApplyGridTheme(dgvWaste)

        Dim totalRing, totalShell, totalJpops As Integer

        For Each row As DataRow In data.Rows
            Dim ring As Integer = SafeInt(row("ring_qty"))
            Dim shell As Integer = SafeInt(row("shell_qty"))
            Dim jpops As Integer = SafeInt(row("jpops_qty"))

            totalRing += ring
            totalShell += shell
            totalJpops += jpops

            dgvWaste.Rows.Add(
                row("time_waste").ToString(), ring, shell, jpops,
                If(IsDBNull(row("remarks")), "", row("remarks").ToString()))
        Next

        AddTotalRow(dgvWaste, "TOTAL WASTE", {totalRing, totalShell, totalJpops, ""})

        ' POS waste totals
        Dim posRing, posShell, posJpops, posJpopsCalc As Integer

        If posWaste IsNot Nothing AndAlso posWaste.Rows.Count > 0 Then
            Dim pr As DataRow = posWaste.Rows(0)
            posRing = SafeInt(pr("RingWaste"))
            posShell = SafeInt(pr("ShellWaste"))
            posJpops = SafeInt(pr("JpopsWaste"))
            posJpopsCalc = CInt(Math.Round(posJpops * 24 * 7 / 35, MidpointRounding.AwayFromZero))

            AddTotalRow(dgvWaste, "TOTAL POS WASTE",
                        {posRing, posShell, posJpopsCalc, ""},
                        Color.FromArgb(220, 240, 200))
        End If

        lblfoc_ring.Text = posRing.ToString()
        lblfoc_shell.Text = posShell.ToString()
        lblfoc_jpops.Text = posJpopsCalc.ToString()
        lbltot_foc.Text = (posRing + posShell + posJpopsCalc).ToString()
    End Sub

    Private Sub LoadGridSoldDonut(data As DataTable)
        dgvDonutsold.Columns.Clear()
        dgvDonutsold.Rows.Clear()

        dgvDonutsold.Columns.Add("HourRange", "Time Sold")
        dgvDonutsold.Columns.Add("RingSold", "Ring Qty")
        dgvDonutsold.Columns.Add("ShellSold", "Shell Qty")
        dgvDonutsold.Columns.Add("JpopsSold", "Jpops Qty")

        ApplyGridTheme(dgvDonutsold)

        Dim totalRing, totalShell, totalJpops As Integer

        For Each row As DataRow In data.Rows
            Dim ring As Integer = CInt(Val(row("RingSold")))
            Dim shell As Integer = CInt(Val(row("ShellSold")))
            Dim jpops As Integer = CInt(Val(row("JpopsSold")))

            totalRing += ring
            totalShell += shell
            totalJpops += jpops

            dgvDonutsold.Rows.Add(row("HourRange").ToString(), ring, shell, jpops)
        Next

        AddTotalRow(dgvDonutsold, "TOTAL SOLD", {totalRing, totalShell, totalJpops})

        lbldnt_ring.Text = totalRing.ToString()
        lbldnt_shell.Text = totalShell.ToString()
        lbldnt_jpops.Text = totalJpops.ToString()
        lbldnt_totqty.Text = (totalRing + totalShell + totalJpops).ToString()

        ' Grand total label combines sold + received offset
        lbltot_Sales.Text = (Val(lbldnt_totqty.Text) + Val(lblrvc_totqty.Text)).ToString()
    End Sub
    Private Function SafeInt(value As Object) As Integer
        Return If(IsDBNull(value), 0, Convert.ToInt32(value))
    End Function

    Private Sub POSHourlyToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles POSHourlyToolStripMenuItem.Click
        frm_dashboard_new.LoadForm(New frm_hourly_POS())
    End Sub

    Private Sub CreateBeginningBalanceToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles CreateBeginningBalanceToolStripMenuItem.Click
        frm_begbal.show()
    End Sub

    Private Sub CreateWasteToolStripMenuItem_Click(sender As Object, e As EventArgs) Handles CreateWasteToolStripMenuItem.Click
        frm_waste.Show()
    End Sub

End Class