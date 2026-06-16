# HEUSE — Railway Deployment Guide

> **Audience:** Developer/agency yang handle deployment ke client.
> **Stack:** Next.js 16 + Prisma 7 + PostgreSQL + PayPal + NextAuth v5
> **Target platform:** [Railway](https://railway.app) (Nixpacks auto-detect)
> **Estimated setup time:** 20-30 menit (mostly nungguin build + setup credentials)
> **Estimated cost:** Railway Hobby plan mulai dari $5/month (ada free $5 credit trial)

---

## 📋 Overview

HEUSE adalah luxury menswear e-commerce platform. Project ini **production-ready** dan tinggal di-deploy.

**Yang akan terjadi setelah deploy:**
- Site live di URL: `<your-app>.up.railway.app` (atau custom domain)
- HTTPS otomatis via Railway
- PostgreSQL ter-setup dan ter-migrate otomatis
- Admin bisa login di `/admin/login`
- Public site bisa diakses tanpa auth

---

## ✅ Pre-requisites

Sebelum mulai, pastiin punya:

- [ ] **GitHub account** (untuk push code)
- [ ] **Railway account** (sign up di https://railway.app, bisa pakai GitHub OAuth)
- [ ] **PayPal Developer account** untuk payment (https://developer.paypal.com)
  - Sandbox credentials **untuk testing** (free, fake money)
  - Live credentials **untuk production** (perlu business verification)
- [ ] **(Optional) UploadThing account** untuk image upload (https://uploadthing.com)
- [ ] **(Optional) Custom domain** yang sudah lo beli (kalo gak mau pake Railway subdomain)

---

## Step 1: Push Code ke GitHub

### 1.1. Initialize Git Repository

Masuk ke folder project:
```bash
cd output/heuse
```

Init git (kalo belum):
```bash
git init
git add .
git status  # REVIEW: pastikan .env, .env.local, node_modules TIDAK muncul
```

**⚠️ CRITICAL:** Cek `git status` sebelum commit. **JANGAN PERNAH** commit `.env` atau `.env.local` (berisi credentials).

`.gitignore` udah include:
- `.env`, `.env.local`, `.env.*.local` → ignored
- `node_modules/` → ignored
- `.next/` → ignored
- `.env.example` → **tetap di-commit** (placeholder, aman)

### 1.2. First Commit

```bash
git commit -m "Initial commit - HEUSE production-ready"
```

### 1.3. Create GitHub Repo

1. Buka https://github.com/new
2. **Repository name:** `heuse-production` (atau sesuai branding client)
3. **Visibility:** Private (recommended) atau Public
4. **JANGAN** centang "Add README", "Add .gitignore", "Add license" (kita udah punya)
5. Klik **Create repository**

### 1.4. Push ke GitHub

GitHub bakal kasih instruksi. Jalankan:
```bash
git remote add origin https://github.com/<username>/<repo-name>.git
git branch -M main
git push -u origin main
```

Verify: buka repo URL di browser → semua file ada, **TIDAK ADA** `.env`.

---

## Step 2: Buat Railway Project

1. Login ke https://railway.app
2. Klik **New Project**
3. Pilih **Deploy from GitHub repo**
4. Pilih repo `heuse-production` yang baru dibuat
5. Railway bakal auto-detect Next.js dan mulai build pertama (bakal gagal karena env vars belum di-set — normal)

---

## Step 3: Add PostgreSQL Service

1. Di project dashboard, klik **+ New** → **Database** → **Add PostgreSQL**
2. Railway bakal provision PostgreSQL instance
3. Klik service **PostgreSQL** yang baru dibuat
4. Tab **Variables** → copy `DATABASE_URL` (format: `postgresql://postgres:***@<host>.railway.app:5432/railway`)
5. **`DATABASE_URL` ini yang akan lo pake untuk env var di Step 4**

---

## Step 4: Set Environment Variables

Klik service **HEUSE app** (yang dari GitHub), lalu tab **Variables**. Klik **+ New Variable** untuk tiap item di bawah.

### 🔴 WAJIB (Required — tanpa ini build/deploy gagal)

| Variable | Value | Catatan |
|---|---|---|
| `DATABASE_URL` | (paste dari Step 3) | Format: `postgresql://postgres:***@<host>.railway.app:5432/railway` |
| `NEXTAUTH_SECRET` | (generate baru) | Generate: `openssl rand -base64 32` — **JANGAN reuse dari local** |
| `NEXTAUTH_URL` | (set setelah deploy) | Untuk sekarang isi `https://placeholder.up.railway.app` — update setelah Railway kasih URL final |
| `ADMIN_SEED_EMAIL` | (email admin) | Misal: `admin@heuse.com` |
| `ADMIN_SEED_PASSWORD` | *** (password kuat) | **WAJIB ganti dari default `admin123`** — pake password manager |
| `PAYPAL_CLIENT_ID` | (dari PayPal) | Lihat cara dapat di bawah |
| `PAYPAL_CLIENT_SECRET` | *** (dari PayPal) | Lihat cara dapat di bawah |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | (sama dengan `PAYPAL_CLIENT_ID`) | Untuk frontend SDK |
| `PAYPAL_ENVIRONMENT` | `sandbox` | Ganti ke `live` setelah ready production |
| `PAYPAL_DEFAULT_CURRENCY` | `IDR` | IDR/USD/EUR — sesuai target market |
| `NEXT_PUBLIC_SITE_URL` | (sama dengan NEXTAUTH_URL) | URL publik site |

### 🟡 Recommended (production quality)

| Variable | Value | Catatan |
|---|---|---|
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `6281234567890` | Format intl tanpa `+`/spasi |
| `NEXT_PUBLIC_INSTAGRAM_HANDLE` | `heuse` | Tanpa `@` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `hello@heuse.com` | Email customer service |
| `ORDER_TOKEN_SECRET` | (generate baru) | `openssl rand -base64 32` — HMAC untuk order view tokens (fallback ke NEXTAUTH_SECRET kalo kosong) |
| `CRON_SECRET` | (generate baru) | `openssl rand -hex 32` — untuk `/api/cron/*` endpoints |

### 🟢 Optional (skip dulu, app jalan tanpa)

| Variable | Kapan perlu |
|---|---|
| `UPLOADTHING_SECRET` + `UPLOADTHING_APP_ID` | Kalo client mau upload gambar di admin (recommended) |
| `RESEND_API_KEY` | Kalo client mau email notif (order confirmation, dll) |
| `GOOGLE_ANALYTICS_ID` | Kalo client pake GA4 |
| `META_PIXEL_ID` | Kalo client pake Facebook Pixel |
| `PAYPAL_WEBHOOK_ID` | Kalo client mau webhook untuk real-time order status (recommended) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | Kalo client mau anti-bot captcha di form (recommended) |

### Cara Dapat PayPal Credentials

1. Buka https://developer.paypal.com/dashboard/applications
2. Toggle ke **Sandbox** (untuk testing) atau **Live** (untuk production)
3. Klik **Apps & Credentials** → **Create App**
4. Isi nama (misal: `HEUSE Production`) → klik **Create App**
5. Copy **Client ID** dan **Secret** ke env vars di Railway
6. ⚠️ **Untuk production**, PayPal butuh business verification (KYB process, butuh waktu)

---

## Step 5: Deploy

Setelah env vars di-set, Railway auto-trigger deploy.

1. Tab **Deployments** di Railway dashboard
2. Liat build log — kalau berhasil, status jadi **Success** ✅
3. Kalau gagal, klik deployment → **View Logs** untuk debug

**Build biasanya 1-3 menit.** First deploy bisa lebih lama karena Nixpacks perlu install deps.

---

## Step 6: Verifikasi Deployment

Setelah deploy sukses, Railway kasih URL: `<your-app>.up.railway.app`

**Sekarang update env vars:**
- Kembali ke **Variables**
- Update `NEXTAUTH_URL` dari `https://placeholder.up.railway.app` ke URL yang asli
- Update `NEXT_PUBLIC_SITE_URL` sama
- Railway akan auto-redeploy

**Smoke test (buka di browser atau pake curl):**

```bash
# Set URL dulu
export APP_URL="https://<your-app>.up.railway.app"

# Health check (harus return JSON)
curl $APP_URL/api/health
# Expected: {"status":"ok","database":"connected","service":"heuse"}

# Public routes (harus 200)
curl -o /dev/null -w "%{http_code}\n" $APP_URL/
curl -o /dev/null -w "%{http_code}\n" $APP_URL/products
curl -o /dev/null -w "%{http_code}\n" $APP_URL/cart
curl -o /dev/null -w "%{http_code}\n" $APP_URL/about
curl -o /dev/null -w "%{http_code}\n" $APP_URL/contact

# Admin routes (harus 307 — redirect ke login)
curl -o /dev/null -w "%{http_code}\n" $APP_URL/admin
curl -o /dev/null -w "%{http_code}\n" $APP_URL/admin/orders
```

**Test admin login:**
1. Buka `$APP_URL/admin/login` di browser
2. Login dengan `ADMIN_SEED_EMAIL` + `ADMIN_SEED_PASSWORD` yang lo set
3. Cek dashboard muncul → ✅ auth working
4. Coba akses `/admin/products` → ✅ protected route accessible setelah login

**Test checkout flow (sandbox):**
1. Buka `$APP_URL/products`
2. Pilih produk → klik "Add to Cart"
3. Buka `$APP_URL/cart` → klik "Checkout"
4. Isi form → klik "Continue to PayPal"
5. Login PayPal sandbox buyer (lihat setup di `PAYPAL-SETUP.md`)
6. Approve payment → kembali ke success page
7. Cek di `/admin/orders` → order muncul dengan status `CONFIRMED`

---

## Step 7: Custom Domain (Optional)

1. Beli domain (Namecheap, Cloudflare, dll)
2. Di Railway: tab **Settings** → **Domains** → **Custom Domain** → masukin domain lo (misal `heuse.com`)
3. Railway kasih **CNAME record** yang harus lo tambahin di DNS provider
4. Tunggu propagasi DNS (5-30 menit)
5. Update env vars: `NEXTAUTH_URL` dan `NEXT_PUBLIC_SITE_URL` ke `https://heuse.com`
6. Railway auto-redeploy

**HTTPS:** Railway auto-provision Let's Encrypt SSL. Gratis, no action needed.

---

## 🔄 Post-Deploy Tasks

### Setup Cron Jobs (Release Expired Orders)

Project ini ada endpoint `/api/cron/release-expired-orders` yang harus dipanggil tiap 15 menit.

**Cara setup di Railway:**

1. Install Railway Cron plugin (coming soon) atau gunakan GitHub Actions
2. **Alternative (recommended):** Setup GitHub Action di repo:
   ```yaml
   # .github/workflows/cron.yml
   name: Cron
   on:
     schedule:
       - cron: '*/15 * * * *'
   jobs:
     release-expired-orders:
       runs-on: ubuntu-latest
       steps:
         - name: Call cron endpoint
           run: |
             curl -X POST https://<your-app>.up.railway.app/api/cron/release-expired-orders \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
   ```
3. Set `CRON_SECRET` di GitHub repo secrets (Settings → Secrets and variables → Actions)
4. Verify di admin dashboard → orders dengan status `AWAITING_PAYMENT` yang expired akan di-release

### Setup PayPal Webhook

1. Login https://developer.paypal.com → Apps & Credentials → pilih app lo
2. Tab **Webhooks** → **Add Webhook**
3. **URL:** `https://<your-app>.up.railway.app/api/paypal/webhook`
4. **Events:**
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `CHECKOUT.ORDER.APPROVED`
5. Save → copy **Webhook ID** → set sebagai `PAYPAL_WEBHOOK_ID` di Railway

### Setup UploadThing (Image Uploads)

1. Sign up di https://uploadthing.com
2. Buat app baru → copy **Secret** dan **App ID**
3. Set di Railway env vars: `UPLOADTHING_SECRET` + `UPLOADTHING_APP_ID`
4. Test di admin → upload gambar produk

---

## 🐛 Troubleshooting

### Build Gagal: "Could not find a declaration file for module 'bcrypt'"

**Fix:** Pastikan `@types/bcrypt` ada di `package.json` devDependencies. Lihat `package.json` di project — harus ada entry `@types/bcrypt: ^6.0.0`.

### Build Gagal: "useSearchParams() should be wrapped in a suspense boundary"

**Fix:** Sudah di-handle di project. `/waitlist` dan `/checkout` sudah di-wrap dengan `<Suspense>`. Kalo muncul lagi, cek file-nya.

### Build Warning: "The 'middleware' file convention is deprecated. Please use 'proxy' instead"

**Fix:** Sudah di-handle. Project pake `proxy.ts` (bukan `middleware.ts`) sesuai Next.js 16.

### Deploy Sukses tapi Pages 404

**Fix:** Cek `NEXTAUTH_URL` dan `NEXT_PUBLIC_SITE_URL` di env vars. Harus match dengan URL Railway.

### Database Error: "relation does not exist"

**Fix:** Migrasi belum jalan. Cek logs:
```bash
# Di Railway, klik service → Deployments → latest → View Logs
# Cari "prisma migrate deploy" output
```
Kalo migrations belum apply, trigger manual deploy: tab **Deployments** → **Deploy** → pilih commit → **Deploy**.

### Health Check Return `database: "disconnected"`

**Fix:** 
1. Cek `DATABASE_URL` di env vars (format harus bener)
2. Cek PostgreSQL service status di Railway (harus **Active**)
3. Cek logs untuk error spesifik

### PayPal: "CURRENCY_NOT_SUPPORTED"

**Fix:** Sandbox accounts jarang support IDR. Pilihan:
- Set `PAYPAL_DEFAULT_CURRENCY=USD` untuk testing
- Atau enable IDR di merchant PayPal account (Live mode)

### PayPal: "PAYPAL_CLIENT_ID is not set"

**Fix:** Cek env vars. `PAYPAL_CLIENT_ID` dan `PAYPAL_CLIENT_SECRET` harus di-set.

---

## ⏪ Rollback Plan

Kalo deploy baru bermasalah, rollback ke versi sebelumnya:

1. Railway dashboard → tab **Deployments**
2. Cari deployment yang masih jalan (sebelum yg broken)
3. Klik **⋮** (three dots) → **Redeploy**

Atau revert di GitHub:
```bash
git revert HEAD
git push
# Railway auto-redeploy dengan commit sebelumnya
```

---

## 👥 Untuk Client (Handoff Notes)

Saat handover ke client, kasih mereka:

1. **Admin URL:** `https://<domain>/admin/login`
2. **Admin credentials:** (email + password yang lo set)
3. **Railway dashboard access:** Invite client ke Railway project (Settings → Members)
4. **Domain management:** Kalo pake custom domain, kasih akses ke DNS provider
5. **PayPal account access:** Kalo pake PayPal Live, perlu business verification — biasanya atas nama client
6. **Backup strategy:** Railway otomatis backup PostgreSQL (7 days retention di Hobby plan)
7. **Support contact:** Lo sebagai developer handle maintenance

**Yang client bisa manage sendiri (via admin dashboard):**
- Products (CRUD lengkap)
- Categories, Drops, Articles
- Orders (lihat + update status)
- Leads/Newsletter subscribers
- Settings (brand config)

**Yang perlu developer (lo):**
- Code changes
- Env vars management
- Database migration
- Custom features

---

## 💰 Estimated Costs (Hobby Plan)

- **Railway app:** ~$5-7/month (web service + cron)
- **PostgreSQL:** ~$3-5/month (paling kecil 1GB, scale as needed)
- **Total:** ~$8-12/month (hemat dari Vercel + Supabase combo)

**Free trial:** $5 credit (cukup untuk testing 1-2 bulan)

---

## 🔒 Security Checklist (Pre-Launch)

Pastikan semua ini di-check sebelum go-live ke production:

- [ ] `ADMIN_SEED_PASSWORD` diganti dari default
- [ ] `NEXTAUTH_SECRET` di-generate baru (bukan dari local)
- [ ] `PAYPAL_ENVIRONMENT=live` (kalau udah live)
- [ ] `NEXT_PUBLIC_SITE_URL` dan `NEXTAUTH_URL` di-set ke domain production
- [ ] `PAYPAL_WEBHOOK_ID` di-set dan verified
- [ ] `CRON_SECRET` di-generate dan GitHub Action di-setup
- [ ] Custom domain configured (kalo pake)
- [ ] HTTPS verified (Railway auto, tapi double-check)
- [ ] Test order dari real customer (kecil nominal) end-to-end
- [ ] Backup strategy understood (Railway default backup)

---

## 📞 Support

Kalo stuck atau ada pertanyaan:

1. Cek **Troubleshooting** section di atas
2. Baca [`README.md`](./README.md) dan [`SPEC.md`](./SPEC.md)
3. Baca [`PAYPAL-SETUP.md`](./PAYPAL-SETUP.md) untuk payment details
4. Cek [Next.js 16 docs](https://nextjs.org/docs)
5. Cek [Railway docs](https://docs.railway.app)

---

_Last updated: 2026-06-15 (post migration to PayPal, Next.js 16 upgrade, security fixes)_
