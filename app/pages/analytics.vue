<script setup lang="ts">
import trackRoute from '~~/app/middlewares/track-route.global'
// Chart.js (client-only rendering via <ClientOnly>)
import { Bar } from 'vue-chartjs'
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
  name: 'analytics',
  middleware: [trackRoute]
})

const { t, locale } = useI18n()
const route = useRoute()

useSeoMeta({
  title: () => `VRC Remix - ${t('analytics.title')}`,
  ogTitle: () => t('analytics.title') as string,
  description: () => t('analytics.description') as string,
  ogDescription: () => t('analytics.description') as string,
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

const years = ref<number[]>([])
const selectedYear = ref<number>(new Date().getFullYear())
const endMonth = ref<number>(new Date().getMonth() + 1)
const dataAuth = ref<number[]>([])
const dataAnon = ref<number[]>([])
const dataAll = ref<number[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function loadYears() {
  try {
    const res = await $fetch<{ years: number[] }>(`/api/analytics/downloads/years`)
    years.value = res.years
    if (res.years.length > 0 && !res.years.includes(selectedYear.value)) {
      selectedYear.value = res.years[0]!
    }
  } catch (e: any) {
    error.value = e?.statusMessage || 'Failed to load years'
  }
}

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const res = await $fetch<{
      year: number,
      endMonth: number,
      labels: number[],
      authenticated: number[],
      anonymous: number[],
      all: number[]
    }>(`/api/analytics/downloads/monthly`, { params: { year: selectedYear.value } })
    endMonth.value = res.endMonth
    dataAuth.value = res.authenticated
    dataAnon.value = res.anonymous
    dataAll.value = res.all
  } catch (e: any) {
    error.value = e?.statusMessage || 'Failed to load data'
  } finally {
    loading.value = false
  }
}

watch(selectedYear, () => loadData())

onMounted(async () => {
  await loadYears()
  await loadData()
})

// Données/Options Chart.js
const chartLabels = computed(() => monthsShort.value.slice(0, endMonth.value))
const chartData = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      label: t('analytics.authenticated') as string,
      backgroundColor: '#3b82f6',
      borderColor: '#3b82f6',
      borderWidth: 0,
      data: (dataAuth.value || []).slice(0, endMonth.value),
      maxBarThickness: 28,
    },
    {
      label: t('analytics.anonymous') as string,
      backgroundColor: '#f59e0b',
      borderColor: '#f59e0b',
      borderWidth: 0,
      data: (dataAnon.value || []).slice(0, endMonth.value),
      maxBarThickness: 28,
    },
    {
      label: t('analytics.total') as string,
      backgroundColor: '#10b981',
      borderColor: '#10b981',
      borderWidth: 0,
      data: (dataAll.value || []).slice(0, endMonth.value),
      maxBarThickness: 28,
    },
  ]
}))

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { display: false },
      stacked: false,
    },
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
      stacked: false,
    }
  },
  plugins: {
    legend: { display: true, position: 'top' as const },
    title: { display: false },
    tooltip: { enabled: true }
  }
}))
</script>

<template>
  <div class="analytics">
    <h1>{{ t('analytics.title') }}</h1>
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
      <section class="chart-card">
        <div v-if="error" class="error">{{ error }}</div>
        <div v-else>
          <div class="legend">
            <span class="dot" style="background:#3b82f6"></span>{{ t('analytics.authenticated') }}
            <span class="dot" style="background:#f59e0b; margin-left:12px"></span>{{ t('analytics.anonymous') }}
            <span class="dot" style="background:#10b981; margin-left:12px"></span>{{ t('analytics.total') }}
          </div>
          <div class="chart-wrap">
            <ClientOnly>
              <Bar :data="chartData" :options="options" />
            </ClientOnly>
          </div>
        </div>
      </section>
    </div>
  </div>
  
</template>

<style scoped>
.analytics { display: grid; gap: 16px; }
.layout { display: grid; grid-template-columns: 140px 1fr; gap: 16px; }
.years { border: 1px solid #eee; border-radius: 8px; padding: 12px; height: fit-content; }
.years-title { font-weight: 600; margin-bottom: 8px; }
.year-btn { display:block; width:100%; text-align:left; padding:8px 10px; margin:6px 0; border-radius:6px; border:1px solid #eee; background:#fafafa; cursor:pointer; }
.year-btn.active { background:#111; color:#fff; border-color:#111; }
.chart-card { border: 1px solid #eee; border-radius: 8px; padding: 12px; overflow-x:auto; }
.legend { font-size: 14px; margin-bottom: 8px; display:flex; align-items:center; }
.legend .dot { width:10px; height:10px; border-radius:50%; display:inline-block; margin-right:6px; }
.chart { display:block; }
.labels { display:grid; grid-auto-flow:column; gap:20px; margin-top:6px; font-size:12px; color:#666; }
.label { min-width:30px; text-align:center; }
.error { color: #b91c1c }
@media (max-width: 720px) {
  .layout { grid-template-columns: 1fr; }
}
</style>
