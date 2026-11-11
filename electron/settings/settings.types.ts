export type DatabaseKey = 'local' | 'hq' | 'headq' | 'hourly'

export interface DatabaseConnectionSettings {
  server: string
  database: string
  username: string
  password: string
  port: number
}

export interface FtpConnectionSettings {
  host: string
  username: string
  password: string
  secure: boolean
}

export interface ConnectionSettings {
  databases: Record<DatabaseKey, DatabaseConnectionSettings>
  ftp: FtpConnectionSettings
  encrypt: boolean
  trustServerCertificate: boolean
}

export interface DatabaseConnectionSettingsView extends DatabaseConnectionSettings {
  password: string
  passwordConfigured: boolean
}

export interface ConnectionSettingsView {
  databases: Record<DatabaseKey, DatabaseConnectionSettingsView>
  ftp: Omit<FtpConnectionSettings, 'password'> & {
    password: string
    passwordConfigured: boolean
  }
  encrypt: boolean
  trustServerCertificate: boolean
}

export type ConnectionTestResult = {
  success: boolean
  message: string
}

export interface LocationOption {
  locationId: number
  locationName: string
}
