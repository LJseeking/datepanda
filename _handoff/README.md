# DatePanda (MVP)

Next.js + Prisma + TypeScript project for DatePanda (Hangzhou Student Edition).

## Tech Stack

- **Framework**: Next.js 14/15 App Router
- **Language**: TypeScript
- **Database**: Prisma ORM + PostgreSQL (Dev: SQLite)
- **Auth**: School Email OTP (MVP)

## Directory Structure

- `app/`: Next.js App Router pages and API routes
- `src/lib/`: Domain business logic (pure functions where possible)
  - `auth/`: Identity management
  - `questionnaire/`: Questionnaire logic, validation
  - `profile/`: Profile generation, scoring
  - `recommendations/`: Matching algorithm, daily generation
  - `messaging/`: Chat, unlock logic
  - `risk/`: Anti-cheat, policy engine
  - `db/`: Prisma client, repositories
  - `matching/`: Match scoring, filtering, batch generation
- `prisma/`: Database schema and migrations

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Initialize database:
   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

3. Run development server:
   ```bash
   pnpm dev
   ```

## API 验证步骤 (curl)

### 1. 学校邮箱 OTP 登录

**请求验证码**:
```bash
curl -i -X POST http://localhost:3000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@zju.edu.cn"}'
```
*查看 Console 获取验证码 (如 123456)*

**验证登录 (保存 cookie)**:
```bash
curl -i -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@zju.edu.cn","code":"123456"}' \
  -c /tmp/dp.cookies
```

**检查登录态**:
```bash
curl -i http://localhost:3000/api/auth/me -b /tmp/dp.cookies
```

### 2. 问卷保存与提交

**保存草稿 (Save Draft)**:
```bash
curl -i -X POST http://localhost:3000/api/questionnaire/save \
  -H "Content-Type: application/json" \
  -d '{"answers":[{"questionKey":"basic_age_range","value":"20-21"},{"questionKey":"interest_date_style","values":["coffee","walk"]}]}' \
  -b /tmp/dp.cookies
```
*预期: 200 OK, 返回 responseId*

**获取问卷状态**:
```bash
curl -i http://localhost:3000/api/questionnaire/state -b /tmp/dp.cookies
```
*预期: locked=false*

**提交问卷 (Submit)**:
```bash
curl -i -X POST http://localhost:3000/api/questionnaire/submit \
  -b /tmp/dp.cookies
```
*预期: 200 OK, 返回 submittedAt*
*注意：如果不满足必填项会返回 400 MISSING_REQUIRED*

**提交后再次保存 (测试锁定)**:
```bash
curl -i -X POST http://localhost:3000/api/questionnaire/save \
  -H "Content-Type: application/json" \
  -d '{"answers":[{"questionKey":"basic_age_range","value":"22-23"}]}' \
  -b /tmp/dp.cookies
```
*预期: 409 Conflict (QUESTIONNAIRE_LOCKED)*

### 3. 画像生成

**生成画像**:
```bash
curl -i -X POST http://localhost:3000/api/profile/generate \
  -b /tmp/dp.cookies
```
*预期: 200 OK, 返回 profile 数据*

**获取我的画像**:
```bash
curl -i http://localhost:3000/api/profile/me \
  -b /tmp/dp.cookies
```

### 4. 匹配系统 (Matching)

**注意：业务时间口径统一为北京时间 (Asia/Shanghai)，THU/FRI 轮次以北京时间周次为准。**

**核心规则**:
1. **周四 (THU)**: 20:00 发放首配。
2. **周五 (FRI)**: 20:00 仅为有资格者发放补录机会。
   - **资格条件**: 用户必须对 THU 提案已点 "ACCEPT"，但尚未成功配对（MUTUAL_ACCEPTED）。
   - **无资格**: 拒绝了 THU 提案、或 THU 提案已过期（未响应）。
3. **互选成功 (MUTUAL_ACCEPTED)**: 双方都点击 ACCEPT 后，状态立即更新，并自动创建聊天会话 (Conversation)。

**触发周四主批次 (Admin)**:
```bash
curl -i -X POST http://localhost:3000/api/matching/run-thu \
  -H "x-admin-token: dev-admin-token"
```
*预期: 200 OK, 返回生成统计 { generated, skipped }*

**用户查询本周匹配**:
```bash
curl -i http://localhost:3000/api/matching/me \
  -b /tmp/dp.cookies
```
*预期: 200 OK, 返回 proposal { status, thuStatus, matchCard, chatReady, conversationId }*
*逻辑: 优先展示 THU；如果 THU 失败且有 FRI 资格，展示 FRI。如果 chatReady=true，前端可跳转聊天。*

**用户响应匹配 (Accept/Reject)**:
```bash
curl -i -X POST http://localhost:3000/api/matching/respond \
  -H "Content-Type: application/json" \
  -d '{"proposalId":"<PROPOSAL_ID>", "action":"ACCEPT"}' \
  -b /tmp/dp.cookies
```
*预期: 200 OK, status: "ACCEPTED" (或 "MUTUAL_ACCEPTED" 并返回 conversationId)*

**过期检查 (Tick Expire)**:
```bash
curl -i -X POST http://localhost:3000/api/matching/tick-expire \
  -H "x-admin-token: dev-admin-token"
```
*预期: 200 OK, 返回 expiredCount (将 24h 未响应的 THU 提案置为 EXPIRED)*
*逻辑：不依赖日期，只依赖精确时间差 (TTL=24h)。*

**触发周五补录批次 (Admin)**:
```bash
curl -i -X POST http://localhost:3000/api/matching/run-fri \
  -H "x-admin-token: dev-admin-token"
```
*预期: 200 OK, 仅为 THU ACCEPTED 但未成功的用户生成 FRI 提案*

**冒烟验证**:
1. **场景 A (单向 Accept)**: 
   - A Accept THU, B Reject THU.
   - Run FRI -> A 获得 FRI 提案 (Eligible), B 无 (Rejected).
2. **场景 B (未响应)**:
   - A Accept THU, B 不响应 (Pending -> Expired).
   - Run FRI -> A 获得 FRI 提案, B 无 (Expired).
3. **场景 C (互选)**:
   - C Accept THU, D Accept THU (或 FRI).
   - 双方状态 -> MUTUAL_ACCEPTED.
   - 自动创建 Conversation (pairKey unique).
   - Me 接口返回 chatReady=true.
4. **并发测试**:
   - 模拟 C 和 D 几乎同时 Accept -> 只有一个 Conversation 被创建 (幂等).

**调试工具**:
```bash
# 查看本周匹配状态与会话 (Admin)
curl -i "http://localhost:3000/api/debug/matching/state?weekKey=2024-42" \
  -H "x-admin-token: dev-admin-token"
```

**验证脚本示例**:
```bash
# User A Accept THU
curl -i -X POST http://localhost:3000/api/matching/respond \
  -d '{"proposalId":"<ID>", "action":"ACCEPT"}' -b cookie_A
# User B Accept User A (Mutual)
curl -i -X POST http://localhost:3000/api/matching/respond \
  -d '{"proposalId":"<ID>", "action":"ACCEPT"}' -b cookie_B
# 预期: status: "MUTUAL_ACCEPTED", conversationId: "..."
```

### 6. 定时任务 (Cron & Email)

项目支持通过 HTTP 接口触发定时任务，并自动发送邮件通知（学校邮箱）。

**配置**:
- `.env` 设置 `CRON_SECRET=your-secret-key` (本地默认为 `dev-cron-secret`)
- `.env` 设置 `EMAIL_PROVIDER=smtp` 启用真实邮件发送 (默认 `console` 仅打印日志)
- SMTP 配置: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

**周四首配 (THU Round)**:
- 时间: 周四 20:00 (Asia/Shanghai) | 对应 UTC 12:00
- 触发:
```bash
curl -X POST http://localhost:3000/api/cron/matching/thu \
  -H "x-cron-secret: dev-cron-secret"
```
- 行为: 生成 THU 提案 -> 仅对已验证且邮箱域名在白名单的用户发送 "匹配已生成" 邮件。

**周五补录 (FRI Round)**:
- 时间: 周五 20:00 (Asia/Shanghai) | 对应 UTC 12:00
- 触发:
```bash
curl -X POST http://localhost:3000/api/cron/matching/fri \
  -H "x-cron-secret: dev-cron-secret"
```
- 行为: 清理 THU 过期提案 -> 仅为 Eligible 用户生成 FRI 提案 -> 发送 "第二次机会" 邮件。

**Cron 冒烟测试**:
1. **幂等性测试 (THU)**: 
   - 触发 `cron/thu` -> 记录 `emails.sent` 数量。
   - 再次触发 `cron/thu` -> 预期 `emails.sent=0`，`emails.skippedAlreadySent` 增加。
2. **失败重试测试 (SMTP)**:
   - 配置错误 SMTP -> 触发 cron -> 预期 logs status=FAILED, retryCount=0。
   - 修复 SMTP -> 再次触发 -> 预期 logs status=SENT, retryCount=1。
3. **收件人过滤**:
   - 确认未验证邮箱 (SchoolVerification!=VERIFIED) 的用户被 skip (`skippedNotVerified`)。
   - 确认非白名单域名邮箱的用户被 skip (`skippedInvalidEmail`)。

**Cron 统计说明**:
- `sent`: 成功发送（或 Log 置为 SENT）
- `skippedAlreadySent`: 已发送过（幂等跳过）或 PENDING 且未超时
- `skippedNotVerified`: 邮箱未验证或未找到
- `skippedInvalidEmail`: 邮箱域名不在白名单
- `failed`: 发送失败或重试次数超限

**调试工具扩展**:
```bash
# 查看 Notification Logs (包含发送状态与错误)
curl -i "http://localhost:3000/api/debug/matching/state?weekKey=2024-42" \
  -H "x-admin-token: dev-admin-token"
```

### 7. Vercel + Supabase 上线步骤

**准备工作 (本地)**:
1. 获取 Supabase Postgres Connection String (Transaction Mode 6543 或 Session Mode 5432 均可，Prisma 推荐 Session Mode 如果不使用 Edge Client，或者使用 Transaction Mode + pgbouncer arguments)。
2. 本地生成迁移文件 (已完成，无需再次生成)。
3. 本地执行首次迁移部署 (确保数据库结构同步):
   ```bash
   DATABASE_URL="your-supabase-connection-string" pnpm run migrate:deploy
   ```

**Vercel 配置**:
1. 在 Vercel Project Settings -> Environment Variables 添加:
   - `DATABASE_URL`: Supabase 连接串
   - `CRON_SECRET`: 强随机字符串
   - `APP_BASE_URL`: 生产域名 (e.g. https://datepanda.com)
   - `EMAIL_PROVIDER`: "console" (默认，测试通过后再切 "smtp")
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: 邮件服务配置 (可选)
2. Deploy Project.
   - Build Command 会自动执行 `prisma generate` (via postinstall).
   - **禁止** 在 Build Command 中执行 `prisma migrate deploy` 或 `db push`. 迁移应由开发者在本地或 CI/CD pipeline 中显式触发.

**注意事项**:
- **严禁** 在生产环境使用 `prisma db push`. 必须使用 `prisma migrate deploy`.
- 每次修改 schema 后，需在本地 `prisma migrate dev` 生成新迁移文件并提交 git，然后针对生产库执行 `migrate:deploy`.
