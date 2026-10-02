<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'

defineProps<{
  title: string
}>()

const emit = defineEmits<{
  close: []
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const titleId = `app-dialog-title-${useId()}`

let openDialogCount = 0

function closeDialog(): void {
  const element = dialog.value
  if (element?.open && typeof element.close === 'function') {
    element.close()
  } else {
    emit('close')
  }
}

function closeFromBackdrop(event: MouseEvent): void {
  if (event.target === event.currentTarget) closeDialog()
}

onMounted(() => {
  openDialogCount += 1
  document.body.classList.add('has-modal-dialog')
  dialog.value?.showModal?.()
})

onBeforeUnmount(() => {
  openDialogCount = Math.max(openDialogCount - 1, 0)
  if (openDialogCount === 0) document.body.classList.remove('has-modal-dialog')
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="app-dialog"
      :aria-labelledby="titleId"
      @click="closeFromBackdrop"
      @close="emit('close')"
    >
      <div class="app-dialog__surface">
        <header class="app-dialog__heading">
          <h3 :id="titleId">{{ title }}</h3>
          <button type="button" aria-label="Закрыть окно" @click="closeDialog">×</button>
        </header>
        <div class="app-dialog__content">
          <slot />
        </div>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.app-dialog {
  width: min(calc(100% - 2rem), 34rem);
  max-height: calc(100dvh - 2rem);
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--color-text);
  box-shadow: 0 1.5rem 4rem rgb(15 23 42 / 24%);
}

.app-dialog::backdrop {
  background: rgb(15 23 42 / 62%);
  backdrop-filter: blur(2px);
}

.app-dialog__surface {
  max-height: calc(100dvh - 2rem);
  overflow: auto;
  background: var(--color-surface);
}

.app-dialog__heading {
  position: sticky;
  z-index: 1;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

h3 {
  margin: 0;
  font-size: var(--font-size-lg);
}

.app-dialog__heading button {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  border-radius: var(--radius-md);
  background: var(--color-interactive-subtle);
  color: var(--color-text);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  place-items: center;
}

.app-dialog__heading button:hover {
  background: var(--color-border);
}

.app-dialog__heading button:focus-visible {
  outline: 2px solid var(--color-interactive);
  outline-offset: 2px;
}

.app-dialog__content {
  padding: var(--space-4);
}

@media (max-width: 35.99rem) {
  .app-dialog {
    width: calc(100% - 1rem);
    max-height: calc(100dvh - 1rem);
  }

  .app-dialog__surface {
    max-height: calc(100dvh - 1rem);
  }
}
</style>
