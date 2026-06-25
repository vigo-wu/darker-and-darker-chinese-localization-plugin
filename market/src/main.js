import { createApp } from 'vue';
import Antd from 'ant-design-vue';
import App from './App.vue';
import { i18n, td, toEnglish } from './i18n';
import { initItemNames } from '@shared/item-name.js';
import 'ant-design-vue/dist/reset.css';
import './styles/global.css';

async function bootstrap() {
  await initItemNames();

  const app = createApp(App);
  app.use(Antd);
  app.use(i18n);
  app.provide('td', td);
  app.provide('toEnglish', toEnglish);
  app.mount('#app');
}

bootstrap().catch((err) => {
  console.error('[market] 启动失败:', err);
});
