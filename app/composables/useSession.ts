export type SessionUser = {
  id: number
  email: string
  username: string
  createdAt: string
  hasAvatar?: boolean
  avatarUrl?: string | null
}

export function useSession() {
  const user = useState<SessionUser | null>('session:user', () => null)
  const loading = useState<boolean>('session:loading', () => false)
  const error = useState<string | null>('session:error', () => null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      const data = await $fetch<SessionUser>('/api/users/me', { method: 'get' })
      user.value = data || null
    } catch (e: any) {
      user.value = null
      // leave error null for unauthenticated
    } finally {
      loading.value = false
    }
  }

  async function login(emailOrUsername: string, password: string) {
    error.value = null
    try {
      await $fetch('/api/auth/login', {
        method: 'post',
        body: {emailOrUsername, password},
      })

      await refresh()
      return true
    } catch (err: any) {
      error.value = err.statusMessage || 'Erreur de connexion'
      return false
    }
  }

  async function register(email: string, username: string, password: string, file?: File) {
    error.value = null
    try {
      if (file) {
        const fd = new FormData()
        fd.append('email', email)
        fd.append('username', username)
        fd.append('password', password)
        // côté serveur nous attendrons le champ fichier nommé "file" (aligné avec /api/users/avatar)
        fd.append('file', file)
        await $fetch('/api/auth/register', {
          method: 'post',
          body: fd,
        })
      } else {
        await $fetch('/api/auth/register', {
          method: 'post',
          body: {email, username, password},
        })
      }
      // Do not refresh session here; account requires email verification first
      return true
    } catch (err: any) {
      if (err.value) {
        error.value = err.value.statusMessage || 'Erreur d\'inscription'
        return false
      }
    }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'post' })
    user.value = null
  }

  if (process.client && user.value === null && !loading.value) {
    refresh()
  }

  return { user, loading, error, refresh, login, register, logout }
}
