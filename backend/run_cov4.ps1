Set-Location 'C:\Users\ucler\Desktop\D4ily\backend'
Start-Transcript -Path 'C:\Users\ucler\Desktop\cov_transcript.txt' -Force
npx vitest run --coverage
Stop-Transcript
