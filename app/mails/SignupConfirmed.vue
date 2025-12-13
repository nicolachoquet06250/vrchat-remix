<script setup lang="ts">
import { Html, Body, Section, Img, Heading, Text, Button } from "@vue-email/components";

defineProps<Props>()
</script>

<script lang="ts">
export type Props = {
  logoUrl?: string,
  username?: string,
  appName: string,
  appUrl: string
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
    <Img v-if="logoUrl" :src="logoUrl" alt="logo vrc remix" style="display:block;height:95px;margin:0 0 8px;" />

    <Heading as="h2">
      Bienvenue sur {{ appName }} !
    </Heading>
    <Text style="margin: 0 0 8px">
      {{ username ? `Bonjour ${username},` : 'Bonjour,' }}
    </Text>
    <Text>
      Votre adresse e‑mail a été vérifiée. Votre compte est maintenant actif.
    </Text>

    <Section style="margin:14px 0">
      <Button :href="`${appUrl}/login`">Se connecter</Button>
    </Section>

    <Text style="margin:16px 0 0;color:#666">
      Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet e‑mail.
    </Text>
  </Section>
</Body>
</Html>
</template>

<style scoped>

</style>