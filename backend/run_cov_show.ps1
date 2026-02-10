Set-Location 'C:\Users\ucler\Desktop\D4ily\backend'
$output = npx vitest run --coverage 2>&1
$inCoverage = $false
foreach ($line in $output) {
    $clean = $line -replace '\x1b\[[0-9;]*[mGKHF]', ''
    if ($clean -match 'Coverage report from') { $inCoverage = $true }
    if ($inCoverage) { Write-Host $clean }
    if ($inCoverage -and $clean -match '^-+$') { if ($clean.Length -gt 50) { break } }
}
