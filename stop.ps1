# stop.ps1 - Stop exactly the Lattice Arcade processes recorded by start.ps1.
# Falls back to sweeping the known service ports if no PID file exists.
$Root = $PSScriptRoot
$PidFile = Join-Path $Root '.services.pids'
$stopped = @()
if (Test-Path $PidFile) {
    try {
        $recorded = Get-Content $PidFile -Raw | ConvertFrom-Json
        foreach ($prop in $recorded.PSObject.Properties) {
            $targetPid = [int]$prop.Value
            if (Get-Process -Id $targetPid -ErrorAction SilentlyContinue) {
                Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
                $stopped += "$($prop.Name)($targetPid)"
            }
        }
    } catch { Write-Host "[stop] Could not parse $PidFile : $_" }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}
if ($stopped.Count -eq 0) {
    foreach ($port in 4001, 3001, 8000, 4173) {
        $owners = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique
        foreach ($owner in $owners) {
            if ($owner -and $owner -ne $PID) { Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue; $stopped += "port$port($owner)" }
        }
    }
}
# Also stop the held SP1 verifier daemon + prover sidecar sessions.
$sp1Stop = Join-Path $Root 'scripts\stop-sp1-daemon.ps1'
if (Test-Path (Join-Path $Root '.sp1-daemon.pid')) { & $sp1Stop }
$proverStop = Join-Path $Root 'scripts\stop-sp1-prover.ps1'
if (Test-Path (Join-Path $Root '.sp1-prover.pid')) { & $proverStop }

Write-Host "[stop] Stopped: $($stopped -join ', ')"
