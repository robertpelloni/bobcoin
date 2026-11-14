# stop-sp1-prover.ps1 - Stop the held SP1 proving sidecar session.
$Root = Split-Path $PSScriptRoot -Parent
$PidFile = Join-Path $Root '.sp1-prover.pid'
if (Test-Path $PidFile) {
    $proverPid = [int](Get-Content $PidFile -Raw).Trim()
    if (Get-Process -Id $proverPid -ErrorAction SilentlyContinue) {
        Stop-Process -Id $proverPid -Force -ErrorAction SilentlyContinue
        Write-Host "[sp1-prover] stopped held session pid=$proverPid"
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host '[sp1-prover] no pid file'
}
