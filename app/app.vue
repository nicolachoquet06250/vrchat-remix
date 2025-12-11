<script setup lang="ts">
const {user} = useSession()
</script>

<template>
  <div>
    <header style="display:flex;gap:12px;padding:12px;border-bottom:1px solid #eee;align-items:center">
      <NuxtLink to="/">VRChat Remix</NuxtLink>
      <NuxtLink to="/projects">Projets</NuxtLink>
      <div style="margin-left:auto;display:flex;gap:8px">
        <NuxtLink v-if="user" to="/profile">Profil</NuxtLink>
        <template v-else>
          <NuxtLink to="/login">Connexion</NuxtLink>
          <NuxtLink to="/register">Inscription</NuxtLink>
        </template>
      </div>
    </header>
    <main style="padding:16px">
      <NuxtPage />
    </main>
  </div>
</template>
