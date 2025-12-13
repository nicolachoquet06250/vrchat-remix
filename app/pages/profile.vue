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
const avatarInput = ref<HTMLInputElement | null>(null)
const filename = computed(() => file.value?.name || '')

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

function openFilePicker() {
  avatarInput.value?.click()
}
</script>

<template>
  <Head>
    <Title>Profile - {{ user?.username }}</Title>
  </Head>

  <div class="container">
    <div class="header">
      <h1>Mon profil</h1>
      <p class="hint">Gérez votre avatar et vos informations personnelles</p>
    </div>

    <div v-if="user" class="form">
      <section class="profile-card">
        <div class="avatar-block">
          <div class="avatar-wrap">
            <img
              v-if="previewUrl || user.avatarUrl"
              :src="previewUrl || user.avatarUrl!"
              alt="Avatar"
              class="avatar"
            />
            <div v-else class="avatar placeholder">{{ user.username?.[0]?.toUpperCase() || 'A' }}</div>
          </div>

          <div class="file-field">
            <span class="file-label">Avatar</span>
            <div class="file-row">
              <input
                ref="avatarInput"
                class="sr-only"
                type="file"
                accept="image/*"
                @change="onPick"
              />
              <button type="button" class="file-btn" @click="openFilePicker" :disabled="uploading">
                Choisir une image
              </button>
              <span class="filename" :class="{ empty: !filename }">{{ filename || 'Aucun fichier' }}</span>
              <button class="btn" :disabled="!file || uploading" @click="onUpload">
                {{ uploading ? 'Envoi…' : 'Uploader' }}
              </button>
            </div>
            <p class="hint">Formats acceptés: jpeg, jpg, png, gif, webp</p>
            <p v-if="error" class="error">{{ error }}</p>
          </div>
        </div>
      </section>

      <section class="info">
        <div class="info-row"><span class="muted">Pseudo</span><span>{{ user.username }}</span></div>
        <div class="info-row"><span class="muted">Email</span><span>{{ user.email }}</span></div>
        <div class="info-row"><span class="muted">Inscription</span><span>{{ new Date(user.createdAt).toLocaleString() }}</span></div>
      </section>

      <div class="actions">
        <NuxtLink class="link" to="/projects">Retour</NuxtLink>
        <button class="danger" @click="onLogout">Se déconnecter</button>
      </div>
    </div>

    <div v-else class="card">Non connecté</div>
  </div>
</template>

<style scoped>
.container { max-width: 720px; margin: 0 auto; display: grid; gap: 16px; }
.header h1 { margin: 0; }
.hint { color: #666; font-size: 12px; }

/* Form layout (align with project edit page) */
.form { display: grid; gap: 16px; }
.actions { display: flex; gap: 8px; align-items: center; }
.link { margin-left: auto; text-decoration: none; color: light-dark(#000, #fff); }
.danger { background: #d9534f; color: #fff; border: 1px solid #d9534f; padding: 6px 10px; border-radius: 6px; cursor: pointer; }
.btn:disabled { border: 1px solid #ddd; padding: 6px 10px; border-radius: 6px; background: #f9f9f9; color: #000; }
.btn:not(:disabled) { border: 1px solid light-dark(#000, #ddd); padding: 6px 10px; border-radius: 6px; background: light-dark(#42b5ce, #42b5ce); cursor: pointer; color: light-dark(#000, #fff); }
.error { color: #b00020; }

/* Avatar block */
.profile-card { border: 1px solid #eee; border-radius: 8px; padding: 16px; display: grid; gap: 16px; }
.avatar-block { display: grid; grid-template-columns: 96px 1fr; gap: 12px; align-items: center; }
.avatar { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; }
.avatar.placeholder { display:flex; align-items:center; justify-content:center; background:#f2f2f2; color:#888; font-weight:600; }

/* Custom file inputs (copied style from edit page) */
.file-field { display: grid; gap: 6px; }
.file-label { font-size: 14px; color: #bbb; }
.file-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.file-btn {
  padding: 10px 12px;
  border: 1px solid #cfcfcf;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: border-color .2s ease, box-shadow .2s ease, background-color .15s ease;
}
.file-btn:hover { border-color: #42b5ce; }
.file-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(107, 124, 255, 0.15); border-color: #42b5ce; }
.file-btn:disabled { opacity: .6; cursor: not-allowed; }
.filename { font-size: 13px; color: #ddd; }
.filename.empty { color: #777; font-style: italic; }

/* Visually hidden */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Info list */
.info { border: 1px solid #eee; border-radius: 8px; padding: 16px; display: grid; gap: 10px; }
.info-row { display: flex; justify-content: space-between; gap: 12px; }
.muted { color: #bbb; }
</style>
