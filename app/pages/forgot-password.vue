<script setup lang="ts">
definePageMeta({ name: 'forgot-password' })

useSeoMeta({
  title: 'Mot de passe oublié',
  description: 'Recevez un lien pour réinitialiser votre mot de passe',
})

const email = ref('')
const pending = ref(false)
const done = ref(false)
const errorMsg = ref<string|undefined>()

async function submit() {
  errorMsg.value = undefined
  if (!email.value) return
  pending.value = true
  try {
    await $fetch('/api/auth/forgot', { method: 'POST', body: { email: email.value } })
    done.value = true
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || 'Une erreur est survenue'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="container">
    <h1>Mot de passe oublié</h1>
    <p>Entrez votre adresse e‑mail, nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>

    <form v-if="!done" @submit.prevent="submit" class="form">
      <label for="email">E‑mail</label>
      <input id="email" v-model="email" type="email" required placeholder="vous@exemple.com" />
      <button type="submit" :disabled="pending">{{ pending ? 'Envoi…' : 'Envoyer le lien' }}</button>
      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
    </form>

    <div v-else class="success">
      <p>Si un compte existe pour cet e‑mail, un message vient d’être envoyé avec un lien de réinitialisation.</p>
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
