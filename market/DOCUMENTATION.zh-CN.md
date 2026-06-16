# DarkerDB API 中文文档

> 原文档：https://darkerdb.com/documentation  
> API 基址：`https://api.darkerdb.com`  
> 当前 API 版本：**1.0.7**（截至 2026-06-16 健康检查）

DarkerDB 为《Dark and Darker》提供游戏数据与开发者工具。可通过 API 追踪市场趋势、分析玩家数据、获取物品详情（属性、描述、市场数据），并下载物品图标等资源。

如需支持或请求新功能，可加入 [DarkerDB Discord](https://discord.gg/darkerdb) 社区讨论。

---

## 目录

- [快速开始](#快速开始)
- [认证与授权](#认证与授权)
- [响应格式](#响应格式)
- [分页](#分页)
- [通用参数与类型](#通用参数与类型)
- [API 端点](#api-端点)
  - [健康检查](#健康检查)
  - [物品 Items](#物品-items)
  - [市场 Market](#市场-market)
  - [服务器人口 Population](#服务器人口-population)
  - [交易聊天 Trades](#交易聊天-trades)
  - [价格查询 Price Check](#价格查询-price-check)
  - [角色 Characters](#角色-characters)
  - [排行榜 Leaderboard](#排行榜-leaderboard)
  - [任务 Quests](#任务-quests)
- [常见问题 FAQ](#常见问题-faq)
- [更新日志摘要](#更新日志摘要)

---

## 快速开始

### 参数颜色说明

文档中参数按颜色区分：

| 颜色 | 含义 |
|------|------|
| 黄色 | **必填**参数 |
| 棕褐色 | **可选**参数 |
| 橡木色 | **全局**参数（所有端点通用） |

### 最简单的请求

```http
GET https://api.darkerdb.com/v1/health-check
```

```bash
curl "https://api.darkerdb.com/v1/health-check"
```

---

## 认证与授权

请求可通过以下两种方式认证：

1. **Session Cookie**：通过 Discord 登录网站后自动获得
2. **API Key**：在用户 [Dashboard](https://darkerdb.com/dashboard) 中创建应用并管理，**强烈建议**在应用中使用 API Key

使用 API Key 时，将其作为查询参数附加到 URL：

```
?key=your-api-key
```

### 速率限制

目前**没有**速率限制，所有已文档化的端点均公开免费使用。但官方强烈建议仍注册应用并在请求中包含 API Key，因为**速率限制与用户等级将在近期实施**。关注 Discord 以获取最新通知。

---

## 响应格式

所有响应均包装在标准信封（envelope）中：

```json
{
  "version": "1.0.7",
  "status": "OK",
  "code": 200,
  "query_time": 0.0113,
  "query_date": "2026-06-16T06:00:00Z",
  "stage": "production",
  "build": "0.15.134.8480",
  "patch": 113,
  "meta": {
    "method": "GET",
    "request": "https://api.darkerdb.com/v1/health-check",
    "query": [],
    "params": []
  },
  "body": "..."
}
```

| 字段 | 说明 |
|------|------|
| `version` | API 版本 |
| `status` | 请求状态（如 `OK`） |
| `code` | HTTP 状态码 |
| `query_time` | 查询耗时（秒） |
| `query_date` | 查询时间（UTC） |
| `build` / `patch` | 游戏构建号与补丁号 |
| `meta` | 请求元信息 |
| `pagination` | 分页信息（若适用） |
| `whoami` | 当前用户信息（若已认证） |
| `body` | 实际响应数据 |

---

## 分页

支持两种分页方式：

### 游标分页（Cursor）

更高效，利用数据库索引，但**不提供**总记录数。

- 参数：`&cursor=#`
- 用法：将 `cursor` 设为上一页响应中最大 cursor 值 + 1

```http
GET /v1/items?cursor=982&limit=2&condense=true
```

### 页码分页（Page）

传统 `limit + offset` 方式，提供总记录数，适合记录较少的资源。

- 参数：`&page=#`
- 注意：`/v1/market` 等大数据量端点**不支持**页码分页

```http
GET /v1/items?page=5&limit=2&condense=true
```

### 通用分页参数

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `limit` | 全局 | 25 | 每页记录数，范围 1–50 |
| `cursor` | 全局 | — | 游标分页 |
| `page` | 全局 | — | 页码分页 |

支持分页的端点会在响应中包含 `pagination` 字段，含分页元数据及下一页完整链接。

---

## 通用参数与类型

### 精简响应（Condense）

所有端点支持全局参数：

```
&condense=true|false
```

- `true`：移除响应中所有 `null` 值
- `false`：包含所有可能的键

### 范围（Ranges）

`price`、`quantity` 等参数支持范围过滤：

| 格式 | 示例 | 说明 |
|------|------|------|
| 精确值 | `100` | 等于 100 |
| 范围 | `200:500` | 200 到 500 之间 |
| 不等式 | `<1000`、`>=50` | 小于 / 大于等于 |

### 属性过滤（Attributes）

部分端点支持按主/副属性过滤：

```
&primary[strength]=1
&secondary[additional_move_speed]=4:5
```

属性列表可通过 `GET /v1/items/attributes` 获取。常见属性包括：

| 显示名 | 字段名 |
|--------|--------|
| Action Speed | `action_speed` |
| Agility | `agility` |
| Armor Penetration | `armor_penetration` |
| Armor Rating | `armor_rating` |
| Strength | `strength` |
| … | （完整列表见 API） |

### 时间戳（Timestamps）

支持 `from` / `to` 过滤，可接受：

- Unix 时间戳（秒，自 1970-01-01）
- 日期字符串：`YYYY-MM-DD`
- ISO 8601：`2025-02-17T03:32:08+00:00`

### 时间间隔（Intervals）

用于聚合周期，可为秒数整数或预定义值：

| 间隔 | 秒数 |
|------|------|
| 1m | 60 |
| 3m | 180 |
| 5m | 300 |
| 10m | 600 |
| 15m | 900 |
| 30m | 1800 |
| 45m | 2700 |
| 1h | 3600 |
| 2h | 7200 |
| 4h | 14400 |
| 1d | 86400 |
| 1w | 604800 |
| 2w | 9072000 |
| 4w | 18144000 |

### 布尔值（Booleans）

| 输入 | 转换结果 |
|------|----------|
| true, 1, yes, on | true |
| false, 0, no, off | false |

### 职业位掩码（Classes）

`required_class` 等字段使用位掩码，多职业需按位或（OR）组合：

| 职业 | 代码 |
|------|------|
| Fighter（战士） | 1 |
| Barbarian（野蛮人） | 2 |
| Rogue（盗贼） | 4 |
| Ranger（游侠） | 8 |
| Wizard（法师） | 16 |
| Cleric（牧师） | 32 |
| Bard（吟游诗人） | 64 |
| Warlock（术士） | 128 |
| Druid（德鲁伊） | 256 |
| Sorcerer（巫师） | 512 |

**示例**：筛选 Wizard + Cleric + Sorcerer 可用的胸甲：

```
/v1/items?slot_type=Chest&required_class=560
```

（16 + 32 + 512 = 560）

---

## API 端点

### 健康检查

```http
GET /v1/health-check
```

检查 API 服务状态，返回版本与运行时间等信息。

---

### 物品 Items

#### GET /v1/items

查询物品列表，支持丰富过滤条件。

**物品通用参数：**

| 参数 | 说明 | 示例 |
|------|------|------|
| `id` | 物品 ID | `LightfootBoots_6001` |
| `archetype` | 原型 | `LightfootBoots` |
| `name` | 物品名称（不区分大小写，支持部分匹配） | `Lightfoot Boots` |
| `rarity` | 稀有度 | `Poor`, `Uncommon`, `Rare`, `Epic`, `Legendary`, `Unique`, `Artifact` |
| `type` | 物品类型 | `Accessory`, `Armor`, `Misc`, `Utility`, `Weapon` |
| `armor_type` | 护甲类型 | `Cloth`, `Leather`, `Plate` |
| `hand_type` | 持握类型 | `One Handed`, `Two Handed` |
| `misc_type` | 杂项类型 | `Currency`, `Gem`, `Herb`, `Hunting Loot`, `Ingot`, `Ore`, `Powder`, `Treasure` |
| `slot_type` | 装备槽位 | `Back`, `Chest`, `Foot`, `Hands`, `Head`, `Legs`, `Necklace`, `Primary`, `Ring`, `Sash`, `Secondary`, `Unarmed`, `Utility` |
| `utility_type` | 实用物品类型 | `Consumable`, `Drink`, `Light Source`, `Mining`, `Soul Heart`, `Throwable` |
| `inventory_width` | 背包宽度 | 范围 |
| `inventory_height` | 背包高度 | 范围 |
| `vendor_price` | 商人售价 | 范围 |
| `gear_score` | 装备评分 | 范围 |
| `adventure_points` | 冒险点数 | 范围 |
| `required_class` | 需求职业 | 位掩码 |
| `required_knowledge` | 需求知识 | 范围 |
| `usable_by` | 可用职业 | — |
| `primary[attribute]` | 主属性过滤 | `primary[strength]=1` |
| `secondary[attribute]` | 副属性过滤 | `secondary[additional_move_speed]=4:5` |

**示例：**

```http
GET /v1/items?name=Lightfoot Boots&rarity=Legendary
```

#### GET /v1/items/attributes

返回所有可过滤的物品属性列表。

#### GET /v1/items/rarities

返回所有稀有度类型。

#### GET /v1/items/{id}

按 ID 获取单个物品详情。

```http
GET /v1/items/LightfootBoots_6001?condense=true
```

#### GET /v1/items/{id}/icon

获取物品图标（PNG 图片）。

```http
GET /v1/items/LightfootBoots_6001/icon
```

---

### 市场 Market

#### GET /v1/market

查询市场挂单与成交记录。

| 参数 | 说明 | 示例 |
|------|------|------|
| `item_id` | 物品 ID | `LightfootBoots_6001` |
| `item` | 物品名称 | `Lightfoot Boots` |
| `archetype` | 原型 | `LightfootBoots` |
| `rarity` | 稀有度 | `Epic` |
| `price` | 总价 | 范围 |
| `price_per_unit` | 单价 | 范围 |
| `seller` | 卖家名称 | — |
| `quantity` | 数量 | 范围 |
| `from` / `to` | 时间范围（基于 `created_at`） | 时间戳 |
| `has_sold` | 是否已售出 | 布尔 |
| `has_expired` | 是否已过期 | 布尔 |
| `primary[attribute]` | 主属性 | — |
| `secondary[attribute]` | 副属性 | — |
| `order` | 排序方向 | `asc`（默认）/ `desc`，按 `created_at` |
| `cursor` | 游标分页 | — |
| `limit` | 每页数量 | 1–50，默认 25 |

> 市场数据保留 **1 个月**。

**示例：**

```http
GET /v1/market?item=Lightfoot Boots&rarity=Epic&price=50:500&limit=5&condense=true
```

#### GET /v1/market/analytics/{item_id}/prices/history

获取物品价格历史（基于**已售出**物品）。

| 参数 | 默认 | 说明 |
|------|------|------|
| `from` | 7 天前 | 起始时间 |
| `to` | now | 结束时间 |
| `interval` | 15m | 聚合间隔 |

**示例：**

```http
GET /v1/market/analytics/WolfPelt/prices/history?interval=1h
```

---

### 服务器人口 Population

#### GET /v1/population

获取当前各服务器在线人数（实时）。

```http
GET /v1/population
```

#### GET /v1/population/history

获取服务器人口历史数据。

| 参数 | 默认 | 说明 |
|------|------|------|
| `from` | 4 小时前 | 起始时间 |
| `to` | now | 结束时间 |
| `interval` | 15m | 聚合间隔 |
| `metric` | avg | 聚合函数：`avg`, `min`, `max` |

```http
GET /v1/population/history
```

---

### 交易聊天 Trades

#### GET /v1/trades/chat

获取游戏内交易聊天实时 feed，可查看神器等物品的最新报价。

支持与 Items 相同的物品过滤参数（`id`, `name`, `rarity` 等）。

> 交易聊天数据保留 **2 周**。

```http
GET /v1/trades/chat
```

---

### 价格查询 Price Check

#### GET /v1/price-check

根据物品稀有度与属性 roll 估算市场价格。

| 参数 | 说明 | 示例 |
|------|------|------|
| `item_id` | 物品 ID | `LightfootBoots_6001` |
| `item` | 物品名称（替代 item_id） | — |
| `rarity` | 稀有度（配合 item 使用） | — |
| `primary[attribute]` | 主属性值 | `primary[strength]=1` |
| `secondary[attribute]` | 副属性值 | `secondary[resourcefulness]=2` |

**示例：**

```http
GET /v1/price-check?item_id=ArcaneGloves_4001&secondary[resourcefulness]=2&secondary[max_health_bonus]=1.3
```

---

### 角色 Characters

#### GET /v1/characters

查询角色列表。

| 参数 | 说明 | 示例 |
|------|------|------|
| `name` | 角色名 | `Skullee` |
| `class` | 职业 | `Warlock` |
| `level` | 等级 | 范围 |
| `rank` | 段位 | — |
| `rating` | 评分 | 范围 |
| `adventure_points` | 冒险点数 | 范围 |
| `cursor` / `page` / `limit` | 分页 | — |

```http
GET /v1/characters
```

#### GET /v1/characters/{id}

按 ID 获取单个角色详情。

```http
GET /v1/characters/46337
```

---

### 排行榜 Leaderboard

#### GET /v1/leaderboards

列出所有可用排行榜。

```http
GET /v1/leaderboards
```

#### GET /v1/leaderboards/{id}

获取指定排行榜数据（如竞技场、冒险者、名人堂等）。

```http
GET /v1/leaderboards/EA5_SHR
```

---

### 任务 Quests

#### GET /v1/quests

获取任务列表。

| 参数 | 说明 |
|------|------|
| `page` | 页码分页 |
| `limit` | 每页数量（1–50，默认 25） |

```http
GET /v1/quests
```

#### GET /v1/quests/{id}

按 ID 获取单个任务详情。

```http
GET /v1/quests/GoblinMerchant_02
```

---

## 常见问题 FAQ

### DarkerDB

**DarkerDB 是开源的吗？**  
部分项目已开源，见 [DarkerDB GitHub](https://github.com/darkerdb)。

**如何贡献？**

- 在 Discord 报告 Bug
- 建议新功能
- 分享你用 API 做的项目
- 向社区传播

### GrimVault（屏幕覆盖工具）

**什么是 GrimVault？**  
高性能屏幕捕获覆盖层，悬停物品时显示详细统计、估价与副属性最佳 roll。

**工作原理？**  
定期截取游戏窗口，OCR 识别悬停物品，从 DarkerDB API 拉取数据。

**无法正常工作？**  
- 游戏需设为 **窗口化全屏（Windowed Fullscreen）**
- 游戏亮度至少 **2.5**
- 游戏语言需为 **英文**

**会被封号吗？**  
GrimVault 仅为信息展示工具，**不注入 DLL、不读内存、不修改游戏**。官方已与 Ironmace 确认使用 GrimVault **不会导致封号**。但在 Dark and Darker Discord 中不允许直播 GrimVault。

**价格如何估算？**  
分析近期市场上相似物品的**实际成交**记录，数据库频繁更新。若发现异常估价，可在 Discord 分享截图反馈。

**Quality vs Relative Quality：**

- **Quality（品质）**：物品绝对好坏，同稀有度可直接比较
- **Relative Quality（相对品质）**：与近期同类型同稀有度成交物品对比，高值表示当前市场上较优

**故障排查：**

1. 确认窗口化全屏模式
2. 关闭 HDR，或将 `capture_method` 设为 `gdi`
3. 游戏语言为英文
4. 亮度设为 2.5
5. Windows 显示设置中将 GrimVault 设为集成显卡运行

日志路径：`%APPDATA%/GrimVault/logs`

---

## 更新日志摘要

### API 1.0.7（2025-09-28，当前）

- 数据更新至 Patch #96
- 新增：`/v1/quests`、`/v1/quests/{id}`
- 物品 API 新增附魔（gemming）副属性范围（`enchanted_*` 前缀）
- 市场数据保留 1 个月，交易聊天保留 2 周
- 价格查询支持 `item=` 与 `rarity=` 参数
- 新增物品属性：`headshot_damage_bonus`、`demon_damage_bonus` 等

### API 1.0.6（2025-05-13）

- 新增 `/v1/price-check`
- 交易聊天新增物品过滤
- 移除卖家/成交量排行榜端点

### API 1.0.5（2025-04-20）

- 新增 `/v1/characters`、`/v1/leaderboards`
- 排行榜端点重构
- 新增 `Artifact` 稀有度、`usable_by` 参数

### API 1.0.0（2025-01-13）

- API 首次发布：`https://api.darkerdb.com`

完整更新日志：https://darkerdb.com/documentation/changelog

---

## 相关链接

| 资源 | 地址 |
|------|------|
| 官网 | https://darkerdb.com |
| API 文档（英文） | https://darkerdb.com/documentation |
| API 基址 | https://api.darkerdb.com |
| 用户 Dashboard | https://darkerdb.com/dashboard |
| GitHub | https://github.com/darkerdb |
| GrimVault | https://darkerdb.com/grimvault |

---

*本文档根据 [darkerdb.com/documentation](https://darkerdb.com/documentation) 官方内容翻译整理，API 行为以官方实时文档为准。*
