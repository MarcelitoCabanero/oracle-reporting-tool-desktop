Imports Guna.UI2.WinForms
Public Class frm_offline_location
    Public SelectedLocation As String = ""
    Public SelectedLocationID As String = ""
    Private Sub BtnCancel_Click(sender As Object, e As EventArgs) Handles BtnCancel.Click
        Me.DialogResult = DialogResult.Cancel
        Me.Close()
    End Sub

    Private Sub frm_offline_location_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        LoadLocations()
    End Sub
    Private Sub LoadLocations()
        cmbLocations.Items.Add("PH017-VER")
        cmbLocations.Items.Add("PH089-LAO")
        cmbLocations.Items.Add("PH005-FVW")
        cmbLocations.Items.Add("PH000-HO")
        cmbLocations.Items.Add("PH062-SKY")
        cmbLocations.Items.Add("PH066-SSJ")
        cmbLocations.Items.Add("PH070-MAR")
        cmbLocations.Items.Add("PH073-SSR")
        cmbLocations.Items.Add("PH077-SBT")
        cmbLocations.Items.Add("PH083-SCU")
        cmbLocations.Items.Add("PH085-PITX")
        cmbLocations.Items.Add("PH018-SML")
        cmbLocations.Items.Add("PH021-BGO")
        cmbLocations.Items.Add("PH028-SMC")
        cmbLocations.Items.Add("PH080-AVM")
        cmbLocations.Items.Add("PH087-JML")
        cmbLocations.Items.Add("PH067-CLK")
        cmbLocations.Items.Add("PH078-LGM")
        cmbLocations.Items.Add("PH082-LMC")
        cmbLocations.Items.Add("PH084-SCC")
        cmbLocations.Items.Add("PH086-BUT")
        cmbLocations.Items.Add("PH024-PQE")
        cmbLocations.Items.Add("PH063-CAL")
        cmbLocations.Items.Add("PH064-SLU")
        cmbLocations.Items.Add("PH065-SGC")
        cmbLocations.Items.Add("PH068-ASG")
        cmbLocations.Items.Add("PH069-SSX")
        cmbLocations.Items.Add("PH071-SSM")
        cmbLocations.Items.Add("PH072-TAN")
        cmbLocations.Items.Add("PH074-SOR")
        cmbLocations.Items.Add("PH075-TUG")
        cmbLocations.Items.Add("PH076-RPA")
        cmbLocations.Items.Add("PH079-SST")
        cmbLocations.Items.Add("PH081-RBS")
        cmbLocations.Items.Add("PH088-SBC")
        cmbLocations.Items.Add("PH011-PMP")
        cmbLocations.Items.Add("PH002-MOA")
        cmbLocations.Items.Add("PH042-SMM")
        cmbLocations.Items.Add("PH044-SMB")
        cmbLocations.Items.Add("PH058-DGP")
        cmbLocations.Items.Add("PH059-SMT")
        cmbLocations.Items.Add("PH060-BG2")
        cmbLocations.Items.Add("PH001-MGM")
        cmbLocations.Items.Add("PH037-KDZ")
        cmbLocations.Items.Add("PH039-TMR")
        cmbLocations.Items.Add("PH048-BBL")
        cmbLocations.Items.Add("PH050-DDM")
        cmbLocations.Items.Add("PH055-CUB")
        cmbLocations.Items.Add("PH030-RBG")
        cmbLocations.Items.Add("PH045-SEO")
        cmbLocations.Items.Add("PH053-NED")
        cmbLocations.Items.Add("PH057-SMO")
        cmbLocations.Items.Add("PH061-RPM")
        cmbLocations.SelectedIndex = 0
    End Sub

    Private Sub btnOk_Click(sender As Object, e As EventArgs) Handles btnOk.Click
        If cmbLocations.SelectedItem IsNot Nothing Then
            SelectedLocation = cmbLocations.SelectedItem.ToString()
            SelectedLocationID = cmbLocations.SelectedIndex.ToString()
            Me.DialogResult = DialogResult.OK
            Me.Close()
        Else
            MessageBox.Show("Please select a location", "Selection Required", MessageBoxButtons.OK, MessageBoxIcon.Warning)
        End If
    End Sub
End Class