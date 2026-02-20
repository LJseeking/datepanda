postgresql://postgres:19871022Wang@@@@@@@db.tuznftjakgnjakaomflm.supabase.co:5432/postgres









Neon for datepanda

DATABASE_URL=postgresql://neondb_owner:npg_MzbX1RD7qOxJ@ep-lucky-leaf-a10zjm57-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require



DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_MzbX1RD7qOxJ@ep-lucky-leaf-a10zjm57.ap-southeast-1.aws.neon.tech/neondb?sslmode=require







git remote -v
git remote add origin https://github.com/LJseeking/datepanda.git
git branch -M main
git push -u origin main





match admin token：o0HzpivToC331U0hIpM66uz5/4QuFAysvkvSfkNWNk4=





CRON: DsOibcebFfQQu01/IjsYTwGSMGVFGpC2Y56mrhjAEr38brakKvx030bIhkImvJbq





curl -i -X POST "http://localhost:3000/api/cron/matching/thu" \
  -H "x-cron-secret: <DsOibcebFfQQu01/IjsYTwGSMGVFGpC2Y56mrhjAEr38brakKvx030bIhkImvJbq"





DATABASE_URL="postgresql://neondb_owner:npg_MzbX1RD7qOxJ@ep-lucky-leaf-a10zjm57-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" pnpm prisma migrate deploy



DATABASE_URL="postgresql://neondb_owner:npg_MzbX1RD7qOxJ@ep-lucky-leaf-a10zjm57.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" pnpm dev









maisender：

密码：mssp.SfPHkdY.ynrw7gy2m5r42k8e.7cjBBJf

username：MS_eYTwEl@datepanda.fun







resend 

API key：re_NeP7wJUf_A4u4g3NzSAwnQdMMehNEfYgN





curl -s -X POST 'https://datepanda.fun/api/email/test' \-H 'content-type: application/json' \

  -H "x-admin-token: o0HzpivToC331U0hIpM66uz5/4QuFAysvkvSfkNWNk4=" \

  -d '{"to":"wanglujie1987@gmail.com","subject":"DatePanda Resend Test (Prod)","html":"<p>It works on Vercel!</p>"}'