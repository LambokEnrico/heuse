@echo off
REM ============================================================
REM  HEUSE - Deploy to Railway
REM  Usage: deploy-railway.bat
REM
REM  What this does:
REM    1. Checks prerequisites (Node, Git, .env)
REM    2. Commits code to Git and pushes to GitHub
REM    3. Installs Railway CLI
REM    4. Logs you into Railway (opens browser)
REM    5. Creates a new Railway project
REM    6. Adds PostgreSQL plugin
REM    7. Pushes all env vars from .env to Railway
REM    8. Deploys the app
REM    9. Shows you the URL + post-deploy checklist
REM
REM  Prerequisites:
REM    - .env file is already filled in (with NEXTAUTH_SECRET, PayPal keys, etc.)
REM    - GitHub repo created (you'll be asked for the URL)
REM    - Railway account created (free: https://railway.app)
REM ============================================================

chcp 65001 > nul
title HEUSE - Railway Deploy
setlocal EnableDelayedExpansion

echo.
echo ============================================================
echo   HEUSE - Deploy to Railway
echo ============================================================
echo.
echo   Script ini bakal otomatis push code + setup Railway.
echo   Pastikan .env udah diisi (NEXTAUTH_SECRET, PayPal, dll).
echo.
echo   Butuh GitHub repo URL. Siapin dulu di https://github.com/new
echo.
pause

REM -----------------------------------------------------------
REM  Step 1: Pre-flight checks
REM -----------------------------------------------------------
echo.
echo [1/9] Checking prerequisites...
echo.

set "MISSING="
where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js belum terinstall. Download di https://nodejs.org
  set "MISSING=1"
) else (
  for /f "tokens=*" %%v in ('node --version') do echo   [OK] Node.js %%v
)

where git >nul 2>nul
if errorlevel 1 (
  echo   [X] Git belum terinstall. Download di https://git-scm.com
  set "MISSING=1"
) else (
  for /f "tokens=*" %%v in ('git --version') do echo   [OK] Git %%v
)

if not exist .env (
  echo   [X] .env belum ada. Run setup-dev.bat dulu atau copy .env.example ke .env
  set "MISSING=1"
) else (
  echo   [OK] .env exists
)

if defined MISSING (
  echo.
  echo   Fix yang missing dulu, terus run script ini lagi.
  pause
  exit /b 1
)
echo.

REM -----------------------------------------------------------
REM  Step 2: Git init + commit
REM -----------------------------------------------------------
echo [2/9] Git setup...
echo.

if not exist .git (
  git init
  echo   [OK] Initialized git repo
)
REM Always ensure we're on main branch (idempotent if already main)
git branch -M main
for /f "tokens=*" %%b in ('git rev-parse --abbrev-ref HEAD') do echo   [i] On branch: %%b

REM Add + commit if there are changes
git add . >nul 2>&1
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Deploy HEUSE to Railway"
  echo   [OK] Committed latest changes
) else (
  echo   [i] Nothing to commit
)
echo.

REM -----------------------------------------------------------
REM  Step 3: Set up GitHub remote + push
REM -----------------------------------------------------------
echo [3/9] Setup GitHub remote + push...
echo.

git remote get-url origin >nul 2>&1
set "HAS_ORIGIN=0"
if not errorlevel 1 set "HAS_ORIGIN=1"

if "!HAS_ORIGIN!"=="0" (
  echo   Belum ada GitHub remote. Masukin URL repo GitHub lo:
  echo   (Format: https://github.com/username/repo-name.git)
  echo   Atau pencet Enter buat pake existing remote kalo ada.
  echo.
  set /p "REMOTE_URL=   Repo URL (atau Enter): "
  if "!REMOTE_URL!"=="" (
    REM Check if origin already exists (might have been added previously)
    for /f "tokens=*" %%r in ('git remote get-url origin 2^>nul') do set "REMOTE_URL=%%r"
    if defined REMOTE_URL (
      echo   [i] Found existing remote: !REMOTE_URL!
    ) else (
      echo   [X] URL kosong, gak ada remote. Stop.
      pause
      exit /b 1
    )
  ) else (
    git remote add origin "!REMOTE_URL!" 2>nul
    if errorlevel 1 (
      git remote set-url origin "!REMOTE_URL!" 2>nul
    )
    echo   [OK] Remote set
  )
) else (
  for /f "tokens=*" %%r in ('git remote get-url origin') do set "REMOTE_URL=%%r"
  echo   [i] Existing remote: !REMOTE_URL!
)

echo.
echo   Pushing to GitHub...
echo   (Kalo gagal "authentication failed", lo butuh Personal Access Token:
echo    https://github.com/settings/tokens - generate token, terus pake sebagai password)
echo.
git push -u origin main
echo.
REM Note: errorlevel check is unreliable in Git Bash (MINGW64).
REM If push printed "Everything up-to-date" or "set up to track" = SUCCESS
echo   [i] Check output di atas. Kalo ada "Everything up-to-date" atau
echo       "branch 'main' set up to track" = PUSH BERHASIL.
echo       Kalo ada "error:" atau "fatal:" = cek URL / token.
echo.
echo   Verify manual: https://github.com/!REMOTE_URL:19,-4!/commits/main
echo.
echo   Tekan Enter buat lanjut ke Railway...
pause >nul
echo.

REM -----------------------------------------------------------
REM  Step 4: Install Railway CLI
REM -----------------------------------------------------------
echo [4/9] Install Railway CLI...
echo.

where railway >nul 2>nul
if errorlevel 1 (
  echo   Installing...
  call npm install -g @railway/cli
  if errorlevel 1 (
    echo   [X] Install gagal. Cek koneksi internet / npm.
    pause
    exit /b 1
  )
)
for /f "tokens=*" %%v in ('railway --version') do echo   [OK] Railway CLI %%v
echo.

REM -----------------------------------------------------------
REM  Step 5: Login to Railway
REM -----------------------------------------------------------
echo [5/9] Login ke Railway...
echo ============================================================
echo   Browser bakal kebuka. Login di sana (pake GitHub OAuth).
echo   Setelah success, balik ke window ini.
echo ============================================================
echo.
pause
call railway login
if errorlevel 1 (
  echo   [X] Login gagal
  pause
  exit /b 1
)
echo   [OK] Logged in
echo.

REM -----------------------------------------------------------
REM  Step 6: Init Railway project
REM -----------------------------------------------------------
echo [6/9] Create Railway project...
echo.
echo   Kalo Railway nanya template, pilih "Empty Project".
echo   Atau pake existing project - pilih "<your existing one>".
echo.
call railway init
if errorlevel 1 (
  echo   [X] Init gagal
  pause
  exit /b 1
)
echo   [OK] Project linked
echo.

REM -----------------------------------------------------------
REM  Step 7: Add PostgreSQL
REM -----------------------------------------------------------
echo [7/9] Adding PostgreSQL plugin...
echo.
call railway add --plugin postgresql
if errorlevel 1 (
  echo   [!] Gagal add Postgres. Mungkin udah ada? Skip...
) else (
  echo   [OK] PostgreSQL added
)
echo.

REM -----------------------------------------------------------
REM  Step 8: Push env vars from .env
REM -----------------------------------------------------------
echo [8/9] Pushing env vars from .env to Railway...
echo.
echo   (DATABASE_URL di-skip, auto-set sama Railway Postgres)
echo   (Credential values TIDAK di-echo ke terminal - by design)
echo.

set "PUSHED=0"
set "FAILED=0"
set "PUSHED_KEYS="
for /f "usebackq delims=" %%v in ('node scripts\parse-env.js') do (
  set "VAR_LINE=%%v"
  if not "!VAR_LINE!"=="" (
    REM Extract only the KEY name (for logging, never the value)
    for /f "delims==" %%k in ("!VAR_LINE!") do set "VAR_KEY=%%k"
    echo   Setting: !VAR_KEY!
    REM Push to Railway, suppress CLI output
    call railway variables set "!VAR_LINE!" >nul 2>&1
    if errorlevel 1 (
      set /a "FAILED+=1"
    ) else (
      set /a "PUSHED+=1"
      set "PUSHED_KEYS=!PUSHED_KEYS! !VAR_KEY!"
    )
  )
)
echo.
echo   Result: !PUSHED! vars pushed, !FAILED! failed.
if !PUSHED! gtr 0 (
  echo   Vars pushed:!PUSHED_KEYS!
)
if !FAILED! gtr 0 (
  echo   [!] Some vars failed - check Railway dashboard Variables tab
)
echo.

REM -----------------------------------------------------------
REM  Step 9: Deploy
REM -----------------------------------------------------------
echo [9/9] Deploying to Railway...
echo.
echo   Ini bisa 2-3 menit buat build + deploy.
echo.
call railway up --detach
if errorlevel 1 (
  echo   [X] Deploy gagal. Cek logs di Railway dashboard.
  pause
  exit /b 1
)
echo   [OK] Deploy triggered!
echo.

REM Get URL
echo   Getting your URL...
timeout /t 5 /nobreak >nul
call railway domain >nul 2>&1
for /f "tokens=*" %%u in ('railway domain 2^>nul') do set "APP_URL=%%u"

REM -----------------------------------------------------------
REM  POST-DEPLOY CHECKLIST
REM -----------------------------------------------------------
echo.
echo ============================================================
echo   DEPLOYED!
echo ============================================================
echo.
if defined APP_URL (
  echo   Your URL: !APP_URL!
  echo.
  echo   Set NEXTAUTH_URL dan NEXT_PUBLIC_SITE_URL:
  echo     railway variables set NEXTAUTH_URL=!APP_URL!
  echo     railway variables set NEXT_PUBLIC_SITE_URL=!APP_URL!
  echo.
  echo   Verify health check:
  echo     curl !APP_URL!/api/health
) else (
  echo   Ambil URL lo di Railway dashboard: https://railway.app/dashboard
  echo   Lalu set NEXTAUTH_URL dan NEXT_PUBLIC_SITE_URL.
)
echo.
echo ============================================================
echo   POST-DEPLOY CHECKLIST
echo ============================================================
echo.
echo   1. Tunggu 2-3 menit buat build selesai (cek Railway dashboard)
echo.
echo   2. Set domain URLs (kalau belum):
echo      railway variables set NEXTAUTH_URL=https://YOUR-URL
echo      railway variables set NEXT_PUBLIC_SITE_URL=https://YOUR-URL
echo.
echo   3. Verifikasi:
echo      curl https://YOUR-URL/api/health
echo.
echo   4. Login admin di browser:
echo      https://YOUR-URL/admin/login
echo.
echo   5. Test checkout (sandbox):
echo      - Buka /products, add to cart, checkout
echo      - Login pake PayPal sandbox buyer account
echo.
echo   6. (Optional) Setup cron + PayPal webhook - lihat DEPLOY.md
echo.
echo   7. (Production) Switch PAYPAL_ENVIRONMENT=live + business verify
echo.
pause
