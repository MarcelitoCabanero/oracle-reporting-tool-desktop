export interface AuthUser {
  username: string
  displayName: string
  role: string
  locationName: string
  locationId: string
}

interface AuthResponse {
  user?: AuthUser
  message?: string
}

const mockSessionKey = 'oracle-reporting-tool-web-session'
const configuredMode = import.meta.env.VITE_AUTH_MODE ?? 'backend'
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false
  const user = value as Record<string, unknown>
  return ['username', 'displayName', 'role', 'locationName', 'locationId']
    .every((key) => typeof user[key] === 'string')
}

function authMode(): 'mock' | 'backend' {
  if (configuredMode === 'mock') {
    if (!import.meta.env.DEV) {
      throw new Error('Development mock authentication is disabled outside development.')
    }
    return 'mock'
  }
  return 'backend'
}

function endpoint(path: string) {
  return `${apiBaseUrl}${path}`
}

async function readResponse(response: Response): Promise<AuthResponse> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return {}
  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object') return {}
  return payload as AuthResponse
}

function readMockSession(): AuthUser | null {
  const session = window.sessionStorage.getItem(mockSessionKey)
  if (!session) return null

  try {
    const parsed: unknown = JSON.parse(session)
    if (isAuthUser(parsed)) return parsed
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
  }

  window.sessionStorage.removeItem(mockSessionKey)
  return null
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (authMode() === 'mock') return readMockSession()

  const response = await fetch(endpoint('/api/auth/session'), {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (response.status === 401) return null
  const body = await readResponse(response)
  if (!response.ok) {
    throw new Error(body.message || 'Unable to verify your session.')
  }
  if (!isAuthUser(body.user)) {
    throw new Error('The authentication server returned an invalid session.')
  }
  return body.user
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const cleanUsername = username.trim()
  if (!cleanUsername || !password) {
    throw new Error('Enter your username or email and password.')
  }

  if (authMode() === 'mock') {
    await new Promise((resolve) => window.setTimeout(resolve, 450))
    const user: AuthUser = {
      username: cleanUsername,
      displayName: cleanUsername.includes('@') ? cleanUsername.split('@')[0] : cleanUsername,
      role: 'Development preview',
      locationName: 'Sample Store',
      locationId: 'DEMO-001',
    }
    window.sessionStorage.setItem(mockSessionKey, JSON.stringify(user))
    return user
  }

  const response = await fetch(endpoint('/api/auth/login'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ username: cleanUsername, password }),
  })
  const body = await readResponse(response)
  if (response.status === 401 || response.status === 403) {
    throw new Error('Invalid username or password.')
  }
  if (!response.ok) {
    throw new Error(body.message || 'Unable to sign in right now. Please try again.')
  }
  if (!isAuthUser(body.user)) {
    throw new Error('The authentication server returned an invalid user.')
  }
  return body.user
}

export async function logout(): Promise<void> {
  if (authMode() === 'mock') {
    window.sessionStorage.removeItem(mockSessionKey)
    return
  }

  const response = await fetch(endpoint('/api/auth/logout'), {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error('The server could not end the session. Please try again.')
  }
}

export function isDevelopmentMock() {
  return import.meta.env.DEV && configuredMode === 'mock'
}
