<script setup lang="ts">
const { user, refresh } = useSession()
const router = useRouter()
onMounted(() => refresh())

definePageMeta({
  name: 'create-project'
})

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
const isPublic = ref<boolean>(false)

// Template refs for custom-styled file inputs
const zipInput = ref<HTMLInputElement | null>(null)
const imagesInput = ref<HTMLInputElement | null>(null)

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
    <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center;">
      <h1>Nouveau projet</h1>

      <UiSwitch
        v-model="isPublic"
        :label="{
          before: 'Privé',
          after: 'Publique'
        }"
      />
    </div>
    <div v-if="!user">Vous devez être connecté pour créer un projet.</div>
    <form v-else class="form" @submit.prevent="onSubmit">
      <label class="float">
        <input v-model="name" type="text" required minlength="3" maxlength="200" placeholder=" " />
        <span class="label-text">Nom</span>
      </label>
      <label class="float">
        <textarea v-model="description" rows="6" maxlength="5000" placeholder=" "></textarea>
        <span class="label-text">Description</span>
      </label>
      <label class="float">
        <input v-model="tags" type="text" placeholder=" " />
        <span class="label-text">Tags (séparés par des virgules)</span>
      </label>
      <div class="file-field">
        <span class="file-label">Fichier ZIP</span>
        <div class="file-row">
          <input
            ref="zipInput"
            class="sr-only"
            type="file"
            accept=".zip,application/zip"
            @change="handleFileChange"
            required
          />
          <button type="button" class="file-btn" @click="zipInput?.click()">Choisir un fichier ZIP</button>
          <span class="filename" :class="{ empty: !file }">{{ file?.name || 'Aucun fichier sélectionné' }}</span>
        </div>
      </div>
      <div class="gallery">
        <div class="gallery-header">
          <h2>Galerie d'images</h2>
          <span class="hint">Ajoutez 1 à 4 images (optionnel)</span>
        </div>
        <div class="uploader">
          <input
            ref="imagesInput"
            class="sr-only"
            key="image-input"
            type="file"
            accept="image/*"
            multiple
            @change="onSelectImages"
          />
          <button type="button" class="file-btn" @click="imagesInput?.click()">Ajouter des images</button>
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
      <div>
        <button type="submit" class="create-btn" :disabled="saving">Créer</button>
      </div>
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
.gallery { display: grid; gap: 10px; }
.gallery-header { display: flex; align-items: center; gap: 8px; }
.gallery-header h2 { font-size: 16px; margin: 0; }
.hint { color: #666; font-size: 12px; }
.uploader { display: flex; gap: 8px; align-items: center; }
.selected { color: #333; font-size: 13px; }
.thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.thumb { position: relative; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
.thumb img { width: 100%; height: 120px; object-fit: cover; display: block; }

/* Custom file inputs */
.file-field { display: grid; gap: 6px; }
.file-label { font-size: 14px; color: #bbb; }
.file-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.file-btn {
  padding: 10px 12px;
  border: 1px solid #cfcfcf;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: border-color .2s ease, box-shadow .2s ease, background-color .15s ease;
}
.file-btn:hover { border-color: #42b5ce; }
.file-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(107, 124, 255, 0.15); border-color: #42b5ce; }
.file-btn:disabled { opacity: .6; cursor: not-allowed; }
.filename { font-size: 13px; color: #ddd; }
.filename.empty { color: #777; font-style: italic; }

/* Visually hide but keep accessible */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Floating label inputs */
.float {
  position: relative;
  display: block;
}

.float input,
.float textarea {
  width: 100%;
  padding: 14px 12px;
  border: 1px solid #cfcfcf;
  border-radius: 8px;
  background: transparent;
  outline: none;
  transition: border-color .2s ease, box-shadow .2s ease;
}

.float input::placeholder,
.float textarea::placeholder {
  color: transparent; /* hide placeholder to let label act as placeholder */
}

.float input:focus,
.float textarea:focus {
  border-color: #42b5ce;
  box-shadow: 0 0 0 3px rgba(107, 124, 255, 0.15);
}

.float .label-text {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #777;
  background: light-dark(#fff, #0a0f18); /* match page background */
  padding: 0 6px;
  pointer-events: none;
  transition: top .2s ease, transform .2s ease, color .2s ease, font-size .2s ease;
}

/* Raised state: when focused or when there is content */
.float:focus-within .label-text,
.float input:not(:placeholder-shown) ~ .label-text,
.float textarea:not(:placeholder-shown) ~ .label-text {
  top: 0;
  transform: translateY(-50%) scale(0.92);
  color: #555;
}

/* Improve textarea vertical alignment (keep label centered initially) */
.float textarea {
  + .label-text {
    top: 20px;
  }
  min-height: 120px;
  resize: vertical;
}

div:has(> .create-btn) {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
}

/* Primary action button: Créer */
.create-btn {
  width: min-content;
  padding: 12px 16px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: linear-gradient(180deg, #48c7e1 0%, #42b5ce 100%);
  color: #0a0f18;
  font-weight: 600;
  letter-spacing: 0.2px;
  cursor: pointer;
  transition: transform .06s ease, filter .15s ease, box-shadow .2s ease;
  box-shadow: 0 6px 16px rgba(66, 181, 206, 0.25);
}

.create-btn:hover {
  filter: brightness(1.05);
}

.create-btn:active {
  transform: translateY(1px);
}

.create-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(107, 124, 255, 0.18), 0 6px 16px rgba(66, 181, 206, 0.25);
}

.create-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  filter: none;
  box-shadow: none;
}
</style>
