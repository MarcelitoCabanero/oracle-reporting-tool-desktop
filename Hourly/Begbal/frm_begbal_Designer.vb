<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Partial Class frm_begbal
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
        Me.pnlHeader      = New Guna.UI2.WinForms.Guna2Panel()
        Me.pnlTitleBlock  = New System.Windows.Forms.Panel()
        Me.lblPageTitle   = New Guna.UI2.WinForms.Guna2HtmlLabel()
        Me.lblPageSub     = New Guna.UI2.WinForms.Guna2HtmlLabel()
        Me.sepHeader      = New Guna.UI2.WinForms.Guna2Separator()
        Me.pnlToolbar     = New Guna.UI2.WinForms.Guna2Panel()
        Me.btnSave        = New Guna.UI2.WinForms.Guna2Button()
        Me.btnClear       = New Guna.UI2.WinForms.Guna2Button()
        Me.pnlGrid        = New System.Windows.Forms.Panel()
        Me.Guna2DataGridView1 = New Guna.UI2.WinForms.Guna2DataGridView()
        Me.pnlHeader.SuspendLayout()
        Me.pnlTitleBlock.SuspendLayout()
        Me.pnlToolbar.SuspendLayout()
        Me.pnlGrid.SuspendLayout()
        CType(Me.Guna2DataGridView1, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()

        ' ── pnlHeader ───────────────────────────────────────────────
        Me.pnlHeader.BackColor = System.Drawing.Color.FromArgb(255, 224, 192)
        Me.pnlHeader.Controls.Add(Me.pnlTitleBlock)
        Me.pnlHeader.Dock = System.Windows.Forms.DockStyle.Top
        Me.pnlHeader.Location = New System.Drawing.Point(0, 0)
        Me.pnlHeader.Name = "pnlHeader"
        Me.pnlHeader.Size = New System.Drawing.Size(1151, 64)
        Me.pnlHeader.TabIndex = 0

        ' ── pnlTitleBlock ───────────────────────────────────────────
        Me.pnlTitleBlock.BackColor = System.Drawing.Color.Transparent
        Me.pnlTitleBlock.Controls.Add(Me.lblPageTitle)
        Me.pnlTitleBlock.Controls.Add(Me.lblPageSub)
        Me.pnlTitleBlock.Location = New System.Drawing.Point(18, 8)
        Me.pnlTitleBlock.Name = "pnlTitleBlock"
        Me.pnlTitleBlock.Size = New System.Drawing.Size(500, 50)
        Me.pnlTitleBlock.TabIndex = 0

        ' ── lblPageTitle ────────────────────────────────────────────
        Me.lblPageTitle.BackColor = System.Drawing.Color.Transparent
        Me.lblPageTitle.Font = New System.Drawing.Font("Segoe UI Semibold", 13.0!, System.Drawing.FontStyle.Bold)
        Me.lblPageTitle.ForeColor = System.Drawing.Color.FromArgb(60, 35, 10)
        Me.lblPageTitle.Location = New System.Drawing.Point(0, 2)
        Me.lblPageTitle.Name = "lblPageTitle"
        Me.lblPageTitle.Size = New System.Drawing.Size(300, 28)
        Me.lblPageTitle.TabIndex = 0
        Me.lblPageTitle.Text = "<b>Donut Produce Entry</b>"

        ' ── lblPageSub ──────────────────────────────────────────────
        Me.lblPageSub.BackColor = System.Drawing.Color.Transparent
        Me.lblPageSub.Font = New System.Drawing.Font("Segoe UI", 8.0!)
        Me.lblPageSub.ForeColor = System.Drawing.Color.FromArgb(120, 80, 40)
        Me.lblPageSub.Location = New System.Drawing.Point(2, 32)
        Me.lblPageSub.Name = "lblPageSub"
        Me.lblPageSub.Size = New System.Drawing.Size(300, 18)
        Me.lblPageSub.TabIndex = 1
        Me.lblPageSub.Text = "Beginning Balance  ·  Produced / Received Donuts"

        ' ── sepHeader ───────────────────────────────────────────────
        Me.sepHeader.Dock = System.Windows.Forms.DockStyle.Top
        Me.sepHeader.FillColor = System.Drawing.Color.FromArgb(210, 160, 90)
        Me.sepHeader.Location = New System.Drawing.Point(0, 64)
        Me.sepHeader.Name = "sepHeader"
        Me.sepHeader.Size = New System.Drawing.Size(1151, 2)
        Me.sepHeader.TabIndex = 1

        ' ── pnlToolbar ──────────────────────────────────────────────
        Me.pnlToolbar.BackColor = System.Drawing.Color.FromArgb(255, 245, 235)
        Me.pnlToolbar.Controls.Add(Me.btnSave)
        Me.pnlToolbar.Controls.Add(Me.btnClear)
        Me.pnlToolbar.Dock = System.Windows.Forms.DockStyle.Top
        Me.pnlToolbar.Location = New System.Drawing.Point(0, 66)
        Me.pnlToolbar.Name = "pnlToolbar"
        Me.pnlToolbar.Size = New System.Drawing.Size(1151, 56)
        Me.pnlToolbar.TabIndex = 2

        ' ── btnSave ─────────────────────────────────────────────────
        Me.btnSave.BorderRadius = 6
        Me.btnSave.Cursor = System.Windows.Forms.Cursors.Hand
        Me.btnSave.CustomBorderColor = System.Drawing.Color.FromArgb(180, 120, 50)
        Me.btnSave.CustomBorderThickness = New System.Windows.Forms.Padding(1)
        Me.btnSave.FillColor = System.Drawing.Color.FromArgb(60, 35, 10)
        Me.btnSave.Font = New System.Drawing.Font("Segoe UI Semibold", 9.5!, System.Drawing.FontStyle.Bold)
        Me.btnSave.ForeColor = System.Drawing.Color.FromArgb(255, 224, 192)
        Me.btnSave.HoverState.FillColor = System.Drawing.Color.FromArgb(90, 55, 20)
        Me.btnSave.Location = New System.Drawing.Point(16, 10)
        Me.btnSave.Name = "btnSave"
        Me.btnSave.Size = New System.Drawing.Size(130, 36)
        Me.btnSave.TabIndex = 0
        Me.btnSave.Text = ChrW(10003) & "  Save Entries"

        ' ── btnClear ────────────────────────────────────────────────
        Me.btnClear.BorderRadius = 6
        Me.btnClear.Cursor = System.Windows.Forms.Cursors.Hand
        Me.btnClear.CustomBorderColor = System.Drawing.Color.FromArgb(210, 160, 90)
        Me.btnClear.CustomBorderThickness = New System.Windows.Forms.Padding(1)
        Me.btnClear.FillColor = System.Drawing.Color.Transparent
        Me.btnClear.Font = New System.Drawing.Font("Segoe UI", 9.5!)
        Me.btnClear.ForeColor = System.Drawing.Color.FromArgb(120, 80, 40)
        Me.btnClear.HoverState.FillColor = System.Drawing.Color.FromArgb(255, 224, 192)
        Me.btnClear.Location = New System.Drawing.Point(158, 10)
        Me.btnClear.Name = "btnClear"
        Me.btnClear.Size = New System.Drawing.Size(120, 36)
        Me.btnClear.TabIndex = 1
        Me.btnClear.Text = ChrW(10005) & "  Clear All"

        ' ── pnlGrid ─────────────────────────────────────────────────
        Me.pnlGrid.BackColor = System.Drawing.Color.FromArgb(255, 245, 235)
        Me.pnlGrid.Controls.Add(Me.Guna2DataGridView1)
        Me.pnlGrid.Dock = System.Windows.Forms.DockStyle.Fill
        Me.pnlGrid.Location = New System.Drawing.Point(0, 122)
        Me.pnlGrid.Name = "pnlGrid"
        Me.pnlGrid.Padding = New System.Windows.Forms.Padding(12, 10, 12, 12)
        Me.pnlGrid.Size = New System.Drawing.Size(1151, 619)
        Me.pnlGrid.TabIndex = 3

        ' ── Guna2DataGridView1 ──────────────────────────────────────
        Me.Guna2DataGridView1.BackgroundColor = System.Drawing.Color.FromArgb(255, 245, 235)
        Me.Guna2DataGridView1.BorderStyle = System.Windows.Forms.BorderStyle.None
        Me.Guna2DataGridView1.Dock = System.Windows.Forms.DockStyle.Fill
        Me.Guna2DataGridView1.GridColor = System.Drawing.Color.FromArgb(240, 220, 190)
        Me.Guna2DataGridView1.Location = New System.Drawing.Point(12, 10)
        Me.Guna2DataGridView1.Name = "Guna2DataGridView1"
        Me.Guna2DataGridView1.RowHeadersVisible = False
        Me.Guna2DataGridView1.RowTemplate.Height = 34
        Me.Guna2DataGridView1.Size = New System.Drawing.Size(1127, 597)
        Me.Guna2DataGridView1.TabIndex = 0
        ' Theme applied at runtime in apply_datagridproperties()

        ' ── frm_begbal ──────────────────────────────────────────────
        Me.AutoScaleDimensions = New System.Drawing.SizeF(96.0!, 96.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.None
        Me.BackColor = System.Drawing.Color.FromArgb(255, 245, 235)
        Me.ClientSize = New System.Drawing.Size(1151, 741)
        Me.Controls.Add(Me.pnlGrid)
        Me.Controls.Add(Me.pnlToolbar)
        Me.Controls.Add(Me.sepHeader)
        Me.Controls.Add(Me.pnlHeader)
        Me.Name = "frm_begbal"
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterParent
        Me.Text = "Donut Produce Entry"

        Me.pnlHeader.ResumeLayout(False)
        Me.pnlTitleBlock.ResumeLayout(False)
        Me.pnlToolbar.ResumeLayout(False)
        Me.pnlGrid.ResumeLayout(False)
        CType(Me.Guna2DataGridView1, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)
    End Sub

    ' ── Field declarations ───────────────────────────────────────────
    Friend WithEvents pnlHeader      As Guna.UI2.WinForms.Guna2Panel
    Friend WithEvents pnlTitleBlock  As System.Windows.Forms.Panel
    Friend WithEvents lblPageTitle   As Guna.UI2.WinForms.Guna2HtmlLabel
    Friend WithEvents lblPageSub     As Guna.UI2.WinForms.Guna2HtmlLabel
    Friend WithEvents sepHeader      As Guna.UI2.WinForms.Guna2Separator
    Friend WithEvents pnlToolbar     As Guna.UI2.WinForms.Guna2Panel
    Friend WithEvents btnSave        As Guna.UI2.WinForms.Guna2Button
    Friend WithEvents btnClear       As Guna.UI2.WinForms.Guna2Button
    Friend WithEvents pnlGrid        As System.Windows.Forms.Panel
    Friend WithEvents Guna2DataGridView1 As Guna.UI2.WinForms.Guna2DataGridView
End Class
