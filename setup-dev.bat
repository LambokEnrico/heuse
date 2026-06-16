@echo off
REM ============================================================
REM  HEUSE - Local Development Setup
REM  Usage: setup-dev.bat
REM
REM  What this does:
REM    1. Checks Node.js, Docker, Git
REM    2. Copies .env.example to .env (if not exists)
REM    3. Opens .env in Notepad for you to fill in
REM    4. Runs npm install
REM    5. Starts PostgreSQL via Docker
REM    6. Runs Prisma migrations
REM    7. Seeds the database
REM    8. Starts the dev server
REM ============================================================

chcp 65001 > nul
title HEUSE - Local Setup
setlocal EnableDelayedExpansion

echo.
echo ============================================================
echo   HEUSE - Local Development Setup
echo ============================================================
echo.

REM -----------------------------------------------------------
REM  Step 1: Pre-flight checks
REM -----------------------------------------------------------
echo [1/8] Checking prerequisites...
echo.

set "MISSING="
where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js belum terinstall. Download di https://nodejs.org
  set "MISSING=1"
) else (
  for /f "tokens=*" %%v in ('node --version') do echo   [OK] Node.js %%v
)

where npm >nul 2>nul
if errorlevel 1 (
  echo   [X] npm belum terinstall
  set "MISSING=1"
) else (
  for /f "tokens=*" %%v in ('npm --version') do echo   [OK] npm %%v
)

where docker >nul 2>nul
if errorlevel 1 (
  echo   [!] Docker belum terinstall. Install dari https://docker.com/products/docker-desktop
  echo       Tanpa Docker, lo perlu PostgreSQL installed manual (port 5432).
  set "DOCKER_MISSING=1"
) else (
  for /f "tokens=*" %%v in ('docker --version') do echo   [OK] Docker %%v
)

if defined MISSING (
  echo.
  echo   Install software yang kurang dulu, lalu run script ini lagi.
  pause
  exit /b 1
)
echo.

REM -----------------------------------------------------------
REM  Step 2: Setup .env
REM -----------------------------------------------------------
echo [2/8] Setting up .env file...
echo.

if not exist .env (
  if exist .env.example (
    copy .env.example .env >nul
    echo   [OK] Created .env from template
  ) else (
    echo   [X] .env.example not found. Are you in the project folder?
    pause
    exit /b 1
  )
) else (
  echo   [i] .env already exists, keeping it
)
echo.

REM -----------------------------------------------------------
REM  Step 3: Open .env for editing
REM -----------------------------------------------------------
echo [3/8] Edit .env file
echo ============================================================
echo   File .env udah terbuka di Notepad.
echo   ISI 5 VARIABLES INI (sisanya boleh default):
echo.
echo     1. NEXTAUTH_SECRET        - paste hasil 'node -e "console.log(require..." di terminal
echo     2. ADMIN_SEED_PASSWORD    - bikin password kuat sendiri
echo     3. PAYPAL_CLIENT_ID       - dari https://developer.paypal.com Sandbox
echo     4. PAYPAL_CLIENT_SECRET   - sama, klik "Show" di PayPal
echo     5. NEXT_PUBLIC_PAYPAL_CLIENT_ID - SAMA dengan PAYPAL_CLIENT_ID
echo.
echo   Close Notepad setelah save, lalu balik ke sini.
echo ============================================================
echo.
pause
notepad .env
echo.
echo   [OK] .env updated
echo.

REM -----------------------------------------------------------
REM  Step 4: npm install
REM -----------------------------------------------------------
echo [4/8] Installing dependencies (ini bisa 1-2 menit)...
echo.
call npm install
if errorlevel 1 (
  echo.
  echo   [X] npm install gagal. Cek error di atas.
  pause
  exit /b 1
)
echo.

REM -----------------------------------------------------------
REM  Step 5: Start Docker Postgres
REM -----------------------------------------------------------
echo [5/8] Starting PostgreSQL via Docker...
echo.
if defined DOCKER_MISSING (
  echo   [!] Docker tidak ada, skip step ini.
  echo       Pastikan PostgreSQL running manual di port 5432.
  echo       Dan edit .env: DATABASE_URL ganti port 5433 ke 5432.
) else (
  call docker compose up -d
  if errorlevel 1 (
    echo   [X] Docker gagal start. Cek Docker Desktop udah jalan.
    pause
    exit /b 1
  )
  echo   Waiting 10 detik untuk Postgres ready...
  timeout /t 10 /nobreak >nul
  echo   [OK] PostgreSQL started
)
echo.

REM -----------------------------------------------------------
REM  Step 6: Prisma migrations
REM -----------------------------------------------------------
echo [6/8] Running database migrations...
echo.
call npx prisma migrate deploy
if errorlevel 1 (
  echo.
  echo   [X] Migration gagal. Cek DATABASE_URL di .env (port 5433, bukan 5432).
  pause
  exit /b 1
)
echo.

REM -----------------------------------------------------------
REM  Step 7: Seed database
REM -----------------------------------------------------------
echo [7/8] Seeding database (admin user + sample products)...
echo.
call npm run db:seed
if errorlevel 1 (
  echo   [!] Seed gagal, tapi migrations jalan. Lo bisa run ulang nanti.
)
echo.

REM -----------------------------------------------------------
REM  Step 8: Start dev server
REM -----------------------------------------------------------
echo [8/8] Starting dev server...
echo ============================================================
echo   DEV SERVER STARTING
echo ============================================================
echo.
echo   Local URL:  http://localhost:3000
echo   Admin:      http://localhost:3000/admin/login
echo.
echo   Login admin:
echo     Email:    (yang lo set di ADMIN_SEED_EMAIL)
echo     Password: (yang lo set di ADMIN_SEED_PASSWORD)
echo.
echo   Stop server: Ctrl+C di window ini
echo ============================================================
echo.
timeout /t 3 /nobreak >nul
call npm run dev

REM This only runs if user closes dev server
echo.
echo   Dev server stopped.
pause
