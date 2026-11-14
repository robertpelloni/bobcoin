# stop-sp1-daemon.ps1 - Stop the held SP1 verifier daemon session.
$Root = Split-Path $PSScriptRoot -Parent
$PidFile = Join-Path $Root '.sp1-daemon.pid'
if (Test-Path $PidFile) {
    $daemonPid = [int](Get-Content $PidFile -Raw).Trim()
    if (Get-Process -Id $daemonPid -ErrorAction SilentlyContinue) {
        Stop-Process -Id $daemonPid -Force -ErrorAction SilentlyContinue
        Write-Host "[sp1-daemon] stopped held session pid=$daemonPid"
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host '[sp1-daemon] no pid file'
}
