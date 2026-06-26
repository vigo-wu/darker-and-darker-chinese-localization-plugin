/**
 * 邮件设置逻辑验证
 * 运行：node scripts/test-email-settings.js
 */

const {
  DEFAULT_EMAIL_SETTINGS,
  mergeEmailSettings,
  validateEmailSettings,
  getEmailSettingsSummary,
  isEmailDeliveryConfigured,
  buildTestEmailContent,
  isBrowserNotificationEnabled,
  buildTestNotificationContent,
} = require('../src/shared/market-subscription.js');

const { hasResendApiKey } = require('../src/shared/resend-config.js');

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

const resendConfigured = hasResendApiKey();

console.log('\n=== 邮件设置逻辑验证 ===\n');
console.log(`Resend 配置文件: ${resendConfigured ? '已检测到 API Key' : '未配置'}\n`);

console.log('1. mergeEmailSettings 应清理旧版 Resend 字段');
{
  const merged = mergeEmailSettings(
    {
      resendApiKey: 're_old',
      emailProvider: 'resend',
      fromEmail: 'old@example.com',
      lastUsedEmail: 'user@example.com',
    },
    { pollIntervalSeconds: 600 },
  );
  assert(merged.resendApiKey === undefined, '不保留 resendApiKey');
  assert(merged.emailProvider === undefined, '不保留 emailProvider');
  assert(merged.lastUsedEmail === 'user@example.com', '保留收件邮箱');
  assert(merged.pollIntervalSeconds === 600, '保留检查间隔');
}

console.log('\n2. isEmailDeliveryConfigured 依赖配置文件与收件邮箱');
{
  const settings = { ...DEFAULT_EMAIL_SETTINGS, enableEmail: true, lastUsedEmail: 'user@example.com' };
  assert(isEmailDeliveryConfigured(settings, true) === true, '配置齐全时可发邮件');
  assert(isEmailDeliveryConfigured(settings, false) === false, '缺少 API Key 时不可发邮件');
  assert(isEmailDeliveryConfigured({ ...settings, enableEmail: false }, true) === false, '关闭邮件时不发');
}

console.log('\n3. validateEmailSettings - 启用邮件时必填收件邮箱');
{
  const errors = validateEmailSettings(
    {
      enableEmail: true,
      lastUsedEmail: '',
      pollIntervalValue: 5,
      pollIntervalUnit: 'minutes',
    },
    { hasResendApiKey: true },
  );
  assert(errors.lastUsedEmail === 'MISSING_NOTIFY_EMAIL', '缺少收件邮箱');
}

console.log('\n4. validateEmailSettings - 缺少 API Key 文件');
{
  const errors = validateEmailSettings(
    {
      enableEmail: true,
      lastUsedEmail: 'user@example.com',
      pollIntervalValue: 5,
      pollIntervalUnit: 'minutes',
    },
    { hasResendApiKey: false },
  );
  assert(errors.resendConfig === 'MISSING_RESEND_API_KEY', '提示配置 API Key 文件');
}

console.log('\n5. getEmailSettingsSummary 摘要');
{
  const summary = getEmailSettingsSummary(
    { lastUsedEmail: 'user@example.com', enableEmail: true },
    resendConfigured,
  );
  assert(summary.emailReady === resendConfigured, '邮件就绪状态与配置文件一致');
  assert(summary.lastUsedEmail === 'user@example.com', '摘要包含收件邮箱');
}

console.log('\n6. buildTestEmailContent 结构');
{
  const { subject, html } = buildTestEmailContent();
  assert(subject.includes('DarkTrans'), '测试邮件主题正确');
  assert(html.includes('测试邮件'), '测试邮件正文正确');
}

console.log('\n7. validateEmailSettings - 秒级间隔校验');
{
  const tooShort = validateEmailSettings({ pollIntervalValue: 5, pollIntervalUnit: 'seconds' });
  assert(tooShort.pollInterval === 'INVALID_POLL_INTERVAL', '低于 10 秒应报错');

  const validSeconds = validateEmailSettings({ pollIntervalValue: 30, pollIntervalUnit: 'seconds' });
  assert(validSeconds.pollInterval === undefined, '30 秒间隔合法');
}

console.log('\n8. mergeEmailSettings - 兼容旧版分钟字段');
{
  const merged = mergeEmailSettings({ pollIntervalMinutes: 2 });
  assert(merged.pollIntervalSeconds === 120, '旧版 pollIntervalMinutes 会转为秒');
}

console.log('\n9. 浏览器通知开关与测试文案');
{
  assert(isBrowserNotificationEnabled({ enableNotifications: true }) === true, '默认启用通知');
  assert(isBrowserNotificationEnabled({ enableNotifications: false }) === false, '可关闭通知');
  const { title, message } = buildTestNotificationContent();
  assert(title.includes('DarkTrans'), '测试通知标题正确');
  assert(message.includes('通知'), '测试通知正文正确');
}

console.log(`\n=== 结果：${passed} 通过，${failed} 失败 ===\n`);
process.exit(failed > 0 ? 1 : 0);
