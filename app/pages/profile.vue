<script setup lang="ts">
const { user, logout, refresh } = useSession()
onMounted(() => refresh())
const router = useRouter()

async function onLogout() {
  await logout()
  await router.push('/login')
}
</script>

<template>
  <div class="container">
    <h1>Mon profil</h1>
    <div v-if="user" class="card">
      <div><strong>Pseudo:</strong> {{ user.username }}</div>
      <div><strong>Email:</strong> {{ user.email }}</div>
      <div><strong>Inscription:</strong> {{ new Date(user.createdAt).toLocaleString() }}</div>
      <div class="actions">
        <button @click="onLogout">Se déconnecter</button>
      </div>
    </div>
    <div v-else>Non connecté</div>
  </div>
</template>

<style scoped>
.container { max-width: 720px; margin: 0 auto; display: grid; gap: 16px; }
.card { border: 1px solid #eee; border-radius: 8px; padding: 16px; display: grid; gap: 8px; }
.actions { margin-top: 8px; }
button { padding: 8px 12px; }
</style>
