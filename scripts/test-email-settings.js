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
    { pollIntervalMinutes: 10 },
  );
  assert(merged.resendApiKey === undefined, '不保留 resendApiKey');
  assert(merged.emailProvider === undefined, '不保留 emailProvider');
  assert(merged.lastUsedEmail === 'user@example.com', '保留收件邮箱');
  assert(merged.pollIntervalMinutes === 10, '保留检查间隔');
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
      pollIntervalMinutes: 5,
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
      pollIntervalMinutes: 5,
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

console.log(`\n=== 结果：${passed} 通过，${failed} 失败 ===\n`);
process.exit(failed > 0 ? 1 : 0);
