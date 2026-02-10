Set-Location 'C:\Users\ucler\Desktop\D4ily\backend'
npx vitest run tests/unit/sanitize.test.ts --coverage 2>&1
Write-Host "---COVERAGE DIR---"
Get-ChildItem 'C:\Users\ucler\Desktop\D4ily\backend\coverage' | Select-Object Name, Length
