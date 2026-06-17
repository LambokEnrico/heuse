$urls = @(
    "https://heuse-production-9203.up.railway.app/checkout/success/HEUSE-MQGXPJC8-QHX2?viewToken=qA3mYkhhx13O-m2l58x391PL-Wt1waPyYkMfGteFk7Y",
    "https://heuse-production-9203.up.railway.app/api/health"
)
foreach ($u in $urls) {
    try {
        $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop
        Write-Host "=== $u ==="
        Write-Host "Status: $($r.StatusCode) | Size: $($r.Content.Length)"
        if ($r.Content -match "Payment Confirmed|Awaiting Payment|Order Status Unknown|Payment Failed|404: This page could not be found") {
            $r.Content | Select-String -Pattern "Payment Confirmed|Awaiting Payment|Order Status Unknown|Payment Failed|404: This page could not be found" -AllMatches | ForEach-Object {
                Write-Host "  -> Match: $($_.Matches[0].Value)"
            }
        } else {
            Write-Host "  -> No status text found in body"
        }
        # Check for Next.js notFound digest
        if ($r.Content -match "NEXT_HTTP_ERROR_FALLBACK;\d+") {
            Write-Host "  -> Next.js notFound digest detected"
        }
    } catch {
        Write-Host "=== $u ==="
        Write-Host "Error: $($_.Exception.Message)"
    }
}
