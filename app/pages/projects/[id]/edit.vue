<script setup lang="ts">
const route = useRoute()
const id = Number(route.params.id)
const router = useRouter()
const {locale} = useI18n()

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
  title: () => `VRC Remix - Modifier le projet "${data.value?.name}"`,
  ogTitle: () => `Modifier le projet "${data.value?.name}"`,
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
  isPublic: false
})
const file = ref<File | null>(null)
const images = ref<Array<{id:number,fileName:string,fileType:string,fileSize:number,createdAt:string}>>([])
const imageFiles = ref<File[]>([])
const previewUrls = ref<string[]>([])
// Template refs for custom-styled file inputs
const zipInput = ref<HTMLInputElement | null>(null)
const imagesInput = ref<HTMLInputElement | null>(null)

watchEffect(() => {
  const p = (data.value as any)
  if (!p) return
  form.name = p.name || ''
  form.description = p.description || ''
  form.tags = (p.tags || []).join(', ')
  form.isPublic = p.isPublic
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
    fd.set('isPublic', form.isPublic ? 'true' : 'false')
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
    <Title>{{ $t('projects.edit.title') }} "{{data!.name}}"</Title>
  </Head>

  <div class="container">
    <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center;">
      <h1>{{ $t('projects.edit.title') }}</h1>

      <UiSwitch
        v-model="form.isPublic"
        :label="{
          before: 'Privé',
          after: 'Publique'
        }"
      />
    </div>
    <div v-if="pending">Chargement…</div>
    <div v-else-if="error">Introuvable</div>
    <div v-else-if="!isOwner">Accès refusé</div>
    <form v-else class="form" @submit.prevent="onSave">
      <label class="float">
        <input v-model="form.name" type="text" required minlength="3" maxlength="200" placeholder=" " />
        <span class="label-text">Nom</span>
      </label>
      <label class="float">
        <textarea v-model="form.description" rows="6" maxlength="5000" placeholder=" "></textarea>
        <span class="label-text">Description</span>
      </label>
      <label class="float">
        <input v-model="form.tags" type="text" placeholder=" " />
        <span class="label-text">Tags (séparés par des virgules)</span>
      </label>
      <div class="file-field">
        <span class="file-label">Remplacer le fichier ZIP (optionnel)</span>
        <div class="file-row">
          <input
            ref="zipInput"
            class="sr-only"
            type="file"
            accept=".zip,application/zip"
            @change="(e:any)=>{ file = e.target.files?.[0] || null }"
          />
          <button type="button" class="file-btn" @click="zipInput?.click()">Choisir un fichier ZIP</button>
          <span class="filename" :class="{ empty: !file }">{{ file?.name || data?.fileName || 'Aucun fichier sélectionné' }}</span>
        </div>
      </div>

      <div class="gallery">
        <div class="gallery-header">
          <h2>Galerie d'images</h2>
          <span class="hint">Ajoutez 1 à 4 images par envoi</span>
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
        <button type="submit" :disabled="saving" class="save-btn">Enregistrer</button>
        <button type="button" class="danger" :disabled="deleting" @click="onDelete">Supprimer</button>
        <NuxtLink :to="{name: `project___${locale}`, params: {id}}" class="link btn">Annuler</NuxtLink>
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
.link { margin-left: auto; text-decoration: none; color: #000; }

.gallery { display: grid; gap: 10px; }
.gallery-header { display: flex; align-items: center; gap: 8px; }
.gallery-header h2 { font-size: 16px; margin: 0; font-weight: normal; color: #bbb; + span {color: #bbb} }
.hint { color: #666; font-size: 12px; }
.uploader { display: flex; gap: 8px; align-items: center; }
.thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.thumb { position: relative; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
.thumb img { width: 100%; height: 120px; object-fit: cover; display: block; }
.thumb-actions { position: absolute; bottom: 6px; right: 6px; }
.btn:disabled { border: 1px solid light-dark(#ddd, #7bc2db); padding: 6px 10px; border-radius: 6px; background: #f9f9f9; color: light-dark(#000, #7bc2db); }
.btn:not(:disabled) {
  border: 1px solid light-dark(#ddd, #7bc2db); padding: 6px 10px; border-radius: 6px; background: #f9f9f9; cursor: pointer; color: light-dark(#000, #7bc2db);
  transition: background .2s ease, color .2s ease;
  &:hover {
    color: light-dark(#000, #fff);
    background: #7bc2db;
  }
}
.no-images { color: #666; font-size: 13px; }

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
  color: transparent; /* hide placeholder */
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

.float:focus-within .label-text,
.float input:not(:placeholder-shown) ~ .label-text,
.float textarea:not(:placeholder-shown) ~ .label-text {
  top: 0;
  transform: translateY(-50%) scale(0.92);
  color: #555;
}

/* Improve textarea vertical alignment */
.float textarea {
  + .label-text { top: 20px; }
  min-height: 120px;
  resize: vertical;
}

/* Primary action button: Enregistrer */
.save-btn {
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: linear-gradient(180deg, #48c7e1 0%, #42b5ce 100%);
  color: #0a0f18;
  font-weight: normal;
  cursor: pointer;
  transition: transform .06s ease, filter .15s ease, box-shadow .2s ease;
}
.save-btn:hover { filter: brightness(1.05); }
.save-btn:active { transform: translateY(1px); }
.save-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(107, 124, 255, 0.18), 0 6px 16px rgba(66, 181, 206, 0.25); }
.save-btn:disabled { opacity: .65; cursor: not-allowed; filter: none; box-shadow: none; }
</style>
