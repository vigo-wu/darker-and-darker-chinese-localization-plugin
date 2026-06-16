<script setup>
import { ref } from 'vue';
import { getItemIconUrl } from '@/api/darkerdb';

const props = defineProps({
  itemId: { type: String, required: true },
  alt: { type: String, default: '' },
  size: { type: Number, default: 48 },
});

const failed = ref(false);
</script>

<template>
  <div class="item-icon" :style="{ width: `${size}px`, height: `${size}px` }">
    <img
      v-if="!failed"
      :src="getItemIconUrl(itemId)"
      :alt="alt"
      loading="lazy"
      @error="failed = true"
    />
    <span v-else class="fallback">◆</span>
  </div>
</template>

<style scoped>
.item-icon {
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  overflow: hidden;
}

.item-icon img {
  height: 120%;
  object-fit: contain;
  width: 100%;
}

.fallback {
  color: rgba(255, 255, 255, 0.45);
  font-size: 20px;
}
</style>
