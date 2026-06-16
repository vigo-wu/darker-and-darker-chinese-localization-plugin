import { createApp } from 'vue';
import Antd from 'ant-design-vue';
import App from './App.vue';
import { i18n, td, toEnglish } from './i18n';
import 'ant-design-vue/dist/reset.css';
import './styles/global.css';

const app = createApp(App);

app.use(Antd);
app.use(i18n);
app.provide('td', td);
app.provide('toEnglish', toEnglish);

app.mount('#app');
