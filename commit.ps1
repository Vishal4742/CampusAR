#!/usr/bin/env pwsh
# commit.ps1 — Run this at the end of every work session
# Usage:  .\commit.ps1 "what you did today"
# Example: .\commit.ps1 "Week 1: integrated Nimiq QR scanner in WebWorker"

param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

$date = Get-Date -Format "yyyy-MM-dd"
$week = [math]::Ceiling(((Get-Date) - (Get-Date "2026-02-27")).Days / 7)

# Stamp today's date into TASKS.md daily log if not already there
$tasksPath = "TASKS.md"
$logLine = "| $date | $Message |"
$content = Get-Content $tasksPath -Raw

if ($content -notmatch [regex]::Escape($date)) {
    # Find the last row in the daily log table and append after it
    $content = $content -replace "(## 📅 Daily Log[\s\S]*?)\|---\|---\|", "`$1|---|---|`n$logLine"
    Set-Content $tasksPath $content -NoNewline
    Write-Host "✅ Added to TASKS.md daily log: $logLine" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Date $date already in TASKS.md — skipping log update" -ForegroundColor Yellow
}

# Stage everything and commit
git add .
git commit -m "w$week/$date: $Message"

Write-Host ""
Write-Host "✅ Committed: w$week/$date: $Message" -ForegroundColor Cyan
Write-Host "   Run 'git push' to push to GitHub when ready." -ForegroundColor Gray
