<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frm_hourly_POS
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()> _
    Protected Overrides Sub Dispose(ByVal disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()> _
    Private Sub InitializeComponent()
        Dim DataGridViewCellStyle1 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle2 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle3 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Me.Panel1 = New System.Windows.Forms.Panel()
        Me.btnExportToExcel = New Guna.UI2.WinForms.Guna2Button()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.dtto = New System.Windows.Forms.DateTimePicker()
        Me.btngenerate = New Guna.UI2.WinForms.Guna2Button()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.dtFrom = New System.Windows.Forms.DateTimePicker()
        Me.dgvHourly = New Guna.UI2.WinForms.Guna2DataGridView()
        Me.GunaProgressIndicator1 = New Guna.UI2.WinForms.Guna2ProgressIndicator()
        Me.BackgroundWorker1 = New System.ComponentModel.BackgroundWorker()
        Me.Panel1.SuspendLayout()
        CType(Me.dgvHourly, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'Panel1
        '
        Me.Panel1.Controls.Add(Me.btnExportToExcel)
        Me.Panel1.Controls.Add(Me.Label1)
        Me.Panel1.Controls.Add(Me.dtto)
        Me.Panel1.Controls.Add(Me.btngenerate)
        Me.Panel1.Controls.Add(Me.Label2)
        Me.Panel1.Controls.Add(Me.dtFrom)
        Me.Panel1.Dock = System.Windows.Forms.DockStyle.Top
        Me.Panel1.Location = New System.Drawing.Point(0, 0)
        Me.Panel1.Name = "Panel1"
        Me.Panel1.Size = New System.Drawing.Size(1138, 128)
        Me.Panel1.TabIndex = 0
        '
        'btnExportToExcel
        '
        Me.btnExportToExcel.Animated = True
        Me.btnExportToExcel.AutoRoundedCorners = True
        Me.btnExportToExcel.BackColor = System.Drawing.Color.Transparent
        Me.btnExportToExcel.BorderRadius = 30
        Me.btnExportToExcel.DisabledState.BorderColor = System.Drawing.Color.DarkGray
        Me.btnExportToExcel.DisabledState.CustomBorderColor = System.Drawing.Color.DarkGray
        Me.btnExportToExcel.DisabledState.FillColor = System.Drawing.Color.FromArgb(CType(CType(169, Byte), Integer), CType(CType(169, Byte), Integer), CType(CType(169, Byte), Integer))
        Me.btnExportToExcel.DisabledState.ForeColor = System.Drawing.Color.FromArgb(CType(CType(141, Byte), Integer), CType(CType(141, Byte), Integer), CType(CType(141, Byte), Integer))
        Me.btnExportToExcel.FillColor = System.Drawing.Color.Green
        Me.btnExportToExcel.Font = New System.Drawing.Font("Segoe UI", 10.8!)
        Me.btnExportToExcel.ForeColor = System.Drawing.Color.White
        Me.btnExportToExcel.Location = New System.Drawing.Point(537, 21)
        Me.btnExportToExcel.Margin = New System.Windows.Forms.Padding(3, 2, 3, 2)
        Me.btnExportToExcel.Name = "btnExportToExcel"
        Me.btnExportToExcel.Size = New System.Drawing.Size(170, 62)
        Me.btnExportToExcel.TabIndex = 18
        Me.btnExportToExcel.Text = "Export"
        Me.btnExportToExcel.UseTransparentBackground = True
        '
        'Label1
        '
        Me.Label1.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.Label1.AutoSize = True
        Me.Label1.Font = New System.Drawing.Font("Tahoma", 12.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label1.Location = New System.Drawing.Point(46, 59)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(40, 24)
        Me.Label1.TabIndex = 17
        Me.Label1.Text = "To:"
        '
        'dtto
        '
        Me.dtto.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.dtto.Font = New System.Drawing.Font("Tahoma", 10.8!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.dtto.Format = System.Windows.Forms.DateTimePickerFormat.[Short]
        Me.dtto.Location = New System.Drawing.Point(92, 56)
        Me.dtto.Name = "dtto"
        Me.dtto.Size = New System.Drawing.Size(228, 29)
        Me.dtto.TabIndex = 16
        '
        'btngenerate
        '
        Me.btngenerate.Animated = True
        Me.btngenerate.AutoRoundedCorners = True
        Me.btngenerate.BackColor = System.Drawing.Color.Transparent
        Me.btngenerate.BorderRadius = 30
        Me.btngenerate.DisabledState.BorderColor = System.Drawing.Color.DarkGray
        Me.btngenerate.DisabledState.CustomBorderColor = System.Drawing.Color.DarkGray
        Me.btngenerate.DisabledState.FillColor = System.Drawing.Color.FromArgb(CType(CType(169, Byte), Integer), CType(CType(169, Byte), Integer), CType(CType(169, Byte), Integer))
        Me.btngenerate.DisabledState.ForeColor = System.Drawing.Color.FromArgb(CType(CType(141, Byte), Integer), CType(CType(141, Byte), Integer), CType(CType(141, Byte), Integer))
        Me.btngenerate.FillColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.btngenerate.Font = New System.Drawing.Font("Segoe UI", 10.8!)
        Me.btngenerate.ForeColor = System.Drawing.Color.Black
        Me.btngenerate.Location = New System.Drawing.Point(361, 21)
        Me.btngenerate.Margin = New System.Windows.Forms.Padding(3, 2, 3, 2)
        Me.btngenerate.Name = "btngenerate"
        Me.btngenerate.Size = New System.Drawing.Size(170, 62)
        Me.btngenerate.TabIndex = 15
        Me.btngenerate.Text = "Generate"
        Me.btngenerate.UseTransparentBackground = True
        '
        'Label2
        '
        Me.Label2.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.Label2.AutoSize = True
        Me.Label2.Font = New System.Drawing.Font("Tahoma", 12.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label2.Location = New System.Drawing.Point(24, 24)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(62, 24)
        Me.Label2.TabIndex = 14
        Me.Label2.Text = "From:"
        '
        'dtFrom
        '
        Me.dtFrom.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.dtFrom.Font = New System.Drawing.Font("Tahoma", 10.8!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.dtFrom.Format = System.Windows.Forms.DateTimePickerFormat.[Short]
        Me.dtFrom.Location = New System.Drawing.Point(92, 21)
        Me.dtFrom.Name = "dtFrom"
        Me.dtFrom.Size = New System.Drawing.Size(228, 29)
        Me.dtFrom.TabIndex = 13
        '
        'dgvHourly
        '
        DataGridViewCellStyle1.BackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(248, Byte), Integer), CType(CType(196, Byte), Integer))
        Me.dgvHourly.AlternatingRowsDefaultCellStyle = DataGridViewCellStyle1
        Me.dgvHourly.AutoSizeColumnsMode = System.Windows.Forms.DataGridViewAutoSizeColumnsMode.None
        Me.dgvHourly.CellBorderStyle = System.Windows.Forms.DataGridViewCellBorderStyle.[Single]
        Me.dgvHourly.ColumnHeadersBorderStyle = System.Windows.Forms.DataGridViewHeaderBorderStyle.[Single]
        DataGridViewCellStyle2.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle2.BackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(192, Byte), Integer), CType(CType(7, Byte), Integer))
        DataGridViewCellStyle2.Font = New System.Drawing.Font("Microsoft Sans Serif", 7.8!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        DataGridViewCellStyle2.ForeColor = System.Drawing.Color.White
        DataGridViewCellStyle2.SelectionBackColor = System.Drawing.SystemColors.Highlight
        DataGridViewCellStyle2.SelectionForeColor = System.Drawing.SystemColors.HighlightText
        DataGridViewCellStyle2.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.dgvHourly.ColumnHeadersDefaultCellStyle = DataGridViewCellStyle2
        Me.dgvHourly.ColumnHeadersHeight = 4
        Me.dgvHourly.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.EnableResizing
        DataGridViewCellStyle3.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle3.BackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(250, Byte), Integer), CType(CType(215, Byte), Integer))
        DataGridViewCellStyle3.Font = New System.Drawing.Font("Microsoft Sans Serif", 7.8!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        DataGridViewCellStyle3.ForeColor = System.Drawing.Color.Black
        DataGridViewCellStyle3.SelectionBackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(213, Byte), Integer), CType(CType(89, Byte), Integer))
        DataGridViewCellStyle3.SelectionForeColor = System.Drawing.Color.Black
        DataGridViewCellStyle3.WrapMode = System.Windows.Forms.DataGridViewTriState.[False]
        Me.dgvHourly.DefaultCellStyle = DataGridViewCellStyle3
        Me.dgvHourly.Dock = System.Windows.Forms.DockStyle.Fill
        Me.dgvHourly.GridColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(235, Byte), Integer), CType(CType(177, Byte), Integer))
        Me.dgvHourly.Location = New System.Drawing.Point(0, 128)
        Me.dgvHourly.Name = "dgvHourly"
        Me.dgvHourly.RowHeadersVisible = False
        Me.dgvHourly.RowHeadersWidth = 51
        Me.dgvHourly.RowTemplate.Height = 24
        Me.dgvHourly.Size = New System.Drawing.Size(1138, 461)
        Me.dgvHourly.TabIndex = 53
        Me.dgvHourly.Theme = Guna.UI2.WinForms.Enums.DataGridViewPresetThemes.Ember
        Me.dgvHourly.ThemeStyle.AlternatingRowsStyle.BackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(248, Byte), Integer), CType(CType(196, Byte), Integer))
        Me.dgvHourly.ThemeStyle.AlternatingRowsStyle.Font = Nothing
        Me.dgvHourly.ThemeStyle.AlternatingRowsStyle.ForeColor = System.Drawing.Color.Empty
        Me.dgvHourly.ThemeStyle.AlternatingRowsStyle.SelectionBackColor = System.Drawing.Color.Empty
        Me.dgvHourly.ThemeStyle.AlternatingRowsStyle.SelectionForeColor = System.Drawing.Color.Empty
        Me.dgvHourly.ThemeStyle.BackColor = System.Drawing.Color.White
        Me.dgvHourly.ThemeStyle.GridColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(235, Byte), Integer), CType(CType(177, Byte), Integer))
        Me.dgvHourly.ThemeStyle.HeaderStyle.BackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(192, Byte), Integer), CType(CType(7, Byte), Integer))
        Me.dgvHourly.ThemeStyle.HeaderStyle.BorderStyle = System.Windows.Forms.DataGridViewHeaderBorderStyle.[Single]
        Me.dgvHourly.ThemeStyle.HeaderStyle.Font = New System.Drawing.Font("Microsoft Sans Serif", 7.8!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.dgvHourly.ThemeStyle.HeaderStyle.ForeColor = System.Drawing.Color.White
        Me.dgvHourly.ThemeStyle.HeaderStyle.HeaightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.EnableResizing
        Me.dgvHourly.ThemeStyle.HeaderStyle.Height = 4
        Me.dgvHourly.ThemeStyle.ReadOnly = False
        Me.dgvHourly.ThemeStyle.RowsStyle.BackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(250, Byte), Integer), CType(CType(215, Byte), Integer))
        Me.dgvHourly.ThemeStyle.RowsStyle.BorderStyle = System.Windows.Forms.DataGridViewCellBorderStyle.[Single]
        Me.dgvHourly.ThemeStyle.RowsStyle.Font = New System.Drawing.Font("Microsoft Sans Serif", 7.8!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.dgvHourly.ThemeStyle.RowsStyle.ForeColor = System.Drawing.Color.Black
        Me.dgvHourly.ThemeStyle.RowsStyle.Height = 24
        Me.dgvHourly.ThemeStyle.RowsStyle.SelectionBackColor = System.Drawing.Color.FromArgb(CType(CType(254, Byte), Integer), CType(CType(213, Byte), Integer), CType(CType(89, Byte), Integer))
        Me.dgvHourly.ThemeStyle.RowsStyle.SelectionForeColor = System.Drawing.Color.Black
        '
        'GunaProgressIndicator1
        '
        Me.GunaProgressIndicator1.Anchor = System.Windows.Forms.AnchorStyles.None
        Me.GunaProgressIndicator1.BackColor = System.Drawing.Color.Transparent
        Me.GunaProgressIndicator1.Location = New System.Drawing.Point(486, 215)
        Me.GunaProgressIndicator1.Name = "GunaProgressIndicator1"
        Me.GunaProgressIndicator1.ProgressColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(128, Byte), Integer), CType(CType(0, Byte), Integer))
        Me.GunaProgressIndicator1.Size = New System.Drawing.Size(167, 158)
        Me.GunaProgressIndicator1.TabIndex = 54
        Me.GunaProgressIndicator1.UseTransparentBackground = True
        Me.GunaProgressIndicator1.Visible = False
        '
        'BackgroundWorker1
        '
        Me.BackgroundWorker1.WorkerReportsProgress = True
        '
        'frm_hourly_POS
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(8.0!, 16.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.BackColor = System.Drawing.Color.White
        Me.ClientSize = New System.Drawing.Size(1138, 589)
        Me.ControlBox = False
        Me.Controls.Add(Me.GunaProgressIndicator1)
        Me.Controls.Add(Me.dgvHourly)
        Me.Controls.Add(Me.Panel1)
        Me.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedDialog
        Me.Name = "frm_hourly_POS"
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "Hourly Sales POS"
        Me.Panel1.ResumeLayout(False)
        Me.Panel1.PerformLayout()
        CType(Me.dgvHourly, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)

    End Sub

    Friend WithEvents Panel1 As Panel
    Friend WithEvents dgvHourly As Guna.UI2.WinForms.Guna2DataGridView
    Friend WithEvents btngenerate As Guna.UI2.WinForms.Guna2Button
    Friend WithEvents Label2 As Label
    Friend WithEvents dtFrom As DateTimePicker
    Friend WithEvents Label1 As Label
    Friend WithEvents dtto As DateTimePicker
    Friend WithEvents GunaProgressIndicator1 As Guna.UI2.WinForms.Guna2ProgressIndicator
    Friend WithEvents BackgroundWorker1 As System.ComponentModel.BackgroundWorker
    Friend WithEvents btnExportToExcel As Guna.UI2.WinForms.Guna2Button
End Class
