<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Partial Class frm_hourly
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
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

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()>
    Private Sub InitializeComponent()
        Dim DataGridViewCellStyle1 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle2 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle3 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle4 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle5 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle6 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle7 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle8 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Dim DataGridViewCellStyle9 As System.Windows.Forms.DataGridViewCellStyle = New System.Windows.Forms.DataGridViewCellStyle()
        Me.Panel1 = New System.Windows.Forms.Panel()
        Me.btngenerate = New Guna.UI2.WinForms.Guna2Button()
        Me.Label3 = New System.Windows.Forms.Label()
        Me.dtTo = New System.Windows.Forms.DateTimePicker()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.dtFrom = New System.Windows.Forms.DateTimePicker()
        Me.MenuStrip1 = New System.Windows.Forms.MenuStrip()
        Me.HourlySummaryReportToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.MPToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.MSToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.MSSDToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.BCToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.PCICToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.TransactionToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.CreateBeginningBalanceToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.CreateWasteToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.POSHourlyToolStripMenuItem = New System.Windows.Forms.ToolStripMenuItem()
        Me.GunaProgressIndicator1 = New Guna.UI2.WinForms.Guna2ProgressIndicator()
        Me.Panel2 = New System.Windows.Forms.Panel()
        Me.Guna2TabControl1 = New Guna.UI2.WinForms.Guna2TabControl()
        Me.TabPage1 = New System.Windows.Forms.TabPage()
        Me.SplitContainer1 = New System.Windows.Forms.SplitContainer()
        Me.Guna2GroupBox1 = New Guna.UI2.WinForms.Guna2GroupBox()
        Me.Label16 = New System.Windows.Forms.Label()
        Me.Label13 = New System.Windows.Forms.Label()
        Me.Label15 = New System.Windows.Forms.Label()
        Me.Label14 = New System.Windows.Forms.Label()
        Me.lbltot_foc = New System.Windows.Forms.Label()
        Me.lblfoc_jpops = New System.Windows.Forms.Label()
        Me.lblfoc_shell = New System.Windows.Forms.Label()
        Me.lblfoc_ring = New System.Windows.Forms.Label()
        Me.Label10 = New System.Windows.Forms.Label()
        Me.Label9 = New System.Windows.Forms.Label()
        Me.lbltot_Sales = New System.Windows.Forms.Label()
        Me.lblrvc_totqty = New System.Windows.Forms.Label()
        Me.lblrvc_jpops = New System.Windows.Forms.Label()
        Me.lblrvc_shell = New System.Windows.Forms.Label()
        Me.lblrvc_ring = New System.Windows.Forms.Label()
        Me.lbldnt_totqty = New System.Windows.Forms.Label()
        Me.lbldnt_jpops = New System.Windows.Forms.Label()
        Me.lbldnt_shell = New System.Windows.Forms.Label()
        Me.lbldnt_ring = New System.Windows.Forms.Label()
        Me.Label12 = New System.Windows.Forms.Label()
        Me.Label7 = New System.Windows.Forms.Label()
        Me.Label11 = New System.Windows.Forms.Label()
        Me.Label8 = New System.Windows.Forms.Label()
        Me.Label6 = New System.Windows.Forms.Label()
        Me.Label5 = New System.Windows.Forms.Label()
        Me.Label4 = New System.Windows.Forms.Label()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.dgvDonutsold = New Guna.UI2.WinForms.Guna2DataGridView()
        Me.dgvWaste = New Guna.UI2.WinForms.Guna2DataGridView()
        Me.dgpProduceDonut = New Guna.UI2.WinForms.Guna2DataGridView()
        Me.TabPage2 = New System.Windows.Forms.TabPage()
        Me.BackgroundWorker1 = New System.ComponentModel.BackgroundWorker()
        Me.Panel1.SuspendLayout()
        Me.MenuStrip1.SuspendLayout()
        Me.Panel2.SuspendLayout()
        Me.Guna2TabControl1.SuspendLayout()
        Me.TabPage1.SuspendLayout()
        CType(Me.SplitContainer1, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SplitContainer1.Panel1.SuspendLayout()
        Me.SplitContainer1.Panel2.SuspendLayout()
        Me.SplitContainer1.SuspendLayout()
        Me.Guna2GroupBox1.SuspendLayout()
        CType(Me.dgvDonutsold, System.ComponentModel.ISupportInitialize).BeginInit()
        CType(Me.dgvWaste, System.ComponentModel.ISupportInitialize).BeginInit()
        CType(Me.dgpProduceDonut, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'Panel1
        '
        Me.Panel1.Controls.Add(Me.btngenerate)
        Me.Panel1.Controls.Add(Me.Label3)
        Me.Panel1.Controls.Add(Me.dtTo)
        Me.Panel1.Controls.Add(Me.Label2)
        Me.Panel1.Controls.Add(Me.dtFrom)
        Me.Panel1.Controls.Add(Me.MenuStrip1)
        Me.Panel1.Dock = System.Windows.Forms.DockStyle.Top
        Me.Panel1.Location = New System.Drawing.Point(0, 0)
        Me.Panel1.Name = "Panel1"
        Me.Panel1.Size = New System.Drawing.Size(1138, 126)
        Me.Panel1.TabIndex = 0
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
        Me.btngenerate.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.btngenerate.ForeColor = System.Drawing.Color.Black
        Me.btngenerate.Location = New System.Drawing.Point(323, 43)
        Me.btngenerate.Margin = New System.Windows.Forms.Padding(3, 2, 3, 2)
        Me.btngenerate.Name = "btngenerate"
        Me.btngenerate.Size = New System.Drawing.Size(170, 62)
        Me.btngenerate.TabIndex = 12
        Me.btngenerate.Text = "Generate"
        Me.btngenerate.UseTransparentBackground = True
        '
        'Label3
        '
        Me.Label3.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.Label3.AutoSize = True
        Me.Label3.Font = New System.Drawing.Font("Segoe UI Semibold", 10.2!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label3.Location = New System.Drawing.Point(43, 81)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(31, 23)
        Me.Label3.TabIndex = 10
        Me.Label3.Text = "To:"
        '
        'dtTo
        '
        Me.dtTo.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.dtTo.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.dtTo.Format = System.Windows.Forms.DateTimePickerFormat.[Short]
        Me.dtTo.Location = New System.Drawing.Point(78, 78)
        Me.dtTo.Name = "dtTo"
        Me.dtTo.Size = New System.Drawing.Size(228, 30)
        Me.dtTo.TabIndex = 9
        '
        'Label2
        '
        Me.Label2.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.Label2.AutoSize = True
        Me.Label2.Font = New System.Drawing.Font("Segoe UI Semibold", 10.2!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label2.Location = New System.Drawing.Point(21, 46)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(54, 23)
        Me.Label2.TabIndex = 8
        Me.Label2.Text = "From:"
        '
        'dtFrom
        '
        Me.dtFrom.Anchor = CType(((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left), System.Windows.Forms.AnchorStyles)
        Me.dtFrom.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.dtFrom.Format = System.Windows.Forms.DateTimePickerFormat.[Short]
        Me.dtFrom.Location = New System.Drawing.Point(78, 43)
        Me.dtFrom.Name = "dtFrom"
        Me.dtFrom.Size = New System.Drawing.Size(228, 30)
        Me.dtFrom.TabIndex = 7
        '
        'MenuStrip1
        '
        Me.MenuStrip1.ImageScalingSize = New System.Drawing.Size(20, 20)
        Me.MenuStrip1.Items.AddRange(New System.Windows.Forms.ToolStripItem() {Me.HourlySummaryReportToolStripMenuItem, Me.TransactionToolStripMenuItem, Me.POSHourlyToolStripMenuItem})
        Me.MenuStrip1.Location = New System.Drawing.Point(0, 0)
        Me.MenuStrip1.Name = "MenuStrip1"
        Me.MenuStrip1.Size = New System.Drawing.Size(1138, 28)
        Me.MenuStrip1.TabIndex = 13
        Me.MenuStrip1.Text = "MenuStrip1"
        '
        'HourlySummaryReportToolStripMenuItem
        '
        Me.HourlySummaryReportToolStripMenuItem.DropDownItems.AddRange(New System.Windows.Forms.ToolStripItem() {Me.MPToolStripMenuItem, Me.MSToolStripMenuItem, Me.MSSDToolStripMenuItem, Me.BCToolStripMenuItem, Me.PCICToolStripMenuItem})
        Me.HourlySummaryReportToolStripMenuItem.Name = "HourlySummaryReportToolStripMenuItem"
        Me.HourlySummaryReportToolStripMenuItem.Size = New System.Drawing.Size(182, 24)
        Me.HourlySummaryReportToolStripMenuItem.Text = "Hourly Summary Report"
        '
        'MPToolStripMenuItem
        '
        Me.MPToolStripMenuItem.Name = "MPToolStripMenuItem"
        Me.MPToolStripMenuItem.Size = New System.Drawing.Size(139, 26)
        Me.MPToolStripMenuItem.Text = "MPPAR"
        '
        'MSToolStripMenuItem
        '
        Me.MSToolStripMenuItem.Name = "MSToolStripMenuItem"
        Me.MSToolStripMenuItem.Size = New System.Drawing.Size(139, 26)
        Me.MSToolStripMenuItem.Text = "MSWD"
        '
        'MSSDToolStripMenuItem
        '
        Me.MSSDToolStripMenuItem.Name = "MSSDToolStripMenuItem"
        Me.MSSDToolStripMenuItem.Size = New System.Drawing.Size(139, 26)
        Me.MSSDToolStripMenuItem.Text = "MSSD"
        '
        'BCToolStripMenuItem
        '
        Me.BCToolStripMenuItem.Name = "BCToolStripMenuItem"
        Me.BCToolStripMenuItem.Size = New System.Drawing.Size(139, 26)
        Me.BCToolStripMenuItem.Text = "BCIC"
        '
        'PCICToolStripMenuItem
        '
        Me.PCICToolStripMenuItem.Name = "PCICToolStripMenuItem"
        Me.PCICToolStripMenuItem.Size = New System.Drawing.Size(139, 26)
        Me.PCICToolStripMenuItem.Text = "PCIC"
        '
        'TransactionToolStripMenuItem
        '
        Me.TransactionToolStripMenuItem.DropDownItems.AddRange(New System.Windows.Forms.ToolStripItem() {Me.CreateBeginningBalanceToolStripMenuItem, Me.CreateWasteToolStripMenuItem})
        Me.TransactionToolStripMenuItem.Name = "TransactionToolStripMenuItem"
        Me.TransactionToolStripMenuItem.Size = New System.Drawing.Size(98, 24)
        Me.TransactionToolStripMenuItem.Text = "Transaction"
        '
        'CreateBeginningBalanceToolStripMenuItem
        '
        Me.CreateBeginningBalanceToolStripMenuItem.Name = "CreateBeginningBalanceToolStripMenuItem"
        Me.CreateBeginningBalanceToolStripMenuItem.Size = New System.Drawing.Size(238, 26)
        Me.CreateBeginningBalanceToolStripMenuItem.Text = "Create Donut Produce"
        '
        'CreateWasteToolStripMenuItem
        '
        Me.CreateWasteToolStripMenuItem.Name = "CreateWasteToolStripMenuItem"
        Me.CreateWasteToolStripMenuItem.Size = New System.Drawing.Size(238, 26)
        Me.CreateWasteToolStripMenuItem.Text = "Create Waste"
        '
        'POSHourlyToolStripMenuItem
        '
        Me.POSHourlyToolStripMenuItem.Name = "POSHourlyToolStripMenuItem"
        Me.POSHourlyToolStripMenuItem.Size = New System.Drawing.Size(98, 24)
        Me.POSHourlyToolStripMenuItem.Text = "POS Hourly"
        '
        'GunaProgressIndicator1
        '
        Me.GunaProgressIndicator1.Anchor = System.Windows.Forms.AnchorStyles.None
        Me.GunaProgressIndicator1.BackColor = System.Drawing.Color.Transparent
        Me.GunaProgressIndicator1.Location = New System.Drawing.Point(0, 0)
        Me.GunaProgressIndicator1.Name = "GunaProgressIndicator1"
        Me.GunaProgressIndicator1.ProgressColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(128, Byte), Integer), CType(CType(0, Byte), Integer))
        Me.GunaProgressIndicator1.Size = New System.Drawing.Size(133, 130)
        Me.GunaProgressIndicator1.TabIndex = 61
        Me.GunaProgressIndicator1.UseTransparentBackground = True
        Me.GunaProgressIndicator1.Visible = False
        '
        'Panel2
        '
        Me.Panel2.Controls.Add(Me.Guna2TabControl1)
        Me.Panel2.Dock = System.Windows.Forms.DockStyle.Fill
        Me.Panel2.Location = New System.Drawing.Point(0, 126)
        Me.Panel2.Name = "Panel2"
        Me.Panel2.Size = New System.Drawing.Size(1138, 463)
        Me.Panel2.TabIndex = 1
        '
        'Guna2TabControl1
        '
        Me.Guna2TabControl1.Alignment = System.Windows.Forms.TabAlignment.Left
        Me.Guna2TabControl1.Controls.Add(Me.TabPage1)
        Me.Guna2TabControl1.Controls.Add(Me.TabPage2)
        Me.Guna2TabControl1.Dock = System.Windows.Forms.DockStyle.Fill
        Me.Guna2TabControl1.ItemSize = New System.Drawing.Size(180, 40)
        Me.Guna2TabControl1.Location = New System.Drawing.Point(0, 0)
        Me.Guna2TabControl1.Name = "Guna2TabControl1"
        Me.Guna2TabControl1.SelectedIndex = 0
        Me.Guna2TabControl1.Size = New System.Drawing.Size(1138, 463)
        Me.Guna2TabControl1.TabButtonHoverState.BorderColor = System.Drawing.Color.Empty
        Me.Guna2TabControl1.TabButtonHoverState.FillColor = System.Drawing.Color.FromArgb(CType(CType(40, Byte), Integer), CType(CType(52, Byte), Integer), CType(CType(70, Byte), Integer))
        Me.Guna2TabControl1.TabButtonHoverState.Font = New System.Drawing.Font("Segoe UI Semibold", 10.0!)
        Me.Guna2TabControl1.TabButtonHoverState.ForeColor = System.Drawing.Color.White
        Me.Guna2TabControl1.TabButtonHoverState.InnerColor = System.Drawing.Color.FromArgb(CType(CType(40, Byte), Integer), CType(CType(52, Byte), Integer), CType(CType(70, Byte), Integer))
        Me.Guna2TabControl1.TabButtonIdleState.BorderColor = System.Drawing.Color.Empty
        Me.Guna2TabControl1.TabButtonIdleState.FillColor = System.Drawing.Color.FromArgb(CType(CType(33, Byte), Integer), CType(CType(42, Byte), Integer), CType(CType(57, Byte), Integer))
        Me.Guna2TabControl1.TabButtonIdleState.Font = New System.Drawing.Font("Segoe UI Semibold", 10.0!)
        Me.Guna2TabControl1.TabButtonIdleState.ForeColor = System.Drawing.Color.FromArgb(CType(CType(156, Byte), Integer), CType(CType(160, Byte), Integer), CType(CType(167, Byte), Integer))
        Me.Guna2TabControl1.TabButtonIdleState.InnerColor = System.Drawing.Color.FromArgb(CType(CType(33, Byte), Integer), CType(CType(42, Byte), Integer), CType(CType(57, Byte), Integer))
        Me.Guna2TabControl1.TabButtonSelectedState.BorderColor = System.Drawing.Color.Empty
        Me.Guna2TabControl1.TabButtonSelectedState.FillColor = System.Drawing.Color.FromArgb(CType(CType(29, Byte), Integer), CType(CType(37, Byte), Integer), CType(CType(49, Byte), Integer))
        Me.Guna2TabControl1.TabButtonSelectedState.Font = New System.Drawing.Font("Segoe UI Semibold", 10.0!)
        Me.Guna2TabControl1.TabButtonSelectedState.ForeColor = System.Drawing.Color.White
        Me.Guna2TabControl1.TabButtonSelectedState.InnerColor = System.Drawing.Color.FromArgb(CType(CType(76, Byte), Integer), CType(CType(132, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.Guna2TabControl1.TabButtonSize = New System.Drawing.Size(180, 40)
        Me.Guna2TabControl1.TabIndex = 0
        Me.Guna2TabControl1.TabMenuBackColor = System.Drawing.Color.FromArgb(CType(CType(33, Byte), Integer), CType(CType(42, Byte), Integer), CType(CType(57, Byte), Integer))
        '
        'TabPage1
        '
        Me.TabPage1.AutoScroll = True
        Me.TabPage1.Controls.Add(Me.SplitContainer1)
        Me.TabPage1.Location = New System.Drawing.Point(184, 4)
        Me.TabPage1.Name = "TabPage1"
        Me.TabPage1.Padding = New System.Windows.Forms.Padding(3)
        Me.TabPage1.Size = New System.Drawing.Size(950, 455)
        Me.TabPage1.TabIndex = 0
        Me.TabPage1.Text = "TabPage1"
        Me.TabPage1.UseVisualStyleBackColor = True
        '
        'SplitContainer1
        '
        Me.SplitContainer1.Dock = System.Windows.Forms.DockStyle.Fill
        Me.SplitContainer1.Location = New System.Drawing.Point(3, 3)
        Me.SplitContainer1.Name = "SplitContainer1"
        '
        'SplitContainer1.Panel1
        '
        Me.SplitContainer1.Panel1.AutoScroll = True
        Me.SplitContainer1.Panel1.Controls.Add(Me.Guna2GroupBox1)
        '
        'SplitContainer1.Panel2
        '
        Me.SplitContainer1.Panel2.AutoScroll = True
        Me.SplitContainer1.Panel2.Controls.Add(Me.dgvDonutsold)
        Me.SplitContainer1.Panel2.Controls.Add(Me.dgvWaste)
        Me.SplitContainer1.Panel2.Controls.Add(Me.dgpProduceDonut)
        Me.SplitContainer1.Size = New System.Drawing.Size(944, 449)
        Me.SplitContainer1.SplitterDistance = 544
        Me.SplitContainer1.TabIndex = 2
        '
        'Guna2GroupBox1
        '
        Me.Guna2GroupBox1.AutoScroll = True
        Me.Guna2GroupBox1.BackColor = System.Drawing.Color.White
        Me.Guna2GroupBox1.BorderColor = System.Drawing.Color.Black
        Me.Guna2GroupBox1.BorderThickness = 2
        Me.Guna2GroupBox1.Controls.Add(Me.Label16)
        Me.Guna2GroupBox1.Controls.Add(Me.Label13)
        Me.Guna2GroupBox1.Controls.Add(Me.Label15)
        Me.Guna2GroupBox1.Controls.Add(Me.Label14)
        Me.Guna2GroupBox1.Controls.Add(Me.lbltot_foc)
        Me.Guna2GroupBox1.Controls.Add(Me.lblfoc_jpops)
        Me.Guna2GroupBox1.Controls.Add(Me.lblfoc_shell)
        Me.Guna2GroupBox1.Controls.Add(Me.lblfoc_ring)
        Me.Guna2GroupBox1.Controls.Add(Me.Label10)
        Me.Guna2GroupBox1.Controls.Add(Me.Label9)
        Me.Guna2GroupBox1.Controls.Add(Me.lbltot_Sales)
        Me.Guna2GroupBox1.Controls.Add(Me.lblrvc_totqty)
        Me.Guna2GroupBox1.Controls.Add(Me.lblrvc_jpops)
        Me.Guna2GroupBox1.Controls.Add(Me.lblrvc_shell)
        Me.Guna2GroupBox1.Controls.Add(Me.lblrvc_ring)
        Me.Guna2GroupBox1.Controls.Add(Me.lbldnt_totqty)
        Me.Guna2GroupBox1.Controls.Add(Me.lbldnt_jpops)
        Me.Guna2GroupBox1.Controls.Add(Me.lbldnt_shell)
        Me.Guna2GroupBox1.Controls.Add(Me.lbldnt_ring)
        Me.Guna2GroupBox1.Controls.Add(Me.Label12)
        Me.Guna2GroupBox1.Controls.Add(Me.Label7)
        Me.Guna2GroupBox1.Controls.Add(Me.Label11)
        Me.Guna2GroupBox1.Controls.Add(Me.Label8)
        Me.Guna2GroupBox1.Controls.Add(Me.Label6)
        Me.Guna2GroupBox1.Controls.Add(Me.Label5)
        Me.Guna2GroupBox1.Controls.Add(Me.Label4)
        Me.Guna2GroupBox1.Controls.Add(Me.Label1)
        Me.Guna2GroupBox1.CustomBorderColor = System.Drawing.Color.FromArgb(CType(CType(246, Byte), Integer), CType(CType(220, Byte), Integer), CType(CType(172, Byte), Integer))
        Me.Guna2GroupBox1.Dock = System.Windows.Forms.DockStyle.Fill
        Me.Guna2GroupBox1.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Guna2GroupBox1.ForeColor = System.Drawing.Color.Black
        Me.Guna2GroupBox1.Location = New System.Drawing.Point(0, 0)
        Me.Guna2GroupBox1.Name = "Guna2GroupBox1"
        Me.Guna2GroupBox1.Size = New System.Drawing.Size(544, 449)
        Me.Guna2GroupBox1.TabIndex = 0
        Me.Guna2GroupBox1.Text = "Summary Donut Produce"
        Me.Guna2GroupBox1.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label16
        '
        Me.Label16.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.Label16.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label16.Location = New System.Drawing.Point(16, 381)
        Me.Label16.Name = "Label16"
        Me.Label16.Size = New System.Drawing.Size(126, 25)
        Me.Label16.TabIndex = 100
        Me.Label16.Text = "Waste Jpops"
        Me.Label16.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'Label13
        '
        Me.Label13.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.Label13.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label13.Location = New System.Drawing.Point(16, 352)
        Me.Label13.Name = "Label13"
        Me.Label13.Size = New System.Drawing.Size(126, 25)
        Me.Label13.TabIndex = 99
        Me.Label13.Text = "Raw Waste"
        Me.Label13.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'Label15
        '
        Me.Label15.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.Label15.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label15.Location = New System.Drawing.Point(16, 322)
        Me.Label15.Name = "Label15"
        Me.Label15.Size = New System.Drawing.Size(126, 25)
        Me.Label15.TabIndex = 98
        Me.Label15.Text = "Waste Topping"
        Me.Label15.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'Label14
        '
        Me.Label14.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.Label14.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label14.Location = New System.Drawing.Point(16, 292)
        Me.Label14.Name = "Label14"
        Me.Label14.Size = New System.Drawing.Size(126, 25)
        Me.Label14.TabIndex = 97
        Me.Label14.Text = "Waste Plain"
        Me.Label14.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'lbltot_foc
        '
        Me.lbltot_foc.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.lbltot_foc.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lbltot_foc.Location = New System.Drawing.Point(417, 263)
        Me.lbltot_foc.Name = "lbltot_foc"
        Me.lbltot_foc.Size = New System.Drawing.Size(84, 25)
        Me.lbltot_foc.TabIndex = 95
        Me.lbltot_foc.Text = "0"
        Me.lbltot_foc.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'lblfoc_jpops
        '
        Me.lblfoc_jpops.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.lblfoc_jpops.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lblfoc_jpops.Location = New System.Drawing.Point(330, 263)
        Me.lblfoc_jpops.Name = "lblfoc_jpops"
        Me.lblfoc_jpops.Size = New System.Drawing.Size(84, 25)
        Me.lblfoc_jpops.TabIndex = 94
        Me.lblfoc_jpops.Text = "0"
        Me.lblfoc_jpops.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'lblfoc_shell
        '
        Me.lblfoc_shell.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.lblfoc_shell.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lblfoc_shell.Location = New System.Drawing.Point(243, 263)
        Me.lblfoc_shell.Name = "lblfoc_shell"
        Me.lblfoc_shell.Size = New System.Drawing.Size(84, 25)
        Me.lblfoc_shell.TabIndex = 93
        Me.lblfoc_shell.Text = "0"
        Me.lblfoc_shell.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'lblfoc_ring
        '
        Me.lblfoc_ring.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.lblfoc_ring.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lblfoc_ring.Location = New System.Drawing.Point(156, 263)
        Me.lblfoc_ring.Name = "lblfoc_ring"
        Me.lblfoc_ring.Size = New System.Drawing.Size(84, 25)
        Me.lblfoc_ring.TabIndex = 92
        Me.lblfoc_ring.Text = "0"
        Me.lblfoc_ring.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'Label10
        '
        Me.Label10.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.Label10.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label10.Location = New System.Drawing.Point(16, 263)
        Me.Label10.Name = "Label10"
        Me.Label10.Size = New System.Drawing.Size(126, 25)
        Me.Label10.TabIndex = 91
        Me.Label10.Text = "POS Waste"
        Me.Label10.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'Label9
        '
        Me.Label9.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(255, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.Label9.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label9.Location = New System.Drawing.Point(3, 227)
        Me.Label9.Name = "Label9"
        Me.Label9.Size = New System.Drawing.Size(498, 25)
        Me.Label9.TabIndex = 90
        Me.Label9.Text = "FOC && Waste"
        Me.Label9.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'lbltot_Sales
        '
        Me.lbltot_Sales.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.lbltot_Sales.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lbltot_Sales.Location = New System.Drawing.Point(417, 192)
        Me.lbltot_Sales.Name = "lbltot_Sales"
        Me.lbltot_Sales.Size = New System.Drawing.Size(84, 25)
        Me.lbltot_Sales.TabIndex = 89
        Me.lbltot_Sales.Text = "0"
        Me.lbltot_Sales.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'lblrvc_totqty
        '
        Me.lblrvc_totqty.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.lblrvc_totqty.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lblrvc_totqty.Location = New System.Drawing.Point(417, 163)
        Me.lblrvc_totqty.Name = "lblrvc_totqty"
        Me.lblrvc_totqty.Size = New System.Drawing.Size(84, 25)
        Me.lblrvc_totqty.TabIndex = 88
        Me.lblrvc_totqty.Text = "0"
        Me.lblrvc_totqty.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'lblrvc_jpops
        '
        Me.lblrvc_jpops.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.lblrvc_jpops.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lblrvc_jpops.Location = New System.Drawing.Point(330, 163)
        Me.lblrvc_jpops.Name = "lblrvc_jpops"
        Me.lblrvc_jpops.Size = New System.Drawing.Size(84, 25)
        Me.lblrvc_jpops.TabIndex = 87
        Me.lblrvc_jpops.Text = "0"
        Me.lblrvc_jpops.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'lblrvc_shell
        '
        Me.lblrvc_shell.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.lblrvc_shell.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lblrvc_shell.Location = New System.Drawing.Point(243, 163)
        Me.lblrvc_shell.Name = "lblrvc_shell"
        Me.lblrvc_shell.Size = New System.Drawing.Size(84, 25)
        Me.lblrvc_shell.TabIndex = 86
        Me.lblrvc_shell.Text = "0"
        Me.lblrvc_shell.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'lblrvc_ring
        '
        Me.lblrvc_ring.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.lblrvc_ring.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lblrvc_ring.Location = New System.Drawing.Point(156, 163)
        Me.lblrvc_ring.Name = "lblrvc_ring"
        Me.lblrvc_ring.Size = New System.Drawing.Size(84, 25)
        Me.lblrvc_ring.TabIndex = 85
        Me.lblrvc_ring.Text = "0"
        Me.lblrvc_ring.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'lbldnt_totqty
        '
        Me.lbldnt_totqty.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.lbldnt_totqty.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lbldnt_totqty.Location = New System.Drawing.Point(417, 132)
        Me.lbldnt_totqty.Name = "lbldnt_totqty"
        Me.lbldnt_totqty.Size = New System.Drawing.Size(84, 25)
        Me.lbldnt_totqty.TabIndex = 76
        Me.lbldnt_totqty.Text = "0"
        Me.lbldnt_totqty.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'lbldnt_jpops
        '
        Me.lbldnt_jpops.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.lbldnt_jpops.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lbldnt_jpops.Location = New System.Drawing.Point(330, 132)
        Me.lbldnt_jpops.Name = "lbldnt_jpops"
        Me.lbldnt_jpops.Size = New System.Drawing.Size(84, 25)
        Me.lbldnt_jpops.TabIndex = 75
        Me.lbldnt_jpops.Text = "0"
        Me.lbldnt_jpops.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'lbldnt_shell
        '
        Me.lbldnt_shell.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.lbldnt_shell.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lbldnt_shell.Location = New System.Drawing.Point(243, 132)
        Me.lbldnt_shell.Name = "lbldnt_shell"
        Me.lbldnt_shell.Size = New System.Drawing.Size(84, 25)
        Me.lbldnt_shell.TabIndex = 74
        Me.lbldnt_shell.Text = "0"
        Me.lbldnt_shell.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'lbldnt_ring
        '
        Me.lbldnt_ring.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.lbldnt_ring.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.lbldnt_ring.Location = New System.Drawing.Point(156, 132)
        Me.lbldnt_ring.Name = "lbldnt_ring"
        Me.lbldnt_ring.Size = New System.Drawing.Size(84, 25)
        Me.lbldnt_ring.TabIndex = 73
        Me.lbldnt_ring.Text = "0"
        Me.lbldnt_ring.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'Label12
        '
        Me.Label12.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.Label12.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label12.Location = New System.Drawing.Point(417, 95)
        Me.Label12.Name = "Label12"
        Me.Label12.Size = New System.Drawing.Size(84, 25)
        Me.Label12.TabIndex = 72
        Me.Label12.Text = "Tot. Qty"
        Me.Label12.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'Label7
        '
        Me.Label7.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.Label7.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label7.Location = New System.Drawing.Point(16, 193)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(126, 25)
        Me.Label7.TabIndex = 71
        Me.Label7.Text = "Total Sold"
        Me.Label7.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'Label11
        '
        Me.Label11.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.Label11.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label11.Location = New System.Drawing.Point(16, 163)
        Me.Label11.Name = "Label11"
        Me.Label11.Size = New System.Drawing.Size(126, 25)
        Me.Label11.TabIndex = 70
        Me.Label11.Text = "Rcv. Donuts"
        Me.Label11.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'Label8
        '
        Me.Label8.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.Label8.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label8.Location = New System.Drawing.Point(16, 132)
        Me.Label8.Name = "Label8"
        Me.Label8.Size = New System.Drawing.Size(126, 25)
        Me.Label8.TabIndex = 67
        Me.Label8.Text = "Donut Sold"
        Me.Label8.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'Label6
        '
        Me.Label6.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.Label6.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label6.Location = New System.Drawing.Point(330, 95)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(84, 25)
        Me.Label6.TabIndex = 65
        Me.Label6.Text = "J.Pops"
        Me.Label6.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'Label5
        '
        Me.Label5.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.Label5.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label5.Location = New System.Drawing.Point(243, 95)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(84, 25)
        Me.Label5.TabIndex = 64
        Me.Label5.Text = "Shell"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'Label4
        '
        Me.Label4.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.Label4.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label4.Location = New System.Drawing.Point(156, 95)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(84, 25)
        Me.Label4.TabIndex = 63
        Me.Label4.Text = "Ring"
        Me.Label4.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'Label1
        '
        Me.Label1.BackColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(255, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.Label1.Font = New System.Drawing.Font("Segoe UI", 10.2!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label1.Location = New System.Drawing.Point(3, 56)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(498, 25)
        Me.Label1.TabIndex = 62
        Me.Label1.Text = "Sales"
        Me.Label1.TextAlign = System.Drawing.ContentAlignment.TopCenter
        '
        'dgvDonutsold
        '
        DataGridViewCellStyle1.BackColor = System.Drawing.Color.White
        Me.dgvDonutsold.AlternatingRowsDefaultCellStyle = DataGridViewCellStyle1
        DataGridViewCellStyle2.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle2.BackColor = System.Drawing.Color.FromArgb(CType(CType(100, Byte), Integer), CType(CType(88, Byte), Integer), CType(CType(255, Byte), Integer))
        DataGridViewCellStyle2.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        DataGridViewCellStyle2.ForeColor = System.Drawing.Color.White
        DataGridViewCellStyle2.SelectionBackColor = System.Drawing.SystemColors.Highlight
        DataGridViewCellStyle2.SelectionForeColor = System.Drawing.SystemColors.HighlightText
        DataGridViewCellStyle2.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.dgvDonutsold.ColumnHeadersDefaultCellStyle = DataGridViewCellStyle2
        Me.dgvDonutsold.ColumnHeadersHeight = 4
        Me.dgvDonutsold.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.EnableResizing
        DataGridViewCellStyle3.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle3.BackColor = System.Drawing.Color.White
        DataGridViewCellStyle3.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        DataGridViewCellStyle3.ForeColor = System.Drawing.Color.FromArgb(CType(CType(71, Byte), Integer), CType(CType(69, Byte), Integer), CType(CType(94, Byte), Integer))
        DataGridViewCellStyle3.SelectionBackColor = System.Drawing.Color.FromArgb(CType(CType(231, Byte), Integer), CType(CType(229, Byte), Integer), CType(CType(255, Byte), Integer))
        DataGridViewCellStyle3.SelectionForeColor = System.Drawing.Color.FromArgb(CType(CType(71, Byte), Integer), CType(CType(69, Byte), Integer), CType(CType(94, Byte), Integer))
        DataGridViewCellStyle3.WrapMode = System.Windows.Forms.DataGridViewTriState.[False]
        Me.dgvDonutsold.DefaultCellStyle = DataGridViewCellStyle3
        Me.dgvDonutsold.Dock = System.Windows.Forms.DockStyle.Top
        Me.dgvDonutsold.GridColor = System.Drawing.Color.FromArgb(CType(CType(231, Byte), Integer), CType(CType(229, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.dgvDonutsold.Location = New System.Drawing.Point(0, 528)
        Me.dgvDonutsold.Name = "dgvDonutsold"
        Me.dgvDonutsold.RowHeadersVisible = False
        Me.dgvDonutsold.RowHeadersWidth = 51
        Me.dgvDonutsold.RowTemplate.Height = 24
        Me.dgvDonutsold.Size = New System.Drawing.Size(375, 264)
        Me.dgvDonutsold.TabIndex = 3
        Me.dgvDonutsold.ThemeStyle.AlternatingRowsStyle.BackColor = System.Drawing.Color.White
        Me.dgvDonutsold.ThemeStyle.AlternatingRowsStyle.Font = Nothing
        Me.dgvDonutsold.ThemeStyle.AlternatingRowsStyle.ForeColor = System.Drawing.Color.Empty
        Me.dgvDonutsold.ThemeStyle.AlternatingRowsStyle.SelectionBackColor = System.Drawing.Color.Empty
        Me.dgvDonutsold.ThemeStyle.AlternatingRowsStyle.SelectionForeColor = System.Drawing.Color.Empty
        Me.dgvDonutsold.ThemeStyle.BackColor = System.Drawing.Color.White
        Me.dgvDonutsold.ThemeStyle.GridColor = System.Drawing.Color.FromArgb(CType(CType(231, Byte), Integer), CType(CType(229, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.dgvDonutsold.ThemeStyle.HeaderStyle.BackColor = System.Drawing.Color.FromArgb(CType(CType(100, Byte), Integer), CType(CType(88, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.dgvDonutsold.ThemeStyle.HeaderStyle.BorderStyle = System.Windows.Forms.DataGridViewHeaderBorderStyle.None
        Me.dgvDonutsold.ThemeStyle.HeaderStyle.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.dgvDonutsold.ThemeStyle.HeaderStyle.ForeColor = System.Drawing.Color.White
        Me.dgvDonutsold.ThemeStyle.HeaderStyle.HeaightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.EnableResizing
        Me.dgvDonutsold.ThemeStyle.HeaderStyle.Height = 4
        Me.dgvDonutsold.ThemeStyle.ReadOnly = False
        Me.dgvDonutsold.ThemeStyle.RowsStyle.BackColor = System.Drawing.Color.White
        Me.dgvDonutsold.ThemeStyle.RowsStyle.BorderStyle = System.Windows.Forms.DataGridViewCellBorderStyle.SingleHorizontal
        Me.dgvDonutsold.ThemeStyle.RowsStyle.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.dgvDonutsold.ThemeStyle.RowsStyle.ForeColor = System.Drawing.Color.FromArgb(CType(CType(71, Byte), Integer), CType(CType(69, Byte), Integer), CType(CType(94, Byte), Integer))
        Me.dgvDonutsold.ThemeStyle.RowsStyle.Height = 24
        Me.dgvDonutsold.ThemeStyle.RowsStyle.SelectionBackColor = System.Drawing.Color.FromArgb(CType(CType(231, Byte), Integer), CType(CType(229, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.dgvDonutsold.ThemeStyle.RowsStyle.SelectionForeColor = System.Drawing.Color.FromArgb(CType(CType(71, Byte), Integer), CType(CType(69, Byte), Integer), CType(CType(94, Byte), Integer))
        '
        'dgvWaste
        '
        DataGridViewCellStyle4.BackColor = System.Drawing.Color.White
        Me.dgvWaste.AlternatingRowsDefaultCellStyle = DataGridViewCellStyle4
        DataGridViewCellStyle5.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle5.BackColor = System.Drawing.Color.FromArgb(CType(CType(100, Byte), Integer), CType(CType(88, Byte), Integer), CType(CType(255, Byte), Integer))
        DataGridViewCellStyle5.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        DataGridViewCellStyle5.ForeColor = System.Drawing.Color.White
        DataGridViewCellStyle5.SelectionBackColor = System.Drawing.SystemColors.Highlight
        DataGridViewCellStyle5.SelectionForeColor = System.Drawing.SystemColors.HighlightText
        DataGridViewCellStyle5.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.dgvWaste.ColumnHeadersDefaultCellStyle = DataGridViewCellStyle5
        Me.dgvWaste.ColumnHeadersHeight = 4
        Me.dgvWaste.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.EnableResizing
        DataGridViewCellStyle6.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle6.BackColor = System.Drawing.Color.White
        DataGridViewCellStyle6.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        DataGridViewCellStyle6.ForeColor = System.Drawing.Color.FromArgb(CType(CType(71, Byte), Integer), CType(CType(69, Byte), Integer), CType(CType(94, Byte), Integer))
        DataGridViewCellStyle6.SelectionBackColor = System.Drawing.Color.FromArgb(CType(CType(231, Byte), Integer), CType(CType(229, Byte), Integer), CType(CType(255, Byte), Integer))
        DataGridViewCellStyle6.SelectionForeColor = System.Drawing.Color.FromArgb(CType(CType(71, Byte), Integer), CType(CType(69, Byte), Integer), CType(CType(94, Byte), Integer))
        DataGridViewCellStyle6.WrapMode = System.Windows.Forms.DataGridViewTriState.[False]
        Me.dgvWaste.DefaultCellStyle = DataGridViewCellStyle6
        Me.dgvWaste.Dock = System.Windows.Forms.DockStyle.Top
        Me.dgvWaste.GridColor = System.Drawing.Color.FromArgb(CType(CType(231, Byte), Integer), CType(CType(229, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.dgvWaste.Location = New System.Drawing.Point(0, 264)
        Me.dgvWaste.Name = "dgvWaste"
        Me.dgvWaste.RowHeadersVisible = False
        Me.dgvWaste.RowHeadersWidth = 51
        Me.dgvWaste.RowTemplate.Height = 24
        Me.dgvWaste.Size = New System.Drawing.Size(375, 264)
        Me.dgvWaste.TabIndex = 2
        Me.dgvWaste.ThemeStyle.AlternatingRowsStyle.BackColor = System.Drawing.Color.White
        Me.dgvWaste.ThemeStyle.AlternatingRowsStyle.Font = Nothing
        Me.dgvWaste.ThemeStyle.AlternatingRowsStyle.ForeColor = System.Drawing.Color.Empty
        Me.dgvWaste.ThemeStyle.AlternatingRowsStyle.SelectionBackColor = System.Drawing.Color.Empty
        Me.dgvWaste.ThemeStyle.AlternatingRowsStyle.SelectionForeColor = System.Drawing.Color.Empty
        Me.dgvWaste.ThemeStyle.BackColor = System.Drawing.Color.White
        Me.dgvWaste.ThemeStyle.GridColor = System.Drawing.Color.FromArgb(CType(CType(231, Byte), Integer), CType(CType(229, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.dgvWaste.ThemeStyle.HeaderStyle.BackColor = System.Drawing.Color.FromArgb(CType(CType(100, Byte), Integer), CType(CType(88, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.dgvWaste.ThemeStyle.HeaderStyle.BorderStyle = System.Windows.Forms.DataGridViewHeaderBorderStyle.None
        Me.dgvWaste.ThemeStyle.HeaderStyle.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.dgvWaste.ThemeStyle.HeaderStyle.ForeColor = System.Drawing.Color.White
        Me.dgvWaste.ThemeStyle.HeaderStyle.HeaightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.EnableResizing
        Me.dgvWaste.ThemeStyle.HeaderStyle.Height = 4
        Me.dgvWaste.ThemeStyle.ReadOnly = False
        Me.dgvWaste.ThemeStyle.RowsStyle.BackColor = System.Drawing.Color.White
        Me.dgvWaste.ThemeStyle.RowsStyle.BorderStyle = System.Windows.Forms.DataGridViewCellBorderStyle.SingleHorizontal
        Me.dgvWaste.ThemeStyle.RowsStyle.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.dgvWaste.ThemeStyle.RowsStyle.ForeColor = System.Drawing.Color.FromArgb(CType(CType(71, Byte), Integer), CType(CType(69, Byte), Integer), CType(CType(94, Byte), Integer))
        Me.dgvWaste.ThemeStyle.RowsStyle.Height = 24
        Me.dgvWaste.ThemeStyle.RowsStyle.SelectionBackColor = System.Drawing.Color.FromArgb(CType(CType(231, Byte), Integer), CType(CType(229, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.dgvWaste.ThemeStyle.RowsStyle.SelectionForeColor = System.Drawing.Color.FromArgb(CType(CType(71, Byte), Integer), CType(CType(69, Byte), Integer), CType(CType(94, Byte), Integer))
        '
        'dgpProduceDonut
        '
        DataGridViewCellStyle7.BackColor = System.Drawing.Color.White
        Me.dgpProduceDonut.AlternatingRowsDefaultCellStyle = DataGridViewCellStyle7
        DataGridViewCellStyle8.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle8.BackColor = System.Drawing.Color.FromArgb(CType(CType(100, Byte), Integer), CType(CType(88, Byte), Integer), CType(CType(255, Byte), Integer))
        DataGridViewCellStyle8.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        DataGridViewCellStyle8.ForeColor = System.Drawing.Color.White
        DataGridViewCellStyle8.SelectionBackColor = System.Drawing.SystemColors.Highlight
        DataGridViewCellStyle8.SelectionForeColor = System.Drawing.SystemColors.HighlightText
        DataGridViewCellStyle8.WrapMode = System.Windows.Forms.DataGridViewTriState.[True]
        Me.dgpProduceDonut.ColumnHeadersDefaultCellStyle = DataGridViewCellStyle8
        Me.dgpProduceDonut.ColumnHeadersHeight = 4
        Me.dgpProduceDonut.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.EnableResizing
        DataGridViewCellStyle9.Alignment = System.Windows.Forms.DataGridViewContentAlignment.MiddleLeft
        DataGridViewCellStyle9.BackColor = System.Drawing.Color.White
        DataGridViewCellStyle9.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        DataGridViewCellStyle9.ForeColor = System.Drawing.Color.FromArgb(CType(CType(71, Byte), Integer), CType(CType(69, Byte), Integer), CType(CType(94, Byte), Integer))
        DataGridViewCellStyle9.SelectionBackColor = System.Drawing.Color.FromArgb(CType(CType(231, Byte), Integer), CType(CType(229, Byte), Integer), CType(CType(255, Byte), Integer))
        DataGridViewCellStyle9.SelectionForeColor = System.Drawing.Color.FromArgb(CType(CType(71, Byte), Integer), CType(CType(69, Byte), Integer), CType(CType(94, Byte), Integer))
        DataGridViewCellStyle9.WrapMode = System.Windows.Forms.DataGridViewTriState.[False]
        Me.dgpProduceDonut.DefaultCellStyle = DataGridViewCellStyle9
        Me.dgpProduceDonut.Dock = System.Windows.Forms.DockStyle.Top
        Me.dgpProduceDonut.GridColor = System.Drawing.Color.FromArgb(CType(CType(231, Byte), Integer), CType(CType(229, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.dgpProduceDonut.Location = New System.Drawing.Point(0, 0)
        Me.dgpProduceDonut.Name = "dgpProduceDonut"
        Me.dgpProduceDonut.RowHeadersVisible = False
        Me.dgpProduceDonut.RowHeadersWidth = 51
        Me.dgpProduceDonut.RowTemplate.Height = 24
        Me.dgpProduceDonut.Size = New System.Drawing.Size(375, 264)
        Me.dgpProduceDonut.TabIndex = 1
        Me.dgpProduceDonut.ThemeStyle.AlternatingRowsStyle.BackColor = System.Drawing.Color.White
        Me.dgpProduceDonut.ThemeStyle.AlternatingRowsStyle.Font = Nothing
        Me.dgpProduceDonut.ThemeStyle.AlternatingRowsStyle.ForeColor = System.Drawing.Color.Empty
        Me.dgpProduceDonut.ThemeStyle.AlternatingRowsStyle.SelectionBackColor = System.Drawing.Color.Empty
        Me.dgpProduceDonut.ThemeStyle.AlternatingRowsStyle.SelectionForeColor = System.Drawing.Color.Empty
        Me.dgpProduceDonut.ThemeStyle.BackColor = System.Drawing.Color.White
        Me.dgpProduceDonut.ThemeStyle.GridColor = System.Drawing.Color.FromArgb(CType(CType(231, Byte), Integer), CType(CType(229, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.dgpProduceDonut.ThemeStyle.HeaderStyle.BackColor = System.Drawing.Color.FromArgb(CType(CType(100, Byte), Integer), CType(CType(88, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.dgpProduceDonut.ThemeStyle.HeaderStyle.BorderStyle = System.Windows.Forms.DataGridViewHeaderBorderStyle.None
        Me.dgpProduceDonut.ThemeStyle.HeaderStyle.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.dgpProduceDonut.ThemeStyle.HeaderStyle.ForeColor = System.Drawing.Color.White
        Me.dgpProduceDonut.ThemeStyle.HeaderStyle.HeaightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.EnableResizing
        Me.dgpProduceDonut.ThemeStyle.HeaderStyle.Height = 4
        Me.dgpProduceDonut.ThemeStyle.ReadOnly = False
        Me.dgpProduceDonut.ThemeStyle.RowsStyle.BackColor = System.Drawing.Color.White
        Me.dgpProduceDonut.ThemeStyle.RowsStyle.BorderStyle = System.Windows.Forms.DataGridViewCellBorderStyle.SingleHorizontal
        Me.dgpProduceDonut.ThemeStyle.RowsStyle.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.dgpProduceDonut.ThemeStyle.RowsStyle.ForeColor = System.Drawing.Color.FromArgb(CType(CType(71, Byte), Integer), CType(CType(69, Byte), Integer), CType(CType(94, Byte), Integer))
        Me.dgpProduceDonut.ThemeStyle.RowsStyle.Height = 24
        Me.dgpProduceDonut.ThemeStyle.RowsStyle.SelectionBackColor = System.Drawing.Color.FromArgb(CType(CType(231, Byte), Integer), CType(CType(229, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.dgpProduceDonut.ThemeStyle.RowsStyle.SelectionForeColor = System.Drawing.Color.FromArgb(CType(CType(71, Byte), Integer), CType(CType(69, Byte), Integer), CType(CType(94, Byte), Integer))
        '
        'TabPage2
        '
        Me.TabPage2.Location = New System.Drawing.Point(184, 4)
        Me.TabPage2.Name = "TabPage2"
        Me.TabPage2.Padding = New System.Windows.Forms.Padding(3)
        Me.TabPage2.Size = New System.Drawing.Size(950, 455)
        Me.TabPage2.TabIndex = 1
        Me.TabPage2.Text = "TabPage2"
        Me.TabPage2.UseVisualStyleBackColor = True
        '
        'BackgroundWorker1
        '
        Me.BackgroundWorker1.WorkerReportsProgress = True
        '
        'frm_hourly
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(8.0!, 18.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.BackColor = System.Drawing.Color.White
        Me.ClientSize = New System.Drawing.Size(1138, 589)
        Me.ControlBox = False
        Me.Controls.Add(Me.GunaProgressIndicator1)
        Me.Controls.Add(Me.Panel2)
        Me.Controls.Add(Me.Panel1)
        Me.Font = New System.Drawing.Font("Tahoma", 9.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedDialog
        Me.MainMenuStrip = Me.MenuStrip1
        Me.Name = "frm_hourly"
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "Donut Produce Monitoring Form"
        Me.Panel1.ResumeLayout(False)
        Me.Panel1.PerformLayout()
        Me.MenuStrip1.ResumeLayout(False)
        Me.MenuStrip1.PerformLayout()
        Me.Panel2.ResumeLayout(False)
        Me.Guna2TabControl1.ResumeLayout(False)
        Me.TabPage1.ResumeLayout(False)
        Me.SplitContainer1.Panel1.ResumeLayout(False)
        Me.SplitContainer1.Panel2.ResumeLayout(False)
        CType(Me.SplitContainer1, System.ComponentModel.ISupportInitialize).EndInit()
        Me.SplitContainer1.ResumeLayout(False)
        Me.Guna2GroupBox1.ResumeLayout(False)
        CType(Me.dgvDonutsold, System.ComponentModel.ISupportInitialize).EndInit()
        CType(Me.dgvWaste, System.ComponentModel.ISupportInitialize).EndInit()
        CType(Me.dgpProduceDonut, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents Label3 As Label
    Friend WithEvents dtTo As DateTimePicker
    Friend WithEvents Label2 As Label
    Friend WithEvents dtFrom As DateTimePicker
    Friend WithEvents btngenerate As Guna.UI2.WinForms.Guna2Button
    Friend WithEvents MenuStrip1 As MenuStrip
    Friend WithEvents HourlySummaryReportToolStripMenuItem As ToolStripMenuItem
    Friend WithEvents MPToolStripMenuItem As ToolStripMenuItem
    Friend WithEvents MSToolStripMenuItem As ToolStripMenuItem
    Friend WithEvents MSSDToolStripMenuItem As ToolStripMenuItem
    Friend WithEvents BCToolStripMenuItem As ToolStripMenuItem
    Friend WithEvents PCICToolStripMenuItem As ToolStripMenuItem
    Friend WithEvents TransactionToolStripMenuItem As ToolStripMenuItem
    Friend WithEvents CreateBeginningBalanceToolStripMenuItem As ToolStripMenuItem
    Friend WithEvents POSHourlyToolStripMenuItem As ToolStripMenuItem
    Friend WithEvents CreateWasteToolStripMenuItem As ToolStripMenuItem
    Friend WithEvents Guna2TabControl1 As Guna.UI2.WinForms.Guna2TabControl
    Friend WithEvents TabPage1 As TabPage
    Friend WithEvents TabPage2 As TabPage
    Friend WithEvents Panel1 As Panel
    Friend WithEvents Panel2 As Panel
    Friend WithEvents GunaProgressIndicator1 As Guna.UI2.WinForms.Guna2ProgressIndicator
    Friend WithEvents BackgroundWorker1 As System.ComponentModel.BackgroundWorker
    Friend WithEvents Guna2GroupBox1 As Guna.UI2.WinForms.Guna2GroupBox
    Friend WithEvents SplitContainer1 As SplitContainer
    Friend WithEvents dgvDonutsold As Guna.UI2.WinForms.Guna2DataGridView
    Friend WithEvents dgvWaste As Guna.UI2.WinForms.Guna2DataGridView
    Friend WithEvents dgpProduceDonut As Guna.UI2.WinForms.Guna2DataGridView
    Friend WithEvents Label8 As Label
    Friend WithEvents Label5 As Label
    Friend WithEvents Label4 As Label
    Friend WithEvents Label1 As Label
    Friend WithEvents lbldnt_ring As Label
    Friend WithEvents Label12 As Label
    Friend WithEvents Label7 As Label
    Friend WithEvents Label11 As Label
    Friend WithEvents Label6 As Label
    Friend WithEvents lbltot_Sales As Label
    Friend WithEvents lblrvc_totqty As Label
    Friend WithEvents lblrvc_jpops As Label
    Friend WithEvents lblrvc_shell As Label
    Friend WithEvents lblrvc_ring As Label
    Friend WithEvents lbldnt_totqty As Label
    Friend WithEvents lbldnt_jpops As Label
    Friend WithEvents lbldnt_shell As Label
    Friend WithEvents Label10 As Label
    Friend WithEvents Label9 As Label
    Friend WithEvents lbltot_foc As Label
    Friend WithEvents lblfoc_jpops As Label
    Friend WithEvents lblfoc_shell As Label
    Friend WithEvents lblfoc_ring As Label
    Friend WithEvents Label14 As Label
    Friend WithEvents Label16 As Label
    Friend WithEvents Label13 As Label
    Friend WithEvents Label15 As Label
End Class
