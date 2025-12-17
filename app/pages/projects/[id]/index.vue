<script setup lang="ts">
const route = useRoute()
const id = Number(route.params.id)
const { user } = useSession()
const { ucFirst, convertDateFromLocal } = useHelpers()
const {locale} = useI18n()

definePageMeta({
  name: 'project'
})

const { data, pending, error, refresh } = await useFetch(`/api/projects/${id}`)

// images for carousel
const { data: images } = await useFetch(`/api/projects/${id}/images`)

useSeoMeta({
  title: () => `VRC Remix - ${data.value?.name}`,
  ogTitle: () => data.value!.name,
  ogImage: () => {
    if (images.value && images.value.length > 0) {
      return `/api/projects/images/og-image?id=${[...images.value].shift()!.id}&d=${new Date().getTime()}`
    }
    return '/vrchat-remix.png'
  },
  description: () => data.value!.description,
  ogDescription: () => data.value!.description,
  twitterCard: 'app'
})

const current = ref(0)
// transition direction for slide animation: 'slide-left' or 'slide-right'
const transitionName = ref('')
const hasImages = computed(() => (images.value || []).length > 0)
const total = computed(() => (images.value || []).length)
const currentImg = computed(() => (images.value && images.value[current.value]) || null)
function prev() {
  if (!images.value || images.value.length === 0) return
  // when going to previous, new slide enters from the left (container moves right)
  transitionName.value = 'slide-right'
  current.value = (current.value - 1 + images.value.length) % images.value.length
}
function next() {
  if (!images.value || images.value.length === 0) return
  // when going to next, new slide enters from the right (container moves left)
  transitionName.value = 'slide-left'
  current.value = (current.value + 1) % images.value.length
}

const isOwner = computed(() => {
  if (!user.value || !data.value) return false
  return user.value.id === data.value!.userId
})

const toggling = ref(false)
const favMsg = ref<string | null>(null)
const modMsg = ref<string | null>(null)
const isFavorite = computed(() => Boolean(data.value && (data.value as any).isFavorite))

async function toggleFavorite() {
  if (!user.value || !data.value) return
  toggling.value = true
  favMsg.value = null
  try {
    if (isFavorite.value) {
      await $fetch(`/api/projects/${id}/favorite`, { method: 'DELETE' })
    } else {
      await $fetch(`/api/projects/${id}/favorite`, { method: 'POST' })
    }
    await refresh()
  } catch (e: any) {
    favMsg.value = e?.data?.statusMessage || 'Action impossible pour le moment'
    setTimeout(() => (favMsg.value = null), 2500)
  } finally {
    toggling.value = false
  }
}

async function reportProject() {
  if (!user.value) return
  const reason = prompt('Pourquoi signalez-vous ce projet ?') || undefined
  try {
    await $fetch(`/api/projects/${id}/report`, { method: 'POST', body: { reason } })
    modMsg.value = String($t('project.index.reported'))
  } catch (e: any) {
    modMsg.value = e?.data?.statusMessage || 'Impossible de signaler pour le moment'
  } finally {
    setTimeout(() => (modMsg.value = null), 2500)
  }
}

const isModeratorOrCreator = computed(() => user.value && (user.value.role === 'moderator' || user.value.role === 'creator'))

async function makePrivate() {
  if (!isModeratorOrCreator.value) return
  try {
    const res: any = await $fetch(`/api/projects/${id}/private`, { method: 'POST' })
    if (res?.deleted) {
      modMsg.value = String($t('project.index.deleted'))
      // Redirect to projects list after deletion
      setTimeout(() => navigateTo('/projects'), 1500)
      return
    }
    modMsg.value = String($t('project.index.privated'))
    await refresh()
  } catch (e: any) {
    modMsg.value = e?.data?.statusMessage || 'Action impossible pour le moment'
  } finally {
    setTimeout(() => (modMsg.value = null), 2500)
  }
}

// ===== Image Preview Modal (zoom/pan) =====
const isModalOpen = ref(false)
const zoom = ref(1) // 1 to 3
const minZoom = 1
const maxZoom = 3
const step = 0.5
const offsetX = ref(0)
const offsetY = ref(0)
const isDragging = ref(false)
const startDrag = ref<{x:number, y:number, ox:number, oy:number} | null>(null)
// Track movement while a mouse button is pressed to differentiate click vs drag
const pressedButton = ref<number | null>(null)
const pressStartPos = ref<{x:number, y:number} | null>(null)
const didMoveSincePress = ref(false)
const moveThreshold = 4 // pixels
const modalRoot = ref<HTMLElement | null>(null)
const closeBtnRef = ref<HTMLButtonElement | null>(null)

// Lock body scroll when the preview modal is open
if (process.client) {
  watch(isModalOpen, (open) => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  })

  onUnmounted(() => {
    // Ensure scroll is restored if component gets destroyed while modal is open
    document.body.style.overflow = ''
  })
}

function openPreview() {
  isModalOpen.value = true
  zoom.value = 1
  offsetX.value = 0
  offsetY.value = 0
  nextTick(() => {
    // focus the dialog for accessibility
    modalRoot.value?.focus()
  })
}

function closePreview() {
  isModalOpen.value = false
}

function onOverlayClick(e: MouseEvent) {
  // Close when clicking outside the image container
  if (e.target === modalRoot.value) {
    closePreview()
  }
}

function zoomIn() {
  zoom.value = Math.min(maxZoom, +(zoom.value + step).toFixed(2))
}

function zoomOut() {
  const next = Math.max(minZoom - 1, +(zoom.value - step).toFixed(2))
  zoom.value = next
  if (next < minZoom) {
    // if already at min after this step, close
    closePreview()
  }
}

function onModalClick(e: MouseEvent) {
  // left click => zoom in
  if (e.button === 0) {
    // If the user moved while pressing, do not zoom (it's a drag)
    if (didMoveSincePress.value) {
      didMoveSincePress.value = false
      return
    }
    zoomIn()
  }
}

function onModalContext(e: MouseEvent) {
  // right click => zoom out and close at min
  e.preventDefault()
  // If the user moved while pressing, do not zoom (it's a drag)
  if (didMoveSincePress.value) {
    didMoveSincePress.value = false
    return
  }
  zoomOut()
}

function onMouseDown(e: MouseEvent) {
  // Track press for movement (for both left/right, any zoom level)
  pressedButton.value = e.button
  pressStartPos.value = { x: e.clientX, y: e.clientY }
  didMoveSincePress.value = false

  // Start dragging (panning) only when zoomed in and left button
  if (zoom.value > 1 && e.button === 0) {
    isDragging.value = true
    startDrag.value = { x: e.clientX, y: e.clientY, ox: offsetX.value, oy: offsetY.value }
  }
}

function onMouseMove(e: MouseEvent) {
  // Mark as moved if surpass threshold while a button is pressed
  if (pressStartPos.value && pressedButton.value !== null) {
    const mdx = e.clientX - pressStartPos.value.x
    const mdy = e.clientY - pressStartPos.value.y
    if (!didMoveSincePress.value && Math.hypot(mdx, mdy) >= moveThreshold) {
      didMoveSincePress.value = true
    }
  }

  // Apply panning only if dragging
  if (!isDragging.value || !startDrag.value) return
  const dx = e.clientX - startDrag.value.x
  const dy = e.clientY - startDrag.value.y
  offsetX.value = startDrag.value.ox + dx
  offsetY.value = startDrag.value.oy + dy
}

function onMouseUp() {
  isDragging.value = false
  startDrag.value = null
  pressedButton.value = null
  pressStartPos.value = null
}

function onKeyDown(e: KeyboardEvent) {
  if (!isModalOpen.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    closePreview()
    return
  }
  // Focus trap simple: keep focus within dialog
  if (e.key === 'Tab') {
    const root = modalRoot.value
    if (!root) return
    const focusable = root.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) {
      e.preventDefault()
      root.focus()
      return
    }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement as HTMLElement | null
    if (!e.shiftKey && active === last) {
      e.preventDefault()
      first?.focus()
    } else if (e.shiftKey && active === first) {
      e.preventDefault()
      last?.focus()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <Head>
    <Title>{{ucFirst(data!.name)}}</Title>
  </Head>

  <div class="container">
    <div v-if="pending">{{ $t('loading') }}</div>
    <div v-else-if="error">{{ $t('project.index.not-found') }}</div>
    <div v-else class="card">
      <div class="header">
        <h1 class="title">{{ ucFirst(data!.name) }}</h1>
        <div class="spacer" />
        <NuxtLink v-if="isOwner" :to="{name: `edit-project___${locale}`, params: {id}}" class="btn" :aria-labelledby="$t('project.index.update')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
            <path d="M535.6 85.7C513.7 63.8 478.3 63.8 456.4 85.7L432 110.1L529.9 208L554.3 183.6C576.2 161.7 576.2 126.3 554.3 104.4L535.6 85.7zM236.4 305.7C230.3 311.8 225.6 319.3 222.9 327.6L193.3 416.4C190.4 425 192.7 434.5 199.1 441C205.5 447.5 215 449.7 223.7 446.8L312.5 417.2C320.7 414.5 328.2 409.8 334.4 403.7L496 241.9L398.1 144L236.4 305.7zM160 128C107 128 64 171 64 224L64 480C64 533 107 576 160 576L416 576C469 576 512 533 512 480L512 384C512 366.3 497.7 352 480 352C462.3 352 448 366.3 448 384L448 480C448 497.7 433.7 512 416 512L160 512C142.3 512 128 497.7 128 480L128 224C128 206.3 142.3 192 160 192L256 192C273.7 192 288 177.7 288 160C288 142.3 273.7 128 256 128L160 128z"/>
          </svg>
        </NuxtLink>
      </div>

      <div class="meta">
        <span class="creator">
          <NuxtLink :to="{name: `creator___${locale}`, params: {id: data!.userId}}" style="text-decoration: underline; color: light-dark(#000, #666); display: inline-flex; flex-direction: row; justify-content: center; align-items: center; gap: 5px">
            <template v-if="data!.creatorHasAvatar && data!.creatorAvatarUrl">
              <img
                class="avatar"
                :src="data!.creatorAvatarUrl"
                :alt="`Avatar de ${data!.creatorUsername || 'utilisateur'}`"
              />
            </template>
            <template v-else>
              <span class="avatar placeholder">{{ (data!.creatorUsername || ('#'+data!.userId)).charAt(0).toUpperCase() }}</span>
            </template>

            <span class="username">{{ data!.creatorUsername || ('#'+data!.userId) }}</span>
          </NuxtLink>
        </span>
        • {{ new Date(data!.createdAt).toLocaleString(locale) }}
      </div>

      <div style="display: flex; flex-direction: row; justify-content: flex-start; align-items: center; gap: 5px;">
        <button
            v-if="user && data"
            class="btn"
            :disabled="toggling"
            type="button"
            @click="toggleFavorite"
            :aria-pressed="isFavorite"
            :aria-labelledby="isFavorite ? $t('project.index.del-to-favorites') : $t('project.index.add-to-favorites')"
        >
          <template v-if="isFavorite">
            <svg v-if="isFavorite" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
              <path d="M192 64C156.7 64 128 92.7 128 128L128 544C128 555.5 134.2 566.2 144.2 571.8C154.2 577.4 166.5 577.3 176.4 571.4L320 485.3L463.5 571.4C473.4 577.3 485.7 577.5 495.7 571.8C505.7 566.1 512 555.5 512 544L512 128C512 92.7 483.3 64 448 64L192 64z"/>
            </svg>
          </template>
          <template v-else>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
              <path d="M128 128C128 92.7 156.7 64 192 64L448 64C483.3 64 512 92.7 512 128L512 545.1C512 570.7 483.5 585.9 462.2 571.7L320 476.8L177.8 571.7C156.5 585.9 128 570.6 128 545.1L128 128zM192 112C183.2 112 176 119.2 176 128L176 515.2L293.4 437C309.5 426.3 330.5 426.3 346.6 437L464 515.2L464 128C464 119.2 456.8 112 448 112L192 112z"/>
            </svg>
          </template>
        </button>

        <button v-if="user" class="btn" type="button" @click="reportProject" :aria-labelledby="$t('project.index.report')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
            <path d="M320 64C334.7 64 348.2 72.1 355.2 85L571.2 485C577.9 497.4 577.6 512.4 570.4 524.5C563.2 536.6 550.1 544 536 544L104 544C89.9 544 76.8 536.6 69.6 524.5C62.4 512.4 62.1 497.4 68.8 485L284.8 85C291.8 72.1 305.3 64 320 64zM320 416C302.3 416 288 430.3 288 448C288 465.7 302.3 480 320 480C337.7 480 352 465.7 352 448C352 430.3 337.7 416 320 416zM320 224C301.8 224 287.3 239.5 288.6 257.7L296 361.7C296.9 374.2 307.4 384 319.9 384C332.5 384 342.9 374.3 343.8 361.7L351.2 257.7C352.5 239.5 338.1 224 319.8 224z"/>
          </svg>
        </button>

        <button v-if="isModeratorOrCreator" class="btn warning" type="button" @click="makePrivate" :aria-labelledby="$t('project.index.mark-private')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
            <path d="M256 160L256 224L384 224L384 160C384 124.7 355.3 96 320 96C284.7 96 256 124.7 256 160zM192 224L192 160C192 89.3 249.3 32 320 32C390.7 32 448 89.3 448 160L448 224C483.3 224 512 252.7 512 288L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 288C128 252.7 156.7 224 192 224z"/>
          </svg>
        </button>
      </div>

      <p class="desc">{{ ucFirst(data!.description ?? '') }}</p>

      <div class="tags" v-if="data!.tags.length > 0">
        <span class="tag" v-for="t in data!.tags" :key="t">#{{ t }}</span>
      </div>

      <div class="file" v-if="data!.hasFile">
        <div>{{ $t('project.index.file') }}: {{ data!.fileName }} <span v-if="data!.fileSize">({{ Math.round(data!.fileSize!/1024) }} Ko)</span></div>
      </div>
      <div class="actions">
        <a v-if="data!.hasFile" :href="`/api/projects/${id}/download`" class="btn primary">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
            <path d="M352 96C352 78.3 337.7 64 320 64C302.3 64 288 78.3 288 96L288 306.7L246.6 265.3C234.1 252.8 213.8 252.8 201.3 265.3C188.8 277.8 188.8 298.1 201.3 310.6L297.3 406.6C309.8 419.1 330.1 419.1 342.6 406.6L438.6 310.6C451.1 298.1 451.1 277.8 438.6 265.3C426.1 252.8 405.8 252.8 393.3 265.3L352 306.7L352 96zM160 384C124.7 384 96 412.7 96 448L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 448C544 412.7 515.3 384 480 384L433.1 384L376.5 440.6C345.3 471.8 294.6 471.8 263.4 440.6L206.9 384L160 384zM464 440C477.3 440 488 450.7 488 464C488 477.3 477.3 488 464 488C450.7 488 440 477.3 440 464C440 450.7 450.7 440 464 440z"/>
          </svg>
          {{ $t('project.index.download') }}
        </a>
        <span v-if="favMsg" class="hint error">{{ favMsg }}</span>
        <span v-if="modMsg" class="hint">{{ modMsg }}</span>
      </div>

      <template v-if="hasImages">
        <div style="display: flex; flex-direction: column; justify-content: flex-start; margin-left: 45px">
          <span style="display: inline-flex; justify-content: flex-start; align-items: center; gap: 10px">
            {{ $t('project.index.left-click') }} :
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
              <path style="fill: light-dark(#000, #fff)" d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 176C258.7 176 248 186.7 248 200L248 248L200 248C186.7 248 176 258.7 176 272C176 285.3 186.7 296 200 296L248 296L248 344C248 357.3 258.7 368 272 368C285.3 368 296 357.3 296 344L296 296L344 296C357.3 296 368 285.3 368 272C368 258.7 357.3 248 344 248L296 248L296 200C296 186.7 285.3 176 272 176z"/>
            </svg>
          </span>
          <span style="display: inline-flex; justify-content: flex-start; align-items: center; gap: 10px">
            {{ $t('project.index.right-click') }} :
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
              <path style="fill: light-dark(#000, #fff)" d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM200 248C186.7 248 176 258.7 176 272C176 285.3 186.7 296 200 296L344 296C357.3 296 368 285.3 368 272C368 258.7 357.3 248 344 248L200 248z"/>
            </svg>
          </span>
        </div>
        <div class="carousel">
          <button class="nav" @click="prev" aria-label="Précédent">‹</button>
          <div class="viewport">
            <Transition :name="transitionName" mode="out-in">
              <img
                  v-if="currentImg"
                  class="slide"
                  :key="current"
                  :src="currentImg.forCarousel"
                  :alt="currentImg.fileName"
                  @click="openPreview"
              />
            </Transition>
          </div>
          <button class="nav" @click="next" aria-label="Suivant">›</button>
        </div>
        <div class="dots">
          <button
              v-for="(img, i) in images"
              :key="img.id"
              class="dot"
              :class="{ active: i === current }"
              @click="current = i"
              :aria-label="`Aller à l'image ${i+1}/${total}`"
          />
        </div>
      </template>
      <!-- Zoom modal -->
      <teleport to="body">
        <div
          v-if="isModalOpen && currentImg"
          class="img-modal"
          ref="modalRoot"
          role="dialog"
          aria-modal="true"
          aria-label="Agrandissement de l'image"
          tabindex="-1"
          @mousedown.self="onMouseDown"
          @click.self="onOverlayClick"
        >
          <div class="modal-inner" @contextmenu="onModalContext" @click="onModalClick">
            <img
              class="modal-image"
              :src="currentImg.forCarousel"
              :alt="currentImg.fileName"
              draggable="false"
              @mousedown="onMouseDown"
              @mousemove="onMouseMove"
              @mouseup="onMouseUp"
              @mouseleave="onMouseUp"
              :style="{ transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})` }"
            />
            <button ref="closeBtnRef" class="close-btn" type="button" @click="closePreview" aria-label="Fermer">✕</button>
          </div>
        </div>
      </teleport>
    </div>
  </div>
</template>

<style scoped>
.container { display: grid; gap: 16px; }
.card { border-radius: 8px; padding: 16px; display: grid; gap: 10px; }
.header { display: flex; align-items: center; gap: 8px; }
.spacer { flex: 1; }
.title { margin: 0; }
.meta { color: #666; font-size: 12px; display: flex; align-items: center; gap: 6px; }
.creator { display: inline-flex; align-items: center; gap: 6px; }
.avatar { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; display: inline-block; }
.avatar.placeholder { background: #f0f0f0; color: #666; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
.username { font-weight: 500; }
.desc { white-space: pre-wrap; }
.carousel { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; }
.viewport {
  position: relative;
  width: 100%;
  height: 360px;
  border: 1px solid light-dark(#eee, #3a3a3a);
  border-radius: 8px;
  overflow: hidden;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}
.slide { max-width: 100%; max-height: 100%; object-fit: contain; display: block; cursor: zoom-in }
.nav {
  border: 1px solid light-dark(#eee, #3a3a3a);
  background-color: light-dark(#52c3ce, #181f29);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: background-color .2s ease-in-out,
  color .2s ease-in-out;

  &:hover {
    background-color: light-dark(#52c3ce, #52c3ce);
    color: light-dark(#fff, #000);
  }
}
.dots { display: flex; gap: 6px; justify-content: center; }
.dot { width: 8px; height: 8px; background: #ddd; border-radius: 50%; border: none; cursor: pointer; padding: 0; }
.dot.active { background: #2b59c3; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag {
  background: light-dark(#56cbd0, #131f29);
  color: light-dark(#fff, #56cbd0);
  border: 1px solid light-dark(#fff, #131f29);
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 12px;
}
.actions { display: flex; gap: 8px; }
.btn {
  border: none;
  background-color: light-dark(#52c3ce, #181f29);
  color: light-dark(#000, #fff);
  padding: 10px;
  border-radius: 10px;
  text-decoration: none;
  cursor: pointer;
  transition: background-color .2s ease-in-out,
  color .2s ease-in-out;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;

  > svg > path {
    fill: light-dark(#000, #fff);
    transition: fill .2s ease-in-out;
  }

  &:hover {
    background-color: light-dark(#52c3ce66, #52c3ce);
    color: light-dark(#000, #000);

    > svg > path {
      fill: light-dark(#000, #000);
    }
  }
}
.btn.primary { background: #2b59c3; color: #fff; border-color: #2b59c3; }

/* Slide animations (plus douce/fluide) */
/* Courbe d'animation plus naturelle et durée un peu plus longue */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 420ms cubic-bezier(.22, .61, .36, 1), opacity 420ms cubic-bezier(.22, .61, .36, 1);
  will-change: transform, opacity;
}

/* Suivant: la nouvelle slide vient de la droite vers la gauche */
.slide-left-enter-from { transform: translateX(30%) scale(0.985); opacity: 0.35; }
.slide-left-enter-to { transform: translateX(0) scale(1); opacity: 1; }
.slide-left-leave-from { transform: translateX(0) scale(1); opacity: 1; position: absolute; inset: 0 auto auto 0; }
.slide-left-leave-to { transform: translateX(-30%) scale(1.015); opacity: 0.35; }

/* Précédent: la nouvelle slide vient de la gauche vers la droite */
.slide-right-enter-from { transform: translateX(-30%) scale(0.985); opacity: 0.35; }
.slide-right-enter-to { transform: translateX(0) scale(1); opacity: 1; }
.slide-right-leave-from { transform: translateX(0) scale(1); opacity: 1; position: absolute; inset: 0 auto auto 0; }
.slide-right-leave-to { transform: translateX(30%) scale(1.015); opacity: 0.35; }

/* Réduction des animations si l'utilisateur préfère moins d'effets */
@media (prefers-reduced-motion: reduce) {
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active {
    transition-duration: 180ms;
  }
}

/* Image modal */
.img-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: zoom-in;
}
.img-modal:has(.modal-image) { /* hint for supporting browsers */ }
.modal-inner {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.modal-image {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  user-select: none;
  will-change: transform;
  transition: transform 120ms ease-out;
  cursor: grab;
}
.modal-image:active { cursor: grabbing; }
.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255,255,255,.1);
  color: #fff;
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}
.close-btn:hover { background: rgba(255,255,255,.2); }
</style>
