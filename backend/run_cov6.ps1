Set-Location 'C:\Users\ucler\Desktop\D4ily\backend'
npx vitest run --coverage --no-file-parallelism 2>&1 | Select-Object -Last 30
Write-Host "---COVERAGE DIR---"
Get-ChildItem 'C:\Users\ucler\Desktop\D4ily\backend\coverage' | Select-Object Name, Length
