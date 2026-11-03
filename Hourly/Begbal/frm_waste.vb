Imports System.Drawing
Imports Guna.UI2.WinForms
Public Class frm_waste
    Private WithEvents dtp As New DateTimePicker()
    Private dtpAdded As Boolean = False
    Dim cls_hourlyPOS As New cls_hourlyPOS
    Private Sub frm_waste_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        SetupGrid()
        apply_datagridproperties()
    End Sub
    Private Sub apply_datagridproperties()
        With Guna2DataGridView1
            .Theme = Guna.UI2.WinForms.Enums.DataGridViewPresetThemes.Ember
            .ThemeStyle.HeaderStyle.BackColor = Color.FromArgb(246, 220, 172)
            .ThemeStyle.RowsStyle.BackColor = Color.FromArgb(251, 246, 226)
            .ThemeStyle.AlternatingRowsStyle.BackColor = Color.White
            .ThemeStyle.HeaderStyle.HeaightSizeMode = DataGridViewColumnHeadersHeightSizeMode.EnableResizing
            .ThemeStyle.HeaderStyle.BorderStyle = DataGridViewHeaderBorderStyle.Single
            .ThemeStyle.HeaderStyle.ForeColor = Color.Black
            .ThemeStyle.HeaderStyle.Font = New Font("Tahoma", 10.5!, FontStyle.Regular)
            .ThemeStyle.RowsStyle.Font = New Font("Tahoma", 10.5!, FontStyle.Regular)
            .ThemeStyle.RowsStyle.SelectionForeColor = Color.Black
            .AllowUserToResizeColumns = True
            .AllowUserToResizeRows = False
            .RowHeadersVisible = False
            .AllowUserToDeleteRows = True
            .AllowUserToAddRows = True
            .SelectionMode = DataGridViewSelectionMode.CellSelect
            .AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill
            .DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
            .ColumnHeadersDefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
            .AutoSizeRowsMode = DataGridViewAutoSizeRowsMode.AllCells
        End With
    End Sub

    Private Sub Guna2DataGridView1_KeyDown(sender As Object, e As KeyEventArgs) Handles Guna2DataGridView1.KeyDown
        If e.KeyCode = Keys.Delete Then
            If Guna2DataGridView1.SelectedCells.Count > 0 Then
                Dim firstRow As DataGridViewRow = Guna2DataGridView1.SelectedCells(0).OwningRow

                ' If whole row is selected OR if user selected any cell in that row -> delete entire row
                If firstRow.Selected OrElse Guna2DataGridView1.SelectedCells.Cast(Of DataGridViewCell).All(Function(c) c.OwningRow.Index = firstRow.Index) Then
                    If Not firstRow.IsNewRow Then
                        Guna2DataGridView1.Rows.Remove(firstRow)
                    End If
                Else
                    ' Clear only the selected cells
                    For Each cell As DataGridViewCell In Guna2DataGridView1.SelectedCells
                        If Not cell.ReadOnly AndAlso Not cell.OwningRow.IsNewRow Then
                            cell.Value = Nothing ' or String.Empty
                        End If
                    Next
                End If
            End If
        End If
    End Sub

    Private Sub SetupGrid()

        ' Add ComboBox column for time_mixing
        Dim cmbCol As New DataGridViewComboBoxColumn()
        cmbCol.HeaderText = "Time Waste"
        cmbCol.Name = "time_waste"
        cmbCol.FlatStyle = FlatStyle.Flat


        ' Fill time-buckets
        Dim startTime As DateTime = DateTime.Today
        For i As Integer = 0 To 23
            Dim fromTime As DateTime = startTime.AddHours(i)
            Dim toTime As DateTime = startTime.AddHours(i + 1)
            Dim fromStr As String = If(fromTime.ToString("hh:mm tt") = "12:00 PM", "12:00 NN", fromTime.ToString("hh:mm tt"))
            Dim toStr As String = If(toTime.ToString("hh:mm tt") = "12:00 PM", "12:00 NN", toTime.ToString("hh:mm tt"))
            cmbCol.Items.Add(fromStr & " – " & toStr)
        Next
        Guna2DataGridView1.Columns.Add(cmbCol)

        ' Add column for date
        Dim dateCol As New DataGridViewTextBoxColumn()
        dateCol.HeaderText = "Date"
        dateCol.Name = "date"
        Guna2DataGridView1.Columns.Add(dateCol)


        ' Add your columns
        AddQtyColumn("shell_qty", "Shell Qty", 80)
        AddQtyColumn("ring_qty", "Ring Qty", 80)
        AddQtyColumn("jpops_qty", "JPops Qty", 90)

        Dim cmbRemarks As New DataGridViewComboBoxColumn()
        cmbRemarks.HeaderText = "Remarks"
        cmbRemarks.Name = "remarks"
        cmbRemarks.FlatStyle = FlatStyle.Flat
        cmbRemarks.Items.Add("Proofing")
        cmbRemarks.Items.Add("Frying")
        cmbRemarks.Items.Add("Topping")
        Guna2DataGridView1.Columns.Add(cmbRemarks)

        ' Setup DateTimePicker (not visible until editing)
        dtp.Format = DateTimePickerFormat.[Short]
        dtp.Visible = False
        AddHandler dtp.ValueChanged, AddressOf dtp_ValueChanged
        Guna2DataGridView1.Controls.Add(dtp)
    End Sub

    ' Show DateTimePicker when editing Date column

    Private Sub Guna2DataGridView1_CellBeginEdit(sender As Object, e As DataGridViewCellCancelEventArgs) Handles Guna2DataGridView1.CellBeginEdit
        If Guna2DataGridView1.Columns(e.ColumnIndex).Name = "date" Then
            Dim rect As Rectangle = Guna2DataGridView1.GetCellDisplayRectangle(e.ColumnIndex, e.RowIndex, True)
            dtp.Size = New Size(rect.Width, rect.Height)
            dtp.Location = New Point(rect.X, rect.Y)

            ' Load existing value if present, otherwise leave blank (no auto-fill)
            If Guna2DataGridView1.CurrentCell.Value IsNot Nothing AndAlso IsDate(Guna2DataGridView1.CurrentCell.Value) Then
                dtp.Value = CDate(Guna2DataGridView1.CurrentCell.Value)
            Else
                dtp.Value = DateTime.Today   ' Picker starts on today but not written yet
            End If

            dtp.Visible = True
        Else
            dtp.Visible = False
        End If
    End Sub

    ' Push value when user changes
    Private Sub dtp_ValueChanged(sender As Object, e As EventArgs)
        If Guna2DataGridView1.CurrentCell IsNot Nothing AndAlso Guna2DataGridView1.Columns(Guna2DataGridView1.CurrentCell.ColumnIndex).Name = "date" Then
            Guna2DataGridView1.CurrentCell.Value = dtp.Value.ToShortDateString()
        End If
    End Sub
    ' Also push value when editing ends (covers case user picks Today without change)
    Private Sub Guna2DataGridView1_CellEndEdit(sender As Object, e As DataGridViewCellEventArgs) Handles Guna2DataGridView1.CellEndEdit
        If Guna2DataGridView1.Columns(e.ColumnIndex).Name = "date" Then
            If Guna2DataGridView1.CurrentCell.Value Is Nothing OrElse Guna2DataGridView1.CurrentCell.Value.ToString() = "" Then
                Guna2DataGridView1.CurrentCell.Value = dtp.Value.ToShortDateString()
            End If
            dtp.Visible = False
        End If

        Try
            ' Check if the edited cell is jpops_qty
            If Guna2DataGridView1.Columns(e.ColumnIndex).Name = "jpops_qty" Then
                Dim row As DataGridViewRow = Guna2DataGridView1.Rows(e.RowIndex)

                ' Validate numeric input
                Dim userInput As Decimal
                If Decimal.TryParse(row.Cells("jpops_qty").Value?.ToString(), userInput) Then
                    ' Apply formula: userInput * 56 * 7 / 35
                    Dim computedValue As Decimal = userInput * 24D * 7D / 35D

                    ' Round to nearest whole number
                    row.Cells("jpops_qty").Value = Math.Round(computedValue, 0, MidpointRounding.AwayFromZero)
                Else
                    ' Clear if invalid
                    row.Cells("jpops_qty").Value = Nothing
                End If
            End If
        Catch ex As Exception
            MessageBox.Show("Error computing Jpops value: " & ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error)
        End Try
    End Sub

    Private Sub AddQtyColumn(name As String, header As String, width As Integer)
        Dim col As New DataGridViewTextBoxColumn()
        col.Name = name
        col.HeaderText = header
        col.Width = width
        col.DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
        col.DefaultCellStyle.Format = "N0" ' Format as number without decimals
        Guna2DataGridView1.Columns.Add(col)
    End Sub


    Private Sub Guna2DataGridView1_EditingControlShowing(sender As Object, e As DataGridViewEditingControlShowingEventArgs) Handles Guna2DataGridView1.EditingControlShowing
        Dim colName As String = Guna2DataGridView1.CurrentCell.OwningColumn.Name
        If colName.EndsWith("_qty") Then
            Dim tb As TextBox = TryCast(e.Control, TextBox)
            If tb IsNot Nothing Then
                RemoveHandler tb.KeyPress, AddressOf QtyColumn_KeyPress
                AddHandler tb.KeyPress, AddressOf QtyColumn_KeyPress
            End If
        End If
    End Sub

    Private Sub QtyColumn_KeyPress(sender As Object, e As KeyPressEventArgs)
        If Not Char.IsControl(e.KeyChar) AndAlso Not Char.IsDigit(e.KeyChar) Then
            e.Handled = True
        End If
    End Sub

    Private Sub btnSave_Click(sender As Object, e As EventArgs) Handles btnSave.Click
        If MsgBox("Are you sure want to save the entry data?", vbQuestion + vbYesNo, "System Message") = vbYes Then
            cls_hourlyPOS.SaveWasteDonut(Guna2DataGridView1)
        End If
    End Sub
End Class