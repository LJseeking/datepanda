# MVP: 破冰问答 + 微信号交换（无站内聊天）

## 🎯 目标

在 1v1 配对后，通过结构化交互（破冰问答 + 双向同意）完成联系方式交换，取代 TalkJS 实时聊天。该方案用于杭州大学生内测。

---

## 1. 用户流程

```
配对生成 → 进入 /matches → 点击配对卡片 → 回答破冰问题
→ （满足阈值后）申请交换微信 → 对方同意 → 双方解锁微信号
→ [可选] 撤回（24h 冷却）→ 拉黑/举报
```

---

## 2. 页面规格

| 页面 | 路径 | 功能 |
|------|------|------|
| 配对列表 | `/matches` | 展示所有配对、进度条、状态徽章 |
| 配对详情 | `/matches/[id]` | 破冰题目、回答编辑、联系方式状态、操作按钮 |
| 联系方式设置 | `/profile/contact` | 填写/更新微信号（AES 加密存储） |

---

## 3. 联系方式状态机

```
LOCKED
  ├─ A 满足阈值，发起申请 → A_REQUESTED
  └─ B 满足阈值，发起申请 → B_REQUESTED

A_REQUESTED / B_REQUESTED
  ├─ 另一方同意 → MUTUAL_ACCEPTED
  └─ (任一方) 任何时候均可拉黑 → BLOCKED

MUTUAL_ACCEPTED
  ├─ 任一方撤回 → REVOKED
  └─ 任一方拉黑 → BLOCKED

REVOKED
  └─ 24h 后，任一方重新满足阈值可再申请 → A/B_REQUESTED

BLOCKED (终态，不可逆)
```

---

## 4. 业务规则

| 规则 | 默认值 | 可配置 |
|------|--------|-------|
| 破冰题总数 | 8 | `ICEBREAKER_TOTAL` in guards.ts |
| 申请交换所需最少回答数 | 4 | `ICEBREAKER_THRESHOLD` in guards.ts |
| 撤回后冷却时间 | 24 小时 | hardcoded in request route |
| 每日最多发起申请次数 | 5 次 | `MAX_DAILY_REQUESTS` in request route |

---

## 5. API 接口清单

| Method | Path | 说明 |
|--------|------|------|
| `GET` | `/api/matches` | 我的配对列表 + 进度 |
| `GET` | `/api/matches/[id]/icebreakers` | 题目 + 双方回答 + 进度 |
| `POST` | `/api/matches/[id]/icebreakers/[qid]/answer` | 提交/更新回答 |
| `POST` | `/api/matches/[id]/contact/request` | 申请交换微信 |
| `POST` | `/api/matches/[id]/contact/accept` | 同意对方申请 |
| `POST` | `/api/matches/[id]/contact/revoke` | 撤回（→ REVOKED） |
| `GET` | `/api/matches/[id]/contact` | 解锁后查看双方微信 |
| `POST` | `/api/matches/[id]/block` | 拉黑（→ BLOCKED，终态） |
| `POST` | `/api/matches/[id]/report` | 举报（写 Report 记录） |
| `GET/PUT` | `/api/profile/contact` | 获取/保存我的微信号 |

---

## 6. 安全与风控

- **微信号加密**：AES-256-GCM，`CONTACT_ENCRYPTION_KEY` 来自 ENV，格式：`iv:authTag:ciphertext`
- **鉴权**：所有 `/api/matches/[id]/*` 必须通过 `requireMatchParticipant` 检查（非参与方返回 403）
- **状态机边界**：每个 API 都有状态前置条件检查（BLOCKED 终态不可操作，MUTUAL_ACCEPTED 才可 REVOKE 等）
- **撤回冷却**：在 request API 中检查 `revokedAt`，若距撤回 < 24h 返回 429
- **速率限制**：每天发起 REQUESTED 日志 ≥ 5 次，返回 429
- **破冰阈值**：调用 `requireIcebreakerThreshold`，回答数 < 4 返回 400
- **举报去重**：同一用户对同一目标只能举报一次
- **审计日志**：每次 REQUESTED / ACCEPTED / REVOKED / BLOCKED / VIEWED 均写 `ContactUnlockLog`

---

## 7. 验收测试步骤

### 7.1 准备数据

```bash
# 种植破冰题
DATABASE_URL=<your_url> npx tsx scripts/seed-icebreakers.ts

# 创建测试配对
DATABASE_URL=<your_url> npx tsx scripts/test-icebreaker-flow.ts
```

### 7.2 手动验证

1. 登录 test01（OTP bypass: 000000），访问 `/matches`，应看到 test02 的配对
2. 进入配对详情，回答至少 4 题
3. 点击「申请交换联系方式」，状态变为「等待对方同意」
4. 换 test02 登录，确认收到申请，点「同意」
5. 双方均可在详情页看到微信号（前提：先在 `/profile/contact` 填写）
6. 测试撤回后，微信号消失，且 24h 内无法再申请
7. 测试拉黑后，所有操作返回 403
8. 用非参与方用户访问 `/api/matches/[id]/icebreakers` → 403
