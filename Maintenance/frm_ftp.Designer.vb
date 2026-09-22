<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frm_ftp
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
        Me.Guna2GroupBox1 = New Guna.UI2.WinForms.Guna2GroupBox()
        Me.piFtp = New Guna.UI2.WinForms.Guna2ProgressIndicator()
        Me.btnSave = New Guna.UI2.WinForms.Guna2Button()
        Me.btnTest = New Guna.UI2.WinForms.Guna2Button()
        Me.txtftppass = New Guna.UI2.WinForms.Guna2TextBox()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.txtftpusername = New Guna.UI2.WinForms.Guna2TextBox()
        Me.txtftphost = New Guna.UI2.WinForms.Guna2TextBox()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.Label3 = New System.Windows.Forms.Label()
        Me.Guna2GroupBox1.SuspendLayout()
        Me.SuspendLayout()
        '
        'Guna2GroupBox1
        '
        Me.Guna2GroupBox1.Controls.Add(Me.piFtp)
        Me.Guna2GroupBox1.Controls.Add(Me.btnSave)
        Me.Guna2GroupBox1.Controls.Add(Me.btnTest)
        Me.Guna2GroupBox1.Controls.Add(Me.txtftppass)
        Me.Guna2GroupBox1.Controls.Add(Me.Label1)
        Me.Guna2GroupBox1.Controls.Add(Me.txtftpusername)
        Me.Guna2GroupBox1.Controls.Add(Me.txtftphost)
        Me.Guna2GroupBox1.Controls.Add(Me.Label2)
        Me.Guna2GroupBox1.Controls.Add(Me.Label3)
        Me.Guna2GroupBox1.Dock = System.Windows.Forms.DockStyle.Fill
        Me.Guna2GroupBox1.Font = New System.Drawing.Font("Segoe UI", 11.25!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Guna2GroupBox1.ForeColor = System.Drawing.Color.Black
        Me.Guna2GroupBox1.Location = New System.Drawing.Point(0, 0)
        Me.Guna2GroupBox1.Name = "Guna2GroupBox1"
        Me.Guna2GroupBox1.Size = New System.Drawing.Size(477, 247)
        Me.Guna2GroupBox1.TabIndex = 0
        Me.Guna2GroupBox1.Text = "Configuration Details"
        '
        'piFtp
        '
        Me.piFtp.Anchor = System.Windows.Forms.AnchorStyles.None
        Me.piFtp.BackColor = System.Drawing.Color.Transparent
        Me.piFtp.Location = New System.Drawing.Point(178, 62)
        Me.piFtp.Margin = New System.Windows.Forms.Padding(2)
        Me.piFtp.Name = "piFtp"
        Me.piFtp.ProgressColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(128, Byte), Integer), CType(CType(0, Byte), Integer))
        Me.piFtp.Size = New System.Drawing.Size(120, 122)
        Me.piFtp.TabIndex = 78
        Me.piFtp.UseTransparentBackground = True
        Me.piFtp.Visible = False
        '
        'btnSave
        '
        Me.btnSave.Animated = True
        Me.btnSave.AutoRoundedCorners = True
        Me.btnSave.BackColor = System.Drawing.Color.Transparent
        Me.btnSave.BorderRadius = 19
        Me.btnSave.DisabledState.BorderColor = System.Drawing.Color.DarkGray
        Me.btnSave.DisabledState.CustomBorderColor = System.Drawing.Color.DarkGray
        Me.btnSave.DisabledState.FillColor = System.Drawing.Color.FromArgb(CType(CType(169, Byte), Integer), CType(CType(169, Byte), Integer), CType(CType(169, Byte), Integer))
        Me.btnSave.DisabledState.ForeColor = System.Drawing.Color.FromArgb(CType(CType(141, Byte), Integer), CType(CType(141, Byte), Integer), CType(CType(141, Byte), Integer))
        Me.btnSave.FillColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.btnSave.Font = New System.Drawing.Font("Segoe UI", 10.8!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.btnSave.ForeColor = System.Drawing.Color.Black
        Me.btnSave.Location = New System.Drawing.Point(319, 179)
        Me.btnSave.Margin = New System.Windows.Forms.Padding(2)
        Me.btnSave.Name = "btnSave"
        Me.btnSave.Size = New System.Drawing.Size(134, 41)
        Me.btnSave.TabIndex = 77
        Me.btnSave.Text = "&Save"
        Me.btnSave.UseTransparentBackground = True
        '
        'btnTest
        '
        Me.btnTest.Animated = True
        Me.btnTest.AutoRoundedCorners = True
        Me.btnTest.BackColor = System.Drawing.Color.Transparent
        Me.btnTest.BorderRadius = 19
        Me.btnTest.DisabledState.BorderColor = System.Drawing.Color.DarkGray
        Me.btnTest.DisabledState.CustomBorderColor = System.Drawing.Color.DarkGray
        Me.btnTest.DisabledState.FillColor = System.Drawing.Color.FromArgb(CType(CType(169, Byte), Integer), CType(CType(169, Byte), Integer), CType(CType(169, Byte), Integer))
        Me.btnTest.DisabledState.ForeColor = System.Drawing.Color.FromArgb(CType(CType(141, Byte), Integer), CType(CType(141, Byte), Integer), CType(CType(141, Byte), Integer))
        Me.btnTest.FillColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.btnTest.Font = New System.Drawing.Font("Segoe UI", 10.8!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.btnTest.ForeColor = System.Drawing.Color.Black
        Me.btnTest.Location = New System.Drawing.Point(180, 179)
        Me.btnTest.Margin = New System.Windows.Forms.Padding(2)
        Me.btnTest.Name = "btnTest"
        Me.btnTest.Size = New System.Drawing.Size(134, 41)
        Me.btnTest.TabIndex = 76
        Me.btnTest.Text = "&Test"
        Me.btnTest.UseTransparentBackground = True
        '
        'txtftppass
        '
        Me.txtftppass.BackColor = System.Drawing.Color.White
        Me.txtftppass.BorderRadius = 10
        Me.txtftppass.BorderThickness = 2
        Me.txtftppass.Cursor = System.Windows.Forms.Cursors.IBeam
        Me.txtftppass.DefaultText = ""
        Me.txtftppass.DisabledState.BorderColor = System.Drawing.Color.FromArgb(CType(CType(208, Byte), Integer), CType(CType(208, Byte), Integer), CType(CType(208, Byte), Integer))
        Me.txtftppass.DisabledState.FillColor = System.Drawing.Color.FromArgb(CType(CType(226, Byte), Integer), CType(CType(226, Byte), Integer), CType(CType(226, Byte), Integer))
        Me.txtftppass.DisabledState.ForeColor = System.Drawing.Color.FromArgb(CType(CType(138, Byte), Integer), CType(CType(138, Byte), Integer), CType(CType(138, Byte), Integer))
        Me.txtftppass.DisabledState.PlaceholderForeColor = System.Drawing.Color.FromArgb(CType(CType(138, Byte), Integer), CType(CType(138, Byte), Integer), CType(CType(138, Byte), Integer))
        Me.txtftppass.FocusedState.BorderColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(192, Byte), Integer), CType(CType(128, Byte), Integer))
        Me.txtftppass.Font = New System.Drawing.Font("Segoe UI", 10.8!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtftppass.ForeColor = System.Drawing.Color.Black
        Me.txtftppass.HoverState.BorderColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(192, Byte), Integer), CType(CType(128, Byte), Integer))
        Me.txtftppass.IconLeftSize = New System.Drawing.Size(30, 30)
        Me.txtftppass.Location = New System.Drawing.Point(154, 133)
        Me.txtftppass.Margin = New System.Windows.Forms.Padding(2)
        Me.txtftppass.Name = "txtftppass"
        Me.txtftppass.PasswordChar = Global.Microsoft.VisualBasic.ChrW(9679)
        Me.txtftppass.PlaceholderForeColor = System.Drawing.Color.Black
        Me.txtftppass.PlaceholderText = ""
        Me.txtftppass.SelectedText = ""
        Me.txtftppass.Size = New System.Drawing.Size(299, 32)
        Me.txtftppass.TabIndex = 75
        Me.txtftppass.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        Me.txtftppass.UseSystemPasswordChar = True
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.BackColor = System.Drawing.Color.White
        Me.Label1.Font = New System.Drawing.Font("Segoe UI", 10.8!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label1.Location = New System.Drawing.Point(23, 138)
        Me.Label1.Margin = New System.Windows.Forms.Padding(2, 0, 2, 0)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(97, 20)
        Me.Label1.TabIndex = 74
        Me.Label1.Text = "FTP Password"
        '
        'txtftpusername
        '
        Me.txtftpusername.BackColor = System.Drawing.Color.White
        Me.txtftpusername.BorderRadius = 10
        Me.txtftpusername.BorderThickness = 2
        Me.txtftpusername.Cursor = System.Windows.Forms.Cursors.IBeam
        Me.txtftpusername.DefaultText = ""
        Me.txtftpusername.DisabledState.BorderColor = System.Drawing.Color.FromArgb(CType(CType(208, Byte), Integer), CType(CType(208, Byte), Integer), CType(CType(208, Byte), Integer))
        Me.txtftpusername.DisabledState.FillColor = System.Drawing.Color.FromArgb(CType(CType(226, Byte), Integer), CType(CType(226, Byte), Integer), CType(CType(226, Byte), Integer))
        Me.txtftpusername.DisabledState.ForeColor = System.Drawing.Color.FromArgb(CType(CType(138, Byte), Integer), CType(CType(138, Byte), Integer), CType(CType(138, Byte), Integer))
        Me.txtftpusername.DisabledState.PlaceholderForeColor = System.Drawing.Color.FromArgb(CType(CType(138, Byte), Integer), CType(CType(138, Byte), Integer), CType(CType(138, Byte), Integer))
        Me.txtftpusername.FocusedState.BorderColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(192, Byte), Integer), CType(CType(128, Byte), Integer))
        Me.txtftpusername.Font = New System.Drawing.Font("Segoe UI", 10.8!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtftpusername.ForeColor = System.Drawing.Color.Black
        Me.txtftpusername.HoverState.BorderColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(192, Byte), Integer), CType(CType(128, Byte), Integer))
        Me.txtftpusername.IconLeftSize = New System.Drawing.Size(30, 30)
        Me.txtftpusername.Location = New System.Drawing.Point(154, 97)
        Me.txtftpusername.Margin = New System.Windows.Forms.Padding(2)
        Me.txtftpusername.Name = "txtftpusername"
        Me.txtftpusername.PasswordChar = Global.Microsoft.VisualBasic.ChrW(0)
        Me.txtftpusername.PlaceholderForeColor = System.Drawing.Color.Black
        Me.txtftpusername.PlaceholderText = ""
        Me.txtftpusername.SelectedText = ""
        Me.txtftpusername.Size = New System.Drawing.Size(299, 32)
        Me.txtftpusername.TabIndex = 73
        Me.txtftpusername.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtftphost
        '
        Me.txtftphost.BackColor = System.Drawing.Color.White
        Me.txtftphost.BorderRadius = 10
        Me.txtftphost.BorderThickness = 2
        Me.txtftphost.Cursor = System.Windows.Forms.Cursors.IBeam
        Me.txtftphost.DefaultText = ""
        Me.txtftphost.DisabledState.BorderColor = System.Drawing.Color.FromArgb(CType(CType(208, Byte), Integer), CType(CType(208, Byte), Integer), CType(CType(208, Byte), Integer))
        Me.txtftphost.DisabledState.FillColor = System.Drawing.Color.FromArgb(CType(CType(226, Byte), Integer), CType(CType(226, Byte), Integer), CType(CType(226, Byte), Integer))
        Me.txtftphost.DisabledState.ForeColor = System.Drawing.Color.FromArgb(CType(CType(138, Byte), Integer), CType(CType(138, Byte), Integer), CType(CType(138, Byte), Integer))
        Me.txtftphost.DisabledState.PlaceholderForeColor = System.Drawing.Color.FromArgb(CType(CType(138, Byte), Integer), CType(CType(138, Byte), Integer), CType(CType(138, Byte), Integer))
        Me.txtftphost.FocusedState.BorderColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(192, Byte), Integer), CType(CType(128, Byte), Integer))
        Me.txtftphost.Font = New System.Drawing.Font("Segoe UI", 10.8!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.txtftphost.ForeColor = System.Drawing.Color.Black
        Me.txtftphost.HoverState.BorderColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(192, Byte), Integer), CType(CType(128, Byte), Integer))
        Me.txtftphost.IconLeftSize = New System.Drawing.Size(30, 30)
        Me.txtftphost.Location = New System.Drawing.Point(154, 61)
        Me.txtftphost.Margin = New System.Windows.Forms.Padding(2)
        Me.txtftphost.Name = "txtftphost"
        Me.txtftphost.PasswordChar = Global.Microsoft.VisualBasic.ChrW(0)
        Me.txtftphost.PlaceholderForeColor = System.Drawing.Color.Black
        Me.txtftphost.PlaceholderText = ""
        Me.txtftphost.SelectedText = ""
        Me.txtftphost.Size = New System.Drawing.Size(299, 32)
        Me.txtftphost.TabIndex = 69
        Me.txtftphost.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.BackColor = System.Drawing.Color.White
        Me.Label2.Font = New System.Drawing.Font("Segoe UI", 10.8!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label2.Location = New System.Drawing.Point(53, 67)
        Me.Label2.Margin = New System.Windows.Forms.Padding(2, 0, 2, 0)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(67, 20)
        Me.Label2.TabIndex = 70
        Me.Label2.Text = "FTP Host"
        '
        'Label3
        '
        Me.Label3.AutoSize = True
        Me.Label3.BackColor = System.Drawing.Color.White
        Me.Label3.Font = New System.Drawing.Font("Segoe UI", 10.8!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label3.Location = New System.Drawing.Point(18, 102)
        Me.Label3.Margin = New System.Windows.Forms.Padding(2, 0, 2, 0)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(102, 20)
        Me.Label3.TabIndex = 71
        Me.Label3.Text = "FTP Username"
        '
        'frm_ftp
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(7.0!, 15.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(477, 247)
        Me.Controls.Add(Me.Guna2GroupBox1)
        Me.Font = New System.Drawing.Font("Segoe UI", 9.0!, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedDialog
        Me.MaximizeBox = False
        Me.MinimizeBox = False
        Me.Name = "frm_ftp"
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "File Transfer Protocol"
        Me.Guna2GroupBox1.ResumeLayout(False)
        Me.Guna2GroupBox1.PerformLayout()
        Me.ResumeLayout(False)

    End Sub

    Friend WithEvents Guna2GroupBox1 As Guna.UI2.WinForms.Guna2GroupBox
    Friend WithEvents txtftpusername As Guna.UI2.WinForms.Guna2TextBox
    Friend WithEvents txtftphost As Guna.UI2.WinForms.Guna2TextBox
    Friend WithEvents Label2 As Label
    Friend WithEvents Label3 As Label
    Friend WithEvents txtftppass As Guna.UI2.WinForms.Guna2TextBox
    Friend WithEvents Label1 As Label
    Friend WithEvents btnSave As Guna.UI2.WinForms.Guna2Button
    Friend WithEvents btnTest As Guna.UI2.WinForms.Guna2Button
    Friend WithEvents piFtp As Guna.UI2.WinForms.Guna2ProgressIndicator
End Class
