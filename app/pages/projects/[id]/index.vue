<script setup lang="ts">
definePageMeta({
  name: 'project'
})
const route = useRoute()
const id = Number(route.params.id)
const { user } = useSession()
const { ucFirst } = useHelpers()

const { data, pending, error, refresh } = await useFetch(`/api/projects/${id}`)

// images for carousel
const { data: images } = await useFetch(`/api/projects/${id}/images`)

useSeoMeta({
  ogTitle: computed(() => data.value!.name),
  ogImage: computed(() => {
    if (images.value && images.value.length > 0) {
      return `/api/projects/images/og-image?id=${[...images.value].shift()!.id}&d=${new Date().getTime()}`
    }
    return '/vrchat-remix.png'
  }),
  description: computed(() => data.value!.description),
  ogDescription: computed(() => data.value!.description),
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
</script>

<template>
  <Head>
    <Title>{{ucFirst(data!.name)}}</Title>
  </Head>

  <div class="container">
    <div v-if="pending">Chargement…</div>
    <div v-else-if="error">Introuvable</div>
    <div v-else class="card">
      <div class="header">
        <h1 class="title">{{ ucFirst(data!.name) }}</h1>
        <div class="spacer" />
        <NuxtLink v-if="isOwner" :to="{name: 'edit-project', params: {id}}" class="btn">Modifier</NuxtLink>
      </div>

      <div class="meta">
        <span class="creator">
          <NuxtLink :to="{name: 'creator', params: {id: data!.userId}}" style="text-decoration: underline; color: light-dark(#000, #666); display: inline-flex; flex-direction: row; justify-content: center; align-items: center; gap: 5px">
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
        • {{ new Date(data!.createdAt).toLocaleString() }}
      </div>

      <p class="desc">{{ ucFirst(data!.description ?? '') }}</p>

      <div class="tags" v-if="data!.tags.length > 0">
        <span class="tag" v-for="t in data!.tags" :key="t">#{{ t }}</span>
      </div>

      <div class="file" v-if="data!.hasFile">
        <div>Fichier: {{ data!.fileName }} <span v-if="data!.fileSize">({{ Math.round(data!.fileSize!/1024) }} Ko)</span></div>
      </div>
      <div class="actions">
        <a v-if="data!.hasFile" :href="`/api/projects/${id}/download`" class="btn primary">Télécharger</a>
        <button
          v-if="user && data"
          class="btn"
          :disabled="toggling"
          type="button"
          @click="toggleFavorite"
          :aria-pressed="isFavorite"
        >
          <template v-if="isFavorite">
            <svg v-if="isFavorite" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
              <path d="M192 64C156.7 64 128 92.7 128 128L128 544C128 555.5 134.2 566.2 144.2 571.8C154.2 577.4 166.5 577.3 176.4 571.4L320 485.3L463.5 571.4C473.4 577.3 485.7 577.5 495.7 571.8C505.7 566.1 512 555.5 512 544L512 128C512 92.7 483.3 64 448 64L192 64z"/>
            </svg>
            Retirer des favoris
          </template>
          <template v-else>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
              <path d="M128 128C128 92.7 156.7 64 192 64L448 64C483.3 64 512 92.7 512 128L512 545.1C512 570.7 483.5 585.9 462.2 571.7L320 476.8L177.8 571.7C156.5 585.9 128 570.6 128 545.1L128 128zM192 112C183.2 112 176 119.2 176 128L176 515.2L293.4 437C309.5 426.3 330.5 426.3 346.6 437L464 515.2L464 128C464 119.2 456.8 112 448 112L192 112z"/>
            </svg>
            Ajouter aux favoris
          </template>
        </button>
        <span v-if="favMsg" class="hint error">{{ favMsg }}</span>
      </div>

      <template v-if="hasImages">
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
    </div>
  </div>
</template>

<style scoped>
.container { display: grid; gap: 16px; }
.card { border: 1px solid #eee; border-radius: 8px; padding: 16px; display: grid; gap: 10px; }
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
.slide { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
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
      fill: light-dark(#fff, #000);
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
</style>
