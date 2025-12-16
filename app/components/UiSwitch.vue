<script setup lang="ts">
type Props = {
  modelValue: boolean
  id?: string
  disabled?: boolean
  label?: string|Partial<{ before: string, after: string }>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

function onChange(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.checked)
}
</script>

<template>
  <label class="ui-switch" :data-disabled="props.disabled ? '' : null">
    <span v-if="props.label" class="ui-switch__label"
          v-html="typeof props.label === 'object' ? props.label.before : props.label"/>
    <input
      :id="id"
      class="ui-switch__input"
      type="checkbox"
      role="switch"
      :aria-checked="props.modelValue ? 'true' : 'false'"
      :checked="props.modelValue"
      :disabled="props.disabled"
      @change="onChange"
    />
    <span class="ui-switch__track" aria-hidden="true">
      <span class="ui-switch__thumb"></span>
    </span>
    <span v-if="props.label" class="ui-switch__label"
          v-html="typeof props.label === 'object' ? props.label.after : props.label" />
  </label>
  
</template>

<style scoped>
/*
  Switch iOS-like, accessible:
  - conserve l'input checkbox pour l'accessibilité
  - input visuellement caché mais focus-visible reflété sur le track
  - couleurs adaptables via variables CSS avec fallback et support light/dark
*/

:host { color-scheme: light dark; }


.ui-switch {
  --switch-width: 44px;
  --switch-height: 26px;
  --switch-radius: 999px;
  --switch-thumb: 22px;
  --switch-off-bg: #e5e7eb; /* light slate-200 */
  --switch-on-bg: #3b82f6;  /* light primary */
  --switch-border: rgba(0,0,0,0.08);
  --switch-shadow: 0 1px 2px rgba(0,0,0,0.2);

  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

/* Dark theme (respecte le thème système si votre app n'impose pas un thème) */
@media (prefers-color-scheme: dark) {
  .ui-switch {
    --switch-off-bg: #374151; /* gray-700 */
    --switch-on-bg: #60a5fa;  /* blue-400 */
    --switch-border: rgba(255,255,255,0.12);
  }
}

.ui-switch[data-disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Visually hide but keep accessible */
.ui-switch__input {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  overflow: hidden;
  white-space: nowrap;
}

.ui-switch__track {
  position: relative;
  width: var(--switch-width);
  height: var(--switch-height);
  background: var(--switch-off-bg);
  border-radius: var(--switch-radius);
  box-shadow: inset 0 0 0 1px var(--switch-border);
  transition: background-color 160ms ease, box-shadow 160ms ease;
}

.ui-switch__thumb {
  position: absolute;
  top: 50%;
  left: 2px;
  width: var(--switch-thumb);
  height: var(--switch-thumb);
  transform: translate(0, -50%);
  background: #fff;
  border-radius: 50%;
  box-shadow: var(--switch-shadow);
  transition: transform 160ms ease, background-color 160ms ease;
}

/* Checked state */
.ui-switch__input:checked + .ui-switch__track {
  background: var(--switch-on-bg);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12);
}
.ui-switch__input:checked + .ui-switch__track .ui-switch__thumb {
  transform: translate(calc(var(--switch-width) - var(--switch-thumb) - 4px), -50%);
  background: #fff;
}

/* Focus visible outline on the track for keyboard users */
.ui-switch__input:focus-visible + .ui-switch__track {
  outline: 3px solid #93c5fd; /* blue-300 */
  outline-offset: 2px;
}

.ui-switch__label {
  font-size: 0.95rem;
}
</style>
