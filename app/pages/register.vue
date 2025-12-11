<script setup lang="ts">
const email = ref('')
const username = ref('')
const password = ref('')
const { register, error } = useSession()
const router = useRouter()
const { uploadAvatar, error: avatarError } = useAvatar()

const file = ref<File | null>(null)
const previewUrl = ref<string | null>(null)

watch(file, (f) => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = f ? URL.createObjectURL(f) : null
})

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0] || null
  if (!f) return
  if (!/^image\/(jpeg|jpg|png|gif|webp)$/.test(f.type)) {
    alert('Format non supporté. Utilisez jpeg, jpg, png, gif ou webp.')
    input.value = ''
    return
  }
  file.value = f
}

async function onSubmit() {
  const ok = await register(email.value, username.value, password.value)
  if (ok) {
    if (file.value) {
      await uploadAvatar(file.value)
    }
    await router.push('/projects')
  }
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
      <div class="avatar">
        <label>
          Avatar (optionnel)
          <input type="file" accept="image/*" @change="onPick" />
        </label>
        <div v-if="previewUrl" class="preview">
          <img :src="previewUrl" alt="Prévisualisation" />
        </div>
        <p v-if="avatarError" class="error">{{ avatarError }}</p>
      </div>
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
.avatar { display: grid; gap: 8px; }
.preview img { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; }
</style>
