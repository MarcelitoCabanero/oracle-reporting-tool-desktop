<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frm_offline_location
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
        Me.cmbLocations = New Guna.UI2.WinForms.Guna2ComboBox()
        Me.BtnCancel = New Guna.UI2.WinForms.Guna2Button()
        Me.btnOk = New Guna.UI2.WinForms.Guna2Button()
        Me.SuspendLayout()
        '
        'cmbLocations
        '
        Me.cmbLocations.BackColor = System.Drawing.Color.Transparent
        Me.cmbLocations.DrawMode = System.Windows.Forms.DrawMode.OwnerDrawFixed
        Me.cmbLocations.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.cmbLocations.FocusedColor = System.Drawing.Color.FromArgb(CType(CType(94, Byte), Integer), CType(CType(148, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.cmbLocations.FocusedState.BorderColor = System.Drawing.Color.FromArgb(CType(CType(94, Byte), Integer), CType(CType(148, Byte), Integer), CType(CType(255, Byte), Integer))
        Me.cmbLocations.Font = New System.Drawing.Font("Segoe UI", 10.0!)
        Me.cmbLocations.ForeColor = System.Drawing.Color.Black
        Me.cmbLocations.ItemHeight = 30
        Me.cmbLocations.Location = New System.Drawing.Point(21, 27)
        Me.cmbLocations.Name = "cmbLocations"
        Me.cmbLocations.Size = New System.Drawing.Size(325, 36)
        Me.cmbLocations.TabIndex = 0
        '
        'BtnCancel
        '
        Me.BtnCancel.Animated = True
        Me.BtnCancel.AutoRoundedCorners = True
        Me.BtnCancel.BackColor = System.Drawing.Color.Transparent
        Me.BtnCancel.BorderRadius = 15
        Me.BtnCancel.DisabledState.BorderColor = System.Drawing.Color.DarkGray
        Me.BtnCancel.DisabledState.CustomBorderColor = System.Drawing.Color.DarkGray
        Me.BtnCancel.DisabledState.FillColor = System.Drawing.Color.FromArgb(CType(CType(169, Byte), Integer), CType(CType(169, Byte), Integer), CType(CType(169, Byte), Integer))
        Me.BtnCancel.DisabledState.ForeColor = System.Drawing.Color.FromArgb(CType(CType(141, Byte), Integer), CType(CType(141, Byte), Integer), CType(CType(141, Byte), Integer))
        Me.BtnCancel.FillColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.BtnCancel.Font = New System.Drawing.Font("Segoe UI", 10.8!)
        Me.BtnCancel.ForeColor = System.Drawing.Color.Black
        Me.BtnCancel.Location = New System.Drawing.Point(192, 84)
        Me.BtnCancel.Margin = New System.Windows.Forms.Padding(3, 2, 3, 2)
        Me.BtnCancel.Name = "BtnCancel"
        Me.BtnCancel.Size = New System.Drawing.Size(154, 32)
        Me.BtnCancel.TabIndex = 14
        Me.BtnCancel.Text = "Cancel"
        Me.BtnCancel.UseTransparentBackground = True
        '
        'btnOk
        '
        Me.btnOk.Animated = True
        Me.btnOk.AutoRoundedCorners = True
        Me.btnOk.BackColor = System.Drawing.Color.Transparent
        Me.btnOk.BorderRadius = 15
        Me.btnOk.DisabledState.BorderColor = System.Drawing.Color.DarkGray
        Me.btnOk.DisabledState.CustomBorderColor = System.Drawing.Color.DarkGray
        Me.btnOk.DisabledState.FillColor = System.Drawing.Color.FromArgb(CType(CType(169, Byte), Integer), CType(CType(169, Byte), Integer), CType(CType(169, Byte), Integer))
        Me.btnOk.DisabledState.ForeColor = System.Drawing.Color.FromArgb(CType(CType(141, Byte), Integer), CType(CType(141, Byte), Integer), CType(CType(141, Byte), Integer))
        Me.btnOk.FillColor = System.Drawing.Color.FromArgb(CType(CType(255, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(192, Byte), Integer))
        Me.btnOk.Font = New System.Drawing.Font("Segoe UI", 10.8!)
        Me.btnOk.ForeColor = System.Drawing.Color.Black
        Me.btnOk.Location = New System.Drawing.Point(26, 84)
        Me.btnOk.Margin = New System.Windows.Forms.Padding(3, 2, 3, 2)
        Me.btnOk.Name = "btnOk"
        Me.btnOk.Size = New System.Drawing.Size(154, 32)
        Me.btnOk.TabIndex = 15
        Me.btnOk.Text = "Ok"
        Me.btnOk.UseTransparentBackground = True
        '
        'frm_offline_location
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(8.0!, 16.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.BackColor = System.Drawing.Color.White
        Me.ClientSize = New System.Drawing.Size(384, 171)
        Me.ControlBox = False
        Me.Controls.Add(Me.btnOk)
        Me.Controls.Add(Me.BtnCancel)
        Me.Controls.Add(Me.cmbLocations)
        Me.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedSingle
        Me.Name = "frm_offline_location"
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "Offline Location"
        Me.ResumeLayout(False)

    End Sub

    Friend WithEvents cmbLocations As Guna.UI2.WinForms.Guna2ComboBox
    Friend WithEvents BtnCancel As Guna.UI2.WinForms.Guna2Button
    Friend WithEvents btnOk As Guna.UI2.WinForms.Guna2Button
End Class
