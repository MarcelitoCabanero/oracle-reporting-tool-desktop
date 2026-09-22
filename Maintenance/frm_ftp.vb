Imports System.IO
Imports FluentFTP

Public Class frm_ftp

    ' ── Form Load: populate fields from ftp_config.txt ────────────────────────
    Private Sub frm_ftp_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        Dim cfg As FtpConfig = FtpService.GetSavedFtpConfig()
        txtftphost.Text = cfg.Host
        txtftpusername.Text = cfg.Username
        txtftppass.Text = cfg.Password
    End Sub

    ' ── Test button: quick connection check without saving ─────────────────────
    Private Async Sub btnTest_Click(sender As Object, e As EventArgs) Handles btnTest.Click
        btnTest.Enabled = False
        btnTest.Text = "Testing..."

        piFtp.Visible = True
        piFtp.Start()

        Dim result As Boolean = Await TestFtpConnectionAsync()

        piFtp.Stop()
        piFtp.Visible = False

        btnTest.Enabled = True
        btnTest.Text = "&Test"

        If result Then
            MessageBox.Show("FTP Connection Successful!",
                            "Connection Test",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Information)
        End If
    End Sub

    Private Async Function TestFtpConnectionAsync() As Task(Of Boolean)
        Return Await Task.Run(Function()
                                  Try
                                      Using client As New FtpClient(txtftphost.Text,
                                                                    txtftpusername.Text,
                                                                    txtftppass.Text)
                                          client.Connect()
                                          If client.IsConnected Then
                                              client.GetNameListing()
                                              Return True
                                          End If
                                          Return False
                                      End Using
                                  Catch ex As Exception
                                      Invoke(Sub()
                                                 MessageBox.Show("FTP Connection Failed: " & ex.Message,
                                                                 "Connection Test",
                                                                 MessageBoxButtons.OK,
                                                                 MessageBoxIcon.Error)
                                             End Sub)
                                      Return False
                                  End Try
                              End Function)
    End Function

    ' ── Save button: test then persist to ftp_config.txt ──────────────────────
    Private Async Sub btnSave_Click(sender As Object, e As EventArgs) Handles btnSave.Click
        btnSave.Enabled = False

        piFtp.Visible = True
        piFtp.Start()

        Dim config As New FtpConfig With {
            .Host = txtftphost.Text.Trim(),
            .Username = txtftpusername.Text.Trim(),
            .Password = txtftppass.Text
        }

        Dim isValid As Boolean = Await FtpService.SaveAndTestAsync(config)

        piFtp.Stop()
        piFtp.Visible = False
        btnSave.Enabled = True

        If isValid Then
            Try
                FtpService.SaveFtpConfig(config)   ' ← writes ftp_config.txt
                MessageBox.Show("FTP configuration saved successfully." &
                                Environment.NewLine &
                                "Config file: " & Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ftp_config.txt"),
                                "Saved",
                                MessageBoxButtons.OK,
                                MessageBoxIcon.Information)
                Me.Close()
            Catch ex As Exception
                MessageBox.Show("Connection OK, but could not write config file:" &
                                Environment.NewLine & ex.Message,
                                "Save Error",
                                MessageBoxButtons.OK,
                                MessageBoxIcon.Warning)
            End Try
        Else
            MessageBox.Show("Could not connect with the supplied credentials." &
                            Environment.NewLine & "Please check host, username and password.",
                            "Connection Failed",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error)
        End If
    End Sub

End Class
