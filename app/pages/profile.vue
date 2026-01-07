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

const isDev = import.meta.env.VITE_NODE_ENV === 'development'

onMounted(refresh)

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

// Logique 2FA
const tfaStatus = ref<{ enabled: boolean } | null>(null)
const tfaLoading = ref(true)
const tfaError = ref<string | null>(null)
const tfaPassword = ref('')
const tfaSubmitting = ref(false)

async function refresh2faStatus() {
  tfaLoading.value = true
  tfaError.value = null
  try {
    tfaStatus.value = await $fetch('/api/auth/2fa-status')
  } catch (e: any) {
    tfaError.value = e.statusMessage || 'Impossible de charger le statut 2FA'
  } finally {
    tfaLoading.value = false
  }
}

onMounted(async () => {
  await refresh()
  await refresh2faStatus()
})

import { startRegistration } from '@simplewebauthn/browser'
const tfaEnabled = computed({
  get: () => !!tfaStatus.value?.enabled,
  set: async (value: boolean) => {
    if (value) await enable2fa()
    else await disable2fa()
  }
})

async function enable2fa() {
  if (!tfaPassword.value) {
    tfaError.value = 'Mot de passe requis pour activer le 2FA'
    tfaStatus.value = { enabled: false }
    return
  }
  tfaSubmitting.value = true
  tfaError.value = null
  try {
    await $fetch('/api/auth/2fa-enable', { method: 'post', body: { password: tfaPassword.value } })
    tfaPassword.value = ''
    await refresh2faStatus()
  } catch (e: any) {
    tfaError.value = e.statusMessage || 'Échec de l\'activation 2FA'
    tfaStatus.value = { enabled: false }
  } finally {
    tfaSubmitting.value = false
  }
}

async function disable2fa() {
  if (!tfaPassword.value) {
    tfaError.value = 'Mot de passe requis pour désactiver le 2FA'
    tfaStatus.value = { enabled: true }
    return
  }
  tfaSubmitting.value = true
  tfaError.value = null
  try {
    await $fetch('/api/auth/2fa-disable', { method: 'post', body: { password: tfaPassword.value } })
    tfaPassword.value = ''
    await refresh2faStatus()
  } catch (e: any) {
    tfaError.value = e.statusMessage || 'Échec de la désactivation 2FA'
    tfaStatus.value = { enabled: true }
  } finally {
    tfaSubmitting.value = false
  }
}

// WebAuthn
const webauthnLoading = ref(false)
const webauthnError = ref<string | null>(null)
const webauthnSuccess = ref<string | null>(null)

async function onRegisterFingerprint() {
  webauthnLoading.value = true
  webauthnError.value = null
  webauthnSuccess.value = null
  try {
    const options = await $fetch('/api/auth/webauthn/register-options')
    const attestation = await startRegistration(options as any)
    await $fetch('/api/auth/webauthn/register-verify', {
      method: 'post',
      body: attestation
    })
    localStorage.setItem('webauthn_registered', 'true')
    webauthnSuccess.value = 'Empreinte enregistrée avec succès !'
  } catch (e: any) {
    webauthnError.value = e.statusMessage || 'Erreur lors de l\'enregistrement de l\'empreinte'
  } finally {
    webauthnLoading.value = false
  }
}
</script>

<template>
  <Head>
    <Title>VRC Remix - Profile - {{ user?.username }}</Title>
  </Head>

  <div class="container">
    <div class="header">
      <h1>{{ $t('profil.title') }}</h1>
      <p class="hint">{{ $t('profil.subtitle') }}</p>
    </div>

    <div v-if="user" class="form">
      <div class="actions">
        <NuxtLink v-if="user?.role === 'creator'" class="link" :to="{ name: `admin-users___${locale}` }">
          <!-- simple shield icon -->
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
            <path d="M320 32C320 32 256 96 128 96L128 320C128 437.3 206.5 540.6 320 573.3C433.5 540.6 512 437.3 512 320L512 96C384 96 320 32 320 32z"/>
          </svg>
          {{ $t('admin.users.title') }}
        </NuxtLink>

        <NuxtLink :to="{name: `analytics___${locale}`}" class="link">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
            <path d="M96 96C113.7 96 128 110.3 128 128L128 464C128 472.8 135.2 480 144 480L544 480C561.7 480 576 494.3 576 512C576 529.7 561.7 544 544 544L144 544C99.8 544 64 508.2 64 464L64 128C64 110.3 78.3 96 96 96zM208 288C225.7 288 240 302.3 240 320L240 384C240 401.7 225.7 416 208 416C190.3 416 176 401.7 176 384L176 320C176 302.3 190.3 288 208 288zM352 224L352 384C352 401.7 337.7 416 320 416C302.3 416 288 401.7 288 384L288 224C288 206.3 302.3 192 320 192C337.7 192 352 206.3 352 224zM432 256C449.7 256 464 270.3 464 288L464 384C464 401.7 449.7 416 432 416C414.3 416 400 401.7 400 384L400 288C400 270.3 414.3 256 432 256zM576 160L576 384C576 401.7 561.7 416 544 416C526.3 416 512 401.7 512 384L512 160C512 142.3 526.3 128 544 128C561.7 128 576 142.3 576 160z"/>
          </svg>
          {{ $t('analytics.title') }}
        </NuxtLink>

        <NuxtLink v-if="user?.role === 'creator'" :to="{name: `admin-analytics___${locale}`}" class="link">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
            <path d="M160 80V48c0-26.5 21.5-48 48-48h224c26.5 0 48 21.5 48 48v32h48c26.5 0 48 21.5 48 48v448c0 26.5-21.5 48-48 48H112c-26.5 0-48-21.5-48-48V128c0-26.5 21.5-48 48-48h48zM128 200v32c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24v-32c0-13.3-10.7-24-24-24H152c-13.3 0-24 10.7-24 24zm128-72h128V48H256v80zM192 512h256c17.7 0 32-14.3 32-32s-14.3-32-32-32H192c-17.7 0-32 14.3-32 32s14.3 32 32 32zm0-128h256c17.7 0 32-14.3 32-32s-14.3-32-32-32H192c-17.7 0-32 14.3-32 32s14.3 32 32 32z"/>
          </svg>
          {{ $t('admin.analytics.title') }}
        </NuxtLink>
      </div>
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
            before: `<img src='${FR}' style='width: 30px; height: 30px;' alt='France'>`,
            after: `<img src='${US}' style='width: 30px; height: 30px;' alt='United-States'>`
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

      <section class="security-settings">
        <h2>{{ $t('profil.two-factor') }}</h2>
        <p class="hint">{{ $t('profil.two-factor-hint') }}</p>

        <div v-if="tfaLoading">{{ $t('loading') }}</div>
        <div v-else class="tfa-controls">
          <div class="row">
            <UiSwitch v-model="tfaEnabled" :disabled="tfaSubmitting" />
            <span :class="{ 'status ok': tfaStatus?.enabled, 'status muted': !tfaStatus?.enabled }">
              {{ tfaStatus?.enabled ? 'Activé' : 'Désactivé' }}
            </span>
          </div>

          <label class="field" style="margin-top: 10px;">
            <span class="label">{{ $t('profil.two-factor-password') }}</span>
            <input v-model="tfaPassword" type="password" class="input" :placeholder="$t('profil.placeholders.current-password')" autocomplete="current-password" />
          </label>

          <div class="row" v-if="tfaError">
            <span class="status err">{{ tfaError }}</span>
          </div>
        </div>
      </section>

      <section class="security-settings" v-if="isDev">
        <h2>{{ $t('profil.webauthn.title') }}</h2>
        <p class="hint">{{ $t('profil.webauthn.hint') }}</p>

        <div class="row">
          <button class="btn" :disabled="webauthnLoading" @click="onRegisterFingerprint">
            {{ webauthnLoading ? 'Chargement…' : $t('profil.webauthn.register') }}
          </button>
        </div>

        <div class="row" v-if="webauthnError">
          <span class="status err">{{ webauthnError }}</span>
        </div>
        <div class="row" v-if="webauthnSuccess">
          <span class="status ok">{{ webauthnSuccess }}</span>
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
.status.muted { color: #888; }

.security-settings { border: 1px solid #eee; border-radius: 8px; padding: 16px; display: grid; gap: 12px; }
.security-settings h2 { margin: 0 0 4px 0; font-size: 16px; }
.tfa-controls { display: grid; gap: 12px; }
</style>
