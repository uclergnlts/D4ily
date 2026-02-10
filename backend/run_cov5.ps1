Set-Location 'C:\Users\ucler\Desktop\D4ily\backend'
npx vitest run --coverage "--coverage.all=false" 2>&1 | Select-Object -Last 20
Write-Host "---"
Get-ChildItem 'C:\Users\ucler\Desktop\D4ily\backend\coverage' | Select-Object Name
