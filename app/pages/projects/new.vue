<script setup lang="ts">
const { user, refresh } = useSession()
const router = useRouter()
onMounted(() => refresh())

useSeoMeta({
  ogTitle: 'Créer un projet',
  ogImage: '/vrchat-remix.png',
  description: 'créer un nouveau projet remix',
  ogDescription: 'créer un nouveau projet remix',
  twitterCard: 'app'
})

const name = ref('')
const description = ref('')
const file = ref<File | null>(null)
const tags = ref('') // comma-separated
const error = ref<string | null>(null)
const saving = ref(false)
const imageFiles = ref<File[]>([])
const previews = ref<string[]>([])

watchEffect(() => {
  if (!user.value) return
})

function handleFileChange(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] || null
}

function onSelectImages(e: any) {
  const files: File[] = Array.from(e.target.files || [])
  if (files.length > 4) {
    error.value = 'Maximum 4 images par envoi'
    imageFiles.value = files.slice(0, 4)
  } else {
    imageFiles.value = files
  }
}

// Build and cleanup local preview URLs
function revokePreviews() {
  for (const url of previews.value) {
    try { URL.revokeObjectURL(url) } catch {}
  }
  previews.value = []
}

watch(imageFiles, (files) => {
  revokePreviews()
  if (!files || files.length === 0) return
  previews.value = files.map((f) => URL.createObjectURL(f))
})

onUnmounted(() => {
  revokePreviews()
})

async function onSubmit() {
  error.value = null
  if (!user.value) {
    await router.push('/login')
    return
  }
  saving.value = true
  try {
    if (!file.value) {
      error.value = 'Veuillez sélectionner un fichier .zip'
      return
    }
    if (!file.value.name.toLowerCase().endsWith('.zip')) {
      error.value = 'Le fichier doit être un .zip'
      return
    }
    const fd = new FormData()
    fd.set('name', name.value)
    if (description.value) fd.set('description', description.value)
    if (tags.value) fd.set('tags', tags.value)
    fd.set('file', file.value)
    // append optional images (max 4)
    if (imageFiles.value.length > 4) {
      error.value = 'Maximum 4 images par envoi'
      return
    }
    for (const img of imageFiles.value) {
      fd.append('images', img)
    }
    try {
      const data = await $fetch('/api/projects', {
        method: 'post',
        body: fd,
      })

      const id = (data as any)?.id
      if (id) await router.push(`/projects/${id}`)
      else await router.push('/projects')
    } catch (err: any) {
        error.value = err.value.statusMessage || 'Erreur lors de la création'
        return
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Head>
    <Title>Créer un projet</Title>
  </Head>

  <div class="container">
    <h1>Nouveau projet</h1>
    <div v-if="!user">Vous devez être connecté pour créer un projet.</div>
    <form v-else class="form" @submit.prevent="onSubmit">
      <label>
        Nom
        <input v-model="name" type="text" required minlength="3" maxlength="200" />
      </label>
      <label>
        Description
        <textarea v-model="description" rows="6" maxlength="5000" />
      </label>
      <label>
        Fichier ZIP
        <input type="file" accept=".zip,application/zip" @change="handleFileChange" required />
      </label>
      <div class="gallery">
        <div class="gallery-header">
          <h2>Galerie d'images</h2>
          <span class="hint">Ajoutez 1 à 4 images (optionnel)</span>
        </div>
        <div class="uploader">
          <input
            key="image-input"
            type="file"
            accept="image/*"
            multiple
            @change="onSelectImages"
          />
          <div class="selected" v-if="imageFiles.length > 0">
            {{ imageFiles.length }} image(s) sélectionnée(s)
          </div>
        </div>
        <div v-if="previews.length > 0" class="thumbs">
          <div class="thumb" v-for="(url, i) in previews" :key="url">
            <img :src="url" :alt="imageFiles[i]?.name || 'preview'" />
          </div>
        </div>
      </div>
      <label>
        Tags (séparés par des virgules)
        <input v-model="tags" type="text" placeholder="ex: avatar, world, shader" />
      </label>
      <button type="submit" :disabled="saving">Créer</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.container { max-width: 720px; margin: 0 auto; display: grid; gap: 16px; }
.form { display: grid; gap: 12px; }
label { display: grid; gap: 6px; }
.error { color: #b00020; }
textarea, input { width: 100%; }
.gallery { border-top: 1px solid #eee; padding-top: 8px; display: grid; gap: 10px; }
.gallery-header { display: flex; align-items: center; gap: 8px; }
.gallery-header h2 { font-size: 16px; margin: 0; }
.hint { color: #666; font-size: 12px; }
.uploader { display: flex; gap: 8px; align-items: center; }
.selected { color: #333; font-size: 13px; }
.thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.thumb { position: relative; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
.thumb img { width: 100%; height: 120px; object-fit: cover; display: block; }
</style>
