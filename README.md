# DatePanda — 本地开发 & 生产部署指南

## 技术栈

- **Next.js 16** (App Router) + **TypeScript**
- **Prisma 7** + **@prisma/adapter-pg** + **pg** → PostgreSQL (Neon)
- **pnpm** 包管理

---

## 鉴权矩阵

| 接口 | Header | Env 变量 | 默认值 |
|------|--------|---------|--------|
| `POST /api/cron/matching/thu` | `Authorization: Bearer <secret>` | `CRON_SECRET` | 无（未设则拒绝） |
| `POST /api/cron/matching/fri` | `Authorization: Bearer <secret>` | `CRON_SECRET` | 无（未设则拒绝） |
| `GET /api/debug/matching/state` | `x-admin-token: <token>` | `MATCH_ADMIN_TOKEN` | `dev-admin-token` |

> **常见 401 原因：**
> - Cron 用了 `x-cron-secret` header（旧写法）→ 改为 `Authorization: Bearer <secret>`
> - Debug 用了 `Authorization` header → 改为 `x-admin-token: <token>`

---

## Prisma 7 架构说明

Prisma 7 **完全移除了 library/binary engine**，必须使用 driver adapter：

```typescript
// src/lib/db/prisma.ts — 唯一的 PrismaClient 初始化点
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: ... });
new PrismaClient({ adapter: new PrismaPg(pool) });
```

`prisma.config.ts` 仅供 CLI migrate 使用（读 `DATABASE_URL_UNPOOLED` 直连），运行时读 `DATABASE_URL`（pooler）。

---

## 环境变量清单

| 变量 | 必须 | 说明 |
|------|------|------|
| `DATABASE_URL` | ✅ | Neon **pooler** URL（`?sslmode=require`），运行时使用 |
| `DATABASE_URL_UNPOOLED` | ✅ | Neon **直连** URL，`prisma migrate deploy` 使用 |
| `CRON_SECRET` | ✅ | Cron 鉴权 secret，`openssl rand -hex 32` 生成 |
| `MATCH_ADMIN_TOKEN` | ✅ | Debug 接口 token，生产建议设强密码 |
| `APP_BASE_URL` | ✅ | 应用根 URL，如 `https://your-app.vercel.app` |
| `EMAIL_PROVIDER` | ✅ | `console`（默认）或 `smtp` |
| `SMTP_HOST` | 可选 | `EMAIL_PROVIDER=smtp` 时必填 |
| `SMTP_PORT` | 可选 | 默认 587 |
| `SMTP_SECURE` | 可选 | `false`（STARTTLS）或 `true`（SSL） |
| `SMTP_USER` | 可选 | SMTP 用户名 |
| `SMTP_PASS` | 可选 | SMTP 密码 |
| `SMTP_FROM` | 可选 | 发件人，如 `DatePanda <noreply@datepanda.com>` |

---

## 本地从零启动

```bash
# 1. 复制环境变量
cp .env.example .env
# 编辑 .env，填写 DATABASE_URL / DATABASE_URL_UNPOOLED / CRON_SECRET

# 2. 安装依赖（postinstall 自动运行 prisma generate）
pnpm install

# 3. 启动 dev server
pnpm dev
# 预期：✓ Ready in ~1s，监听 http://localhost:3000
```

---

## 本地验证命令

```bash
CRON_SECRET="DsOibcebFfQQu01/IjsYTwGSMGVFGpC2Y56mrhjAEr38brakKvx030bIhkImvJbq"
BASE="http://localhost:3000"

# ① THU cron（预期 200，ok:true）
curl -s -X POST "$BASE/api/cron/matching/thu" \
  -H "Authorization: Bearer $CRON_SECRET"

# ② FRI cron（预期 200，ok:true）
curl -s -X POST "$BASE/api/cron/matching/fri" \
  -H "Authorization: Bearer $CRON_SECRET"

# ③ Debug state（预期 200，ok:true）
curl -s "$BASE/api/debug/matching/state?weekKey=2026-08" \
  -H "x-admin-token: dev-admin-token"

# ④ 错误 secret → 401
curl -s -X POST "$BASE/api/cron/matching/thu" \
  -H "Authorization: Bearer wrong"
# 预期：{"ok":false,"error":{"code":"UNAUTHORIZED",...}}
```

**预期响应示例：**
```json
{"ok":true,"data":{"weekKey":"2026-08","round":"THU","createdProposalsCount":0,
  "emails":{"sent":0,"skippedAlreadySent":0,"skippedNotVerified":0,"skippedInvalidEmail":0,"failed":0},
  "durationMs":1569}}
```

---

## 生产验证命令

```bash
CRON_SECRET="<生产 CRON_SECRET>"
BASE="https://your-app.vercel.app"

curl -s -X POST "$BASE/api/cron/matching/thu" \
  -H "Authorization: Bearer $CRON_SECRET"

curl -s "$BASE/api/debug/matching/state?weekKey=$(date -u +%Y-%V)" \
  -H "x-admin-token: <生产 MATCH_ADMIN_TOKEN>"
```

---

## Prisma 迁移策略

### 本地开发

```bash
# 生成迁移 SQL（不执行，需 shadow DB 或 --create-only）
pnpm prisma migrate dev --create-only --name <name>

# 应用迁移（使用直连 URL）
pnpm migrate:deploy
```

### 生产首次迁移（防翻车步骤）

> ⚠️ **Vercel Build Command 跑 migrate 的风险：**
> - 若 `DATABASE_URL` 是 pooler URL，migrate 会失败（pgbouncer 不支持 DDL 事务）
> - 必须显式使用 `DATABASE_URL_UNPOOLED`

**推荐方案：在 Vercel Build Command 中：**

```bash
DATABASE_URL=$DATABASE_URL_UNPOOLED npx prisma migrate deploy && next build
```

或使用 `pnpm migrate:deploy && next build`（`migrate:deploy` 脚本已内置 `DATABASE_URL=$DATABASE_URL_UNPOOLED`）。

**手动迁移（更安全）：**

```bash
# 在本地，指向生产数据库直连 URL
DATABASE_URL="postgresql://user:pass@host.neon.tech/neondb?sslmode=require" \
  npx prisma migrate deploy
```

---

## Vercel 部署配置

### Build Settings

| 设置 | 值 |
|------|-----|
| Framework Preset | Next.js |
| Build Command | `pnpm migrate:deploy && next build` |
| Install Command | `pnpm install`（postinstall 自动 `prisma generate`） |
| Output Directory | `.next` |

### Vercel Cron（vercel.json）

```json
{
  "crons": [
    { "path": "/api/cron/matching/thu", "schedule": "0 12 * * 4" },
    { "path": "/api/cron/matching/fri", "schedule": "0 12 * * 5" }
  ]
}
```

> UTC 12:00 = 北京时间 20:00（Asia/Shanghai，UTC+8）
> Vercel Cron 自动注入 `Authorization: Bearer $CRON_SECRET` header。

---

## 上线步骤 Checklist

### Step 1 — 本地验证

- [ ] `cp .env.example .env` 并填写所有必填变量
- [ ] `pnpm install`（确认 postinstall 输出 `Generated Prisma Client`）
- [ ] `pnpm dev` 启动成功（`✓ Ready`）
- [ ] 运行本地验证命令，THU/FRI cron 返回 `ok:true`
- [ ] Debug state 返回 `ok:true`

### Step 2 — Vercel 配置

- [ ] 在 Vercel 项目 Settings → Environment Variables 添加所有必填变量：
  - `DATABASE_URL`（pooler URL）
  - `DATABASE_URL_UNPOOLED`（直连 URL）
  - `CRON_SECRET`
  - `MATCH_ADMIN_TOKEN`
  - `APP_BASE_URL`（`https://your-app.vercel.app`）
  - `EMAIL_PROVIDER=console`
- [ ] Build Command 设为：`pnpm migrate:deploy && next build`
- [ ] Install Command：`pnpm install`

### Step 3 — 部署 & 验证

- [ ] 触发 Vercel 部署，观察 Build Log：
  - 确认 `prisma migrate deploy` 输出 `All migrations have been successfully applied`
  - 确认 `next build` 无报错
- [ ] 部署完成后，运行生产验证命令
- [ ] 在 Vercel Dashboard → Cron Jobs 确认两条 cron 已注册
- [ ] 手动触发一次 cron，确认 Vercel Function Log 中无 500 错误

---

## 文件变更记录

| 文件 | 操作 | 原因 |
|------|------|------|
| `src/lib/db/prisma.ts` | 修改 | Prisma 7 改用 `@prisma/adapter-pg` |
| `src/lib/cron/auth.ts` | 修改 | 改为 `Authorization: Bearer` header |
| `src/lib/matching/service.ts` | 修改 | 事务 bug：`prisma.create` → `tx.create` |
| `src/lib/matching/eligibility.ts` | 修改 | MUTUAL_ACCEPTED 检查顺序 bug |
| `vercel.json` | 新增 | Cron 调度配置 |
| `prisma.config.ts` | 修改 | migrate 用 `DATABASE_URL_UNPOOLED` |
| `prisma.config.ts.bak` | 删除 | 遗留备份文件 |
| `package.json` | 修改 | `migrate:deploy` 显式使用 `DATABASE_URL_UNPOOLED` |
| `.env.example` | 新增 | 环境变量模板 |
| `README.md` | 新增 | 完整部署指南 |
