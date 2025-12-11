<script setup lang="ts">
const email = ref('')
const username = ref('')
const password = ref('')
const { register, error } = useSession()
const router = useRouter()

async function onSubmit() {
  const ok = await register(email.value, username.value, password.value)
  if (ok) await router.push('/projects')
}
</script>

<template>
  <div class="container">
    <h1>Inscription</h1>
    <form @submit.prevent="onSubmit" class="form">
      <label>
        Email
        <input v-model="email" type="email" required />
      </label>
      <label>
        Pseudo
        <input v-model="username" type="text" required minlength="3" maxlength="32" />
      </label>
      <label>
        Mot de passe
        <input v-model="password" type="password" required minlength="8" />
      </label>
      <button type="submit">Créer mon compte</button>
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
