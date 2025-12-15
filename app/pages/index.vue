<script setup lang="ts">
definePageMeta({
  name: 'root'
})

useSeoMeta({
  title: 'VRC Remix — Découvrez et partagez des projets',
  ogTitle: 'VRC Remix',
  description: 'Une plateforme pour explorer, suivre et partager des projets VRChat. Recherchez par nom ou par tag et recevez des alertes.',
  ogDescription: 'Explorez, suivez et partagez des projets VRChat avec la communauté.',
  ogImage: '/vrchat-remix.png',
  twitterCard: 'app'
})

const goToProjects = () => navigateTo({ name: 'home' })

type LatestUpdate = {
  ok: boolean
  error?: string
  data?: {
    number: number
    title: string
    message: string | null
    mergedAt: string
    htmlUrl: string
    author: string | null,
    authorAvatar: string | null
  } | null
}

const { data: latestUpdate, pending: latestPending, error: latestError } = await useAsyncData<LatestUpdate>(
  'latest-update',
  () => $fetch('/api/updates/latest'),
  { server: true, lazy: true }
)
</script>

<template>
  <section class="hero">
    <div class="hero-inner">
      <img src="/vrchat-remix.png" alt="Logo VRC Remix" class="hero-logo" />
      <h1>VRC Remix</h1>
      <p class="tagline">Le hub pour découvrir, remixer et partager des projets VRChat.</p>
      <p class="tagline">Recherchez par nom ou par tag, enregistrez des alertes et suivez facilement les nouveautés.</p>

      <div class="cta">
        <button class="btn cta-btn" type="button" @click="goToProjects">
          Découvrir les projets
        </button>
      </div>

      <ul class="features">
        <li>
          <span class="feature-title">Recherche multi-type</span>
          <span class="feature-desc">Par nom ou par tag pour trouver rapidement le bon projet.</span>
        </li>
        <li>
          <span class="feature-title">Alertes personnalisées</span>
          <span class="feature-desc">Enregistrez vos recherches et recevez une notification dès qu’il y a du nouveau.</span>
        </li>
        <li>
          <span class="feature-title">Partage simplifié</span>
          <span class="feature-desc">Publiez vos projets et collaborez avec la communauté.</span>
        </li>
      </ul>
    </div>
  </section>

  <section class="updates">
    <div class="updates-inner">
      <h2 class="updates-title">Dernières updates</h2>

      <div v-if="latestPending" class="updates-card">Chargement…</div>
      <div v-else-if="latestError" class="updates-card error">Impossible de récupérer les updates. Réessayez plus tard.</div>
      <div v-else>
        <div v-if="latestUpdate?.ok && latestUpdate.data" class="updates-card">
          <div class="updates-meta">
            <span class="badge">Merge</span>
            <time :datetime="latestUpdate.data.mergedAt">{{ new Date(latestUpdate.data.mergedAt).toLocaleString() }}</time>
          </div>
          <h3 class="update-title">{{ latestUpdate.data.title }}</h3>
          <p v-if="latestUpdate.data.message" class="update-message">
            <MDC :value="latestUpdate.data.message" tag="section" />
          </p>
          <p class="update-footer">
            <a :href="latestUpdate.data.htmlUrl" target="_blank" rel="noopener noreferrer">Voir sur GitHub</a>
            <span v-if="latestUpdate.data.author"> — par <img v-if="latestUpdate.data.authorAvatar" :src="latestUpdate.data.authorAvatar" alt="avatar github user" class="github-avatar">{{ latestUpdate.data.author }}</span>
          </p>
        </div>
        <div v-else-if="latestUpdate?.ok && !latestUpdate.data" class="updates-card">Aucun merge récent.</div>
        <div v-else class="updates-card warning">
          Section non configurée. Définissez les variables NUXT_PUBLIC_GITHUB_OWNER et NUXT_PUBLIC_GITHUB_REPO.
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  min-height: calc(100dvh - 100px);
  display: grid;
  place-items: center;
}

.hero-inner {
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  text-align: center;
  padding: 24px;
}

.hero-logo {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 6px 30px light-dark(#52c5d033, #000);
}

h1 {
  margin: 16px 0 8px;
  font-size: 42px;
  line-height: 1.1;
  color: light-dark(#000, #fff);
}

.tagline {
  color: light-dark(#334155, #cbd5e1);
  font-size: 18px;
  max-width: 780px;
  margin: 0 auto;
}

.cta {
  margin-top: 24px;
}

.cta-btn {
  /* Couleur primaire basée sur le logo (#52c5d0) */
  background-color: light-dark(#52c5d0, #52c5d0);
  color: #000;
  padding: 12px 18px;
  border-radius: 12px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 25px light-dark(#52c5d055, #52c5d022);
}

.cta-btn:focus {
  outline: 2px solid light-dark(#0005, #fff5);
  outline-offset: 2px;
}

.features {
  margin: 36px auto 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 14px;
  max-width: 920px;
}

@media (min-width: 720px) {
  .features { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

.features li {
  background: light-dark(#ffffff, #18202b);
  color: light-dark(#0f172a, #e2e8f0);
  padding: 16px;
  border-radius: 14px;
  border: 1px solid light-dark(#e5e7eb, #1f2937);
  text-align: left;
}

.feature-title {
  display: block;
  font-weight: 700;
  margin-bottom: 6px;
  color: light-dark(#0f172a, #ffffff);
}

.feature-desc {
  display: block;
  color: light-dark(#334155, #cbd5e1);
}

/* Updates */
.updates {
  border-top: 1px solid light-dark(#e5e7eb, #1f2937);
  padding: 24px 0 48px;
}
.updates-inner {
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding: 0 24px;
}
.updates-title {
  margin: 4px 0 16px;
  font-size: 22px;
  color: light-dark(#0f172a, #ffffff);
}
.updates-card {
  background: light-dark(#ffffff, #18202b);
  color: light-dark(#0f172a, #e2e8f0);
  padding: 16px;
  border-radius: 14px;
  border: 1px solid light-dark(#e5e7eb, #1f2937);
}
.updates-card.error { border-color: #ef4444; }
.updates-card.warning { border-color: #f59e0b; }
.updates-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: light-dark(#334155, #cbd5e1);
  font-size: 14px;
}
.badge {
  display: inline-block;
  background: light-dark(#e5f7f9, #0f2024);
  color: light-dark(#0b2a2e, #8be9ff);
  border: 1px solid light-dark(#cbeef3, #15323a);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.update-title { margin: 8px 0; font-size: 18px; }
.update-message { white-space: pre-wrap; color: light-dark(#334155, #cbd5e1); }
.update-footer { margin-top: 8px; font-size: 14px; color: light-dark(#334155, #cbd5e1); }
.update-footer a { color: light-dark(#0ea5e9, #7dd3fc); text-decoration: underline; }

.github-avatar {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  vertical-align: middle;
  margin-right: 10px;
  margin-left: 10px;
}
</style>