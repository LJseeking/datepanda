# DatePanda — 本地开发 & 生产部署指南

## 技术栈

- **Next.js 16** (App Router) + **TypeScript**
- **Prisma 7** + **@prisma/adapter-pg** + **pg** → PostgreSQL (Neon)
- **pnpm** 包管理

---

## 鉴权矩阵

## 上线检查清单 (Deployment Checklist)

### 1. Vercel 环境变量配置
在 Vercel 项目 Settings -> Environment Variables 中配置以下变量：
- `DATABASE_URL`: Neon Pooler URL (生产运行时用)
- `DATABASE_URL_UNPOOLED`: Neon Direct URL (Migration 用)
- `CRON_SECRET`: 任意 32 字节 hex 字符串 (用于 Cron 鉴权)
- `MATCH_ADMIN_TOKEN`: 自定义强密码 (用于 Debug 接口)
- `APP_BASE_URL`: 生产域名 (如 `https://datepanda.com`)
- `EMAIL_PROVIDER`: `console` (上线初期不发邮件) 或 `smtp` (后续启用)

### 2. Vercel Cron 配置
本项目已包含 `vercel.json`，配置了以下 Cron 任务：
- **周四 20:00 (CST)**: `/api/cron/matching/thu` (UTC 12:00)
- **周五 20:00 (CST)**: `/api/cron/matching/fri` (UTC 12:00)

### 3. 本地验证 (Dry Run)
在本地模拟生产环境运行：
```bash
# 1. Build
pnpm build

# 2. Start
export PORT=3000
pnpm start

# 3. Trigger Cron (Dry Run)
curl -X POST http://localhost:3000/api/cron/matching/thu \
     -H "Authorization: Bearer <YOUR_CRON_SECRET>"

# 预期输出:
# {
#   "ok": true,
#   "data": {
#     "emails": { "sent": X, "skippedAlreadySent": Y, ... }
#   }
# }
```

### 4. 生产验证
上线后执行：
```bash
# 触发 Cron (如需手动触发)
curl -X POST https://your-domain.com/api/cron/matching/thu \
     -H "Authorization: Bearer <PROD_CRON_SECRET>"

# 查看状态
curl https://your-domain.com/api/debug/matching/state?weekKey=YYYY-WW \
     -H "x-admin-token: <PROD_ADMIN_TOKEN>"
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
