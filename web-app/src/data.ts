import {
  BarChart3,
  Clock3,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  Menu,
  NotebookText,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import type { NavigationGroup, SalesRow } from './types'

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'OVERVIEW',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'Finance insight', to: '/finance-insight', icon: BarChart3 },
    ],
  },
  {
    label: 'REPORTS',
    items: [
      { label: 'Hourly sales', to: '/hourly-sales', icon: Clock3 },
      { label: 'System sales', to: '/system-sales', icon: FileBarChart },
      { label: 'Menu items', to: '/menu-item', icon: Menu },
      { label: 'POS journal', to: '/pos-journal', icon: NotebookText },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { label: 'Remittance of funds', to: '/rof', icon: WalletCards },
      { label: 'Deposit monitoring', to: '/deposit', icon: CreditCard },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { label: 'Maintenance', to: '/maintenance', icon: ShieldCheck },
    ],
  },
]

export const sampleSales: SalesRow[] = [
  { date: 'Nov 04, 2026 · 10:42 AM', check: '208451', workstation: 'POS-02', employee: 'A. Santos', tender: 'Cash', amount: 2480, status: 'Completed' },
  { date: 'Nov 04, 2026 · 10:36 AM', check: '208450', workstation: 'POS-01', employee: 'M. Reyes', tender: 'Credit card', amount: 1765.5, status: 'Completed' },
  { date: 'Nov 04, 2026 · 10:29 AM', check: '208449', workstation: 'POS-03', employee: 'J. Cruz', tender: 'GCash', amount: 935, status: 'Completed' },
  { date: 'Nov 04, 2026 · 10:18 AM', check: '208448', workstation: 'POS-02', employee: 'A. Santos', tender: 'Cash', amount: 3120, status: 'Voided' },
  { date: 'Nov 04, 2026 · 10:04 AM', check: '208447', workstation: 'POS-01', employee: 'R. Dela Cruz', tender: 'Debit card', amount: 1420, status: 'Completed' },
  { date: 'Nov 04, 2026 · 09:51 AM', check: '208446', workstation: 'POS-04', employee: 'M. Reyes', tender: 'Cash', amount: 680, status: 'Completed' },
  { date: 'Nov 04, 2026 · 09:43 AM', check: '208445', workstation: 'POS-03', employee: 'J. Cruz', tender: 'GCash', amount: 2245, status: 'Completed' },
  { date: 'Nov 04, 2026 · 09:32 AM', check: '208444', workstation: 'POS-02', employee: 'A. Santos', tender: 'Cash', amount: 1240, status: 'Completed' },
]

export const hourlyRows = [
  { time: '06:00 – 07:00', ring: 47, shell: 31, jpops: 24, waste: 3, sold: 61 },
  { time: '07:00 – 08:00', ring: 60, shell: 44, jpops: 30, waste: 4, sold: 82 },
  { time: '08:00 – 09:00', ring: 72, shell: 48, jpops: 34, waste: 5, sold: 97 },
  { time: '09:00 – 10:00', ring: 54, shell: 38, jpops: 27, waste: 2, sold: 78 },
  { time: '10:00 – 11:00', ring: 44, shell: 30, jpops: 30, waste: 3, sold: 54 },
]

export const menuItems = [
  { number: '100214', name: 'Original Glazed Dozen', major: 'DONUTS', family: 'DOZEN', price: 520, status: 'Active' },
  { number: '100102', name: 'Original Glazed', major: 'DONUTS', family: 'RING', price: 45, status: 'Active' },
  { number: '200118', name: 'House Blend Regular', major: 'BEVERAGES', family: 'HOT COFFEE', price: 110, status: 'Active' },
  { number: '100325', name: 'Chocolate Iced Kreme', major: 'DONUTS', family: 'RING', price: 55, status: 'Active' },
  { number: '300041', name: 'Cheese Original Pretzel', major: 'BAKERY', family: 'PRETZELS', price: 95, status: 'Inactive' },
  { number: '200205', name: 'Iced Latte Large', major: 'BEVERAGES', family: 'ICED COFFEE', price: 185, status: 'Active' },
  { number: '100447', name: 'Strawberry Filled', major: 'DONUTS', family: 'FILLED', price: 62, status: 'Active' },
]

export const depositRows = [
  { businessDate: 'Nov 03, 2026', depositDate: 'Nov 04, 2026', reference: 'BDO-784210', pos: 48620, deposited: 48520, variance: -100, status: 'Submitted' },
  { businessDate: 'Nov 02, 2026', depositDate: 'Nov 03, 2026', reference: 'BDO-784093', pos: 52140, deposited: 52140, variance: 0, status: 'Reconciled' },
  { businessDate: 'Nov 01, 2026', depositDate: 'Nov 02, 2026', reference: 'BDO-783940', pos: 43885, deposited: 43635, variance: -250, status: 'For review' },
  { businessDate: 'Oct 31, 2026', depositDate: 'Nov 01, 2026', reference: 'BDO-783804', pos: 60210, deposited: 60210, variance: 0, status: 'Reconciled' },
  { businessDate: 'Oct 30, 2026', depositDate: 'Oct 31, 2026', reference: 'BDO-783688', pos: 41975, deposited: 41975, variance: 0, status: 'Reconciled' },
]

export const rofCashRows = [
  { cashier: 'A. Santos', tender: 'Cash', pos: 18450, actual: 18450, remarks: 'Balanced' },
  { cashier: 'M. Reyes', tender: 'Cash', pos: 16280, actual: 16230, remarks: 'Short ₱50.00' },
  { cashier: 'J. Cruz', tender: 'Cash', pos: 13940, actual: 13940, remarks: 'Balanced' },
]

export const rofNonCashRows = [
  { cashier: 'Store total', tender: 'Credit card', pos: 23860, actual: 23860, remarks: 'Terminal settlement' },
  { cashier: 'Store total', tender: 'GCash', pos: 11640, actual: 11640, remarks: 'Wallet settlement' },
  { cashier: 'Store total', tender: 'Gift certificate', pos: 2450, actual: 2450, remarks: 'Manual tender' },
]

export const employeeRows = [
  { employee: 'A. Santos', checks: 48, gross: 32480, discounts: 1240, net: 31240, variance: 0 },
  { employee: 'M. Reyes', checks: 42, gross: 28960, discounts: 860, net: 28100, variance: 50 },
  { employee: 'J. Cruz', checks: 39, gross: 26420, discounts: 680, net: 25740, variance: 0 },
  { employee: 'R. Dela Cruz', checks: 34, gross: 22180, discounts: 460, net: 21720, variance: -25 },
]

export const tenderRows = [
  { check: '208451', date: 'Nov 04, 2026', type: 'Cash', amount: 2480, reference: '—' },
  { check: '208450', date: 'Nov 04, 2026', type: 'Credit card', amount: 1765.5, reference: 'VISA ···· 2841' },
  { check: '208449', date: 'Nov 04, 2026', type: 'GCash', amount: 935, reference: 'GC-409512' },
  { check: '208447', date: 'Nov 04, 2026', type: 'Debit card', amount: 1420, reference: 'BPI ···· 7084' },
  { check: '208446', date: 'Nov 04, 2026', type: 'Cash', amount: 680, reference: '—' },
]

export const scPwdRows = [
  { check: '208422', date: 'Nov 04, 2026', type: 'OSCA', name: 'Maria D. Villanueva', id: 'OSCA-184-552', workstation: 'POS-01', gross: 1040, discount: 124.8, net: 915.2 },
  { check: '208397', date: 'Nov 04, 2026', type: 'PWD', name: 'Carlo M. Reyes', id: 'PWD-009-348', workstation: 'POS-03', gross: 520, discount: 62.4, net: 457.6 },
  { check: '208366', date: 'Nov 03, 2026', type: 'OSCA', name: 'Lourdes S. Garcia', id: 'OSCA-207-311', workstation: 'POS-02', gross: 780, discount: 93.6, net: 686.4 },
  { check: '208305', date: 'Nov 03, 2026', type: 'PWD', name: 'David R. Lim', id: 'PWD-011-027', workstation: 'POS-04', gross: 390, discount: 46.8, net: 343.2 },
]

export const varianceRows = [
  { check: '208450', time: '10:36 AM', employee: 'M. Reyes', workstation: 'POS-01', sales: 1765.5, tender: 1715.5, variance: -50, reason: 'Cash short' },
  { check: '208431', time: '10:11 AM', employee: 'R. Dela Cruz', workstation: 'POS-04', sales: 980, tender: 1005, variance: 25, reason: 'Over ring' },
  { check: '208408', time: '09:54 AM', employee: 'J. Cruz', workstation: 'POS-03', sales: 1240, tender: 1240, variance: 0, reason: 'Balanced' },
]

export const journalReceipt = [
  'J.CO DONUTS PHILIPPINES',
  'STORE 0042  |  ORACLE MALL',
  '--------------------------------',
  'Check No: 208451       POS-02',
  'Nov 04, 2026          10:42 AM',
  '--------------------------------',
  'Original Glazed Dozen       520.00',
  'House Blend Regular         110.00',
  'Strawberry Filled x2        124.00',
  'Iced Latte Large            185.00',
  '--------------------------------',
  'Subtotal                    939.00',
  'VAT                         100.61',
  'TOTAL                       939.00',
  'Cash                      1,000.00',
  'Change                       61.00',
  '--------------------------------',
  'Thank you. See you again!',
]
