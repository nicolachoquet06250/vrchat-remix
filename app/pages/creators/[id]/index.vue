<script setup lang="ts">
import type {Creator} from "~~/server/api/creators/[id].get";

const route = useRoute()
const router = useRouter()
const { user } = useSession()
const { t, locale } = useI18n()

const id = computed(() => Number(route.params.id))
const page = ref<number>(Number(route.query.page || 1))
const pageSize = 20

const query = computed(() => ({ page: page.value, pageSize }))

const { data, pending, error, refresh } = await useFetch<Creator>(`/api/creators/${id.value}`, {
  query,
  watch: [id, page],
})

// Désactivation du profil (créateur affiché) — visible uniquement pour un utilisateur connecté avec rôle "creator"
const disableLoading = ref(false)
const disableMessage = ref<string | null>(null)
const disableError = ref<string | null>(null)
const confirmOpen = ref(false)
const confirmLoading = ref(false)

function onDisableCreator() {
  // Ouvre la modal de confirmation
  disableMessage.value = null
  disableError.value = null
  confirmOpen.value = true
}

async function onConfirmDisable() {
  confirmLoading.value = true
  disableLoading.value = true
  try {
    await $fetch(`/api/users/${id.value}/disable`, { method: 'POST' })
    disableMessage.value = t('profil.disable.success') as string
    confirmOpen.value = false
  } catch (e: any) {
    disableError.value = e?.statusMessage || (t('profil.disable.error') as string)
  } finally {
    confirmLoading.value = false
    disableLoading.value = false
  }
}

definePageMeta({
  name: 'creator'
})

useSeoMeta({
  title: () => `VRC Remix - ${data.value?.user ? `Créateur · ${data.value.user.username}` : 'Créateur'}`,
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
        <div v-if="user?.role === 'creator' && user?.id !== parseInt(route.params.id as string)"
             class="meta"
             style="margin-left: auto;"
        >
          <button class="danger" :disabled="disableLoading" @click="onDisableCreator">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="20" height="20">
              <path style="fill: light-dark(#000, #fff);" d="M431.2 476.5L163.5 208.8C141.1 240.2 128 278.6 128 320C128 426 214 512 320 512C361.5 512 399.9 498.9 431.2 476.5zM476.5 431.2C498.9 399.8 512 361.4 512 320C512 214 426 128 320 128C278.5 128 240.1 141.1 208.8 163.5L476.5 431.2zM64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320z"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- Bouton désactiver (créateur connecté uniquement) -->
      <div v-if="user?.role === 'creator'" class="disable-row">
        <span v-if="disableMessage" class="status ok">{{ disableMessage }}</span>
        <span v-if="disableError" class="status err">{{ disableError }}</span>
      </div>

      <!-- Modal de confirmation Oui / Non -->
      <teleport to="body">
        <div v-if="confirmOpen" class="modal-overlay" @click.self="confirmOpen = false" @keydown.esc="confirmOpen = false" tabindex="-1">
          <div class="modal" role="dialog" aria-modal="true">
            <div class="modal-body">
              <p>{{ $t('profil.disable.confirm') }}</p>
            </div>
            <div class="modal-actions">
              <button class="btn" :disabled="confirmLoading" @click="confirmOpen = false">Non</button>
              <button class="btn danger" :disabled="confirmLoading" @click="onConfirmDisable()">Oui</button>
            </div>
          </div>
        </div>
      </teleport>

      <section class="projects">
        <div v-if="!data.items.length" class="empty">Aucun projet public.</div>
        <ul v-else class="grid">
          <li v-for="p in data.items" :key="p.id" class="card">
            <NuxtLink :to="{name: `project___${locale}`, params: {id: p.id}}" class="thumb" :title="p.name">
              <img v-if="p.coverImageId" :src="`/api/projects/images/carousel-image?id=${p.coverImageId}`" :alt="p.name"/>
              <div v-else class="no-image">Aperçu indisponible</div>
            </NuxtLink>
            <div class="body">
              <NuxtLink :to="{name: `project___${locale}`, params: {id: p.id}}" class="name">{{ p.name }}</NuxtLink>
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
/* simple styles pour la rangée de désactivation */
.disable-row { display: flex; align-items: center; gap: 10px; margin: 8px 0 16px; }
.danger { padding: 6px 10px; border-radius: 6px; border: 1px solid #7f1d1d; background: #450a0a; color: #fff; cursor: pointer; }
.danger[disabled] { opacity: .6; cursor: not-allowed; }
.status.ok { color: #22c55e; }
.status.err { color: #ef4444; }

/* Modal simple */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: light-dark(#111,#111); color: inherit; border: 1px solid light-dark(#2a2a2a,#2a2a2a); border-radius: 10px; width: min(480px, calc(100vw - 32px)); box-shadow: 0 10px 30px rgba(0,0,0,.4); }
.modal-body { padding: 18px 16px 8px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; padding: 12px 16px 16px; }
.btn { padding: 6px 10px; border-radius: 6px; border: 1px solid light-dark(#e5e7eb,#374151); background: light-dark(#fff,#222); color: inherit; cursor: pointer; }
</style>
