<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue'

type Props = {
  modelValue: boolean
  title?: string
}
const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

function close() {
  emit('update:modelValue', false)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  if (props.modelValue) {
    document.body.style.overflow = 'hidden'
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})

watch(() => props.modelValue, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="overlay" @click.self="close">
      <div class="modal" role="dialog" aria-modal="true" :aria-label="title || 'Dialogue'">
        <header class="header">
          <h3 class="title">{{ title }}</h3>
          <button class="close" @click="close" aria-label="Fermer">
            ✕
          </button>
        </header>
        <section class="content">
          <slot />
        </section>
      </div>
    </div>
  </Teleport>
  
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in oklab, #000 40%, transparent);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 1000;
}
.modal {
  background: light-dark(#fff, #0f1621);
  color: light-dark(#000, #fff);
  width: min(720px, 100%);
  max-height: 90dvh;
  border-radius: 12px;
  box-shadow: 0 10px 30px #0006;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
}
.header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid light-dark(#eee, #243142);
}
.title { margin: 0; font-size: 18px; }
.close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: inherit;
  font-size: 20px;
  cursor: pointer;
}
.content {
  padding: 12px 16px 16px;
  overflow: auto;
}

@media (max-width: 640px) {
  .overlay {
    padding: 0;
  }
  .modal {
    width: 100%;
    height: 100dvh;
    max-height: none;
    border-radius: 0;
  }
}
</style>
