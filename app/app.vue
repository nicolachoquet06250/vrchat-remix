<script setup lang="ts">
import FR from '~~/app/assets/fr.png'
import US from '~~/app/assets/us.png'

const {user, loading} = useSession()
const router = useRouter()
const route = useRoute()
const {locale, setLocale} = useI18n()

const isDev = import.meta.env.VITE_NODE_ENV === 'development'
const devVignetteLabel = import.meta.env.VITE_NODE_ENV

function changeLocale(newLocale: 'fr'|'en') {
  // Ignore if already set
  if (locale.value === newLocale) return
  setLocale(newLocale)
}

const lang = computed({
  get: () => locale.value === 'en',
  set: (l: boolean) => changeLocale(l ? 'en' : 'fr')
})
</script>

<template>
  <VitePwaManifest />

  <div>
    <header class="header">
      <NuxtLink :to="{name: `root___${locale}`}">
        <img src="/vrchat-remix.png" :alt="$t('alt.logo')" class="logo">
      </NuxtLink>
      <a
          v-if="router.resolve({name: `root___${locale}`}).href !== route.path"
          :href="router.resolve({name: `projects___${locale}`}).href"
          @click.prevent.stop="navigateTo({name: `projects___${locale}`})"
          :class="['menu-item', {
            'router-link-active': router.resolve({name: `projects___${locale}`}).href === route.path
          }]"
      >
        {{ $t('nav.projects') }}
      </a>

      <div v-if="!loading" style="display:flex; flex-direction: row; justify-content: center; align-items: center; gap: 12px;">
        <NuxtLink v-if="user" :to="{name: `profile___${locale}`}" class="profile-link">
          <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="Avatar" class="avatar" />
          <div v-else class="avatar placeholder">{{ user.username.slice(0, 1).toUpperCase() }}</div>

          <span>{{ user.username }}</span>
        </NuxtLink>
        <template v-else>
          <NuxtLink :to="{name: `login___${locale}`}" class="btn">{{ $t('nav.login') }}</NuxtLink>
          <NuxtLink :to="{name: `register___${locale}`}" class="btn">{{ $t('nav.register') }}</NuxtLink>
        </template>
      </div>
    </header>

    <main style="padding: 16px 16px 0;">
      <NuxtPage />
    </main>

    <div v-if="isDev" style="position: fixed; z-index: 1; bottom: 10px; right: 10px; background: darkgreen; color: white; padding: 10px 15px; border-radius: 5px; user-select: none">{{devVignetteLabel}}</div>
  </div>
</template>

<style>
:root {
  color-scheme: light dark;
  background-color: light-dark(#fff, #080f19);
  color: light-dark(#000, #fff);
}

* {
  box-sizing: border-box;
  font-family: Arial, sans-serif;
}

html, body {
  margin: 0;
  padding: 0;
}
</style>

<style scoped>
.header {
  display: flex;
  gap: 12px;
  padding-right: 12px;
  align-items: center;

  a:focus {
    outline: 1px solid light-dark(#0005, #fff5);
  }

  > div {
    margin-left:auto;
    display:flex;
    gap:8px;
  }
}
.btn {
  background-color: light-dark(rgba(82, 195, 206, 1), rgba(82, 195, 206, 1));
  color: light-dark(#000, #000);
  padding: 10px;
  border-radius: 10px;
  text-decoration: none;
}
.logo {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  object-fit: cover;
}
.profile-link {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  padding: 5px;
  border-radius: 10px;
  color: light-dark(#000, #fff);
  background-color: light-dark(rgba(255, 255, 255, 1), rgba(24, 31, 41, 1));
  transition: background-color .2s ease-in-out,
  color .2s ease-in-out;

  .avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid #ddd;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  &:hover, &:focus {
    outline: 1px solid light-dark(#0005, #fff5);
  }

  &:hover {
    background-color: light-dark(rgba(82, 195, 206, 1), rgba(82, 195, 206, 1));
    color: light-dark(#000, #000);
  }
}
.menu-item {
  display: inline-block;
  color: light-dark(#52c5d0, #52c5d0);
  text-decoration: none;
  font-family: Arial, sans-serif;
  position: relative;
  outline: none;

  &:focus {
    outline: 1px solid light-dark(#0005, #fff5);
    outline-offset: 20px;
  }

  &.router-link-active:after {
    content: '';
    display: block;
    width: 100%;
    height: 2px;
    position: absolute;
    bottom: -10px;
    background-color: light-dark(#52c5d0, #52c5d0);
  }
}
</style>