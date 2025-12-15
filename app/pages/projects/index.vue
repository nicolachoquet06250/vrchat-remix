<script setup lang="ts">
import {useHelpers} from "@/composables/useHelpers";

definePageMeta({
  name: 'home'
})

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
const mineOnly = ref<boolean>(
  route.query.mineOnly === 'true' || route.query.mineOnly === '1'
)

const qd = useDebounce(q, 1000);

const query = computed(() => ({
  q: qd.value || undefined,
  tag: tag.value || undefined,
  page: page.value,
  pageSize,
  mineOnly: mineOnly.value || undefined,
}));

const { data, pending, refresh } = await useFetch('/api/projects', { query, watch: [qd, tag, page, mineOnly] })

// Alertes de recherche (sauvegarde par e‑mail)
const { data: alerts, refresh: refreshAlerts } = await useFetch('/api/search-alerts', { method: 'GET' })

const showAlerts = ref(false)
const saving = ref(false)
const saveMsg = ref<string|undefined>()
const searchTypeBool = ref<boolean>(false)
const searchBy = computed(() => searchTypeBool.value ? 'project' : 'tag');

async function saveCurrentSearch() {
  if (!user.value) return
  const type = searchBy.value
  const queryVal = (type === 'project' ? q.value : tag.value).trim()
  if (!queryVal) return
  saving.value = true
  saveMsg.value = undefined
  try {
    await $fetch('/api/search-alerts', {
      method: 'POST',
      body: { type, query: queryVal },
    })
    await refreshAlerts()
    saveMsg.value = 'Alerte enregistrée'
  } catch (e: any) {
    saveMsg.value = e?.data?.statusMessage || 'Erreur lors de l’enregistrement'
  } finally {
    saving.value = false
    setTimeout(() => (saveMsg.value = undefined), 2500)
  }
}

async function deleteAlert(id: number) {
  await $fetch(`/api/search-alerts/${id}`, { method: 'DELETE' })
  await refreshAlerts()
}

function onSearch() {
  page.value = 1
  router.replace({
    query: {
      q: q.value || undefined,
      tag: tag.value || undefined,
      page: page.value,
      // @ts-ignore
      mineOnly: (mineOnly.value ?? false),
    }
  })
  refresh()
}

function go(p: number) {
  page.value = p
  router.replace({
    query: {
      q: q.value || undefined,
      tag: tag.value || undefined,
      page: page.value,
      // @ts-ignore
      mineOnly: (mineOnly.value ?? false),
    }
  })
}

function toggleMineOnly() {
  // Réinitialise la pagination et met à jour l'URL
  page.value = 1
  router.replace({
    query: {
      q: q.value || undefined,
      tag: tag.value || undefined,
      page: page.value,
      // @ts-ignore
      mineOnly: (mineOnly.value ?? false),
    },
  })
}
</script>

<template>
  <Head>
    <Title>Liste des projets</Title>
  </Head>

  <div class="container">
    <div class="header">
      <h1>Projets</h1>
      <div style="display: flex; flex-direction: row; justify-content: center; align-items: center; gap: 5px;">
        <button v-if="user && (alerts?.length ?? 0) > 0" class="btn no-auto" type="button" @click="showAlerts = true">Mes recherches</button>
        <NuxtLink v-if="user" :to="{name: 'create-project'}" class="btn">Nouveau projet</NuxtLink>
      </div>
    </div>

    <form class="filters" @submit.prevent="onSearch">
      <UiSwitch
          id="searchTypeSwitch"
          style="margin-right: 20px;"
          v-model="searchTypeBool"
          :label="{
            before: 'Nom',
            after: 'Tag'
          }"
      />

      <div class="search-zone">
        <button type="submit">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 640 640">
            <path d="M480 272C480 317.9 465.1 360.3 440 394.7L566.6 521.4C579.1 533.9 579.1 554.2 566.6 566.7C554.1 579.2 533.8 579.2 521.3 566.7L394.7 440C360.3 465.1 317.9 480 272 480C157.1 480 64 386.9 64 272C64 157.1 157.1 64 272 64C386.9 64 480 157.1 480 272zM272 416C351.5 416 416 351.5 416 272C416 192.5 351.5 128 272 128C192.5 128 128 192.5 128 272C128 351.5 192.5 416 272 416z"/>
          </svg>
        </button>
        <input v-model="q" type="search" placeholder="Rechercher un projet" v-if="searchBy === 'project'" />
        <input v-model="tag" type="text" placeholder="Tag (ex: avatar)" v-if="searchBy === 'tag'" />
      </div>

      <div v-if="user && ((searchBy==='project' && q) || (searchBy==='tag' && tag))" class="alerts">
        <button type="button" class="btn" :disabled="saving" @click="saveCurrentSearch">
          {{ saving ? 'Enregistrement…' : 'Enregistrer cette recherche' }}
        </button>
        <span v-if="saveMsg" class="hint">{{ saveMsg }}</span>
      </div>

      <div v-if="user" class="mine-only">
        <UiSwitch
          id="mineOnlySwitch"
          v-model="mineOnly"
          :label="{
            before: 'Tous les projets',
            after: 'Mes projets'
          }"
          @update:modelValue="toggleMineOnly"
        />
      </div>
    </form>

    <UiModal v-model="showAlerts" title="Mes recherches enregistrées">
      <template v-if="alerts?.length">
        <table class="alerts-table">
          <thead>
          <tr>
            <th>Type</th>
            <th>Recherche</th>
            <th class="actions">Actions</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="a in alerts" :key="a.id">
            <td>{{ a.type === 'tag' ? 'Tag' : 'Nom' }}</td>
            <td>{{ a.query }}</td>
            <td class="actions">
              <button type="button" class="danger" @click="deleteAlert(a.id)" aria-label="Supprimer cette alerte">
                <!-- Icône poubelle -->
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 448 512" aria-hidden="true" focusable="false" style="vertical-align: middle; margin-right: 6px;">
                  <path fill="currentColor" d="M135.2 17.7C140.6 7.1 151.4 0 163.5 0h121c12.1 0 22.9 7.1 28.3 17.7L328 32H432c8.8 0 16 7.2 16 16s-7.2 16-16 16H16C7.2 64 0 56.8 0 48S7.2 32 16 32H120l15.2-14.3zM32 96H416l-21.2 371.6c-1.8 31.4-27.7 56.4-59.2 56.4H112.4c-31.5 0-57.4-25-59.2-56.4L32 96zm128 64c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V176c0-8.8-7.2-16-16-16zm128 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V176c0-8.8-7.2-16-16-16z"/>
                </svg>
                <span>Supprimer</span>
              </button>
            </td>
          </tr>
          </tbody>
        </table>
      </template>
      <template v-else>
        <p>Aucune recherche enregistrée pour le moment.</p>
      </template>
    </UiModal>

    <div v-if="pending">Chargement…</div>
    <div v-else>
      <div v-if="!data?.items?.length">Aucun projet trouvé.</div>

      <ul class="grid">
        <li v-for="p in data?.items!" :key="p.id" class="card">
          <NuxtLink :to="{name: 'project', params: {id: p.id}}">
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
a:focus, button:focus {
  outline: 1px solid light-dark(#0005, #fff5);
}
.container { display: grid; gap: 16px; }
.header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.header .btn {
  margin-left: auto;
  cursor: pointer;
  transition: background-color .2s ease-in-out,
  color .2s ease-in-out;

  &:hover {
    background-color: light-dark(#52c3ce66, #52c3ce);
    color: light-dark(#000, #000);
  }
}
.btn {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  background-color: light-dark(#52c3ce, #181f29);
  color: light-dark(#000, #fff);
  padding: 10px;
  border: none;
  border-radius: 10px;
  text-decoration: none;
  cursor: pointer;
  transition: background-color .2s ease-in-out,
  color .2s ease-in-out;

  &:hover {
    background-color: light-dark(#52c3ce, #52c3ce);
    color: light-dark(#fff, #000);
  }
}
.square-btn {
  background-color: light-dark(#fff, #181f29);
  color: light-dark(#000, #fff);
  border-radius: 10px;
  text-decoration: none;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color .2s ease-in-out,
  color .2s ease-in-out;

  &:not(:disabled) {
    cursor: pointer;

    &:focus {
      outline: 2px solid #52c3ce;
    }

    &:hover {
      background-color: light-dark(#e6e6e6, #52c3ce);
      color: light-dark(#000, #000);
    }
  }
}
.filters {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;

  > div {
    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: center;
  }
}
.search-zone {
  max-width: 50%;
  border: 1px solid black;
  background-color: light-dark(#fff, #0b141e);
  border-radius: 5px;

  &:has(input:focus) {
    outline: light-dark(#0005, #fff5) solid 2px;
    outline-offset: 1px;
  }

  > button {
    background-color: transparent;
    border: none;
    outline: none;
    cursor: pointer;
    > svg > path {
      fill: light-dark(#000, #fff);
    }

    + input {
      border: none;
      background-color: transparent;
      outline: none;

      &::placeholder {
        color: light-dark(#000, #fff);
      }
    }
  }
}
.grid { list-style: none; display: flex; flex-direction: row; flex-wrap: wrap; gap: 12px; padding: 0; margin: 0; }
.card {
  border: 1px solid light-dark(#eee, #3a3a3a);
  border-radius: 8px;
  padding: 12px;
  display: grid;
  gap: 6px;
  cursor: pointer;
  width: 15%;
  min-width: 320px;
  * {
    text-decoration: none;
    color: light-dark(#000, #fff);
  }

  > a {
    outline: none;
  }

  &:has(> a:focus) {
    outline: 1px solid light-dark(#0005, #57cfd5);
  }

  &:has(> a) {
    transition: background-color .5s ease-in-out;
    &:hover {
      background-color: light-dark(#e6e6e6, #17233a);

      .tag {
        border-color: #56cbd0;
      }
    }
  }
}
.cover { width: 100%; height: 160px; margin-bottom: 15px; border-radius: 6px; overflow: hidden; background: light-dark(#f2f2f2, #080f19); border: 1px solid light-dark(#eee, #3a3a3a); }
.cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover.placeholder { background: repeating-linear-gradient(45deg, #f7f7f7, #f7f7f7 10px, #f2f2f2 10px, #f2f2f2 20px); }
.title { font-weight: 600; }
.meta { color: light-dark(#666, #fff); font-size: 12px; display: flex; align-items: center; gap: 6px; margin-top: 10px }
.creator { display: inline-flex; align-items: center; gap: 6px; }
.avatar { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; display: inline-block; }
.avatar.placeholder { background: #f0f0f0; color: #666; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
.username { font-weight: 500; }
.desc { color: light-dark(#333, #fff); }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag {
  background: light-dark(#56cbd0, #131f29);
  color: light-dark(#fff, #56cbd0);
  border: 1px solid light-dark(#fff, #131f29);
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 12px;
  transition: border-bottom-color .5s ease-in-out,
  border-top-color .5s ease-in-out,
  border-right-color .5s ease-in-out,
  border-left-color .5s ease-in-out;
}
.pagination { display: flex; align-items: center; gap: 8px; justify-content: center; margin-top: 8px; }

/* Tableau des recherches enregistrées (zébré 1 ligne sur 2) */
.alerts-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.alerts-table th,
.alerts-table td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid light-dark(#eee, #2a2a2a);
}
.alerts-table thead th {
  color: light-dark(#000, #fff);
}
.alerts-table tbody tr:nth-child(even) {
  background-color: light-dark(#f6f6f6, #121a24);
}
.alerts-table tbody tr:hover {
  background-color: light-dark(#eeeeee, #17233a);
}
.alerts-table .actions {
  text-align: right;
  white-space: nowrap;
}

/* Bouton danger (cohérent avec le style existant ailleurs) */
.danger {
  background: #d9534f;
  color: #fff;
  border: 1px solid #d9534f;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.danger:hover {
  background: #c9302c;
  border-color: #c9302c;
}
.danger:disabled {
  opacity: .6;
  cursor: not-allowed;
}
</style>
