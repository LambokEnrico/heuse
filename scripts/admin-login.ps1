# NextAuth login flow + fetch admin orders
$baseUrl = "https://heuse-production-9203.up.railway.app"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# 1. Get CSRF token
try {
    $csrfRes = Invoke-WebRequest -Uri "$baseUrl/api/auth/csrf" -UseBasicParsing -TimeoutSec 15 -WebSession $session -ErrorAction Stop
    Write-Host "=== CSRF Response ==="
    Write-Host "Status: $($csrfRes.StatusCode)"
    Write-Host "Body: $($csrfRes.Content)"
    $csrfData = $csrfRes.Content | ConvertFrom-Json
    $csrfToken = $csrfData.csrfToken
    Write-Host "CSRF Token: $csrfToken"
} catch {
    Write-Host "CSRF error: $($_.Exception.Message)"
    exit
}

# 2. Login
try {
    $loginBody = @{
        csrfToken = $csrfToken
        email = "heuseofficials@gmail.com"
        password = "heuse321"
        callbackUrl = "$baseUrl/admin"
        json = "true"
    }
    $loginRes = Invoke-WebRequest -Uri "$baseUrl/api/auth/callback/credentials" `
        -Method POST `
        -Body $loginBody `
        -UseBasicParsing `
        -TimeoutSec 15 `
        -WebSession $session `
        -ContentType "application/x-www-form-urlencoded" `
        -MaximumRedirection 0 `
        -ErrorAction Stop
    Write-Host "=== Login Response ==="
    Write-Host "Status: $($loginRes.StatusCode)"
    Write-Host "Headers: $($loginRes.Headers | Out-String)"
    Write-Host "Body: $($loginRes.Content)"
} catch {
    Write-Host "=== Login Error ==="
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Message: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Body: $($reader.ReadToEnd())"
    }
}

# 3. Fetch admin orders
try {
    $ordersRes = Invoke-WebRequest -Uri "$baseUrl/api/admin/orders?pageSize=10" -UseBasicParsing -TimeoutSec 15 -WebSession $session -ErrorAction Stop
    Write-Host "=== Admin Orders ==="
    Write-Host "Status: $($ordersRes.StatusCode)"
    Write-Host "Body: $($ordersRes.Content)"
} catch {
    Write-Host "=== Orders Error ==="
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    Write-Host "Message: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Body: $($reader.ReadToEnd())"
    }
}
