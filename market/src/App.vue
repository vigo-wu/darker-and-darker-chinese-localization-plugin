<script setup>
import { theme } from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import MarketView from '@/views/MarketView.vue';
</script>

<template>
  <a-config-provider
    :locale="zhCN"
    :theme="{
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: '#c6a46c',
        borderRadius: 8,
      },
    }"
  >
    <a-layout class="app-layout">
      <a-layout-content class="app-content">
        <MarketView />
      </a-layout-content>
    </a-layout>
  </a-config-provider>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: #111;
}

.app-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
  width: 100%;
}
</style>
