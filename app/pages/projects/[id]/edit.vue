<script setup lang="ts">
const route = useRoute()
const id = Number(route.params.id)
const router = useRouter()

definePageMeta({
  name: 'edit-project'
})

const { user, refresh: refreshSession } = useSession()

onMounted(() => {
  refreshSession()
  loadImages()
})

const { data, pending, error } = await useFetch(`/api/projects/${id}`)

useSeoMeta({
  ogTitle: computed(() => `Modifier le projet "${data.value?.name}"`),
  ogImage: '/vrchat-remix.png',
  description: 'créer un nouveau projet remix',
  ogDescription: 'créer un nouveau projet remix',
  twitterCard: 'app'
})

const isOwner = computed(() => {
  if (!user.value || !data.value) return false
  return user.value.id === (data.value as any).userId
})

const form = reactive({
  name: '',
  description: '',
  tags: '', // comma-separated
})
const file = ref<File | null>(null)
const images = ref<Array<{id:number,fileName:string,fileType:string,fileSize:number,createdAt:string}>>([])
const imageFiles = ref<File[]>([])
const previewUrls = ref<string[]>([])

watchEffect(() => {
  const p = (data.value as any)
  if (!p) return
  form.name = p.name || ''
  form.description = p.description || ''
  form.tags = (p.tags || []).join(', ')
})

const saving = ref(false)
const errMsg = ref<string | null>(null)

async function onSave() {
  errMsg.value = null
  if (!isOwner.value) {
    await router.push(`/projects/${id}`)
    return
  }
  saving.value = true
  try {
    const tags = form.tags
    // Use multipart to support optional file replacement
    const fd = new FormData()
    fd.set('name', form.name)
    fd.set('description', form.description || '')
    fd.set('tags', tags || '')
    if (file.value) {
      if (!file.value.name.toLowerCase().endsWith('.zip')) {
        errMsg.value = 'Le fichier doit être un .zip'
        return
      }
      fd.set('file', file.value)
    }
    try {
      await $fetch(`/api/projects/${id}`, {method: 'patch', body: fd})
      await router.push(`/projects/${id}`)
    } catch (err: any) {
      if (err.value) {
        errMsg.value = err.value.statusMessage || 'Erreur lors de la sauvegarde'
        return
      }
    }
  } finally {
    saving.value = false
  }
}

const deleting = ref(false)
async function onDelete() {
  if (!isOwner.value) return
  if (!confirm('Supprimer ce projet ?')) return
  deleting.value = true
  try {
    await $fetch(`/api/projects/${id}`, { method: 'delete' })
    await router.push('/projects')
  } catch(err: any) {
    errMsg.value = err.value.statusMessage || 'Erreur lors de la suppression'
    return
  } finally {
    deleting.value = false
  }
}

async function loadImages() {
  try {
    const list = await $fetch(`/api/projects/${id}/images`)
    images.value = (list as any[]) as any
  } catch (e) {
    // ignore
  }
}

function onSelectImages(e: any) {
  const files: File[] = Array.from(e.target.files || [])
  if (files.length > 4) {
    errMsg.value = 'Maximum 4 images par envoi'
    imageFiles.value = files.slice(0, 4)
  } else {
    imageFiles.value = files
  }
}

function revokePreviews() {
  for (const url of previewUrls.value) {
    try { URL.revokeObjectURL(url) } catch {}
  }
  previewUrls.value = []
}

watch(imageFiles, (files) => {
  revokePreviews()
  if (!files || files.length === 0) return
  previewUrls.value = files.map((f) => URL.createObjectURL(f))
})

onUnmounted(() => {
  revokePreviews()
})

const uploadingImages = ref(false)
async function onUploadImages() {
  errMsg.value = null
  if (!isOwner.value) return
  if (imageFiles.value.length === 0) {
    errMsg.value = 'Sélectionnez au moins une image'
    return
  }
  if (imageFiles.value.length > 4) {
    errMsg.value = 'Maximum 4 images par envoi'
    return
  }
  uploadingImages.value = true
  try {
    const fd = new FormData()
    for (const f of imageFiles.value) {
      fd.append('images', f)
    }
    await $fetch(`/api/projects/${id}/images`, { method: 'post', body: fd })
    imageFiles.value = []
    // clear input value if needed (handled by key binding on input)
    await loadImages()
  } catch (err: any) {
    if (err?.value) {
      errMsg.value = err.value.statusMessage || 'Erreur lors de l\'upload des images'
    } else {
      errMsg.value = 'Erreur lors de l\'upload des images'
    }
  } finally {
    uploadingImages.value = false
  }
}

const deletingImageIds = ref<number[]>([])
async function onDeleteImage(imageId: number) {
  if (!isOwner.value) return
  if (!confirm('Supprimer cette image ?')) return
  deletingImageIds.value.push(imageId)
  try {
    await $fetch(`/api/projects/images/${imageId}`, { method: 'delete' })
    await loadImages()
  } catch (err: any) {
    errMsg.value = err?.value?.statusMessage || 'Erreur lors de la suppression de l\'image'
  } finally {
    deletingImageIds.value = deletingImageIds.value.filter((id) => id !== imageId)
  }
}
</script>

<template>
  <Head>
    <Title>Modifier le projet "{{data!.name}}"</Title>
  </Head>

  <div class="container">
    <h1>Modifier le projet</h1>
    <div v-if="pending">Chargement…</div>
    <div v-else-if="error">Introuvable</div>
    <div v-else-if="!isOwner">Accès refusé</div>
    <form v-else class="form" @submit.prevent="onSave">
      <label>
        Nom
        <input v-model="form.name" type="text" required minlength="3" maxlength="200" />
      </label>
      <label>
        Description
        <textarea v-model="form.description" rows="6" maxlength="5000" />
      </label>
      <label>
        Remplacer le fichier ZIP (optionnel)
        <input type="file" accept=".zip,application/zip" @change="(e:any)=>{ file = e.target.files?.[0] || null }" />
      </label>
      <label>
        Tags (séparés par des virgules)
        <input v-model="form.tags" type="text" />
      </label>

      <div class="gallery">
        <div class="gallery-header">
          <h2>Galerie d'images</h2>
          <span class="hint">Ajoutez 1 à 4 images par envoi</span>
        </div>
        <div class="uploader">
          <input
            key="image-input"
            type="file"
            accept="image/*"
            multiple
            @change="onSelectImages"
          />
          <button type="button" class="btn" :disabled="uploadingImages || imageFiles.length===0" @click="onUploadImages">
            {{ uploadingImages ? 'Envoi…' : 'Uploader' }}
          </button>
          <div class="selected" v-if="imageFiles.length > 0">
            {{ imageFiles.length }} image(s) sélectionnée(s)
          </div>
        </div>
        <div v-if="previewUrls.length > 0" class="thumbs">
          <div class="thumb" v-for="(url, i) in previewUrls" :key="url">
            <img :src="url" :alt="imageFiles[i]?.name || 'preview'" />
          </div>
        </div>
        <div v-if="images.length > 0" class="thumbs">
          <div v-for="img in images" :key="img.id" class="thumb">
            <img :src="`/api/projects/images/${img.id}`" :alt="img.fileName" />
            <div class="thumb-actions">
              <button type="button" class="danger" :disabled="deletingImageIds.includes(img.id)" @click="onDeleteImage(img.id)">
                {{ deletingImageIds.includes(img.id) ? 'Suppression…' : 'Supprimer' }}
              </button>
            </div>
          </div>
        </div>
        <div v-else class="no-images">Aucune image pour le moment.</div>
      </div>
      <div class="actions">
        <button type="submit" :disabled="saving" class="btn">Enregistrer</button>
        <button type="button" class="danger" :disabled="deleting" @click="onDelete">Supprimer</button>
        <NuxtLink :to="{name: 'project', params: {id}}" class="link btn">Annuler</NuxtLink>
      </div>
      <p v-if="errMsg" class="error">{{ errMsg }}</p>
    </form>
  </div>
</template>

<style scoped>
.container { max-width: 720px; margin: 0 auto; display: grid; gap: 16px; }
.form { display: grid; gap: 12px; }
label { display: grid; gap: 6px; }
.actions { display: flex; gap: 8px; align-items: center; }
.error { color: #b00020; }
.danger { background: #d9534f; color: #fff; border: 1px solid #d9534f; padding: 6px 10px; border-radius: 6px; cursor: pointer; }
.link { margin-left: auto; }

.gallery { border-top: 1px solid #eee; padding-top: 8px; display: grid; gap: 10px; }
.gallery-header { display: flex; align-items: center; gap: 8px; }
.gallery-header h2 { font-size: 16px; margin: 0; }
.hint { color: #666; font-size: 12px; }
.uploader { display: flex; gap: 8px; align-items: center; }
.thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.thumb { position: relative; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
.thumb img { width: 100%; height: 120px; object-fit: cover; display: block; }
.thumb-actions { position: absolute; bottom: 6px; right: 6px; }
.btn { border: 1px solid #ddd; padding: 6px 10px; border-radius: 6px; background: #f9f9f9; cursor: pointer; }
.no-images { color: #666; font-size: 13px; }
</style>
