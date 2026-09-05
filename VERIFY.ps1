$ErrorActionPreference = 'Stop'

Write-Host '1/3 Installing exact dependencies...' -ForegroundColor Cyan
npm ci

Write-Host '2/3 Running TypeScript and production build...' -ForegroundColor Cyan
npm run check

Write-Host '3/3 Running production dependency audit...' -ForegroundColor Cyan
npm audit --omit=dev

Write-Host 'DARIJAVOICE_VERIFY_OK' -ForegroundColor Green
