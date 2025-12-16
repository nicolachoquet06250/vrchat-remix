import {defineI18nConfig} from "@nuxtjs/i18n/dist/runtime/composables";

export default defineI18nConfig(() => ({
    legacy: false,
    locale: 'fr',
    fallbackLocale: 'en',
    availableLocales: ['fr', 'en'],
}))