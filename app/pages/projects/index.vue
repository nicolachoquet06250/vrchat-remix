<script setup lang="ts">
import {useHelpers} from "@/composables/useHelpers";

const route = useRoute()
const router = useRouter()
const { user } = useSession()
const { ucFirst } = useHelpers()

useSeoMeta({
  ogTitle: 'Liste des projets',
  ogImage: '/vrchat-remix.png',
  description: 'Equivalent de la fonctionnalité remix de meta pour vrchat',
  ogDescription: 'Equivalent de la fonctionnalité remix de meta pour vrchat',
  twitterCard: 'app'
})

const q = ref<string>((route.query.q as string) || '')
const tag = ref<string>((route.query.tag as string) || '')
const page = ref<number>(Number(route.query.page || 1))
const pageSize = 20

const qd = useDebounce(q, 1000);

const query = computed(() => ({
  q: qd.value || undefined,
  tag: tag.value || undefined,
  page: page.value,
  pageSize
}));

const { data, pending, refresh } = await useFetch('/api/projects', { query, watch: [qd, tag, page] })

function onSearch() {
  page.value = 1
  router.replace({ query: { q: q.value || undefined, tag: tag.value || undefined, page: page.value } })
  refresh()
}

function go(p: number) {
  page.value = p
  router.replace({ query: { q: q.value || undefined, tag: tag.value || undefined, page: page.value } })
}
</script>

<template>
  <Head>
    <Title>Liste des projets</Title>
  </Head>

  <div class="container">
    <div class="header">
      <h1>Projets</h1>
      <NuxtLink v-if="user" to="/projects/new" class="btn">Nouveau projet</NuxtLink>
    </div>

    <form class="filters" @submit.prevent="onSearch">
      <input v-model="q" type="search" placeholder="Rechercher un projet" />
      <input v-model="tag" type="text" placeholder="Tag (ex: avatar)" />
      <button type="submit">Rechercher</button>
    </form>

    <div v-if="pending">Chargement…</div>
    <div v-else>
      <div v-if="!data?.items?.length">Aucun projet trouvé.</div>
      <ul class="grid">
        <li v-for="p in data?.items!" :key="p.id" class="card">
          <NuxtLink :to="{path: `/projects/${p.id}`}">
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
                  <span class="avatar placeholder">{{ (p.creatorUsername || '#'+p.userId).charAt(0).toUpperCase() }}</span>
                </template>
                <span class="username">{{ p.creatorUsername || ('#'+p.userId) }}</span>
              </span>
              • {{ new Date(p.createdAt).toLocaleDateString() }}
            </div>
            <p class="desc">{{ p.description ? ucFirst(p.description) : 'Description vide' }}</p>
            <div class="tags">
              <span class="tag" v-for="t in p.tags" :key="t">#{{ t }}</span>
            </div>
          </NuxtLink>
        </li>
      </ul>

      <div v-if="(data?.total || 0) > pageSize" class="pagination">
        <button :disabled="page<=1" @click="go(page-1)">Précédent</button>
        <span>Page {{ page }}</span>
        <button :disabled="(data?.items?.length||0) < pageSize" @click="go(page+1)">Suivant</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container { display: grid; gap: 16px; }
.header { display: flex; align-items: center; gap: 12px; }
.header .btn { margin-left: auto; }
.filters { display: flex; gap: 8px; align-items: center; }
.grid { list-style: none; display: grid; grid-template-columns: repeat(auto-fill,minmax(280px,1fr)); gap: 12px; padding: 0; margin: 0; }
.card {
  border: 1px solid #eee; border-radius: 8px; padding: 12px; display: grid; gap: 6px; cursor: pointer;
  * {
    text-decoration: none;
    color: black;
  }

  &:has(> a) {
    transition: background-color .5s ease-in-out;
    &:hover {
      background-color: #e6e6e6;
    }
  }
}
.cover { width: 100%; height: 160px; border-radius: 6px; overflow: hidden; background: #f2f2f2; border: 1px solid #eee; }
.cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover.placeholder { background: repeating-linear-gradient(45deg, #f7f7f7, #f7f7f7 10px, #f2f2f2 10px, #f2f2f2 20px); }
.title { font-weight: 600; }
.meta { color: #666; font-size: 12px; display: flex; align-items: center; gap: 6px; }
.creator { display: inline-flex; align-items: center; gap: 6px; }
.avatar { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; display: inline-block; }
.avatar.placeholder { background: #f0f0f0; color: #666; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
.username { font-weight: 500; }
.desc { color: #333; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { background: #f5f5f5; border: 1px solid #eee; padding: 2px 6px; border-radius: 999px; font-size: 12px; }
.pagination { display: flex; align-items: center; gap: 8px; justify-content: center; margin-top: 8px; }
</style>
