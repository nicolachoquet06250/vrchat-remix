export function useAvatar() {
  const uploading = useState<boolean>('avatar:uploading', () => false)
  const error = useState<string | null>('avatar:error', () => null)

  async function uploadAvatar(file: File) {
    error.value = null
    if (!file) return false
    const fd = new FormData()
    fd.append('file', file)
    uploading.value = true
    try {
      await $fetch('/api/users/avatar', {
        method: 'post',
        body: fd,
      })
      // refresh session to get new avatar url
      const { refresh } = useSession()
      await refresh()
      return true
    } catch (e: any) {
      error.value = e?.statusMessage || 'Échec de l\'upload de l\'avatar'
      return false
    } finally {
      uploading.value = false
    }
  }

  return { uploading, error, uploadAvatar }
}
