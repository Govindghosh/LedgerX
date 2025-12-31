$baseUrl = "http://localhost:5000/api/v1"

function Hit-Endpoint($name, $uri, $method, $body = $null, $headers = $null) {
    Write-Host "`n[TEST] Testing $name..."
    try {
        $params = @{
            Uri = $uri
            Method = $method
            ContentType = "application/json"
        }
        if ($body) { $params["Body"] = ($body | ConvertTo-Json) }
        if ($headers) { $params["Headers"] = $headers }
        
        $response = Invoke-RestMethod @params
        Write-Host "[OK] Success: $($response.message)"
        return $response
    } catch {
        Write-Host "[ERROR] Failed: $($_.Exception.Message)"
        return $null
    }
}

$health = Hit-Endpoint "Health" "http://localhost:5000/health" "Get"

$login = Hit-Endpoint "Login" "$baseUrl/auth/login" "Post" @{
    email = "admin@test.com"
    password = "Admin@123"
}

if ($login -and $login.data.accessToken) {
    $token = $login.data.accessToken
    $headers = @{ Authorization = "Bearer $token" }
    
    $null = Hit-Endpoint "Transactions" "$baseUrl/transactions" "Get" $null $headers
    $null = Hit-Endpoint "Reports" "$baseUrl/reports/charts" "Get" $null $headers
    $null = Hit-Endpoint "Wallet" "$baseUrl/wallet/me" "Get" $null $headers
}

Write-Host "`n[DONE] All API hits completed!"
