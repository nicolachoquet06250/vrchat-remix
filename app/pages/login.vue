<script setup lang="ts">
const { login, error, user } = useSession()
const router = useRouter()
const route = useRoute()
const {locale} = useI18n()

const emailOrUsername = ref('')
const password = ref('')
const submitting = ref(false)
const resending = ref(false)

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
    const ok = await login(emailOrUsername.value, password.value)
    if (ok) {
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
</script>

<template>
  <Head>
    <Title>{{ $t('login.tab.title') }}</Title>
  </Head>

  <div class="container">
    <div class="header">
      <h1>{{ $t('login.title') }}</h1>
      <p class="hint">{{ $t('login.subtitle') }}</p>
    </div>

    <form @submit.prevent="onSubmit" class="form" novalidate>
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
        <button type="submit" class="save-btn" :disabled="submitting">
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
