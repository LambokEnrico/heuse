# HEUSE — Setup Guide

Luxury menswear e-commerce built with Next.js 16, Prisma 7, PostgreSQL, and PayPal.
Last force-rebuild: 2026-06-15T17:45+07:00

---

## ⚡ Quick Start (3 menit)

```powershell
# 1. Start Postgres
docker compose up -d

# 2. Copy env template
Copy-Item .env.example .env
# Edit .env: set ADMIN_SEED_PASSWORD, NEXTAUTH_SECRET, PayPal keys (see below)

# 3. Migrate + seed
npx prisma migrate dev --name init
npm run db:seed

# 4. Run
npm run dev
```

Open: http://localhost:3000
Admin: http://localhost:3000/admin/login (use creds from `.env`)

---

## 🔐 Environment Variables (`.env`)

> **WAJIB** copy `.env.example` → `.env` lalu isi. **JANGAN** hardcode di source code.

### Required (untuk run)

| Var | Contoh | Keterangan |
|-----|--------|------------|
| `DATABASE_URL` | `postgresql://postgres:***@localhost:5433/heuse_dev` | Local Docker. Untuk prod lihat section "Deploy to Railway" |
| `NEXTAUTH_SECRET` | random 32-char | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NEXTAUTH_URL` | `http://localhost:3000` | Site URL (ganti saat deploy) |
| `ADMIN_SEED_EMAIL` | `admin@heuse.local` | Email untuk login admin (seed) |
| `ADMIN_SEED_PASSWORD` | `admin123` | Password untuk login admin (seed) — **ganti di production!** |
| `PAYPAL_CLIENT_ID` | `AYSq...xxxx` | Dari https://developer.paypal.com (sandbox) |
| `PAYPAL_CLIENT_SECRET` | `ELH0...xxxx` | Sama, secret key |
| `PAYPAL_ENVIRONMENT` | `sandbox` | `"sandbox"` atau `"live"` |
| `PAYPAL_DEFAULT_CURRENCY` | `IDR` | Default: `IDR`. Sandbox auto-convert ke USD (lihat PayPal section) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | URL publik (untuk OpenGraph, PayPal return URL) |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | `AYSq...xxxx` | Sama dengan `PAYPAL_CLIENT_ID` (ekspos ke client) |

### Optional (skip dulu kalau cuma demo)

| Var | Fungsi |
|-----|--------|
| `UPLOADTHING_SECRET` + `UPLOADTHING_APP_ID` | Upload gambar di admin (kosongkan → upload gagal, gambar lama tetep tampil) |
| `RESEND_API_KEY` | Email notifikasi (kosongkan → gak kirim email) |
| `GOOGLE_ANALYTICS_ID` | GA4 tracking (kosongkan → off) |
| `META_PIXEL_ID` | Facebook Pixel (kosongkan → off) |
| `PAYPAL_WEBHOOK_ID` + `PAYPAL_WEBHOOK_SECRET` | PayPal webhook verification (lihat PAYPAL-SETUP.md) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `6281234567890` format intl, no `+` atau spasi |
| `NEXT_PUBLIC_INSTAGRAM_HANDLE` | `heuse` (tanpa `@`) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `hello@heuse.com` |

---

## 💳 PayPal Setup (sandbox)

1. Buka https://developer.paypal.com → **Log in** → toggle ke **Sandbox**
2. **Apps & Credentials** → **Create App**
3. Copy **Client ID** dan **Secret** → paste ke `.env`
4. **Webhooks** (opsional untuk demo lokal): skip dulu, pake `PayPalAutoCapture` component yang udah handle return-URL capture

### ⚠️ Sandbox & IDR limitation

PayPal sandbox merchant account biasanya **gak support IDR** (walaupun IDR ada di currency codes list). HEUSE handle ini otomatis:

- **Sandbox**: `lib/paypal.ts` auto-convert IDR → USD (rate hardcoded 1 USD = 16,000 IDR)
- **Live**: pake currency sesuai `PAYPAL_DEFAULT_CURRENCY` (pastikan merchant account lo support IDR)

> Untuk production beneran, **ganti hardcoded rate** di `lib/paypal.ts` dengan live FX API, atau enable IDR di merchant account PayPal lo.

### Test account buyer

Bikin sandbox buyer di https://developer.paypal.com/dashboard/accounts (type: **Personal**).
Pake itu untuk test checkout. Saldo awal: $5000 (fake money).

---

## 🗄️ Database

### Local (Docker)

`docker-compose.yml` udah include:
- Postgres 16-alpine
- Port **5433** (host) → 5432 (container)
- DB name: `heuse_dev`
- Volume: `heuse_pg_data` (persistent)

```powershell
docker compose up -d       # start
docker compose down        # stop (data tetap)
docker compose down -v     # stop + hapus data
```

### Production (Railway)

Lihat section **Deploy to Railway** di bawah.

---

## 👤 Admin

- Login: http://localhost:3000/admin/login
- Email: dari `ADMIN_SEED_EMAIL` di `.env`
- Password: dari `ADMIN_SEED_PASSWORD` di `.env`
- Role setelah seed: **OWNER** (bisa delete products)
- Role **ADMIN** bisa manage products, articles, dll tapi gak bisa delete

### Cara bikin admin tambahan (manual)

```powershell
# Generate hash untuk password baru (uses native `bcrypt`, NOT `bcryptjs`)
node -e "console.log(require('bcrypt').hashSync('your-new-password', 10))"

# Insert ke DB
docker exec -i heuse-postgres psql -U postgres -d heuse_dev < insert-admin.sql
```

---

## 🚀 Deploy to Railway

**📖 Baca [`DEPLOY.md`](./DEPLOY.md) untuk panduan lengkap step-by-step.**

Quick summary:
1. Push project ke GitHub (jangan commit `.env`!)
2. Buka https://railway.app → New Project → Deploy from GitHub
3. Add PostgreSQL service
4. Set environment variables (lihat `DEPLOY.md` Step 4 untuk list lengkap)
5. Deploy otomatis jalan

`railway.toml` sudah include di root project dengan NIXPACKS builder + healthcheck.

**Quick deploy:**

1. Push project ke GitHub (jangan commit `.env`!)
2. Buka https://railway.app → **New Project** → **Deploy from GitHub repo**
3. Pilih repo + branch
4. Add **PostgreSQL** service dari Railway dashboard (Provision → PostgreSQL)
5. Set environment variables di Railway → Variables (lihat section "Environment Variables" di atas — `DATABASE_URL` auto-injected dari PostgreSQL service)
6. Railway auto-detect Next.js, build jalan otomatis
7. Set custom domain (optional) — Railway kasih `<app>.up.railway.app` by default

**Yang udah Railway-ready:**

- ✅ `railway.toml` dengan NIXPACKS builder + healthcheck `/api/health`
- ✅ `prisma generate` di `build` script (otomatis sebelum Next.js build)
- ✅ `prisma migrate deploy` di `start` script (otomatis jalan saat container start)
- ✅ `/api/health` endpoint untuk Railway healthcheck
- ✅ `trustHost: true` di NextAuth (handle dynamic Railway URLs)
- ✅ PostgreSQL provider di `prisma/schema.prisma`
- ✅ ZERO hardcoded secrets (semua via env)
- ✅ CSP security headers configured
- ✅ `output: "standalone"` disabled (Railway serve static via Next.js — gak perlu standalone mode, menghindari 404 issue)

**Catatan:**

- `output: "standalone"` di-disable karena di Railway static files di-serve dari root, bukan dari `.next/standalone/`. Biarkan disabled.
- Rate limiting (`lib/rate-limit.ts`) saat ini in-memory — bakal reset tiap container restart, dan gak work cross-instance. Untuk production multi-instance, swap ke Upstash Ratelimit.

Lihat `RAILWAY-FUNDAMENTAL.md` di workspace root untuk context lebih lengkap.

---

## 🛠️ Common Commands

```powershell
# Dev
npm run dev                # Start dev server (port 3000)
npm run build              # Production build
npm run start              # Run production build

# Database
npx prisma migrate dev     # Create + apply migration
npx prisma migrate deploy  # Apply migrations (production)
npx prisma studio          # GUI editor (port 5555)
npm run db:seed            # Seed sample data
npm run db:push            # Push schema without migration

# Docker
docker compose up -d       # Start Postgres
docker compose down        # Stop
docker compose logs -f postgres  # View logs

# Kill stuck dev server
Get-NetTCPConnection -LocalPort 3000 -State Listen |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

## 🧪 Verify Setup (smoke test)

```powershell
# 1. Homepage
curl http://localhost:3000

# 2. Health check
curl http://localhost:3000/api/health
# Expected: {"status":"ok","database":"connected","service":"heuse"}

# 3. Products page
curl http://localhost:3000/products

# 4. Admin login page
curl http://localhost:3000/admin/login

# 5. Database
docker exec -i heuse-postgres psql -U postgres -d heuse_dev -c "SELECT count(*) FROM \"Product\""
# Expected: 3 (Obsidian Bomber, Onyx Varsity, Charcoal Runner)
```

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| `P1000: Authentication failed` di migrate | Cek `DATABASE_URL` — port harus `5433` (bukan 5432) |
| `EADDRINUSE: port 3000` | Kill process: lihat command di atas |
| `Can't resolve '@/components/public/midtrans-snap-loader'` | Stale import dari migrasi. Pull latest code. |
| PayPal "CURRENCY_NOT_SUPPORTED" | Lo test di sandbox dengan currency yg gak disupport. Pakai IDR/auto-convert, atau switch ke USD. |
| `ORDER_ALREADY_CAPTURED` | Normal — duit udah masuk PayPal. Refresh page, `PayPalAutoCapture` akan sync DB. |
| Admin gak bisa delete product | Role kamu `ADMIN`. Seed admin harus `OWNER`. Re-run `npm run db:seed`. |
| Admin gak bisa login | Password hash broken. Run `npm run db:seed` — itu upsert + re-hash password. |
| Gambar produk blank | `UPLOADTHING_*` kosong. URL Unsplash seed masih jalan. |

---

## 📚 Related Docs

- `SPEC.md` — Full product spec (PRD)
- `PAYPAL-SETUP.md` — PayPal sandbox/live setup detail
- `AGENTS.md` / `CLAUDE.md` — Project-specific rules
- `../RAILWAY-FUNDAMENTAL.md` — Railway deployment guide (workspace root)

---

_Last updated: 2026-06-14 (post PayPal migration + comprehensive audit)_
