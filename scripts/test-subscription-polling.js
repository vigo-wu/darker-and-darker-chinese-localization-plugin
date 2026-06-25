/**
 * 订阅轮询逻辑验证
 * 运行：node scripts/test-subscription-polling.js
 */

const { ALARM_NAME, DEFAULT_EMAIL_SETTINGS, mergeEmailSettings } = require('../src/shared/market-subscription.js');
const { runSubscriptionCheck } = require('../src/shared/run-subscription-check.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${message}`);
    return;
  }
  failed += 1;
  console.error(`  ✗ ${message}`);
}

async function initItemNamesForTest() {
  const { initItemNames } = await import('../src/shared/item-name.js');
  await initItemNames();
}

function createAlarmMock() {
  const alarms = new Map();
  const listeners = new Set();

  return {
    alarms,
    listeners,
    api: {
      async clear(name) {
        alarms.delete(name);
      },
      async create(name, info) {
        alarms.set(name, { name, ...info });
      },
      async get(name) {
        return alarms.get(name) || null;
      },
      onAlarm: {
        addListener(fn) {
          listeners.add(fn);
        },
      },
      async trigger() {
        const alarm = alarms.get(ALARM_NAME);
        if (!alarm) return null;
        for (const listener of listeners) {
          listener(alarm);
        }
        return alarm;
      },
    },
  };
}

async function simulateScheduleAlarm(storage, alarmApi) {
  const subscriptions = storage.subscriptions || [];
  const emailSettings = mergeEmailSettings(storage.emailSettings || {});
  const activeCount = subscriptions.filter((sub) => sub.enabled !== false).length;
  await alarmApi.clear(ALARM_NAME);

  if (activeCount === 0) return null;

  const minutes = Math.max(1, Number(emailSettings.pollIntervalMinutes) || 5);
  await alarmApi.create(ALARM_NAME, { periodInMinutes: minutes });
  return alarmApi.get(ALARM_NAME);
}

console.log('订阅轮询逻辑测试\n');

(async () => {
  await initItemNamesForTest();

  assert(ALARM_NAME === 'market-subscription-check', 'ALARM_NAME 常量正确');

  const merged = mergeEmailSettings({ pollIntervalMinutes: 3 });
  assert(merged.pollIntervalMinutes === 3, '邮件设置合并轮询间隔');

  const alarmMock = createAlarmMock();
  const storage = {
    subscriptions: [{ id: '1', itemName: 'Bandage', enabled: true, lastNotifiedIds: [] }],
    emailSettings: DEFAULT_EMAIL_SETTINGS,
  };

  const alarm = await simulateScheduleAlarm(storage, alarmMock.api);
  assert(Boolean(alarm), '有活跃订阅时会创建 alarm');
  assert(alarm.periodInMinutes === 5, '默认 5 分钟轮询');

  storage.emailSettings = { pollIntervalMinutes: 2 };
  const alarm2 = await simulateScheduleAlarm(storage, alarmMock.api);
  assert(alarm2.periodInMinutes === 2, '修改间隔后会按新值调度');

  storage.subscriptions = [];
  const cleared = await simulateScheduleAlarm(storage, alarmMock.api);
  assert(cleared === null, '无活跃订阅时清除 alarm');
  assert(alarmMock.alarms.size === 0, 'alarm 已被移除');

  let pollRuns = 0;
  alarmMock.api.onAlarm.addListener((item) => {
    if (item.name === ALARM_NAME) pollRuns += 1;
  });
  await alarmMock.api.create(ALARM_NAME, { periodInMinutes: 1 });
  await alarmMock.api.trigger();
  assert(pollRuns === 1, 'alarm 监听器可被触发');

  const checkResult = await runSubscriptionCheck({
    readState: async () => ({
      subscriptions: [{
        id: '1',
        itemName: 'Bandage',
        enabled: true,
        rarity: '',
        maxPrice: null,
        lastNotifiedIds: [],
      }],
      emailSettings: DEFAULT_EMAIL_SETTINGS,
    }),
    saveSubscriptions: async () => {},
    fetchMarketListings: async (itemName) => {
      const response = await fetch(
        `https://api.darkerdb.com/v1/market?condense=true&limit=5&has_sold=false&item=${encodeURIComponent(itemName)}`,
      );
      const data = await response.json();
      return data.body || [];
    },
    notifyNewListing: async () => {},
  });
  assert(checkResult.checked === 1, '轮询检查函数可执行');
  assert(checkResult.fetched >= 0, '轮询检查会统计 API 返回数量');

  console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
