<script setup lang="ts">
import { Html, Body, Section, Img, Heading, Text, Button, Head } from "@vue-email/components";
defineProps<Props>()
</script>

<script lang="ts">
export type Props = {
  logoUrl?: string,
  appName: string,
  appUrl: string,
  projectUrl: string,
  projectName: string,
  query: string,
  type: 'project'|'tag',
}
</script>

<template>
  <Html>
    <Head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta charset="utf-8" />
      <title>{{ appName }}</title>
    </Head>

    <Body style="background:#ffffff;padding:24px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;">
      <Section style="max-width:560px;margin:0 auto;">
        <Img v-if="logoUrl" :src="logoUrl" alt="logo" style="display:block;height:95px;margin:0 0 8px;" />

        <Heading as="h2">
          Nouveau projet correspondant à votre alerte
        </Heading>
        <Text style="margin: 0 0 8px">
          Nous avons trouvé un nouveau projet qui correspond à votre alerte enregistrée
          ({{ type === 'tag' ? `tag: ${query}` : `nom contenant: ${query}` }}).
        </Text>

        <Section style="margin:14px 0">
          <Heading as="h3" style="margin:0 0 6px;">{{ projectName }}</Heading>
          <Button :href="projectUrl">Voir le projet</Button>
        </Section>

        <Text style="margin:16px 0 0;color:#666">
          Vous recevez cet e‑mail car vous avez enregistré une alerte sur {{ appName }}.
        </Text>
      </Section>
    </Body>
  </Html>
</template>

<style scoped>

</style>
