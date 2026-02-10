Set-Location 'C:\Users\ucler\Desktop\D4ily\backend'
npx vitest run --coverage 2>&1 | Select-Object -Last 5
Write-Host "---COVERAGE DIR---"
Get-ChildItem 'C:\Users\ucler\Desktop\D4ily\backend\coverage' | Select-Object Name, Length
