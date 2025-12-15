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
</style>