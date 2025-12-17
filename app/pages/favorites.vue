<script setup lang="ts">
const { user } = useSession()
const {locale} = useI18n()

onMounted(() => {
  setTimeout(() => {
    if (!user.value) {
      navigateTo('/login?next=/favorites')
    }
  }, 1000)
})

definePageMeta({
  name: 'favorites'
})

useSeoMeta({
  title: 'VRC Remix - Mes favoris',
  ogTitle: 'VRC Remix - Mes favoris',
  description: 'Retrouvez ici tous les projets que vous avez ajoutés à vos favoris.',
  ogDescription: 'Vos projets favoris sur VRC Remix.',
  twitterCard: 'app'
})

const { data, pending, error, refresh } = await useFetch('/api/favorites')

function ucFirst(s?: string | null) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Favoris sur la liste
const favToggling = ref<Record<number, boolean>>({})
async function toggleFavoriteOnList(projectId: number, isFav: boolean | undefined) {
  if (!user.value) return
  favToggling.value[projectId] = true
  try {
    await $fetch(
        `/api/projects/${projectId}/favorite`,
        { method: isFav ? 'DELETE' : 'POST' }
    )
    await refresh()
  } catch (e) {
    // no-op UI message for maintenant; la page est refresh de toute façon
  } finally {
    favToggling.value[projectId] = false
  }
}
</script>

<template>
  <div class="container">
    <div class="header">
      <h1>{{ $t('favorites.title') }}</h1>
    </div>

    <div v-if="pending">{{ $t('loading') }}</div>
    <div v-else-if="error">{{ $t('favorites.cannot-load') }}</div>
    <template v-else>
      <p v-if="!data?.items?.length">
        {{ $t('favorites.no-fav') }}
      </p>
      <ul v-else class="grid">
        <li v-for="p in data!.items" :key="p.id" class="card">
          <NuxtLink :to="{ name: `project___${locale}`, params: { id: p.id } }">
            <div v-if="p.coverImageId" class="cover">
              <img :src="`/api/projects/images/${p.coverImageId}`" :alt="`${p.name} cover`" />
            </div>
            <div v-else class="cover placeholder" />

            <span class="title">{{ ucFirst(p.name) }}</span>

            <div class="meta">
              <span class="creator">
                <template v-if="p.creatorHasAvatar && p.creatorAvatarUrl">
                  <img class="avatar" :src="p.creatorAvatarUrl" :alt="`Avatar de ${p.creatorUsername || 'utilisateur'}`" />
                </template>
                <template v-else>
                  <span class="avatar placeholder">{{ (p.creatorUsername || ('#'+p.userId)).charAt(0).toUpperCase() }}</span>
                </template>
                <span class="username">{{ p.creatorUsername || ('#'+p.userId) }}</span>
              </span>
              • {{ new Date(p.createdAt).toLocaleDateString(locale) }}
            </div>

            <p class="desc">{{ p.description ? ucFirst(p.description) : $t('favorites.empty-description') }}</p>

            <div class="tags">
              <span class="tag" v-for="t in p.tags" :key="t">#{{ t }}</span>
            </div>
          </NuxtLink>
          <!-- Bouton favori, uniquement si connecté -->
          <button
              v-if="user"
              class="fav-btn"
              type="button"
              :aria-label="p.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
              :title="p.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'"
              :disabled="favToggling[p.id]"
              @click="toggleFavoriteOnList(p.id, p.isFavorite)"
          >
            <!-- Étoile pleine si favori, sinon contour -->
            <svg v-if="p.isFavorite" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="18" height="18">
              <path d="M192 64C156.7 64 128 92.7 128 128L128 544C128 555.5 134.2 566.2 144.2 571.8C154.2 577.4 166.5 577.3 176.4 571.4L320 485.3L463.5 571.4C473.4 577.3 485.7 577.5 495.7 571.8C505.7 566.1 512 555.5 512 544L512 128C512 92.7 483.3 64 448 64L192 64z"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="18" height="18">
              <path d="M128 128C128 92.7 156.7 64 192 64L448 64C483.3 64 512 92.7 512 128L512 545.1C512 570.7 483.5 585.9 462.2 571.7L320 476.8L177.8 571.7C156.5 585.9 128 570.6 128 545.1L128 128zM192 112C183.2 112 176 119.2 176 128L176 515.2L293.4 437C309.5 426.3 330.5 426.3 346.6 437L464 515.2L464 128C464 119.2 456.8 112 448 112L192 112z"/>
            </svg>
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.container { display: grid; gap: 16px; }
.header { display: flex; align-items: center; justify-content: space-between; }
.grid {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  padding: 0;
}
.card {
  position: relative;
  display: grid;
  gap: 10px;
  background: light-dark(#fff, #0b1620);
  color: light-dark(#000, #fff);
  border-radius: 10px;
  padding: 10px;
}
.cover {
  width: 100%;
  height: 160px;
  border-radius: 10px;
  overflow: hidden;
  background: light-dark(#f2f2f2, #0a0a0a);
}
.cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover.placeholder { display: grid; place-items: center; color: #999; }
.title { font-weight: 700; }
.meta { color: #9aa; display: flex; align-items: center; gap: 6px; }
.creator { display: inline-flex; align-items: center; gap: 6px; }
.avatar { width: 20px; height: 20px; border-radius: 50%; }
.avatar.placeholder { display: grid; place-items: center; font-size: 12px; background: #ccc; color: #000; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { background: light-dark(#eef, #17212b); padding: 2px 6px; border-radius: 6px; font-size: 12px; }
a { color: inherit; text-decoration: none; }

.fav-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid light-dark(#eee, #3a3a3a);
  border-radius: 50%;
  background: light-dark(#fff, #0b141e);
  color: light-dark(#f1b100, #f1b100);
  cursor: pointer;
  transition: transform .12s ease-in-out, background-color .2s ease-in-out;

  &:hover {
    transform: scale(1.06);
    background: light-dark(#fdfdfd, #17233a);
  }

  &:disabled {
    opacity: .7;
    cursor: progress;
  }

  > svg > path {
    fill: light-dark(#000, #fff);
  }
}
</style>
