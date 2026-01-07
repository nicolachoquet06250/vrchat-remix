<script setup lang="ts">
import trackRoute from '~~/app/middlewares/track-route.global'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

definePageMeta({
  name: 'admin-analytics',
  middleware: [trackRoute]
})

const { t, locale } = useI18n()
const route = useRoute()

const error = ref();
const years = ref([new Date().getFullYear()]);
const selectedYear = ref(new Date().getFullYear());
const loading = ref(false);

useSeoMeta({
  title: () => `VRC Remix - ${t('admin.analytics.title')}`,
  ogTitle: () => t('admin.analytics.title') as string,
  description: () => t('admin.analytics.description') as string,
  ogDescription: () => t('admin.analytics.description') as string,
})

// Enregistrer les composants de Chart.js côté client uniquement
if (import.meta.client) {
  ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)
}

// 1..12 -> labels localisés courts (réactif pour i18n)
const monthsShort = computed(() => [
  t('months.1'), t('months.2'), t('months.3'), t('months.4'), t('months.5'), t('months.6'),
  t('months.7'), t('months.8'), t('months.9'), t('months.10'), t('months.11'), t('months.12')
] as string[])

const projectsList = ref<{ id: number, name: string, downloadCount: number }[]>([])
const expandedProjectId = ref<number | null>(0)
const currentPage = ref(1)
const totalPages = ref(1)
const totalProjects = ref(0)
const nextUrl = ref<string | null>(null)
const prevUrl = ref<string | null>(null)

async function loadProjects(url?: string) {
  loading.value = true
  try {
    const res = await $fetch<{
      projects: any[],
      total: number,
      page: number,
      totalPages: number,
      next: string | null,
      previous: string | null
    }>(url || '/api/admin/analytics/projects', {
      params: url ? {} : { page: currentPage.value, limit: 10 }
    })
    projectsList.value = res.projects
    totalPages.value = res.totalPages
    totalProjects.value = res.total
    currentPage.value = res.page
    nextUrl.value = res.next
    prevUrl.value = res.previous
  } catch (e: any) {
    error.value = e?.statusMessage || 'Failed to load projects'
  } finally {
    loading.value = false
  }
}

async function loadYears() {
  try {
    const res = await $fetch<{ years: number[] }>(`/api/admin/analytics/downloads/years`)
    years.value = res.years
  } catch (e: any) {
    error.value = e?.statusMessage || 'Failed to load years'
  }
}

// On retire le watch sur currentPage pour éviter les doubles appels
// car on appelle loadProjects directement dans les boutons de pagination
// watch(currentPage, () => loadProjects())

onMounted(async () => {
  await Promise.all([
    loadYears(),
    loadProjects()
  ])
})

function toggleProject(id: number) {
  if (expandedProjectId.value === id) {
    expandedProjectId.value = null
  } else {
    expandedProjectId.value = id
  }
}
</script>

<template>
  <div class="analytics">
    <h1>{{ t('admin.analytics.title') }}</h1>
    
    <div v-if="error" class="error" style="margin-bottom: 16px;">{{ error }}</div>

    <div class="layout">
      <aside class="years">
        <div class="years-title">{{ t('analytics.years') }}</div>
        <button v-if="years.length === 0 || years[0] !== new Date().getFullYear()" :class="['year-btn', { active: new Date().getFullYear() === selectedYear }]" @click="selectedYear = new Date().getFullYear()">
          {{ new Date().getFullYear() }}
        </button>
        <button v-for="y in years" :key="y" :class="['year-btn', { active: y === selectedYear }]" @click="selectedYear = y">
          {{ y }}
        </button>
      </aside>

      <section class="projects-list">
        <div class="accordion-item global-stats">
          <button class="accordion-header" @click="toggleProject(0)">
            <span class="project-name">Statistiques Globales (Tous les projets)</span>
            <svg :class="['chevron', { rotated: expandedProjectId === 0 }]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          <div v-if="expandedProjectId === 0" class="accordion-content">
            <AdminProjectChart :project-id="0" :year="selectedYear" />
          </div>
        </div>

        <div v-for="project in projectsList" :key="project.id" class="accordion-item">
          <button class="accordion-header" @click="toggleProject(project.id)">
            <span class="project-name">{{ project.name }}</span>
            <span class="project-meta">{{ project.downloadCount }} {{ t('project.index.total-downloads') }}</span>
            <svg :class="['chevron', { rotated: expandedProjectId === project.id }]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          
          <div v-if="expandedProjectId === project.id" class="accordion-content">
            <AdminProjectChart :project-id="project.id" :year="selectedYear" />
          </div>
        </div>
        
        <div v-if="projectsList.length === 0 && !loading" class="empty-state">
          Aucun projet avec des téléchargements trouvé.
        </div>

        <div v-if="totalPages > 1" class="pagination">
          <button 
            class="btn" 
            :disabled="!prevUrl || loading" 
            @click="loadProjects(prevUrl!)"
          >
            {{ t('admin.users.pagination.previous') }}
          </button>
          <span class="page-info">Page {{ currentPage }} / {{ totalPages }} ({{ totalProjects }} projets)</span>
          <button 
            class="btn" 
            :disabled="!nextUrl || loading" 
            @click="loadProjects(nextUrl!)"
          >
            {{ t('admin.users.pagination.next') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.analytics { display: grid; gap: 16px; }
.layout { display: grid; grid-template-columns: 140px 1fr; gap: 16px; }
.years { border: 1px solid light-dark(#eee, #2a3441); border-radius: 8px; padding: 12px; height: fit-content; background: light-dark(#fff, #111a24); }
.years-title { font-weight: 600; margin-bottom: 8px; color: light-dark(#111, #fff); }
.year-btn { display:block; width:100%; text-align:left; padding:8px 10px; margin:6px 0; border-radius:6px; border:1px solid light-dark(#eee, #2a3441); background: light-dark(#fafafa, #1c2632); color: light-dark(#333, #ccc); cursor:pointer; }
.year-btn:hover { background: light-dark(#f0f0f0, #252f3d); }
.year-btn.active { background: light-dark(#111, #52c5d0); color: light-dark(#fff, #000); border-color: light-dark(#111, #52c5d0); }

.projects-list { display: flex; flex-direction: column; gap: 8px; }
.accordion-item { border: 1px solid light-dark(#eee, #2a3441); border-radius: 8px; overflow: hidden; background: light-dark(#fff, #111a24); }
.accordion-header { 
  width: 100%; 
  display: flex; 
  align-items: center; 
  padding: 12px 16px; 
  background: light-dark(#fcfcfc, #161f2b); 
  color: light-dark(#000, #fff);
  border: none; 
  cursor: pointer; 
  text-align: left;
  transition: background 0.2s;
}
.accordion-header:hover { background: light-dark(#f5f5f5, #1c2632); }
.project-name { font-weight: 600; flex: 1; }
.project-meta { font-size: 14px; color: light-dark(#666, #aaa); margin-right: 12px; }
.chevron { transition: transform 0.2s; color: light-dark(#999, #666); }
.chevron.rotated { transform: rotate(180deg); }
.accordion-content { padding: 16px; border-top: 1px solid light-dark(#eee, #2a3441); }

.error { color: #ef4444 }
.empty-state { padding: 32px; text-align: center; color: light-dark(#666, #aaa); border: 1px dashed light-dark(#ccc, #444); border-radius: 8px; }

.pagination { 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  gap: 16px; 
  margin-top: 16px; 
  padding: 16px;
  background: light-dark(#fff, #111a24);
  border: 1px solid light-dark(#eee, #2a3441);
  border-radius: 8px;
}
.page-info { font-size: 14px; color: light-dark(#666, #aaa); }
.btn {
  background-color: light-dark(rgba(82, 195, 206, 1), rgba(82, 195, 206, 1));
  color: light-dark(#000, #000);
  padding: 8px 16px;
  border-radius: 10px;
  text-decoration: none;
  border: none;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 720px) {
  .layout { grid-template-columns: 1fr; }
}
</style>
