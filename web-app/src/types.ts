import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export interface NavigationItem {
  label: string
  to: string
  icon: LucideIcon
}

export interface NavigationGroup {
  label: string
  items: NavigationItem[]
}

export interface TableColumn<T> {
  label: string
  align?: 'left' | 'right'
  render: (row: T, index: number) => ReactNode
}

export interface SalesRow {
  date: string
  check: string
  workstation: string
  employee: string
  tender: string
  amount: number
  status: string
}
