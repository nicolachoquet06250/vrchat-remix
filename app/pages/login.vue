<script setup lang="ts">
const { login, error, user, refresh } = useSession()
const router = useRouter()
const route = useRoute()
const {locale} = useI18n()

const emailOrUsername = ref('')
const password = ref('')
const submitting = ref(false)
const resending = ref(false)
const twoFaChallengeId = ref<string | null>(null)
const twoFaCode = ref('')
const verifying = ref(false)
const activeTab = ref<'password' | 'webauthn'>('password')

const isDev = import.meta.env.VITE_NODE_ENV === 'development'

onMounted(() => {
  if (isDev) {
    if (localStorage.getItem('webauthn_registered') === 'true') {
      activeTab.value = 'webauthn'
    }
  }
})

definePageMeta({
  name: 'login'
})

useSeoMeta({
  ogTitle: 'VRC Remix - Se connecter',
  ogImage: '/vrchat-remix.png',
  description: 'se connecter',
  ogDescription: 'se connecter',
  twitterCard: 'app'
})

async function onSubmit() {
  submitting.value = true
  try {
    const res: any = await login(emailOrUsername.value, password.value)
    if (res && res.twoFactorRequired && res.challengeId) {
      twoFaChallengeId.value = res.challengeId
      // afficher le step 2FA
      return
    }
    if (res && res.success) {
      if (route.query.next) {
        await router.push(route.query.next as string);
        return;
      }
      await router.push('/projects');
    }
  } finally {
    submitting.value = false
  }
}

async function onResend() {
  if (!emailOrUsername.value || resending.value) return
  resending.value = true
  try {
    await $fetch('/api/auth/resend', { method: 'post', body: { emailOrUsername: emailOrUsername.value } })
    // Provide a gentle confirmation in-place
    error.value = 'Un e‑mail de vérification a été renvoyé (si un compte non vérifié existe).'
  } catch {
    // swallow to avoid user enumeration
    error.value = 'Un e‑mail de vérification a été renvoyé (si un compte non vérifié existe).'
  } finally {
    resending.value = false
  }
}

async function onVerify2fa() {
  if (!twoFaChallengeId.value) return
  verifying.value = true
  error.value = null
  try {
    await $fetch('/api/auth/2fa-verify', {
      method: 'post',
      body: { challengeId: twoFaChallengeId.value, code: twoFaCode.value }
    })
    await refresh()
    if (route.query.next) {
      await router.push(route.query.next as string)
      return
    }
    await router.push('/projects')
  } catch (e: any) {
    error.value = e.statusMessage || 'Code invalide'
  } finally {
    verifying.value = false
  }
}

import { startAuthentication } from '@simplewebauthn/browser'
async function onResend2fa() {
  if (!twoFaChallengeId.value || resending.value) return
  resending.value = true
  try {
    await $fetch('/api/auth/2fa-resend', { method: 'post', body: { challengeId: twoFaChallengeId.value } })
  } catch {}
  finally { resending.value = false }
}

// WebAuthn
const webauthnLoading = ref(false)

async function onWebAuthnLogin() {
  if (!emailOrUsername.value) {
    error.value = "Veuillez saisir votre identifiant pour utiliser l'empreinte"
    return
  }
  webauthnLoading.value = true
  error.value = null
  try {
    const options = await $fetch('/api/auth/webauthn/login-options', {
      query: { username: emailOrUsername.value }
    })
    const assertion = await startAuthentication(options as any)
    await $fetch('/api/auth/webauthn/login-verify', {
      method: 'post',
      body: assertion
    })
    localStorage.setItem('webauthn_registered', 'true')
    await refresh()
    if (route.query.next) {
      await router.push(route.query.next as string)
      return
    }
    await router.push('/projects')
  } catch (e: any) {
    error.value = e.statusMessage || "Erreur lors de la connexion par empreinte"
  } finally {
    webauthnLoading.value = false
  }
}
</script>

<template>
  <Head>
    <Title>VRC Remix - {{ $t('login.tab.title') }}</Title>
  </Head>

  <div class="container">
    <div class="header">
      <h1>{{ $t('login.title') }}</h1>
      <p class="hint">{{ $t('login.subtitle') }}</p>
    </div>

    <form @submit.prevent="onSubmit"
          class="form"
          novalidate
          v-if="!twoFaChallengeId && activeTab === 'password'"
    >
      <label class="float">
        <input
            v-model="emailOrUsername"
            type="text"
            placeholder=" "
            required
            minlength="3"
            autocomplete="username"
        />
        <span class="label-text">{{ $t('login.ident') }}</span>
      </label>

      <label class="float">
        <input
            v-model="password"
            type="password"
            placeholder=" "
            required
            minlength="8"
            autocomplete="current-password"
        />
        <span class="label-text">{{ $t('login.password') }}</span>
      </label>

      <div>
        <NuxtLink class="link" :to="{name: `forgot-password___${locale}`}">{{ $t('login.forgot-password') }}</NuxtLink>
      </div>

      <div class="actions">
        <NuxtLink class="link" :to="{name: `register___${locale}`}">{{ $t('login.create-account') }}</NuxtLink>
        <button type="submit" class="save-btn" :disabled="submitting || webauthnLoading">
          {{ submitting ? `${$t('login.title')}…` : $t('login.tab.title') }}
        </button>
      </div>

      <div v-if="error" class="error">
        <p>{{ error }}</p>
        <button
            v-if="/vérifier votre e‑mail/i.test(error || '')"
            type="button"
            class="save-btn"
            style="margin-top:8px"
            :disabled="resending"
            @click="onResend"
        >{{ resending ? $t('login.resend') : $t('login.resend-email') }}</button>
      </div>
    </form>

    <template v-if="isDev">
      <div class="form" v-if="!twoFaChallengeId && activeTab === 'webauthn'">
        <label class="float">
          <input
              v-model="emailOrUsername"
              type="text"
              placeholder=" "
              required
              minlength="3"
              autocomplete="username"
          />
          <span class="label-text">{{ $t('login.ident') }}</span>
        </label>

        <div class="actions">
          <NuxtLink class="link" :to="{name: `register___${locale}`}">{{ $t('login.create-account') }}</NuxtLink>
          <button type="button" class="save-btn" @click="onWebAuthnLogin" :disabled="webauthnLoading || submitting" style="display: flex; align-items: center; gap: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
              <path style="fill: #000" d="M112 320C112 205.1 205.1 112 320 112C383.1 112 439.6 140.1 477.8 184.5C486.4 194.6 501.6 195.7 511.6 187.1C521.6 178.5 522.8 163.3 514.2 153.3C467.3 98.6 397.7 64 320 64C178.6 64 64 178.6 64 320L64 360C64 373.3 74.7 384 88 384C101.3 384 112 373.3 112 360L112 320zM570.5 267.1C567.8 254.1 555 245.8 542.1 248.6C529.2 251.4 520.8 264.1 523.6 277C526.5 290.9 528.1 305.3 528.1 320.1L528.1 360.1C528.1 373.4 538.8 384.1 552.1 384.1C565.4 384.1 576.1 373.4 576.1 360.1L576.1 320.1C576.1 302 574.2 284.3 570.6 267.2zM320 144C301 144 282.6 147 265.5 152.6C250.3 157.6 246.8 176.3 257.2 188.5C264.3 196.8 276 199.3 286.6 196.4C297.2 193.5 308.4 192 320 192C390.7 192 448 249.3 448 320L448 344.9C448 370.1 446.5 395.2 443.6 420.2C441.9 434.8 453 448 467.8 448C479.6 448 489.7 439.4 491.1 427.7C494.4 400.3 496.1 372.7 496.1 345L496.1 320.1C496.1 222.9 417.3 144.1 320.1 144.1zM214.7 212.7C205.6 202.1 189.4 201.3 180.8 212.3C157.7 242.1 144 279.4 144 320L144 344.9C144 369.1 141.4 393.3 136.2 416.8C132.8 432.4 144.1 447.9 160.1 447.9C170.6 447.9 180 440.9 182.3 430.6C188.7 402.5 192 373.8 192 344.8L192 319.9C192 292.7 200.5 267.5 214.9 246.8C222.1 236.4 222.9 222.2 214.7 212.6zM320 224C267 224 224 267 224 320L224 344.9C224 380.8 219.4 416.4 210.2 451C206.4 465.3 216.9 480 231.7 480C241.2 480 249.6 473.8 252.1 464.6C262.6 425.6 268 385.4 268 344.9L268 320C268 291.3 291.3 268 320 268C348.7 268 372 291.3 372 320L372 344.9C372 381.2 368.5 417.3 361.6 452.8C358.9 466.7 369.3 480 383.4 480C393.6 480 402.4 473 404.4 463C412.1 424.2 416 384.7 416 344.9L416 320C416 267 373 224 320 224zM344 320C344 306.7 333.3 296 320 296C306.7 296 296 306.7 296 320L296 344.9C296 404.8 285 464.2 263.5 520.1L257.6 535.4C252.8 547.8 259 561.7 271.4 566.4C283.8 571.1 297.7 565 302.4 552.6L308.3 537.3C331.9 475.9 344 410.7 344 344.9L344 320z"/>
            </svg>
            {{ webauthnLoading ? 'Connexion…' : $t('profil.webauthn.login') }}
          </button>
        </div>

        <div v-if="error" class="error">
          <p>{{ error }}</p>
        </div>
      </div>

      <div class="tabs" v-if="!twoFaChallengeId">
        <button
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === 'password' }"
            @click="activeTab = 'password'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
            <path style="fill: light-dark(#000, #fff)" d="M400 416C497.2 416 576 337.2 576 240C576 142.8 497.2 64 400 64C302.8 64 224 142.8 224 240C224 258.7 226.9 276.8 232.3 293.7L71 455C66.5 459.5 64 465.6 64 472L64 552C64 565.3 74.7 576 88 576L168 576C181.3 576 192 565.3 192 552L192 512L232 512C245.3 512 256 501.3 256 488L256 448L296 448C302.4 448 308.5 445.5 313 441L346.3 407.7C363.2 413.1 381.3 416 400 416zM440 160C462.1 160 480 177.9 480 200C480 222.1 462.1 240 440 240C417.9 240 400 222.1 400 200C400 177.9 417.9 160 440 160z"/>
          </svg>
          <!--        {{ $t('login.tabs.password') }}-->
        </button>
        <button
            type="button"
            class="tab-btn"
            :class="{ active: activeTab === 'webauthn' }"
            @click="activeTab = 'webauthn'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
            <path style="fill: light-dark(#000, #fff)" d="M112 320C112 205.1 205.1 112 320 112C383.1 112 439.6 140.1 477.8 184.5C486.4 194.6 501.6 195.7 511.6 187.1C521.6 178.5 522.8 163.3 514.2 153.3C467.3 98.6 397.7 64 320 64C178.6 64 64 178.6 64 320L64 360C64 373.3 74.7 384 88 384C101.3 384 112 373.3 112 360L112 320zM570.5 267.1C567.8 254.1 555 245.8 542.1 248.6C529.2 251.4 520.8 264.1 523.6 277C526.5 290.9 528.1 305.3 528.1 320.1L528.1 360.1C528.1 373.4 538.8 384.1 552.1 384.1C565.4 384.1 576.1 373.4 576.1 360.1L576.1 320.1C576.1 302 574.2 284.3 570.6 267.2zM320 144C301 144 282.6 147 265.5 152.6C250.3 157.6 246.8 176.3 257.2 188.5C264.3 196.8 276 199.3 286.6 196.4C297.2 193.5 308.4 192 320 192C390.7 192 448 249.3 448 320L448 344.9C448 370.1 446.5 395.2 443.6 420.2C441.9 434.8 453 448 467.8 448C479.6 448 489.7 439.4 491.1 427.7C494.4 400.3 496.1 372.7 496.1 345L496.1 320.1C496.1 222.9 417.3 144.1 320.1 144.1zM214.7 212.7C205.6 202.1 189.4 201.3 180.8 212.3C157.7 242.1 144 279.4 144 320L144 344.9C144 369.1 141.4 393.3 136.2 416.8C132.8 432.4 144.1 447.9 160.1 447.9C170.6 447.9 180 440.9 182.3 430.6C188.7 402.5 192 373.8 192 344.8L192 319.9C192 292.7 200.5 267.5 214.9 246.8C222.1 236.4 222.9 222.2 214.7 212.6zM320 224C267 224 224 267 224 320L224 344.9C224 380.8 219.4 416.4 210.2 451C206.4 465.3 216.9 480 231.7 480C241.2 480 249.6 473.8 252.1 464.6C262.6 425.6 268 385.4 268 344.9L268 320C268 291.3 291.3 268 320 268C348.7 268 372 291.3 372 320L372 344.9C372 381.2 368.5 417.3 361.6 452.8C358.9 466.7 369.3 480 383.4 480C393.6 480 402.4 473 404.4 463C412.1 424.2 416 384.7 416 344.9L416 320C416 267 373 224 320 224zM344 320C344 306.7 333.3 296 320 296C306.7 296 296 306.7 296 320L296 344.9C296 404.8 285 464.2 263.5 520.1L257.6 535.4C252.8 547.8 259 561.7 271.4 566.4C283.8 571.1 297.7 565 302.4 552.6L308.3 537.3C331.9 475.9 344 410.7 344 344.9L344 320z"/>
          </svg>
          <!--        {{ $t('login.tabs.webauthn') }}-->
        </button>
      </div>
    </template>

    <form v-if="twoFaChallengeId" class="form" @submit.prevent="onVerify2fa">
      <p>Un code à 6 chiffres vous a été envoyé par e‑mail. Saisissez-le ci‑dessous pour terminer la connexion.</p>
      <label class="float">
        <input v-model="twoFaCode" type="text" inputmode="numeric" pattern="\d{6}" placeholder=" " required minlength="6" maxlength="6" autocomplete="one-time-code" />
        <span class="label-text">Code 2FA</span>
      </label>
      <div class="actions">
        <button type="button" class="link" @click="twoFaChallengeId = null">Retour</button>
        <div style="margin-left:auto; display:flex; gap:8px; align-items:center;">
          <button type="button" class="link" :disabled="resending" @click="onResend2fa">Renvoyer le code</button>
          <button type="submit" class="save-btn" :disabled="verifying || twoFaCode.length !== 6">{{ verifying ? 'Vérification…' : 'Vérifier' }}</button>
        </div>
      </div>
      <div v-if="error" class="error"><p>{{ error }}</p></div>
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

.tabs {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.tab-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  color: #777;
  transition: all .2s ease;
}
.tab-btn.active {
  color: #42b5ce;
  border-bottom-color: #42b5ce;
}

/* Floating label inputs (aligned with edit page) */
.float { position: relative; display: block; }
.float input { width: 100%; padding: 14px 12px; border: 1px solid #cfcfcf; border-radius: 8px; background: transparent; outline: none; transition: border-color .2s ease, box-shadow .2s ease; }
.float input::placeholder { color: transparent; }
.float input:focus { border-color: #42b5ce; box-shadow: 0 0 0 3px rgba(107, 124, 255, 0.15); }
.float .label-text { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #777; background: light-dark(#fff, #0a0f18); padding: 0 6px; pointer-events: none; transition: top .2s ease, transform .2s ease, color .2s ease, font-size .2s ease; }
.float:focus-within .label-text,
.float input:not(:placeholder-shown) ~ .label-text { top: 0; transform: translateY(-50%) scale(0.92); color: #555; }

/* Primary button style (save-btn) */
.save-btn { padding: 6px 10px; border: 1px solid transparent; border-radius: 6px; background: linear-gradient(180deg, #48c7e1 0%, #42b5ce 100%); color: #0a0f18; cursor: pointer; transition: transform .06s ease, filter .15s ease, box-shadow .2s ease; }
.save-btn:hover { filter: brightness(1.05); }
.save-btn:active { transform: translateY(1px); }
.save-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(107, 124, 255, 0.18), 0 6px 16px rgba(66, 181, 206, 0.25); }
.save-btn:disabled { opacity: .65; cursor: not-allowed; filter: none; box-shadow: none; }

</style>
