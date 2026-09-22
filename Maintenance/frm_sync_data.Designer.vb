<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Partial Class frm_sync_data
    Inherits System.Windows.Forms.Form

    <System.Diagnostics.DebuggerNonUserCode()>
    Protected Overrides Sub Dispose(ByVal disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    Private components As System.ComponentModel.IContainer

    <System.Diagnostics.DebuggerStepThrough()>
    Private Sub InitializeComponent()
        Dim DataGridViewCellStyle1 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle2 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle3 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Me.pnlHeader = New Guna.UI2.WinForms.Guna2Panel()
        Me.lblTitle = New Guna.UI2.WinForms.Guna2HtmlLabel()
        Me.lblSubtitle = New Guna.UI2.WinForms.Guna2HtmlLabel()
        Me.pnlToolbar = New Guna.UI2.WinForms.Guna2Panel()
        Me.btnload = New Guna.UI2.WinForms.Guna2Button()
        Me.BtnSync = New Guna.UI2.WinForms.Guna2Button()
        Me.btnftp = New Guna.UI2.WinForms.Guna2Button()
        Me.lblRecCount = New Guna.UI2.WinForms.Guna2HtmlLabel()
        Me.lblDiv = New Guna.UI2.WinForms.Guna2HtmlLabel()
        Me.pnlGrid = New System.Windows.Forms.Panel()
        Me.dgvMissingData = New Guna.UI2.WinForms.Guna2DataGridView()
        Me.pnlOverlay = New Guna.UI2.WinForms.Guna2Panel()
        Me.loader = New Guna.UI2.WinForms.Guna2CircleProgressBar()
        Me.lblLoading = New Guna.UI2.WinForms.Guna2HtmlLabel()
        Me.pnlStatus = New Guna.UI2.WinForms.Guna2Panel()
        Me.lblStatus = New Guna.UI2.WinForms.Guna2HtmlLabel()
        Me.pnlHeader.SuspendLayout()
        Me.pnlToolbar.SuspendLayout()
        Me.pnlGrid.SuspendLayout()
        CType(Me.dgvMissingData, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.pnlOverlay.SuspendLayout()
        Me.pnlStatus.SuspendLayout()
        Me.SuspendLayout()
        '
        'pnlHeader
        '
        Me.pnlHeader.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.pnlHeader.Controls.Add(Me.lblTitle)
        Me.pnlHeader.Controls.Add(Me.lblSubtitle)
        Me.pnlHeader.Dock = System.Windows.Forms.DockStyle.Top
        Me.pnlHeader.Location = New System.Drawing.Point(0, 0)
        Me.pnlHeader.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.pnlHeader.Name = "pnlHeader"
        Me.pnlHeader.Size = New System.Drawing.Size(1500, 78)
        Me.pnlHeader.TabIndex = 0
        '
        'lblTitle
        '
        Me.lblTitle.BackColor = System.Drawing.Color.Transparent
        Me.lblTitle.Font = New System.Drawing.Font("Segoe UI Semibold", 14.0!, System.Drawing.FontStyle.Bold)
        Me.lblTitle.ForeColor = System.Drawing.Color.FromArgb(CType(CType(60, Byte), Integer), CType(CType(35, Byte), Integer), CType(CType(10, Byte), Integer))
        Me.lblTitle.Location = New System.Drawing.Point(22, 9)
        Me.lblTitle.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.lblTitle.Name = "lblTitle"
        Me.lblTitle.Size = New System.Drawing.Size(107, 33)
        Me.lblTitle.TabIndex = 0
        Me.lblTitle.Text = "<b>Data Sync</b>"
        '
        'lblSubtitle
        '
        Me.lblSubtitle.BackColor = System.Drawing.Color.Transparent
        Me.lblSubtitle.Font = New System.Drawing.Font("Segoe UI", 8.5!)
        Me.lblSubtitle.ForeColor = System.Drawing.Color.FromArgb(CType(CType(160, Byte), Integer), CType(CType(120, Byte), Integer), CType(CType(80, Byte), Integer))
        Me.lblSubtitle.Location = New System.Drawing.Point(25, 45)
        Me.lblSubtitle.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.lblSubtitle.Name = "lblSubtitle"
        Me.lblSubtitle.Size = New System.Drawing.Size(341, 21)
        Me.lblSubtitle.TabIndex = 1
        Me.lblSubtitle.Text = "Identify and push missing menu items from HQ to POS"
        '
        'pnlToolbar
        '
        Me.pnlToolbar.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(240, Byte), Integer), CType(CType(225, Byte), Integer))
        Me.pnlToolbar.Controls.Add(Me.btnload)
        Me.pnlToolbar.Controls.Add(Me.BtnSync)
        Me.pnlToolbar.Controls.Add(Me.btnftp)
        Me.pnlToolbar.Controls.Add(Me.lblRecCount)
        Me.pnlToolbar.Controls.Add(Me.lblDiv)
        Me.pnlToolbar.Dock = System.Windows.Forms.DockStyle.Top
        Me.pnlToolbar.Location = New System.Drawing.Point(0, 78)
        Me.pnlToolbar.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.pnlToolbar.Name = "pnlToolbar"
        Me.pnlToolbar.Size = New System.Drawing.Size(1500, 68)
        Me.pnlToolbar.TabIndex = 1
        '
        'btnload
        '
        Me.btnload.Animated = True
        Me.btnload.BorderRadius = 17
        Me.btnload.Cursor = System.Windows.Forms.Cursors.Hand
        Me.btnload.CustomBorderColor = System.Drawing.Color.FromArgb(CType(CType(180, Byte), Integer), CType(CType(110, Byte), Integer), CType(CType(50, Byte), Integer))
        Me.btnload.FillColor = System.Drawing.Color.FromArgb(CType(CType(210, Byte), Integer), CType(CType(140, Byte), Integer), CType(CType(80, Byte), Integer))
        Me.btnload.Font = New System.Drawing.Font("Segoe UI Semibold", 9.0!)
        Me.btnload.ForeColor = System.Drawing.Color.White
        Me.btnload.Location = New System.Drawing.Point(18, 12)
        Me.btnload.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.btnload.Name = "btnload"
        Me.btnload.Size = New System.Drawing.Size(210, 42)
        Me.btnload.TabIndex = 0
        Me.btnload.Text = "Load Missing Items"
        '
        'BtnSync
        '
        Me.BtnSync.Animated = True
        Me.BtnSync.BorderRadius = 17
        Me.BtnSync.Cursor = System.Windows.Forms.Cursors.Hand
        Me.BtnSync.CustomBorderColor = System.Drawing.Color.FromArgb(CType(CType(210, Byte), Integer), CType(CType(170, Byte), Integer), CType(CType(120, Byte), Integer))
        Me.BtnSync.FillColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.BtnSync.Font = New System.Drawing.Font("Segoe UI Semibold", 9.0!)
        Me.BtnSync.ForeColor = System.Drawing.Color.FromArgb(CType(CType(60, Byte), Integer), CType(CType(35, Byte), Integer), CType(CType(10, Byte), Integer))
        Me.BtnSync.Location = New System.Drawing.Point(242, 12)
        Me.BtnSync.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.BtnSync.Name = "BtnSync"
        Me.BtnSync.Size = New System.Drawing.Size(162, 42)
        Me.BtnSync.TabIndex = 1
        Me.BtnSync.Text = "Sync to POS"
        '
        'btnftp
        '
        Me.btnftp.Animated = True
        Me.btnftp.BorderRadius = 17
        Me.btnftp.Cursor = System.Windows.Forms.Cursors.Hand
        Me.btnftp.CustomBorderColor = System.Drawing.Color.FromArgb(CType(CType(210, Byte), Integer), CType(CType(170, Byte), Integer), CType(CType(120, Byte), Integer))
        Me.btnftp.FillColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(240, Byte), Integer), CType(CType(225, Byte), Integer))
        Me.btnftp.Font = New System.Drawing.Font("Segoe UI", 9.0!)
        Me.btnftp.ForeColor = System.Drawing.Color.FromArgb(CType(CType(100, Byte), Integer), CType(CType(65, Byte), Integer), CType(CType(20, Byte), Integer))
        Me.btnftp.Location = New System.Drawing.Point(445, 12)
        Me.btnftp.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.btnftp.Name = "btnftp"
        Me.btnftp.Size = New System.Drawing.Size(150, 42)
        Me.btnftp.TabIndex = 2
        Me.btnftp.Text = "FTP Settings"
        '
        'lblRecCount
        '
        Me.lblRecCount.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.lblRecCount.BackColor = System.Drawing.Color.Transparent
        Me.lblRecCount.Font = New System.Drawing.Font("Segoe UI Semibold", 8.5!, System.Drawing.FontStyle.Bold)
        Me.lblRecCount.ForeColor = System.Drawing.Color.FromArgb(CType(CType(160, Byte), Integer), CType(CType(120, Byte), Integer), CType(CType(80, Byte), Integer))
        Me.lblRecCount.Location = New System.Drawing.Point(2575, 21)
        Me.lblRecCount.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.lblRecCount.Name = "lblRecCount"
        Me.lblRecCount.Size = New System.Drawing.Size(3, 2)
        Me.lblRecCount.TabIndex = 4
        '
        'lblDiv
        '
        Me.lblDiv.BackColor = System.Drawing.Color.Transparent
        Me.lblDiv.Font = New System.Drawing.Font("Segoe UI", 11.0!)
        Me.lblDiv.ForeColor = System.Drawing.Color.FromArgb(CType(CType(210, Byte), Integer), CType(CType(170, Byte), Integer), CType(CType(120, Byte), Integer))
        Me.lblDiv.Location = New System.Drawing.Point(420, 20)
        Me.lblDiv.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.lblDiv.Name = "lblDiv"
        Me.lblDiv.Size = New System.Drawing.Size(7, 27)
        Me.lblDiv.TabIndex = 5
        Me.lblDiv.Text = "|"
        '
        'pnlGrid
        '
        Me.pnlGrid.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(245, Byte), Integer), CType(CType(235, Byte), Integer))
        Me.pnlGrid.Controls.Add(Me.dgvMissingData)
        Me.pnlGrid.Dock = System.Windows.Forms.DockStyle.Fill
        Me.pnlGrid.Location = New System.Drawing.Point(0, 146)
        Me.pnlGrid.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.pnlGrid.Name = "pnlGrid"
        Me.pnlGrid.Size = New System.Drawing.Size(1500, 689)
        Me.pnlGrid.TabIndex = 2
        '
        'dgvMissingData
        '
        Me.dgvMissingData.AllowUserToAddRows = False
        DataGridViewCellStyle1.BackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(248, Byte), Integer), CType(CType(196, Byte), Integer))
        Me.dgvMissingData.AlternatingRowsDefaultCellStyle = DataGridViewCellStyle1
        Me.dgvMissingData.AutoSizeColumnsMode = System.Windows.Forms.DataGridViewAutoSizeColumnsMode.None
        Me.dgvMissingData.CellBorderStyle = System.Windows.Forms.DataGridViewCellBorderStyle.[Single]
        Me.dgvMissingData.ColumnHeadersBorderStyle = System.Windows.Forms.DataGridViewHeaderBorderStyle.[Single]
        DataGridViewCellStyle2.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle2.BackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(192, Byte), Integer), CType(CType(7, Byte), Integer))
        DataGridViewCellStyle2.Font = New System.Drawing.Font("Segoe UI", 9.0!)
        DataGridViewCellStyle2.ForeColor = System.Drawing.Color.White
        DataGridViewCellStyle2.SelectionBackColor = System.Drawing.SystemColors.Highlight
        DataGridViewCellStyle2.SelectionForeColor = System.Drawing.SystemColors.HighlightText
        DataGridViewCellStyle2.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.dgvMissingData.ColumnHeadersDefaultCellStyle = DataGridViewCellStyle2
        Me.dgvMissingData.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize
        DataGridViewCellStyle3.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle3.BackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(250, Byte), Integer), CType(CType(215, Byte), Integer))
        DataGridViewCellStyle3.Font = New System.Drawing.Font("Segoe UI", 9.0!)
        DataGridViewCellStyle3.ForeColor = System.Drawing.Color.Black
        DataGridViewCellStyle3.SelectionBackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(213, Byte), Integer), CType(CType(89, Byte), Integer))
        DataGridViewCellStyle3.SelectionForeColor = System.Drawing.Color.Black
        DataGridViewCellStyle3.WrapMode = System.Windows.Forms.DataGridViewTriState.[False]
        Me.dgvMissingData.DefaultCellStyle = DataGridViewCellStyle3
        Me.dgvMissingData.Dock = System.Windows.Forms.DockStyle.Fill
        Me.dgvMissingData.GridColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(235, Byte), Integer), CType(CType(177, Byte), Integer))
        Me.dgvMissingData.Location = New System.Drawing.Point(0, 0)
        Me.dgvMissingData.Margin = New System.Windows.Forms.Padding(0)
        Me.dgvMissingData.Name = "dgvMissingData"
        Me.dgvMissingData.RowHeadersVisible = False
        Me.dgvMissingData.RowHeadersWidth = 51
        Me.dgvMissingData.RowTemplate.Height = 32
        Me.dgvMissingData.Size = New System.Drawing.Size(1500, 689)
        Me.dgvMissingData.TabIndex = 0
        Me.dgvMissingData.Theme = Guna.UI2.WinForms.Enums.DataGridViewPresetThemes.Ember
        Me.dgvMissingData.ThemeStyle.AlternatingRowsStyle.BackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(248, Byte), Integer), CType(CType(196, Byte), Integer))
        Me.dgvMissingData.ThemeStyle.AlternatingRowsStyle.Font = Nothing
        Me.dgvMissingData.ThemeStyle.AlternatingRowsStyle.ForeColor = System.Drawing.Color.Empty
        Me.dgvMissingData.ThemeStyle.AlternatingRowsStyle.SelectionBackColor = System.Drawing.Color.Empty
        Me.dgvMissingData.ThemeStyle.AlternatingRowsStyle.SelectionForeColor = System.Drawing.Color.Empty
        Me.dgvMissingData.ThemeStyle.BackColor = System.Drawing.Color.White
        Me.dgvMissingData.ThemeStyle.GridColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(235, Byte), Integer), CType(CType(177, Byte), Integer))
        Me.dgvMissingData.ThemeStyle.HeaderStyle.BackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(192, Byte), Integer), CType(CType(7, Byte), Integer))
        Me.dgvMissingData.ThemeStyle.HeaderStyle.BorderStyle = System.Windows.Forms.DataGridViewHeaderBorderStyle.[Single]
        Me.dgvMissingData.ThemeStyle.HeaderStyle.Font = New System.Drawing.Font("Segoe UI", 9.0!)
        Me.dgvMissingData.ThemeStyle.HeaderStyle.ForeColor = System.Drawing.Color.White
        Me.dgvMissingData.ThemeStyle.HeaderStyle.HeaightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize
        Me.dgvMissingData.ThemeStyle.HeaderStyle.Height = 4
        Me.dgvMissingData.ThemeStyle.ReadOnly = False
        Me.dgvMissingData.ThemeStyle.RowsStyle.BackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(250, Byte), Integer), CType(CType(215, Byte), Integer))
        Me.dgvMissingData.ThemeStyle.RowsStyle.BorderStyle = System.Windows.Forms.DataGridViewCellBorderStyle.SingleHorizontal
        Me.dgvMissingData.ThemeStyle.RowsStyle.Font = New System.Drawing.Font("Segoe UI", 9.0!)
        Me.dgvMissingData.ThemeStyle.RowsStyle.ForeColor = System.Drawing.Color.Black
        Me.dgvMissingData.ThemeStyle.RowsStyle.Height = 32
        Me.dgvMissingData.ThemeStyle.RowsStyle.SelectionBackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(213, Byte), Integer), CType(CType(89, Byte), Integer))
        Me.dgvMissingData.ThemeStyle.RowsStyle.SelectionForeColor = System.Drawing.Color.Black
        '
        'pnlOverlay
        '
        Me.pnlOverlay.BackColor = System.Drawing.Color.FromArgb(CType(CType(210, Byte), Integer), CType(CType(255, Byte), Integer), CType(CType(240, Byte), Integer), CType(CType(220, Byte), Integer))
        Me.pnlOverlay.Controls.Add(Me.loader)
        Me.pnlOverlay.Controls.Add(Me.lblLoading)
        Me.pnlOverlay.Dock = System.Windows.Forms.DockStyle.Fill
        Me.pnlOverlay.Location = New System.Drawing.Point(0, 0)
        Me.pnlOverlay.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.pnlOverlay.Name = "pnlOverlay"
        Me.pnlOverlay.Size = New System.Drawing.Size(1500, 875)
        Me.pnlOverlay.TabIndex = 99
        Me.pnlOverlay.Visible = False
        '
        'loader
        '
        Me.loader.Animated = True
        Me.loader.FillColor = System.Drawing.Color.FromArgb(CType(CType(200, Byte), Integer), CType(CType(213, Byte), Integer), CType(CType(218, Byte), Integer), CType(CType(223, Byte), Integer))
        Me.loader.Font = New System.Drawing.Font("Segoe UI", 12.0!)
        Me.loader.ForeColor = System.Drawing.Color.White
        Me.loader.Location = New System.Drawing.Point(716, 350)
        Me.loader.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.loader.Minimum = 0
        Me.loader.Name = "loader"
        Me.loader.ProgressColor = System.Drawing.Color.FromArgb(CType(CType(210, Byte), Integer), CType(CType(140, Byte), Integer), CType(CType(80, Byte), Integer))
        Me.loader.Size = New System.Drawing.Size(68, 68)
        Me.loader.TabIndex = 0
        Me.loader.Value = 75
        '
        'lblLoading
        '
        Me.lblLoading.BackColor = System.Drawing.Color.Transparent
        Me.lblLoading.Font = New System.Drawing.Font("Segoe UI", 10.0!)
        Me.lblLoading.ForeColor = System.Drawing.Color.FromArgb(CType(CType(60, Byte), Integer), CType(CType(35, Byte), Integer), CType(CType(10, Byte), Integer))
        Me.lblLoading.Location = New System.Drawing.Point(662, 430)
        Me.lblLoading.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.lblLoading.Name = "lblLoading"
        Me.lblLoading.Size = New System.Drawing.Size(99, 25)
        Me.lblLoading.TabIndex = 1
        Me.lblLoading.Text = "Please wait..."
        '
        'pnlStatus
        '
        Me.pnlStatus.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.pnlStatus.Controls.Add(Me.lblStatus)
        Me.pnlStatus.Dock = System.Windows.Forms.DockStyle.Bottom
        Me.pnlStatus.Location = New System.Drawing.Point(0, 835)
        Me.pnlStatus.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.pnlStatus.Name = "pnlStatus"
        Me.pnlStatus.Size = New System.Drawing.Size(1500, 40)
        Me.pnlStatus.TabIndex = 3
        '
        'lblStatus
        '
        Me.lblStatus.BackColor = System.Drawing.Color.Transparent
        Me.lblStatus.Font = New System.Drawing.Font("Segoe UI", 8.5!)
        Me.lblStatus.ForeColor = System.Drawing.Color.FromArgb(CType(CType(160, Byte), Integer), CType(CType(120, Byte), Integer), CType(CType(80, Byte), Integer))
        Me.lblStatus.Location = New System.Drawing.Point(18, 10)
        Me.lblStatus.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.lblStatus.Name = "lblStatus"
        Me.lblStatus.Size = New System.Drawing.Size(40, 21)
        Me.lblStatus.TabIndex = 0
        Me.lblStatus.Text = "Ready"
        '
        'frm_sync_data
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(120.0!, 120.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Dpi
        Me.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(245, Byte), Integer), CType(CType(235, Byte), Integer))
        Me.ClientSize = New System.Drawing.Size(1500, 875)
        Me.ControlBox = False
        Me.Controls.Add(Me.pnlGrid)
        Me.Controls.Add(Me.pnlToolbar)
        Me.Controls.Add(Me.pnlHeader)
        Me.Controls.Add(Me.pnlStatus)
        Me.Controls.Add(Me.pnlOverlay)
        Me.Font = New System.Drawing.Font("Segoe UI", 9.0!)
        Me.FormBorderStyle = System.Windows.Forms.FormBorderStyle.None
        Me.Margin = New System.Windows.Forms.Padding(4, 4, 4, 4)
        Me.Name = "frm_sync_data"
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "Data Sync"
        Me.pnlHeader.ResumeLayout(False)
        Me.pnlHeader.PerformLayout()
        Me.pnlToolbar.ResumeLayout(False)
        Me.pnlToolbar.PerformLayout()
        Me.pnlGrid.ResumeLayout(False)
        CType(Me.dgvMissingData, System.ComponentModel.ISupportInitialize).EndInit()
        Me.pnlOverlay.ResumeLayout(False)
        Me.pnlOverlay.PerformLayout()
        Me.pnlStatus.ResumeLayout(False)
        Me.pnlStatus.PerformLayout()
        Me.ResumeLayout(False)

    End Sub

    ' ── Field declarations ───────────────────────────────────────────
    Friend WithEvents pnlHeader      As Guna.UI2.WinForms.Guna2Panel
    Friend WithEvents lblTitle       As Guna.UI2.WinForms.Guna2HtmlLabel
    Friend WithEvents lblSubtitle    As Guna.UI2.WinForms.Guna2HtmlLabel
    Friend WithEvents pnlToolbar     As Guna.UI2.WinForms.Guna2Panel
    Friend WithEvents btnload        As Guna.UI2.WinForms.Guna2Button
    Friend WithEvents BtnSync        As Guna.UI2.WinForms.Guna2Button
    Friend WithEvents btnftp         As Guna.UI2.WinForms.Guna2Button
    Friend WithEvents lblRecCount As Guna.UI2.WinForms.Guna2HtmlLabel
    Friend WithEvents pnlGrid As System.Windows.Forms.Panel
    Friend WithEvents dgvMissingData As Guna.UI2.WinForms.Guna2DataGridView
    Friend WithEvents pnlStatus As Guna.UI2.WinForms.Guna2Panel
    Friend WithEvents lblStatus As Guna.UI2.WinForms.Guna2HtmlLabel
    Friend WithEvents pnlOverlay As Guna.UI2.WinForms.Guna2Panel
    Friend WithEvents loader As Guna.UI2.WinForms.Guna2CircleProgressBar
    Friend WithEvents lblLoading As Guna.UI2.WinForms.Guna2HtmlLabel
    Friend WithEvents lblDiv As Guna.UI2.WinForms.Guna2HtmlLabel
End Class
