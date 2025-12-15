<script setup lang="ts">
const email = ref('')
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const { register, error } = useSession()
const router = useRouter()
const { uploadAvatar, error: avatarError, uploading } = useAvatar()
const submitting = ref(false)

definePageMeta({
  name: 'register'
})

useSeoMeta({
  title: `VRC Remix - S'inscrire`,
  ogTitle: `S'inscrire`,
  ogImage: '/vrchat-remix.png',
  description: computed(() => `page d'inscription`),
  ogDescription: computed(() => `page d'inscription`),
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

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0] || null
  if (!f) return
  if (!/^image\/(jpeg|jpg|png|gif|webp)$/.test(f.type)) {
    alert('Format non supporté. Utilisez jpeg, jpg, png, gif ou webp.')
    input.value = ''
    return
  }
  file.value = f
}

async function onSubmit() {
  // simple client-side validation
  if (password.value !== confirmPassword.value) {
    alert('Les mots de passe ne correspondent pas.')
    return
  }
  submitting.value = true
  try {
    const ok = await register(email.value, username.value, password.value, file.value || undefined)
    if (ok) {
      // Avatar upload will be possible after login; keep local-only for now.
      await router.push({ path: '/verify/sent', query: { email: email.value } })
    }
  } finally {
    submitting.value = false
  }
}

function openFilePicker() {
  avatarInput.value?.click()
}
</script>

<template>
  <div class="container">
    <Head>
      <Title>Inscription</Title>
    </Head>

    <div class="header">
      <h1>Inscription</h1>
      <p class="hint">Créez votre compte pour commencer</p>
    </div>

    <form @submit.prevent="onSubmit" class="form" novalidate>
      <label class="float">
        <input
          v-model="email"
          type="email"
          placeholder=" "
          required
          autocomplete="email"
        />
        <span class="label-text">Email</span>
      </label>

      <label class="float">
        <input
          v-model="username"
          type="text"
          placeholder=" "
          required
          minlength="3"
          maxlength="32"
          autocomplete="username"
        />
        <span class="label-text">Pseudo</span>
      </label>

      <label class="float">
        <input
          v-model="password"
          type="password"
          placeholder=" "
          required
          minlength="8"
          autocomplete="new-password"
        />
        <span class="label-text">Mot de passe</span>
      </label>

      <label class="float">
        <input
          v-model="confirmPassword"
          type="password"
          placeholder=" "
          required
          minlength="8"
          autocomplete="new-password"
        />
        <span class="label-text">Confirmer le mot de passe</span>
      </label>

      <section class="avatar-field">
        <div class="file-field">
          <span class="file-label">Avatar (optionnel)</span>
          <div class="file-row">
            <input
              ref="avatarInput"
              class="sr-only"
              type="file"
              accept="image/*"
              @change="onPick"
            />
            <button type="button" class="file-btn" @click="openFilePicker" :disabled="uploading || submitting">
              Choisir une image
            </button>
            <span class="filename" :class="{ empty: !filename }">{{ filename || 'Aucun fichier' }}</span>
          </div>
          <div v-if="previewUrl" class="preview">
            <img :src="previewUrl" alt="Prévisualisation" />
          </div>
          <p class="hint">Formats acceptés: jpeg, jpg, png, gif, webp</p>
          <p v-if="avatarError" class="error">{{ avatarError }}</p>
        </div>
      </section>

      <div class="actions">
        <NuxtLink class="link" to="/login">J'ai déjà un compte</NuxtLink>
        <button type="submit" class="save-btn" :disabled="submitting">
          {{ submitting ? 'Création…' : 'Créer mon compte' }}
        </button>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.container { max-width: 480px; margin: 0 auto; display: grid; gap: 16px; }
.header h1 { margin: 0; }
.hint { color: #666; font-size: 12px; }

.form { display: grid; gap: 16px; }
.actions { display: flex; gap: 8px; align-items: center; }
.link { margin-right: auto; text-decoration: none; color: light-dark(#000, #fff); }
.error { color: #b00020; }

/* Floating label inputs */
.float { position: relative; display: block; }
.float input { width: 100%; padding: 14px 12px; border: 1px solid #cfcfcf; border-radius: 8px; background: transparent; outline: none; transition: border-color .2s ease, box-shadow .2s ease; }
.float input::placeholder { color: transparent; }
.float input:focus { border-color: #42b5ce; box-shadow: 0 0 0 3px rgba(107, 124, 255, 0.15); }
.float .label-text { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #777; background: light-dark(#fff, #0a0f18); padding: 0 6px; pointer-events: none; transition: top .2s ease, transform .2s ease, color .2s ease, font-size .2s ease; }
.float:focus-within .label-text,
.float input:not(:placeholder-shown) ~ .label-text { top: 0; transform: translateY(-50%) scale(0.92); color: #555; }

/* File field (match edit/profile) */
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
.preview img { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; }

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

/* Primary button style (save-btn) */
.save-btn { padding: 6px 10px; border: 1px solid transparent; border-radius: 6px; background: linear-gradient(180deg, #48c7e1 0%, #42b5ce 100%); color: #0a0f18; cursor: pointer; transition: transform .06s ease, filter .15s ease, box-shadow .2s ease; }
.save-btn:hover { filter: brightness(1.05); }
.save-btn:active { transform: translateY(1px); }
.save-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(107, 124, 255, 0.18), 0 6px 16px rgba(66, 181, 206, 0.25); }
.save-btn:disabled { opacity: .65; cursor: not-allowed; filter: none; box-shadow: none; }
</style>
