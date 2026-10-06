<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

defineProps<{
  label: string
}>()

const isOpen = ref(false)
const menuId = `item-actions-menu-${useId()}`
const root = useTemplateRef<HTMLElement>('root')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')

function closeMenu(): void {
  isOpen.value = false
}

function closeMenuAndRestoreFocus(): void {
  closeMenu()
  void nextTick(() => trigger.value?.focus())
}

function closeFromOutside(event: PointerEvent): void {
  if (event.target instanceof Node && !root.value?.contains(event.target)) closeMenu()
}

watch(isOpen, (open) => {
  if (open) {
    document.addEventListener('pointerdown', closeFromOutside)
  } else {
    document.removeEventListener('pointerdown', closeFromOutside)
  }
})

onBeforeUnmount(() => document.removeEventListener('pointerdown', closeFromOutside))
</script>

<template>
  <div
    ref="root"
    class="item-actions-menu"
    :class="{ 'item-actions-menu--open': isOpen }"
    @keydown.esc.stop.prevent="closeMenuAndRestoreFocus"
  >
    <button
      ref="trigger"
      class="item-actions-menu__trigger"
      type="button"
      :aria-label="label"
      :aria-expanded="isOpen"
      :aria-controls="menuId"
      @click="isOpen = !isOpen"
    >
      <AppIcon name="more-horizontal" />
    </button>

    <div
      v-if="isOpen"
      :id="menuId"
      class="item-actions-menu__popup"
      role="region"
      :aria-label="label"
      @click="closeMenu"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.item-actions-menu {
  position: absolute;
  z-index: 1;
  top: var(--space-3);
  right: var(--space-3);
  width: 2.5rem;
  height: 2.5rem;
}

.item-actions-menu--open {
  z-index: 5;
}

.item-actions-menu__trigger {
  position: relative;
  z-index: 2;
  display: inline-grid;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  place-items: center;
}

.item-actions-menu__trigger:hover,
.item-actions-menu__trigger[aria-expanded='true'] {
  color: var(--color-interactive);
  background: var(--color-interactive-subtle);
}

.item-actions-menu__trigger:focus-visible,
.item-actions-menu__popup :slotted(button:focus-visible) {
  outline: 2px solid var(--color-interactive);
  outline-offset: 2px;
}

.item-actions-menu__trigger :deep(.app-icon) {
  font-size: 1.25rem;
}

.item-actions-menu__popup {
  position: absolute;
  top: 0;
  right: 0;
  display: grid;
  width: min(15rem, calc(100vw - 2 * var(--space-3)));
  gap: var(--space-1);
  padding: calc(2.5rem + var(--space-2)) var(--space-2) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: 0 0.75rem 2rem rgb(15 23 42 / 18%);
}

.item-actions-menu__popup :slotted(button) {
  min-height: 2.5rem;
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.item-actions-menu__popup :slotted(button:hover) {
  background: var(--color-interactive-subtle);
}

.item-actions-menu__popup :slotted(.item-actions-menu__danger) {
  color: var(--color-negative);
}

@media (prefers-reduced-motion: no-preference) {
  .item-actions-menu__popup {
    animation: item-actions-menu-in 120ms ease-out;
    transform-origin: top right;
  }
}

@keyframes item-actions-menu-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
}
</style>
