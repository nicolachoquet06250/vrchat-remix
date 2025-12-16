<script setup lang="ts">
definePageMeta({ name: 'verify-invalid' })
useSeoMeta({
  title: 'VRC Remix - Lien invalide ou expiré',
  ogTitle: 'Lien invalide ou expiré',
  ogImage: '/vrchat-remix.png',
  description: 'Le lien de vérification est invalide ou a expiré.',
  ogDescription: 'Le lien de vérification est invalide ou a expiré.',
  twitterCard: 'app'
})
const emailOrUsername = ref('')
const resending = ref(false)
async function onResend() {
  if (!emailOrUsername.value || resending.value) return
  resending.value = true
  try {
    await $fetch('/api/auth/resend', { method: 'post', body: { emailOrUsername: emailOrUsername.value } })
    alert('Un e‑mail de vérification a été renvoyé (si un compte non vérifié existe).')
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <div class="container">
    <Head>
      <Title>Lien de vérification invalide</Title>
    </Head>

    <div class="header">
      <h1>Lien invalide ou expiré</h1>
      <p class="hint">Demandez un nouveau lien pour activer votre compte.</p>
    </div>

    <div class="card">
      <div class="form">
        <label class="float">
          <input v-model="emailOrUsername" type="text" placeholder=" " autocomplete="email" />
          <span class="label-text">Email ou pseudo</span>
        </label>
        <div class="actions">
          <NuxtLink class="link" to="/login">Retour connexion</NuxtLink>
          <button class="save-btn" :disabled="resending" @click="onResend">{{ resending ? 'Renvoi…' : 'Renvoyer le lien' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container { max-width: 520px; margin: 0 auto; display: grid; gap: 16px; }
.header h1 { margin: 0; }
.hint { color: #666; font-size: 12px; }
.card { border:1px solid #eee; border-radius:8px; padding:16px; display:grid; gap:12px }
.form { display:grid; gap:12px }
.actions { display:flex; align-items:center; gap:8px }
.link { margin-right:auto; text-decoration:none; color: light-dark(#000, #fff); }
.save-btn { padding: 6px 10px; border: 1px solid transparent; border-radius: 6px; background: linear-gradient(180deg, #48c7e1 0%, #42b5ce 100%); color: #0a0f18; text-decoration:none; }
.float { position: relative; display: block; }
.float input { width: 100%; padding: 14px 12px; border: 1px solid #cfcfcf; border-radius: 8px; background: transparent; outline: none; transition: border-color .2s ease, box-shadow .2s ease; }
.float input::placeholder { color: transparent; }
.float input:focus { border-color: #42b5ce; box-shadow: 0 0 0 3px rgba(107,124,255,.15); }
.float .label-text { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#777; background: light-dark(#fff,#0a0f18); padding:0 6px; pointer-events:none; transition: top .2s ease, transform .2s ease, color .2s ease }
.float:focus-within .label-text, .float input:not(:placeholder-shown) ~ .label-text { top:0; transform: translateY(-50%) scale(.92); color:#555 }
</style>
