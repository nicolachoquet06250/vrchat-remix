<script setup lang="ts">
import type {Creator} from "~~/server/api/creators/[id].get";

const route = useRoute()
const router = useRouter()

const id = computed(() => Number(route.params.id))
const page = ref<number>(Number(route.query.page || 1))
const pageSize = 20

const query = computed(() => ({ page: page.value, pageSize }))

const { data, pending, error, refresh } = await useFetch<Creator>(`/api/creators/${id.value}`, {
  query,
  watch: [id, page],
})

definePageMeta({
  name: 'creator'
})

useSeoMeta({
  title: () => data.value?.user ? `Créateur · ${data.value.user.username}` : 'Créateur',
  ogTitle: () => data.value?.user ? `VRC Remix - ${data.value.user.username}` : 'VRC Remix - Créateur',
  description: 'Profil créateur et projets publics',
  ogDescription: 'Profil créateur et projets publics',
  ogImage: '/vrchat-remix.png',
})

function go(p: number) {
  page.value = p
  router.replace({
    query: { page: page.value },
  })
}
</script>

<template>
  <div class="creator-page">
    <div v-if="pending" class="loading">Chargement…</div>
    <div v-else-if="error" class="error">Erreur: {{ (error as any)?.data?.statusMessage || (error as any)?.message || 'inconnue' }}</div>
    <div v-else-if="!data?.user" class="error">Créateur introuvable</div>
    <div v-else>
      <header class="creator-header">
        <div class="avatar-wrap">
          <img v-if="data.user.avatarUrl" :src="data.user.avatarUrl" :alt="`Avatar de ${data.user.username}`" class="avatar"/>
          <span v-else class="avatar placeholder">{{ data.user.username.charAt(0).toUpperCase() }}</span>
        </div>
        <div class="meta">
          <h1 class="username">{{ data.user.username }}</h1>
          <p class="count">{{ data.total }} projet(s) public(s)</p>
        </div>
      </header>

      <section class="projects">
        <div v-if="!data.items.length" class="empty">Aucun projet public.</div>
        <ul v-else class="grid">
          <li v-for="p in data.items" :key="p.id" class="card">
            <NuxtLink :to="`/projects/${p.id}`" class="thumb" :title="p.name">
              <img v-if="p.coverImageId" :src="`/api/projects/images/carousel-image?id=${p.coverImageId}`" :alt="p.name"/>
              <div v-else class="no-image">Aperçu indisponible</div>
            </NuxtLink>
            <div class="body">
              <NuxtLink :to="`/projects/${p.id}`" class="name">{{ p.name }}</NuxtLink>
              <div class="tags">
                <span v-for="t in p.tags" :key="t" class="tag">#{{ t }}</span>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <div v-if="(data.total || 0) > pageSize" class="pagination">
        <button :disabled="page <= 1" @click="go(page-1)">Précédent</button>
        <span>Page {{ page }}</span>
        <button :disabled="(data.items?.length||0) < pageSize" @click="go(page+1)">Suivant</button>
      </div>
    </div>
  </div>
  
</template>

<style scoped>
.creator-page { max-width: 1000px; margin: 0 auto; padding: 20px; }
.loading, .error, .empty { padding: 16px; }
.creator-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.avatar-wrap { width: 64px; height: 64px; position: relative; }
.avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
.avatar.placeholder { width: 64px; height: 64px; border-radius: 50%; background: #ccc; color: #333; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.username { margin: 0; }
.count { margin: 4px 0 0; color: #666; font-size: 14px; }
.projects .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
.card { background: #111; border: 1px solid #2a2a2a; border-radius: 8px; overflow: hidden; }
.thumb { display: block; background: #222; aspect-ratio: 16/9; }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.no-image { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #888; font-size: 12px; }
.body { padding: 10px; }
.name { color: #fff; font-weight: 600; display: inline-block; margin-bottom: 6px; text-decoration: none; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { background: #1a1a1a; border: 1px solid #2a2a2a; color: #bbb; font-size: 12px; padding: 2px 6px; border-radius: 12px; }
.pagination { margin-top: 16px; display: flex; gap: 12px; align-items: center; justify-content: center; }
.pagination button { padding: 6px 10px; }
</style>
