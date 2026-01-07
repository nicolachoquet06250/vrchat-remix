<script setup lang="ts">
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

const props = defineProps<{
  projectId: number
  year: number
}>()

const { t } = useI18n()

// Enregistrer les composants de Chart.js côté client uniquement
if (import.meta.client) {
  ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)
}

const monthsShort = computed(() => [
  t('months.1'), t('months.2'), t('months.3'), t('months.4'), t('months.5'), t('months.6'),
  t('months.7'), t('months.8'), t('months.9'), t('months.10'), t('months.11'), t('months.12')
] as string[])

const endMonth = ref<number>(12)
const dataAuth = ref<number[]>([])
const dataAnon = ref<number[]>([])
const dataAll = ref<number[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const params: any = { year: props.year }
    if (props.projectId > 0) {
      params.projectId = props.projectId
    }
    const res = await $fetch<{
      year: number,
      endMonth: number,
      labels: number[],
      authenticated: number[],
      anonymous: number[],
      all: number[]
    }>(`/api/admin/analytics/downloads/monthly`, { 
      params
    })
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

watch(() => props.year, () => loadData())
onMounted(() => loadData())

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

const options = computed(() => {
  const isDark = import.meta.client && window.matchMedia('(prefers-color-scheme: dark)').matches
  const textColor = isDark ? '#ccc' : '#666'
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'

  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { display: false },
        stacked: false,
        ticks: { color: textColor }
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: textColor },
        stacked: false,
        grid: { color: gridColor }
      }
    },
    plugins: {
      legend: { 
        display: true, 
        position: 'top' as const,
        labels: { color: textColor }
      },
      title: { display: false },
      tooltip: { enabled: true }
    }
  }
})
</script>

<template>
  <div class="project-chart">
    <div v-if="loading" class="loading">{{ t('loading') }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
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
  </div>
</template>

<style scoped>
.project-chart { min-height: 200px; }
.legend { font-size: 14px; margin-bottom: 8px; display:flex; align-items:center; }
.legend .dot { width:10px; height:10px; border-radius:50%; display:inline-block; margin-right:6px; }
.chart-wrap { height: 300px; }
.loading { padding: 40px; text-align: center; color: light-dark(#666, #aaa); }
.error { color: #ef4444; padding: 20px; }
</style>
