<script setup lang="ts">
const { user, logout, refresh } = useSession()
const { uploading, error, uploadAvatar } = useAvatar()
onMounted(() => refresh())
const router = useRouter()

definePageMeta({
  name: 'profile'
})

useSeoMeta({
  ogTitle: computed(() => `Profile - ${user.value?.username}`),
  ogImage: '/vrchat-remix.png',
  description: computed(() => `la page de profile de ${user.value?.username}`),
  ogDescription: computed(() => `la page de profile de ${user.value?.username}`),
  twitterCard: 'app'
})

const file = ref<File | null>(null)
const previewUrl = ref<string | null>(null)

watch(file, (f) => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = f ? URL.createObjectURL(f) : null
})

async function onLogout() {
  await logout()
  await router.push('/login')
}

async function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0] || null
  if (!f) return
  // Basic client-side filter to common image types
  if (!/^image\/(jpeg|jpg|png|gif|webp)$/.test(f.type)) {
    alert('Format non supporté. Utilisez jpeg, jpg, png, gif ou webp.')
    input.value = ''
    return
  }
  file.value = f
}

async function onUpload() {
  if (!file.value) return
  const ok = await uploadAvatar(file.value)
  if (ok) {
    file.value = null
    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
      previewUrl.value = null
    }
  }
}
</script>

<template>
  <Head>
    <Title>Profile - {{ user?.username }}</Title>
  </Head>

  <div class="container">
    <h1>Mon profil</h1>
    <div v-if="user" class="card">
      <div class="avatar-row">
        <img
          v-if="previewUrl || user.avatarUrl"
          :src="previewUrl || user.avatarUrl!"
          alt="Avatar"
          class="avatar"
        />
        <div v-else class="avatar placeholder">A</div>
        <div class="uploader">
          <label class="file-label">
            <input type="file" accept="image/*" @change="onPick" />
            <span>Choisir une image…</span>
          </label>
          <button :disabled="!file || uploading" @click="onUpload">
            {{ uploading ? 'Envoi…' : 'Uploader' }}
          </button>
          <p v-if="error" class="error">{{ error }}</p>
        </div>
      </div>
      <div><strong>Pseudo:</strong> {{ user.username }}</div>
      <div><strong>Email:</strong> {{ user.email }}</div>
      <div><strong>Inscription:</strong> {{ new Date(user.createdAt).toLocaleString() }}</div>
      <div class="actions">
        <button @click="onLogout">Se déconnecter</button>
      </div>
    </div>
    <div v-else>Non connecté</div>
  </div>
</template>

<style scoped>
.container { max-width: 720px; margin: 0 auto; display: grid; gap: 16px; }
.card { border: 1px solid #eee; border-radius: 8px; padding: 16px; display: grid; gap: 8px; }
.avatar-row { display: grid; grid-template-columns: 96px 1fr; gap: 12px; align-items: center; }
.avatar { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; }
.avatar.placeholder { display:flex; align-items:center; justify-content:center; background:#f2f2f2; color:#888; font-weight:600; }
.uploader { display: grid; gap: 8px; align-items: start; }
.file-label { display:inline-grid; align-items:center; gap:6px; }
.file-label input[type="file"] { display:block; }
.actions { margin-top: 8px; }
button { padding: 8px 12px; }
.error { color: #b00020; }
</style>
