import {
  Moon,
  Sun,
} from 'lucide-react'

import type {
  Theme,
} from '../App'

interface SettingsPageProps {
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

function SettingsPage({
  theme,
  onThemeChange,
}: SettingsPageProps) {
  const isDark = theme === 'dark'

  return (
    <section className="settings-page">
      <div className="settings-header">
        <h1>Mode</h1>
        <button
          type="button"
          className={`theme-switch ${isDark ? 'active' : ''}`}
          role="switch"
          aria-checked={isDark}
          aria-label="Toggle dark mode"
          onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
        >
          <span className="theme-track">
            <Sun size={14} className="theme-icon theme-icon-light" />
            <Moon size={14} className="theme-icon theme-icon-dark" />
            <span className="theme-thumb" />
          </span>
        </button>
      </div>
    </section>
  )
}

export default SettingsPage

