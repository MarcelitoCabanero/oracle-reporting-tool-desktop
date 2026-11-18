import {
  findUserByCredentials,
} from './auth.repository.js'

export interface LoginResult {
  success: boolean

  user?: {
    username: string
    displayName: string
    role: string
    locationName: string
    locationId: string
  }

  message?: string
}

let activeSessionUser: {
  username: string
  role: string
  locationName: string
  locationId: string
} | null = null

export function getActiveSessionLocationName(): string | null {
  if (!activeSessionUser) {
    return null
  }
  const role = activeSessionUser.role.trim().toLowerCase()
  const loc = activeSessionUser.locationName.trim()
  if (!loc || role === 'admin' || loc.toLowerCase() === 'admin') {
    return null
  }
  return loc
}

export async function loginUser(
  username: string,
  password: string,
): Promise<LoginResult> {
  const cleanUsername =
    username.trim()

  if (
    !cleanUsername ||
    !password
  ) {
    return {
      success: false,
      message:
        'Username and password are required.',
    }
  }

  try {
    console.log(
      `Authenticating user: ${cleanUsername}`,
    )

    const dbUser =
      await findUserByCredentials(
        cleanUsername,
        password,
      )

    if (!dbUser) {
      console.log(
        `Authentication failed: ${cleanUsername}`,
      )

      return {
        success: false,
        message:
          'Invalid username or password.',
      }
    }

    console.log(
      `Authentication successful: ${dbUser.username}`,
    )

    activeSessionUser = {
      username: dbUser.username,
      role: dbUser.access,
      locationName: dbUser.locationName,
      locationId: dbUser.locationId,
    }

    return {
      success: true,

      user: {
        username:
          dbUser.username,

        displayName:
          dbUser.locationName,

        role:
          dbUser.access,

        locationName:
          dbUser.locationName,

        locationId:
          dbUser.locationId,
      },
    }
  } catch (error) {
    console.error(
      'Authentication database error:',
      error,
    )

    return {
      success: false,
      message:
        'Unable to connect to the authentication server.',
    }
  }
}