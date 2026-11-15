# start-sp1-daemon.ps1 - Hold the SP1 verifier daemon alive from Windows.
# WSL2 terminates the distro (and every process in it) seconds after the
# last wsl.exe client disconnects, so a daemon started with a one-shot
# `wsl -- bash ... &` dies between requests. This launcher keeps one
# wsl.exe session open running the daemon in the foreground; stop it with
# scripts/stop-sp1-daemon.ps1 or by killing the recorded PID.
$Root = Split-Path $PSScriptRoot -Parent
$PidFile = Join-Path $Root '.sp1-daemon.pid'
$proc = Start-Process -FilePath 'wsl.exe' -ArgumentList '-d', 'Ubuntu', '--', '/mnt/c/Users/hyper/workspace/bobcoin/proof-of-play/verifier/target/release/proof-of-play-verifier', '--serve', '127.0.0.1:9823', '--elf', '/mnt/c/Users/hyper/workspace/bobcoin/proof-of-play/program/elf/proof-of-play' -PassThru -WindowStyle Hidden
try { $proc.PriorityClass = 'BelowNormal' } catch {}
$proc.Id | Set-Content -Path $PidFile -Encoding ASCII
Write-Host "[sp1-daemon] held wsl session pid=$($proc.Id) (BelowNormal); daemon on 127.0.0.1:9823 after setup"
