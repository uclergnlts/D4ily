Set-Location 'C:\Users\ucler\Desktop\D4ily\backend'
$process = New-Object System.Diagnostics.Process
$process.StartInfo.FileName = 'node.exe'
$process.StartInfo.Arguments = 'node_modules\.bin\vitest run --coverage'
$process.StartInfo.WorkingDirectory = 'C:\Users\ucler\Desktop\D4ily\backend'
$process.StartInfo.RedirectStandardOutput = $true
$process.StartInfo.RedirectStandardError = $true
$process.StartInfo.UseShellExecute = $false
$process.StartInfo.CreateNoWindow = $true
$process.Start() | Out-Null
$stdout = $process.StandardOutput.ReadToEnd()
$stderr = $process.StandardError.ReadToEnd()
$process.WaitForExit()
$stdout | Out-File 'C:\Users\ucler\Desktop\cov_stdout2.txt' -Encoding utf8
$stderr | Out-File 'C:\Users\ucler\Desktop\cov_stderr2.txt' -Encoding utf8
Write-Host "Exit:" $process.ExitCode
Write-Host "stdout lines:" ($stdout -split "`n").Count
Write-Host "stderr lines:" ($stderr -split "`n").Count
