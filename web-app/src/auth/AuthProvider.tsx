import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as authService from './auth-service'
import type { AuthUser } from './auth-service'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  sessionError: string
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')

  const refreshSession = useCallback(async () => {
    setLoading(true)
    setSessionError('')
    try {
      setUser(await authService.getCurrentUser())
    } catch (error) {
      setUser(null)
      setSessionError(error instanceof Error ? error.message : 'Unable to verify your session.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  const signIn = useCallback(async (username: string, password: string) => {
    const nextUser = await authService.login(username, password)
    setUser(nextUser)
    setSessionError('')
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, sessionError, signIn, signOut, refreshSession }),
    [user, loading, sessionError, signIn, signOut, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
