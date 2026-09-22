export interface FtpConfig {
  host: string
  username: string
  password: string
}

export interface MissingMenuItem {
  itemnumber: string
  itemname: string
  transtype: string
  majorgroup: string
  familygroup: string
}

export interface MaintenanceResult {
  success: boolean
  message: string
}