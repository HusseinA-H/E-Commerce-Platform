#!/usr/bin/env pwsh
# =============================================================================
# APEX LUXE — Infrastructure Diagnostics Script
# =============================================================================
# Usage:
#   .\scripts\infra-diagnose.ps1
#
# What it checks:
#   1. Docker Desktop status
#   2. Container health (apex_luxe_mssql, apex_luxe_redis)
#   3. Port 1433 / 6379 listeners
#   4. SQL Server connectivity (sqlcmd)
#   5. Redis connectivity (redis-cli)
#   6. Backend health endpoint (http://localhost:5000/api/v1/health)
#   7. Database existence check
# =============================================================================

$ErrorActionPreference = 'Continue'
$SA_PASSWORD = "ApexLuxe@2024!"

function Write-Header {
  param([string]$Title)
  Write-Host "`n══════════════════════════════════════════" -ForegroundColor Cyan
  Write-Host "  $Title" -ForegroundColor Cyan
  Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
}

function Write-Ok    { param([string]$msg) Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Warn  { param([string]$msg) Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Fail  { param([string]$msg) Write-Host "  ❌ $msg" -ForegroundColor Red }
function Write-Info  { param([string]$msg) Write-Host "  ℹ️  $msg" -ForegroundColor Gray }

# -----------------------------------------------------------------------------
# 1. Docker Desktop
# -----------------------------------------------------------------------------
Write-Header "1. Docker Desktop"
try {
  $dockerVersion = docker version --format "{{.Server.Version}}" 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Ok "Docker Desktop is running (engine v$dockerVersion)"
  } else {
    Write-Fail "Docker Desktop is not running or unreachable"
  }
} catch {
  Write-Fail "docker command not found — is Docker Desktop installed?"
}

# -----------------------------------------------------------------------------
# 2. Container Status
# -----------------------------------------------------------------------------
Write-Header "2. Container Status"
$containers = docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1
$containers | ForEach-Object {
  if ($_ -match "apex_luxe") {
    if ($_ -match "healthy") { Write-Ok $_ }
    elseif ($_ -match "unhealthy") { Write-Warn $_ }
    elseif ($_ -match "Up") { Write-Info "$_ (health check pending)" }
    else { Write-Fail $_ }
  }
}

# -----------------------------------------------------------------------------
# 3. Port Listeners
# -----------------------------------------------------------------------------
Write-Header "3. Port Listeners"

$port1433 = netstat -ano | Select-String ":1433\s" | Select-Object -First 3
if ($port1433) {
  Write-Ok "Port 1433 is listening:"
  $port1433 | ForEach-Object { Write-Info $_.ToString().Trim() }
} else {
  Write-Fail "Nothing is listening on port 1433"
}

$port6379 = netstat -ano | Select-String ":6379\s" | Select-Object -First 3
if ($port6379) {
  Write-Ok "Port 6379 is listening:"
  $port6379 | ForEach-Object { Write-Info $_.ToString().Trim() }
} else {
  Write-Fail "Nothing is listening on port 6379"
}

# -----------------------------------------------------------------------------
# 4. SQL Server Connectivity
# -----------------------------------------------------------------------------
Write-Header "4. SQL Server Connectivity"
$sqlResult = docker exec apex_luxe_mssql /opt/mssql-tools18/bin/sqlcmd `
  -S localhost -U SA -P $SA_PASSWORD -C `
  -Q "SELECT @@SERVERNAME AS ServerName, @@VERSION AS Version;" 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Ok "SQL Server authenticated successfully"
  Write-Info "Container: apex_luxe_mssql"
} else {
  Write-Fail "SQL Server authentication failed:"
  Write-Info $sqlResult
}

# -----------------------------------------------------------------------------
# 5. Database Existence Check
# -----------------------------------------------------------------------------
Write-Header "5. Database 'apexluxe'"
$dbCheck = docker exec apex_luxe_mssql /opt/mssql-tools18/bin/sqlcmd `
  -S localhost -U SA -P $SA_PASSWORD -C `
  -Q "SELECT name FROM sys.databases WHERE name='apexluxe';" 2>&1
if ($dbCheck -match "apexluxe") {
  Write-Ok "Database 'apexluxe' exists"
} else {
  Write-Fail "Database 'apexluxe' does NOT exist — creating it now..."
  docker exec apex_luxe_mssql /opt/mssql-tools18/bin/sqlcmd `
    -S localhost -U SA -P $SA_PASSWORD -C `
    -Q "CREATE DATABASE apexluxe;" 2>&1
  Write-Ok "Database 'apexluxe' created"
}

# -----------------------------------------------------------------------------
# 6. Redis Connectivity
# -----------------------------------------------------------------------------
Write-Header "6. Redis Connectivity"
$redisPing = docker exec apex_luxe_redis redis-cli ping 2>&1
if ($redisPing -match "PONG") {
  Write-Ok "Redis responded with PONG"
} else {
  Write-Fail "Redis ping failed: $redisPing"
}

# -----------------------------------------------------------------------------
# 7. Backend Health Endpoint
# -----------------------------------------------------------------------------
Write-Header "7. Backend Health Endpoint"
try {
  $response = Invoke-RestMethod -Uri "http://localhost:5000/api/v1/health" -TimeoutSec 5 2>&1
  $status = $response.status
  if ($status -eq "ok") {
    Write-Ok "Backend health: OK"
  } else {
    Write-Warn "Backend health: DEGRADED"
  }
  Write-Info "Database : $($response.services.database.status)"
  Write-Info "Redis    : $($response.services.redis.status)"
  Write-Info "Uptime   : $($response.uptime)s"
} catch {
  Write-Warn "Backend health endpoint not reachable (is the server running?)"
}

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
Write-Header "Diagnostics Complete"
Write-Host ""
Write-Info "To start infrastructure: docker compose up -d"
Write-Info "To start backend:        cd backend; npm run start:dev"
Write-Info "To run Prisma migrate:   cd backend; npx prisma migrate deploy"
Write-Host ""
