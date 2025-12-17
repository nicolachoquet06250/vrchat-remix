<script setup lang="ts">
const { user } = useSession()
const router = useRouter()
const { locale } = useI18n()

definePageMeta({ name: 'admin-users' })

// Redirect if not creator on client
if (process.client) {
  watchEffect(() => {
    if (user.value && user.value.role !== 'creator') {
      router.replace('/')
    }
  })
}

const q = ref('')
const page = ref(1)
const pageSize = ref(20)

const dq = useDebounce(q, 1000);

const { data, pending, error, refresh } = await useFetch(() => `/api/admin/users?q=${encodeURIComponent(dq.value)}&page=${page.value}&pageSize=${pageSize.value}`)

// Debounce search (1s)
let t: any = null
watch(dq, () => {
  page.value = 1
  if (t) clearTimeout(t)
  t = setTimeout(() => refresh(), 1000)
})
watch(page, () => refresh())

type Row = {
  id: number;
  username: string;
  email: string;
  role: 'user'|'moderator'|'creator',
  hasAvatar: boolean,
  avatarUrl: string
}
const items = computed<Row[]>(() => (data.value?.items || []) as Row[])
const total = computed(() => Number(data.value?.total || 0))

async function toggleRole(row: Row, makeModerator: boolean) {
  if (row.role === 'creator') return
  const previous = row.role
  row.role = makeModerator ? 'moderator' : 'user'
  try {
    await $fetch(`/api/users/${row.id}/role`, {
      method: 'POST',
      body: { role: row.role },
    })
  } catch (e) {
    row.role = previous // rollback
    alert('Impossible de mettre à jour le rôle pour le moment.')
  }
}
</script>

<template>
  <Head>
    <Title>Admin · {{ $t('admin.users.title') }}</Title>
  </Head>

  <div class="container">
    <div class="header">
      <h1>{{ $t('admin.users.title') }}</h1>
    </div>

    <div class="toolbar">
      <input
        class="search"
        type="search"
        :placeholder="$t('admin.users.search.placeholder')"
        v-model="q"
      />
    </div>

    <div v-if="pending">{{ $t('loading') }}</div>
    <div v-else-if="error">
      <p class="hint error">{{ $t('admin.users.errors.forbidden') }}</p>
    </div>
    <div v-else>
      <table class="table">
        <thead>
          <tr>
            <th>{{ $t('admin.users.columns.username') }}</th>
            <th style="width: 160px; text-align: center">{{ $t('admin.users.columns.role') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in items" :key="u.id">
            <td>
              <div class="user">
                <div class="avatar placeholder" v-if="u.hasAvatar">
                  <img :src="u.avatarUrl" alt="avatar" class="avatar-img" loading="lazy">
                </div>
                <div class="avatar placeholder" v-else>{{ (u.username || '#'+u.id).charAt(0).toUpperCase() }}</div>
                <div class="meta">
                  <div class="name">{{ u.username }}</div>
                  <div class="email">{{ u.email }}</div>
                </div>
              </div>
            </td>
            <td style="text-align: center">
              <UiSwitch
                v-if="u.role !== 'creator'"
                :model-value="u.role === 'moderator'"
                @update:modelValue="(val:boolean) => toggleRole(u, val)"
                :label="{ before: 'user', after: 'moderator' }"
              />
              <span v-else style="color: rgba(255, 255, 255, .5); user-select: none;">
                Super Admin
              </span>
            </td>
          </tr>
          <tr v-if="!items.length">
            <td colspan="2" class="empty">{{ $t('admin.users.no-data') }}</td>
          </tr>
        </tbody>
      </table>

      <div class="pagination">
        <button class="btn" :disabled="page<=1" @click="page = Math.max(1, page-1)">
          {{ $t('admin.users.pagination.previous') }}
        </button>
        <span class="muted">{{ $t('projects.index.pagination.page') }} {{ page }}</span>
        <button class="btn" :disabled="(page*pageSize) >= total" @click="page = page + 1">
          {{ $t('admin.users.pagination.next') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container { display: flex; flex-direction: column; gap: 16px; padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; }
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.search { inline-size: 360px; max-inline-size: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid light-dark(#e5e7eb,#374151); background: light-dark(#fff,#111); color: inherit; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 10px 8px; border-bottom: 1px solid light-dark(#e5e7eb,#374151); }
.user { display: flex; align-items: center; gap: 10px; }
.avatar.placeholder { width: 34px; height: 34px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: #8883; color: inherit; font-weight: 600; }
.avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.meta { display: flex; flex-direction: column; }
.email { color: light-dark(#666,#aaa); font-size: .9rem }
.empty { text-align: center; padding-block: 20px; color: light-dark(#666,#aaa) }
.pagination { display: flex; gap: 8px; align-items: center; justify-content: center; padding-top: 10px; }
.btn { padding: 6px 10px; border: 1px solid light-dark(#e5e7eb,#374151); background: light-dark(#fff,#222); color: inherit; border-radius: 8px; }
.btn[disabled] { opacity: .6; cursor: not-allowed; }
.muted { color: light-dark(#666,#aaa); }
</style>
