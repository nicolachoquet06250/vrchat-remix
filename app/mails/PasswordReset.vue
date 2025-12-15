<script setup lang="ts">
import { Html, Head, Body, Section, Img, Heading, Text, Button } from "@vue-email/components";

defineProps<{
  logoUrl?: string,
  username?: string,
  appName: string,
  appUrl: string,
  resetUrl: string
}>()
</script>

<template>
  <Html lang="fr">
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
          Réinitialisez votre mot de passe
        </Heading>

        <Text style="margin: 0 0 8px">{{username ? `Bonjour ${username},` : 'Bonjour,'}}</Text>
        <Text>
          Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci‑dessous pour en définir un nouveau :
        </Text>

        <Section style="margin:14px 0">
          <Button :href="resetUrl" style="display:inline-block;background:#2b59c3;color:#fff;padding:10px 14px;border-radius:6px;text-decoration:none;">
            Changer mon mot de passe
          </Button>
        </Section>

        <Text style="margin:16px 0 0;color:#666">
          Ce lien expirera dans 48 heures. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e‑mail.
        </Text>

        <Text style="margin:16px 0 0;color:#666">
          Accéder à {{ appName }} :
          <Button :href="appUrl" style="color:#2b59c3;text-decoration:none;">
            {{appUrl}}
          </Button>
        </Text>
      </Section>
    </Body>
  </Html>
  
</template>

<style scoped>

</style>
