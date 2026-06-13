$supabaseUrl = 'https://cfeeqgokzkzblddefhxn.supabase.co'
$supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI'

# Let's log in
$body = @{
    email = 'owaisgmail@gmail.com'
    password = 'Owais@11'
} | ConvertTo-Json

$headers = @{
    'apikey' = $supabaseAnonKey
    'Content-Type' = 'application/json'
}

Write-Host "Attempting login..."
try {
    $loginRes = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/token?grant_type=password" -Method Post -Body $body -Headers $headers
    $token = $loginRes.access_token
    Write-Host "Logged in successfully."
} catch {
    Write-Host "Login failed: $_"
    exit 1
}

$authHeaders = @{
    'apikey' = $supabaseAnonKey
    'Authorization' = "Bearer $token"
    'Content-Type' = 'application/json'
}

# 1. Raw fetch
Write-Host "`n1. Fetching raw notifications (no joins)..."
try {
    $res = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/notifications?limit=5" -Method Get -Headers $authHeaders
    Write-Host "Success: $($res | ConvertTo-Json -Depth 5)"
} catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response body: $($reader.ReadToEnd())"
    }
}

# 2. Join as written in code
Write-Host "`n2. Fetching notifications with actor relationship..."
try {
    $url = "$supabaseUrl/rest/v1/notifications?select=*,actor:profiles!actor_id(full_name,avatar_url,user_type)&limit=5"
    $res = Invoke-RestMethod -Uri $url -Method Get -Headers $authHeaders
    Write-Host "Success: $($res | ConvertTo-Json -Depth 5)"
} catch {
    Write-Host "Error: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response body: $($reader.ReadToEnd())"
    }
}
