<script setup lang="ts">
import trackRoute, {type RouteMeta} from '~~/app/middlewares/track-route.global'
import FR from "@/assets/fr.png";
import US from "@/assets/us.png";

const {locale, setLocale} = useI18n()

const { user, logout, refresh, updateProfile, changePassword, error: sessionError } = useSession()
const { uploading, error, uploadAvatar } = useAvatar()
const router = useRouter()
const route = useRoute()

const meta = route.meta as RouteMeta;

onMounted(() => refresh())

definePageMeta({
  name: 'profile',
  middleware: [trackRoute]
})

useSeoMeta({
  title: () => `VRC Remix - ${user.value?.username}`,
  ogTitle: () => `Profile - ${user.value?.username}`,
  ogImage: '/vrchat-remix.png',
  description: () => `la page de profile de ${user.value?.username}`,
  ogDescription: () => `la page de profile de ${user.value?.username}`,
  twitterCard: 'app'
})

const file = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const avatarInput = ref<HTMLInputElement | null>(null)
const filename = computed(() => file.value?.name || '')

// Edition profil (email / pseudo)
const form = reactive({
  username: '',
  email: '',
})
const profileSaving = ref(false)
const profileMessage = ref<string | null>(null)
const profileError = ref<string | null>(null)

watch(user, (u) => {
  if (u) {
    form.username = u.username
    form.email = u.email
  }
}, { immediate: true })

async function onSaveProfile() {
  if (!user.value) return
  profileMessage.value = null
  profileError.value = null
  profileSaving.value = true
  try {
    const res = await updateProfile({ username: form.username, email: form.email })
    if (res?.requiresVerification) {
      profileMessage.value = 'Profil mis à jour. Veuillez vérifier votre nouvelle adresse e‑mail via le lien reçu.'
    } else {
      profileMessage.value = 'Profil mis à jour.'
    }
  } catch (e: any) {
    profileError.value = e?.statusMessage || sessionError.value || 'Erreur lors de la mise à jour du profil'
  } finally {
    profileSaving.value = false
  }
}

// Changement de mot de passe
const pwd = reactive({ current: '', next: '', confirm: '' })
const pwdSaving = ref(false)
const pwdMessage = ref<string | null>(null)
const pwdError = ref<string | null>(null)

async function onChangePassword() {
  pwdMessage.value = null
  pwdError.value = null
  if (!pwd.current || !pwd.next || !pwd.confirm) {
    pwdError.value = 'Veuillez remplir tous les champs.'
    return
  }
  if (pwd.next.length < 8) {
    pwdError.value = 'Le nouveau mot de passe doit faire au moins 8 caractères.'
    return
  }
  if (pwd.next !== pwd.confirm) {
    pwdError.value = 'La confirmation ne correspond pas.'
    return
  }
  pwdSaving.value = true
  const ok = await changePassword(pwd.current, pwd.next, pwd.confirm)
  pwdSaving.value = false
  if (ok) {
    pwdMessage.value = 'Mot de passe modifié avec succès.'
    pwd.current = ''
    pwd.next = ''
    pwd.confirm = ''
  } else {
    pwdError.value = sessionError.value || 'Impossible de changer le mot de passe.'
  }
}

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

function changeLocale(newLocale: 'fr'|'en') {
  // Ignore if already set
  if (locale.value === newLocale) return
  setLocale(newLocale)
}

const lang = computed({
  get: () => locale.value === 'en',
  set: (l: boolean) => changeLocale(l ? 'en' : 'fr')
})
</script>

<template>
  <Head>
    <Title>Profile - {{ user?.username }}</Title>
  </Head>

  <div class="container">
    <div class="header">
      <h1>{{ $t('profil.title') }}</h1>
      <p class="hint">{{ $t('profil.subtitle') }}</p>
    </div>

    <div v-if="user" class="form">
      <div class="actions">
        <NuxtLink class="link" :to="{
          name: meta.previousRoute?.name ?? `root___${locale}`,
          params: meta.previousRoute?.params ?? {},
          query: meta.previousRoute?.query ?? {}
        }">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
            <!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
            <path d="M201.4 297.4C188.9 309.9 188.9 330.2 201.4 342.7L361.4 502.7C373.9 515.2 394.2 515.2 406.7 502.7C419.2 490.2 419.2 469.9 406.7 457.4L269.3 320L406.6 182.6C419.1 170.1 419.1 149.8 406.6 137.3C394.1 124.8 373.8 124.8 361.3 137.3L201.3 297.3z"/>
          </svg> {{ $t('profil.header.back') }}
        </NuxtLink>
        <button class="danger" @click="onLogout">{{ $t('profil.header.disconnect') }}</button>
      </div>

      <div style="display: flex; flex-direction: row; justify-content: flex-start; align-items: center; gap: 15px">
        <span>
          {{ $t('profil.choose-language') }}
        </span>

        <UiSwitch
            v-model="lang"
            :label="{
            before: `<img src='${FR}' style='width: 30px; height: 30px;'>`,
            after: `<img src='${US}' style='width: 30px; height: 30px;'>`
        }"
        />
      </div>

      <section class="info">
        <div class="info-row">
          <span class="muted">{{ $t('profil.inscription') }}</span>
          <span>{{ new Date(user.createdAt).toLocaleString(locale) }}</span>
        </div>
      </section>

      <section class="profile-card">
        <div class="avatar-block">
          <div class="avatar-wrap">
            <img
              v-if="previewUrl || user.avatarUrl"
              :src="previewUrl || user.avatarUrl!"
              alt="Avatar"
              class="avatar"
            />
            <div v-else class="avatar placeholder">
              {{ user.username?.[0]?.toUpperCase() || 'A' }}
            </div>
          </div>

          <div class="file-field">
            <span class="file-label">{{ $t('profil.avatar') }}</span>
            <div class="file-row">
              <input
                ref="avatarInput"
                class="sr-only"
                type="file"
                accept="image/*"
                @change="onPick"
              />
              <button type="button" class="file-btn" @click="openFilePicker" :disabled="uploading">
                {{ $t('profil.choose-image') }}
              </button>
              <span class="filename" :class="{ empty: !filename }">{{ filename || 'Aucun fichier' }}</span>
              <button class="btn" :disabled="!file || uploading" @click="onUpload">
                {{ uploading ? 'Envoi…' : $t('profil.upload') }}
              </button>
            </div>
            <p class="hint">{{ $t('profil.formats') }}: jpeg, jpg, png, gif, webp</p>
            <p v-if="error" class="error">{{ error }}</p>
          </div>
        </div>
      </section>

      <section class="profile-edit">
        <h2>{{ $t('profil.profil-informations') }}</h2>
        <div class="btn" style="text-align: center; border-color: darkorange; background-color: transparent; cursor: default;">
          ⚠️ {{ $t('profil.alert') }} ⚠️
        </div>
        <div class="grid">
          <label class="field">
            <span class="label">{{ $t('profil.pseudo') }}</span>
            <input v-model="form.username" type="text" class="input" :placeholder="$t('profil.placeholders.pseudo')" />
          </label>
          <label class="field">
            <span class="label">{{ $t('profil.email') }}</span>
            <input v-model="form.email" type="email" class="input" :placeholder="$t('profil.placeholders.email')" />
          </label>
        </div>
        <div class="row">
          <button class="btn" :disabled="profileSaving" @click="onSaveProfile">
            {{ profileSaving ? 'Enregistrement…' : $t('profil.save') }}
          </button>
          <span class="status ok" v-if="profileMessage">{{ profileMessage }}</span>
          <span class="status err" v-if="profileError">{{ profileError }}</span>
        </div>
      </section>

      <section class="password-edit">
        <h2>{{ $t('profil.change-password') }}</h2>
        <div class="grid full">
          <label class="field">
            <span class="label">{{ $t('profil.current-password') }}</span>
            <input v-model="pwd.current" type="password" class="input" :placeholder="$t('profil.placeholders.current-password')" />
          </label>
        </div>
        <div class="grid">
          <label class="field">
            <span class="label">{{ $t('profil.new-password') }}</span>
            <input v-model="pwd.next" type="password" class="input" :placeholder="$t('profil.placeholders.new-password')" />
          </label>
          <label class="field">
            <span class="label">{{ $t('profil.confirm-new-password') }}</span>
            <input v-model="pwd.confirm" type="password" class="input" :placeholder="$t('profil.placeholders.confirm-new-password')" />
          </label>
        </div>
        <div class="row">
          <button class="btn" :disabled="pwdSaving" @click="onChangePassword">
            {{ pwdSaving ? 'Changement…' : $t('profil.change-password') }}
          </button>
          <span class="status ok" v-if="pwdMessage">{{ pwdMessage }}</span>
          <span class="status err" v-if="pwdError">{{ pwdError }}</span>
        </div>
      </section>

      <div class="actions" style="margin-bottom: 20px;">
        <NuxtLink class="link" :to="{
          name: meta.previousRoute?.name ?? `root___${locale}`,
          params: meta.previousRoute?.params ?? {},
          query: meta.previousRoute?.query ?? {}
        }">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
            <!--!Font Awesome Free v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
            <path d="M201.4 297.4C188.9 309.9 188.9 330.2 201.4 342.7L361.4 502.7C373.9 515.2 394.2 515.2 406.7 502.7C419.2 490.2 419.2 469.9 406.7 457.4L269.3 320L406.6 182.6C419.1 170.1 419.1 149.8 406.6 137.3C394.1 124.8 373.8 124.8 361.3 137.3L201.3 297.3z"/>
          </svg> {{ $t('profil.header.back') }}
        </NuxtLink>
        <button class="danger" @click="onLogout">{{ $t('profil.header.disconnect') }}</button>
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
.actions { display: flex; gap: 10px; align-items: center; justify-content: space-between; }
.link { text-decoration: none; color: light-dark(#000, #fff); display: inline-flex; align-items: center; gap: 6px; }
svg > path { fill: light-dark(#000, #fff); }
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

/* Profile edit */
.profile-edit, .password-edit { border: 1px solid #eee; border-radius: 8px; padding: 16px; display: grid; gap: 12px; }
.profile-edit h2, .password-edit h2 { margin: 0 0 8px 0; font-size: 16px; }
.grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
.grid.full { display: flex; > label { flex: 1; } }
@media (min-width: 640px) {
  .grid { grid-template-columns: 1fr 1fr; }
}
.field { display: grid; gap: 6px; }
.label { font-size: 13px; color: #999; }
.input { padding: 10px 12px; border: 1px solid #cfcfcf; border-radius: 8px; background: transparent; color: inherit; }
.row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.status.ok { color: #2e7d32; }
.status.err { color: #b00020; }
</style>
