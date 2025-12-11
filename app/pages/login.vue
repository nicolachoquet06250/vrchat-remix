<script setup lang="ts">
const emailOrUsername = ref('')
const password = ref('')
const { login, error, user } = useSession()
const router = useRouter()

async function onSubmit() {
  const ok = await login(emailOrUsername.value, password.value)
  if (ok) await router.push('/projects')
}
</script>

<template>
  <div class="container">
    <h1>Connexion</h1>
    <form @submit.prevent="onSubmit" class="form">
      <label>
        Email ou pseudo
        <input v-model="emailOrUsername" type="text" required minlength="3" />
      </label>
      <label>
        Mot de passe
        <input v-model="password" type="password" required minlength="8" />
      </label>
      <button type="submit">Se connecter</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.container { max-width: 520px; margin: 0 auto; }
.form { display: grid; gap: 12px; }
label { display: grid; gap: 6px; }
.error { color: #b00020; }
</style>
