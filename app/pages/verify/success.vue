<script setup lang="ts">
definePageMeta({ name: 'verify-success' })
useSeoMeta({
  ogTitle: 'VRC Remix - E‑mail vérifié',
  ogImage: '/vrchat-remix.png',
  description: 'Votre e‑mail a été vérifié. Vous pouvez vous connecter.',
  ogDescription: 'Votre e‑mail a été vérifié. Vous pouvez vous connecter.',
  twitterCard: 'app'
})
</script>

<template>
  <div class="container">
    <Head>
      <Title>Votre compte est activé</Title>
    </Head>

    <div class="header">
      <h1>Votre compte est activé</h1>
      <p class="hint">Votre adresse e‑mail a été vérifiée avec succès.</p>
    </div>

    <div class="card">
      <p>Merci ! Votre e‑mail est confirmé. Vous pouvez maintenant vous connecter.</p>
      <div class="actions">
        <NuxtLink class="save-btn" to="/login">Aller à la connexion</NuxtLink>
        <NuxtLink class="link" to="/projects">Voir les projets</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container { max-width: 520px; margin: 0 auto; display: grid; gap: 16px; }
.header h1 { margin: 0; }
.hint { color: #666; font-size: 12px; }
.card { border:1px solid #eee; border-radius:8px; padding:16px; display:grid; gap:12px }
.actions { display:flex; align-items:center; gap:8px }
.link { text-decoration:none; color: light-dark(#000, #fff); }
.save-btn { padding: 6px 10px; border: 1px solid transparent; border-radius: 6px; background: linear-gradient(180deg, #48c7e1 0%, #42b5ce 100%); color: #0a0f18; text-decoration:none; }
</style>
