$routes = @("/", "/login", "/dashboard", "/users", "/wallets", "/transactions", "/reports", "/audit-logs", "/settings")
foreach ($r in $routes) {
    Write-Host "[NAV] Hitting http://localhost:3000$r"
    try {
        $null = iwr -Uri "http://localhost:3000$r" -Method Get
        Write-Host "[OK]"
    } catch {
        Write-Host "[FAIL] $r"
    }
}
