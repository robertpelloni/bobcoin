# start-sp1-prover.ps1 - Hold the SP1 proving sidecar alive from Windows.
# Same WSL-lifecycle constraint as the verifier daemon: one held wsl.exe
# session keeps the distro (and sidecar) alive. Port 9824, BelowNormal.
$Root = Split-Path $PSScriptRoot -Parent
$PidFile = Join-Path $Root '.sp1-prover.pid'
$proc = Start-Process -FilePath 'wsl.exe' -ArgumentList '-d', 'Ubuntu', '--', '/mnt/c/Users/hyper/workspace/bobcoin/proof-of-play/prover/target/release/proof-of-play-prover', '--serve', '127.0.0.1:9824', '--elf', '/mnt/c/Users/hyper/workspace/bobcoin/proof-of-play/program/elf/proof-of-play' -PassThru -WindowStyle Hidden
try { $proc.PriorityClass = 'BelowNormal' } catch {}
$proc.Id | Set-Content -Path $PidFile -Encoding ASCII
Write-Host "[sp1-prover] held wsl session pid=$($proc.Id) (BelowNormal); sidecar on http://localhost:9824 after setup"
