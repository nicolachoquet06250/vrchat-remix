<script setup lang="ts">
const route = useRoute()
const id = Number(route.params.id)
const { user } = useSession()

const { data, pending, error } = await useFetch(`/api/projects/${id}`)

// images for carousel
const { data: images } = await useFetch(`/api/projects/${id}/images`)
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
</script>

<template>
  <div class="container">
    <div v-if="pending">Chargement…</div>
    <div v-else-if="error">Introuvable</div>
    <div v-else class="card">
      <div class="header">
        <h1 class="title">{{ data!.name }}</h1>
        <div class="spacer" />
        <NuxtLink v-if="isOwner" :to="{path: `/projects/${id}/edit`}" class="btn">Modifier</NuxtLink>
      </div>
      <div class="meta">par #{{ data!.userId }} • {{ new Date(data!.createdAt).toLocaleString() }}</div>
      <p class="desc">{{ data!.description }}</p>
      <template v-if="hasImages">
        <div class="carousel">
          <button class="nav" @click="prev" aria-label="Précédent">‹</button>
          <div class="viewport">
            <Transition :name="transitionName" mode="out-in">
              <img
                  v-if="currentImg"
                  class="slide"
                  :key="current"
                  :src="`/api/projects/images/${currentImg.id}`"
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
      <div class="tags" v-if="data!.tags.length > 0">
        <span class="tag" v-for="t in data!.tags" :key="t">#{{ t }}</span>
      </div>
      <div class="file" v-if="data!.hasFile">
        <div>Fichier: {{ data!.fileName }} <span v-if="data!.fileSize">({{ Math.round(data!.fileSize!/1024) }} Ko)</span></div>
      </div>
      <div class="actions">
        <a v-if="data!.hasFile" :href="`/api/projects/${id}/download`" class="btn primary">Télécharger</a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container { display: grid; gap: 16px; }
.card { border: 1px solid #eee; border-radius: 8px; padding: 16px; display: grid; gap: 10px; }
.header { display: flex; align-items: center; gap: 8px; }
.spacer { flex: 1; }
.title { margin: 0; }
.meta { color: #666; font-size: 12px; }
.desc { white-space: pre-wrap; }
.carousel { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; }
.viewport { position: relative; width: 100%; height: 360px; border: 1px solid #eee; border-radius: 8px; overflow: hidden; background: #fafafa; display: flex; align-items: center; justify-content: center; }
.slide { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
.nav { border: 1px solid #ddd; background: #fff; border-radius: 6px; width: 36px; height: 36px; font-size: 22px; line-height: 1; cursor: pointer; }
.dots { display: flex; gap: 6px; justify-content: center; }
.dot { width: 8px; height: 8px; background: #ddd; border-radius: 50%; border: none; cursor: pointer; padding: 0; }
.dot.active { background: #2b59c3; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { background: #f5f5f5; border: 1px solid #eee; padding: 2px 6px; border-radius: 999px; font-size: 12px; }
.actions { display: flex; gap: 8px; }
.btn { border: 1px solid #ddd; padding: 6px 10px; border-radius: 6px; text-decoration: none; cursor: pointer; }
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
