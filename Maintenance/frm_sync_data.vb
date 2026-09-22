Imports System.Data.SqlClient
Imports System.Configuration

Public Class frm_sync_data

    Private ReadOnly POSconnection As String =
        ConfigurationManager.ConnectionStrings("LocalDB").ConnectionString

    Private ReadOnly HQConnection As String =
        ConfigurationManager.ConnectionStrings("HQDB").ConnectionString

    Private missingDataTable As DataTable

#Region "Form Load"

    Private Sub frm_sync_data_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        loader.ProgressColor2 = System.Drawing.Color.FromArgb(255, 224, 192)
        ApplyGridTheme()
        ShowOverlay(False)
        SetButtonState(syncing:=False)
        UpdateStatus("Ready — click ""Load Missing Items"" to compare HQ vs POS menu items.")
        AddHandler Me.Resize, Sub(s, ev) CenterOverlay()
    End Sub

#End Region

#Region "Load missing items"

    Private Async Sub btnload_Click(sender As Object, e As EventArgs) Handles btnload.Click
        Await LoadMissingDataAsync()
    End Sub

    Private Async Function LoadMissingDataAsync() As Task
        ShowOverlay(True, "Comparing HQ and POS data...")
        SetButtonState(syncing:=True)
        UpdateStatus("Loading — comparing HQ menu items against local POS database...")

        Try
            dgvMissingData.Rows.Clear()
            dgvMissingData.Columns.Clear()

            missingDataTable = Await Task.Run(Function() GetMissingData())

            SetupGrid()

            If missingDataTable IsNot Nothing AndAlso missingDataTable.Rows.Count > 0 Then
                For Each row As DataRow In missingDataTable.Rows
                    dgvMissingData.Rows.Add(
                        row("itemnumber").ToString(),
                        row("itemname").ToString(),
                        row("transtype").ToString(),
                        row("majorgroup").ToString(),
                        row("familygroup").ToString()
                    )
                Next
                Dim cnt As Integer = missingDataTable.Rows.Count
                lblRecCount.Text = cnt & " missing item(s)"
                UpdateStatus(cnt & " missing item(s) found — review the list then click ""Sync to POS"".")
            Else
                lblRecCount.Text = "0 missing items"
                UpdateStatus("All data is already in sync. No missing items found.")
                MessageBox.Show("All data is already synced.",
                                "Sync Status", MessageBoxButtons.OK, MessageBoxIcon.Information)
            End If

        Catch ex As Exception
            MessageBox.Show("Error loading data: " & ex.Message, "Error",
                            MessageBoxButtons.OK, MessageBoxIcon.Error)
            UpdateStatus("Error — " & ex.Message)
        Finally
            ShowOverlay(False)
            SetButtonState(syncing:=False)
        End Try
    End Function

    ''' <summary>Background-safe — uses its own connections, no UI access.</summary>
    Private Function GetMissingData() As DataTable
        Dim dtHQ As New DataTable()
        Dim posItemNumbers As New HashSet(Of String)()

        ' Load HQ data
        Using hqConn As New SqlConnection(HQConnection)
            Using cmd As New SqlCommand(
                "SELECT itemnumber, itemname, transtype, majorgroup, familygroup
                 FROM dts_object", hqConn)
                hqConn.Open()
                Using da As New SqlDataAdapter(cmd)
                    da.Fill(dtHQ)
                End Using
            End Using
        End Using

        ' Load POS item numbers
        Using posConn As New SqlConnection(POSconnection)
            Using cmd As New SqlCommand("SELECT itemnumber FROM dts_object", posConn)
                posConn.Open()
                Using reader = cmd.ExecuteReader()
                    While reader.Read()
                        posItemNumbers.Add(reader("itemnumber").ToString())
                    End While
                End Using
            End Using
        End Using

        ' Return only the rows missing from POS
        Dim missingRows =
            dtHQ.AsEnumerable().
            Where(Function(r) Not posItemNumbers.Contains(r("itemnumber").ToString()))

        Return If(missingRows.Any(), missingRows.CopyToDataTable(), Nothing)
    End Function

#End Region

#Region "Sync to POS"

    Private Async Sub BtnSync_Click(sender As Object, e As EventArgs) Handles BtnSync.Click
        If dgvMissingData.Rows.Count = 0 Then
            MessageBox.Show("No missing data to sync. Load items first.",
                            "System Information", MessageBoxButtons.OK, MessageBoxIcon.Exclamation)
            Return
        End If

        Dim confirm As DialogResult =
            MessageBox.Show($"This will insert {dgvMissingData.Rows.Count} missing item(s) into the POS database." &
                            Environment.NewLine & "Proceed?",
                            "Confirm Sync", MessageBoxButtons.YesNo, MessageBoxIcon.Question)
        If confirm <> DialogResult.Yes Then Return

        ShowOverlay(True, "Syncing items to POS database...")
        SetButtonState(syncing:=True)
        UpdateStatus("Syncing — writing missing items to local POS database...")

        Try
            Await SyncDataAsync()

            MessageBox.Show("Data sync completed successfully.",
                            "Sync Done", MessageBoxButtons.OK, MessageBoxIcon.Information)
            UpdateStatus("Sync completed. Reloading to verify...")

            ' Reload to confirm
            Await LoadMissingDataAsync()

        Catch ex As Exception
            MessageBox.Show("Sync error: " & ex.Message, "Error",
                            MessageBoxButtons.OK, MessageBoxIcon.Error)
            UpdateStatus("Sync error — " & ex.Message)
        Finally
            ShowOverlay(False)
            SetButtonState(syncing:=False)
        End Try
    End Sub

    ''' <summary>
    ''' Reads from the grid (UI thread) then inserts into POS database.
    ''' Grid is accessed before Await so the lambda captures safe copies.
    ''' </summary>
    Private Async Function SyncDataAsync() As Task
        ' Snapshot grid data on UI thread before going async
        Dim rows As New List(Of (itemnumber As String, itemname As String,
                                  transtype As String, majorgroup As String,
                                  familygroup As String))

        For Each row As DataGridViewRow In dgvMissingData.Rows
            If row.IsNewRow Then Continue For
            rows.Add((
                row.Cells("itemnumber").Value?.ToString(),
                row.Cells("itemname").Value?.ToString(),
                row.Cells("Transtype").Value?.ToString(),
                row.Cells("majorgroup").Value?.ToString(),
                row.Cells("familygroup").Value?.ToString()
            ))
        Next

        ' Insert on background thread
        Await Task.Run(Async Function()
                           Using posConn As New SqlConnection(POSconnection)
                               Await posConn.OpenAsync()
                               For Each r In rows
                                   Using cmd As New SqlCommand(
                        "IF NOT EXISTS (SELECT 1 FROM dts_object WHERE itemnumber = @itemnumber)
                         BEGIN
                             INSERT INTO dts_object (itemnumber, itemname, Transtype, Majorgroup, familygroup)
                             VALUES (@itemnumber, @itemname, @Transtype, @majorgroup, @familygroup)
                         END", posConn)
                                       cmd.Parameters.AddWithValue("@itemnumber", r.itemnumber)
                                       cmd.Parameters.AddWithValue("@itemname", r.itemname)
                                       cmd.Parameters.AddWithValue("@Transtype", r.transtype)
                                       cmd.Parameters.AddWithValue("@majorgroup", r.majorgroup)
                                       cmd.Parameters.AddWithValue("@familygroup", r.familygroup)
                                       Await cmd.ExecuteNonQueryAsync()
                                   End Using
                               Next
                           End Using
                       End Function)
    End Function

#End Region

#Region "Navigation — FTP / System Update (preserved)"

    Private Sub btnftp_Click(sender As Object, e As EventArgs) Handles btnftp.Click
        frm_ftp.Show()
    End Sub

#End Region

#Region "Grid setup & theme"

    Private Sub SetupGrid()
        With dgvMissingData
            .Columns.Add("itemnumber", "MenuItem Number")
            .Columns.Add("itemname", "MenuItem Name")
            .Columns.Add("Transtype", "Trans Type")
            .Columns.Add("majorgroup", "Major Group")
            .Columns.Add("familygroup", "Family Group")

            .AllowUserToAddRows = False
            .SelectionMode = DataGridViewSelectionMode.FullRowSelect

            ' Distribute column widths
            Dim colW As Integer = Math.Max(140, (dgvMissingData.Width - 4) \ 5)
            For i As Integer = 0 To .ColumnCount - 1
                .Columns(i).Width = colW
                .Columns(i).ReadOnly = True
                .Columns(i).SortMode = DataGridViewColumnSortMode.NotSortable
                .Columns(i).DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleCenter
            Next

            ' Item name — wider and left-aligned for readability
            .Columns("itemname").Width = Math.Max(220, colW + 40)
            .Columns("itemname").DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleLeft
            .Columns("itemnumber").Width = 170
            ApplyGridTheme()

        End With
    End Sub

    Private Sub ApplyGridTheme()
        With dgvMissingData
            .Theme = Guna.UI2.WinForms.Enums.DataGridViewPresetThemes.Ember
            .ThemeStyle.HeaderStyle.BackColor = System.Drawing.Color.FromArgb(255, 224, 192)
            .ThemeStyle.HeaderStyle.ForeColor = System.Drawing.Color.FromArgb(60, 35, 10)
            .ThemeStyle.HeaderStyle.Font = New System.Drawing.Font("Segoe UI Semibold", 9.5!, System.Drawing.FontStyle.Bold)
            .ThemeStyle.HeaderStyle.BorderStyle = DataGridViewHeaderBorderStyle.Single
            .ThemeStyle.HeaderStyle.HeaightSizeMode = DataGridViewColumnHeadersHeightSizeMode.AutoSize

            .ThemeStyle.RowsStyle.BackColor = System.Drawing.Color.FromArgb(255, 255, 250)
            .ThemeStyle.RowsStyle.ForeColor = System.Drawing.Color.FromArgb(40, 25, 8)
            .ThemeStyle.RowsStyle.Font = New System.Drawing.Font("Segoe UI", 9.0!)
            .ThemeStyle.RowsStyle.Height = 32
            .ThemeStyle.RowsStyle.SelectionBackColor = System.Drawing.Color.FromArgb(255, 224, 192)
            .ThemeStyle.RowsStyle.SelectionForeColor = System.Drawing.Color.FromArgb(60, 35, 10)
            .ThemeStyle.RowsStyle.BorderStyle = DataGridViewCellBorderStyle.Single

            .ThemeStyle.AlternatingRowsStyle.BackColor = System.Drawing.Color.FromArgb(255, 243, 230)
            .ThemeStyle.AlternatingRowsStyle.ForeColor = System.Drawing.Color.FromArgb(40, 25, 8)

            .ThemeStyle.BackColor = System.Drawing.Color.FromArgb(255, 245, 235)
            .ThemeStyle.GridColor = System.Drawing.Color.FromArgb(230, 195, 155)
            .ThemeStyle.ReadOnly = False
        End With
    End Sub

#End Region

#Region "UI state helpers"

    ''' <summary>Enable/disable action buttons during async operations.</summary>
    Private Sub SetButtonState(syncing As Boolean)
        btnload.Enabled = Not syncing
        BtnSync.Enabled = Not syncing
        btnftp.Enabled = Not syncing
    End Sub

    Private Sub ShowOverlay(show As Boolean, Optional msg As String = "")
        If Me.InvokeRequired Then
            Me.Invoke(Sub() ShowOverlay(show, msg))
            Return
        End If
        If show AndAlso msg <> "" Then lblLoading.Text = msg
        pnlOverlay.Visible = show
        If show Then
            pnlOverlay.BringToFront()
            CenterOverlay()
        End If
    End Sub

    Private Sub CenterOverlay()
        loader.Location = New System.Drawing.Point(
            (pnlOverlay.Width - loader.Width) \ 2,
            (pnlOverlay.Height - loader.Height) \ 2 - 20)
        lblLoading.Location = New System.Drawing.Point(
            (pnlOverlay.Width - lblLoading.Width) \ 2,
             loader.Bottom + 10)
    End Sub

    Private Sub UpdateStatus(msg As String)
        lblStatus.Text = msg
    End Sub

#End Region

End Class
