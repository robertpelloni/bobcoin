# start.ps1 - Lattice Arcade (Bobcoin) Windows launcher.
# Builds Go services once, starts every component at BelowNormal priority,
# logs to logs\<name>.log, and records PIDs in .services.pids (JSON) so
# stop.ps1 / scripts\system_tray.py can quit exactly what was started.
# Usage: powershell -ExecutionPolicy Bypass -File .\start.ps1 [-SkipBuild] [-WithSp1Daemon]
param([switch]$SkipBuild, [switch]$WithSp1Daemon)
$ErrorActionPreference = 'Continue'
$Root = $PSScriptRoot
$LogDir = Join-Path $Root 'logs'
$BinDir = Join-Path $Root 'bin'
New-Item -ItemType Directory -Force -Path $LogDir, $BinDir | Out-Null

function Start-BelowNormal([string]$Name, [string]$File, [string]$ArgString, [string]$WorkDir) {
    # ProcessStartInfo (not Start-Process) so argument strings survive intact.
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $File
    $psi.Arguments = $ArgString
    $psi.WorkingDirectory = $WorkDir
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    # Redirect via cmd so log handles outlive this launcher process.
    $outLog = Join-Path $LogDir "$Name.out.log"
    $errLog = Join-Path $LogDir "$Name.err.log"
    $psi.FileName = 'cmd.exe'
    $psi.Arguments = "/c `"`"$File`" $ArgString > `"$outLog`" 2> `"$errLog`"`""
    $psi.RedirectStandardOutput = $false
    $psi.RedirectStandardError = $false
    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi
    [void]$proc.Start()
    Start-Sleep -Milliseconds 400
    # Resolve the real child PID (cmd's child) so stop.ps1 kills the server, not the shell.
    $childId = $proc.Id
    try {
        $child = Get-CimInstance Win32_Process -Filter "ParentProcessId=$($proc.Id)" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($child) { $childId = [int]$child.ProcessId }
        $target = Get-Process -Id $childId -ErrorAction SilentlyContinue
        if ($target) { $target.PriorityClass = 'BelowNormal' }
    } catch { Write-Host "[start] could not set priority for ${Name}: $_" }
    Write-Host "[start] $Name pid=$childId (BelowNormal) -> logs\$Name.*.log"
    return $childId
}

$pids = [ordered]@{}
$services = @(
    @{ Name = 'go-lattice';      Dir = 'go-lattice' },
    @{ Name = 'go-game-server';  Dir = 'go-game-server' },
    @{ Name = 'go-supertorrent'; Dir = 'go-supertorrent' },
    @{ Name = 'go-casino';       Dir = 'go-casino' }
)
foreach ($svc in $services) {
    $exe = Join-Path $BinDir "$($svc.Name).exe"
    if (-not $SkipBuild -or -not (Test-Path $exe)) {
        Write-Host "[build] $($svc.Name)..."
        Push-Location (Join-Path $Root $svc.Dir)
        go build -o $exe .
        if ($LASTEXITCODE -ne 0) { Write-Host "[build] FAILED: $($svc.Name) (see output above)" }
        Pop-Location
    }
    if (Test-Path $exe) { $pids[$svc.Name] = Start-BelowNormal $svc.Name $exe '' (Join-Path $Root $svc.Dir) }
}

# Frontend: vite preview serves the production build on 4173 (tray/DASHBOARD port).
$dist = Join-Path $Root 'frontend\dist\index.html'
if (-not (Test-Path $dist)) {
    Write-Host '[build] frontend (npm run build)...'
    Push-Location (Join-Path $Root 'frontend'); npm run build; Pop-Location
}
if (Test-Path $dist) {
    # Run vite directly under node (npx.cmd under Start-Process drops its args).
    $viteJs = Join-Path $Root 'frontend\node_modules\vite\bin\vite.js'
    $pids['frontend'] = Start-BelowNormal 'frontend' 'node' "`"$viteJs`" preview --port 4173 --strictPort" (Join-Path $Root 'frontend')
}

# NPC liquidity agent (optional; needs go-game-server on 3001).
$npc = Join-Path $Root 'scripts\npc_agent.py'
if (Test-Path $npc) {
    $pythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
    if ($pythonExe) { $pids['npc-agent'] = Start-BelowNormal 'npc-agent' $pythonExe "-u `"$npc`"" $Root }
}

# Reconcile: cmd/conhost wrappers make the spawned PID unreliable, so record
# the processes actually listening on the known ports (and the NPC by cmdline).
$portMap = @{ 'go-lattice' = 4001; 'go-game-server' = 3001; 'go-supertorrent' = 8000; 'frontend' = 4173 }
foreach ($name in $portMap.Keys) {
    for ($i = 0; $i -lt 20; $i++) {
        $owner = (Get-NetTCPConnection -LocalPort $portMap[$name] -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
        if ($owner) { $pids[$name] = [int]$owner; try { (Get-Process -Id $owner).PriorityClass = 'BelowNormal' } catch {}; break }
        Start-Sleep -Milliseconds 500
    }
}
$casinoProc = Get-CimInstance Win32_Process -Filter "Name='go-casino.exe'" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($casinoProc) { $pids['go-casino'] = [int]$casinoProc.ProcessId; try { (Get-Process -Id $casinoProc.ProcessId).PriorityClass = 'BelowNormal' } catch {} }
$npcProc = Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*npc_agent.py*' } | Select-Object -First 1
if ($npcProc) { $pids['npc-agent'] = [int]$npcProc.ProcessId; try { (Get-Process -Id $npcProc.ProcessId).PriorityClass = 'BelowNormal' } catch {} }

# Optional: SP1 verifier daemon (held WSL session; see scripts/start-sp1-daemon.ps1).
if ($WithSp1Daemon) {
    $daemonScript = Join-Path $Root 'scripts\start-sp1-daemon.ps1'
    if (Test-Path $daemonScript) {
        Write-Host '[start] Launching SP1 verifier daemon (WSL, BelowNormal)...'
        & $daemonScript
    }
}

$pids | ConvertTo-Json | Set-Content -Path (Join-Path $Root '.services.pids') -Encoding UTF8
Write-Host '[start] Dashboard: http://localhost:4173  Lattice:4001  Game:3001  Supertorrent:8000'
Write-Host '[start] Stop with .\stop.ps1 or the system-tray Quit action.'
