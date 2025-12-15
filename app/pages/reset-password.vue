<script setup lang="ts">
definePageMeta({ name: 'reset-password' })

useSeoMeta({
  title: 'VRC Remix - Réinitialiser le mot de passe',
  description: 'Définissez un nouveau mot de passe pour votre compte',
})

const route = useRoute()
const router = useRouter()

const token = computed(() => String(route.query.token || ''))
const valid = ref<boolean|null>(null)
const loading = ref(false)
const errorMsg = ref<string|undefined>()

const password = ref('')
const password2 = ref('')
const pending = ref(false)
const done = ref(false)

onMounted(async () => {
  if (!token.value) {
    errorMsg.value = 'Lien invalide'
    valid.value = false
    return
  }
  loading.value = true
  try {
    await $fetch('/api/auth/reset', { method: 'GET', query: { token: token.value } })
    valid.value = true
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'Lien invalide ou expiré'
    valid.value = false
  } finally {
    loading.value = false
  }
})

async function submit() {
  errorMsg.value = undefined
  if (password.value.length < 8) {
    errorMsg.value = 'Le mot de passe doit contenir au moins 8 caractères'
    return
  }
  if (password.value !== password2.value) {
    errorMsg.value = 'Les mots de passe ne correspondent pas'
    return
  }
  pending.value = true
  try {
    await $fetch('/api/auth/reset', { method: 'POST', body: { token: token.value, password: password.value } })
    done.value = true
    // Option: rediriger vers login après quelques secondes
    setTimeout(() => router.replace('/'), 3000)
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'Impossible de changer le mot de passe'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="container">
    <h1>Réinitialiser le mot de passe</h1>

    <div v-if="loading">Vérification du lien…</div>

    <div v-else-if="valid === false" class="error">
      {{ errorMsg || 'Lien invalide ou expiré' }}
    </div>

    <form v-else-if="valid && !done" @submit.prevent="submit" class="form">
      <label for="pwd">Nouveau mot de passe</label>
      <input id="pwd" v-model="password" type="password" required minlength="8" />

      <label for="pwd2">Confirmer le mot de passe</label>
      <input id="pwd2" v-model="password2" type="password" required minlength="8" />

      <button type="submit" :disabled="pending">{{ pending ? 'Enregistrement…' : 'Changer le mot de passe' }}</button>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    </form>

    <div v-else class="success">
      <p>Votre mot de passe a été changé. Vous allez être redirigé…</p>
    </div>
  </div>
</template>

<style scoped>
.container { max-width: 560px; margin: 24px auto; padding: 0 16px; }
.form { display: grid; gap: 12px; }
label { font-weight: 600; }
input { padding: 8px 10px; border: 1px solid #ccc; border-radius: 6px; }
button { background: #2b59c3; color: #fff; border: 0; border-radius: 6px; padding: 10px 14px; cursor: pointer; }
.error { color: #b00020; }
.success { background: darkgreen; border: 1px solid #cfe0ff; padding: 12px; border-radius: 6px; }
</style>
