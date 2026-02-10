Set-Location 'C:\Users\ucler\Desktop\D4ily\backend'
npx vitest run --coverage "--exclude=tests/unit/aiService.test.ts,tests/unit/auth.middleware.test.ts,tests/unit/emotionalAnalysisService.test.ts,tests/unit/rateLimit.test.ts,tests/integration/routes/admin.test.ts,tests/integration/routes/feed.test.ts" 2>&1 | Select-Object -Last 5
Write-Host "---COVERAGE TABLE SNIPPET---"
Get-ChildItem 'C:\Users\ucler\Desktop\D4ily\backend\coverage' | Select-Object Name, Length
