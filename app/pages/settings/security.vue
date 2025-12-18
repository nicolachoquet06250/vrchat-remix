<script setup lang="ts">
const status = ref<{ enabled: boolean } | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const password = ref('')
const submitting = ref(false)

definePageMeta({
  name: 'settings-security'
})

useSeoMeta({
  ogTitle: 'VRC Remix - Sécurité du compte',
  description: 'Paramètres de sécurité du compte',
})

onMounted(async () => {
  await refreshStatus()
})

async function refreshStatus() {
  loading.value = true
  error.value = null
  try {
    status.value = await $fetch('/api/auth/2fa-status')
  } catch (e: any) {
    error.value = e.statusMessage || 'Impossible de charger le statut 2FA'
  } finally {
    loading.value = false
  }
}

async function enable2fa() {
  if (!password.value) return
  submitting.value = true
  error.value = null
  try {
    await $fetch('/api/auth/2fa-enable', { method: 'post', body: { password: password.value } })
    password.value = ''
    await refreshStatus()
  } catch (e: any) {
    error.value = e.statusMessage || 'Échec de l\'activation 2FA'
  } finally {
    submitting.value = false
  }
}

async function disable2fa() {
  if (!password.value) return
  submitting.value = true
  error.value = null
  try {
    await $fetch('/api/auth/2fa-disable', { method: 'post', body: { password: password.value } })
    password.value = ''
    await refreshStatus()
  } catch (e: any) {
    error.value = e.statusMessage || 'Échec de la désactivation 2FA'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>Sécurité du compte</h1>
      <p class="hint">Activez la double authentification par e‑mail pour sécuriser vos connexions.</p>
    </div>

    <div v-if="loading">Chargement…</div>
    <div v-else>
      <div class="card">
        <div class="row">
          <div>
            <h3>Double authentification (2FA)</h3>
            <p class="hint">Statut: <strong>{{ status?.enabled ? 'activée' : 'désactivée' }}</strong></p>
          </div>
        </div>

        <label class="float" style="max-width: 360px;">
          <input v-model="password" type="password" placeholder=" " minlength="8" autocomplete="current-password" />
          <span class="label-text">Mot de passe (requis pour modifier le 2FA)</span>
        </label>

        <div class="actions">
          <button v-if="!status?.enabled" class="save-btn" :disabled="submitting || !password" @click="enable2fa">
            {{ submitting ? 'Activation…' : 'Activer le 2FA' }}
          </button>
          <button v-else class="danger-btn" :disabled="submitting || !password" @click="disable2fa">
            {{ submitting ? 'Désactivation…' : 'Désactiver le 2FA' }}
          </button>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container { max-width: 720px; margin: 0 auto; display: grid; gap: 16px; }
.header h1 { margin: 0; }
.hint { color: #666; font-size: 12px; }
.card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; display: grid; gap: 16px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.actions { display: flex; gap: 8px; }
.error { color: #b00020; }

.float { position: relative; display: block; }
.float input { width: 100%; padding: 14px 12px; border: 1px solid #cfcfcf; border-radius: 8px; background: transparent; outline: none; transition: border-color .2s ease, box-shadow .2s ease; }
.float input::placeholder { color: transparent; }
.float input:focus { border-color: #42b5ce; box-shadow: 0 0 0 3px rgba(107, 124, 255, 0.15); }
.float .label-text { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #777; background: light-dark(#fff, #0a0f18); padding: 0 6px; pointer-events: none; transition: top .2s ease, transform .2s ease, color .2s ease, font-size .2s ease; }
.float:focus-within .label-text,
.float input:not(:placeholder-shown) ~ .label-text { top: 0; transform: translateY(-50%) scale(0.92); color: #555; }

.save-btn { padding: 6px 10px; border: 1px solid transparent; border-radius: 6px; background: linear-gradient(180deg, #48c7e1 0%, #42b5ce 100%); color: #0a0f18; cursor: pointer; }
.danger-btn { padding: 6px 10px; border: 1px solid #e5b0b0; border-radius: 6px; background: #f9e6e6; color: #6d1a1a; cursor: pointer; }
</style>
