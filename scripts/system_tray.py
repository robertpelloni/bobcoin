#!/usr/bin/env python3
"""
scripts/system_tray.py
=======================
System Tray and Server Lifecycle Daemon for Lattice Arcade (Bobcoin).

Provides:
- Real-time status monitoring for all services:
  * Go-Lattice Consensus (Port 4001)
  * Go-Game-Server Orchestrator / AI Oracle (Port 3001)
  * Go-Supertorrent / Storage WebTorrent (Port 8000)
  * Vite Frontend Dashboard (Port 4173)
  * Casino NPC Daemon
  * Liquidity NPC Agent
- Interactive controls: Start all, Stop/Quit all, Restart all, Launch Web UI in browser.
- Headless CLI / Daemon mode fallback when X11 / Wayland display is not present.
- Live log tailing capability.
"""

import os
import sys
import time
import signal
import socket
import urllib.request
import subprocess
import threading
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PORTS = {
    "go-lattice": 4001,
    "go-game-server": 3001,
    "go-supertorrent": 8000,
    "frontend": 4173,
}

PID_FILE = REPO_ROOT / ".services.pids"
SP1_PORTS = {"sp1-verifier-daemon": 9823, "sp1-prover-sidecar": 9824}

def check_port(port: int, host: str = "127.0.0.1", timeout: float = 0.5) -> bool:
    """Check if a TCP port is actively accepting connections (checks IPv4 & IPv6 localhost)."""
    for h in [host, "::1", "localhost"]:
        try:
            with socket.create_connection((h, port), timeout=timeout):
                return True
        except OSError:
            continue
    return False

def get_services_status():
    """Returns a dict mapping service name to online boolean status."""
    status = {}
    for name, port in PORTS.items():
        status[name] = check_port(port)
    for name, port in SP1_PORTS.items():
        status[name] = check_port(port)
    return status


def _run_ps_script(name: str) -> bool:
    """Run a repo PowerShell helper (Windows SP1 held-session launchers)."""
    script = REPO_ROOT / "scripts" / name
    if not IS_WINDOWS or not script.exists():
        print(f"[SystemTray] {name} is only available on Windows/WSL in this build.")
        return False
    subprocess.Popen(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(script)],
        cwd=str(REPO_ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"[SystemTray] Launched {name}")
    return True


def start_sp1_services():
    """Start the SP1 verifier daemon + prover sidecar (held WSL sessions)."""
    _run_ps_script("start-sp1-daemon.ps1")
    _run_ps_script("start-sp1-prover.ps1")


def stop_sp1_services():
    """Stop the SP1 verifier daemon + prover sidecar held sessions."""
    _run_ps_script("stop-sp1-daemon.ps1")
    _run_ps_script("stop-sp1-prover.ps1")

IS_WINDOWS = sys.platform.startswith("win")


def _pids_on_port(port: int):
    """Return PIDs listening on a TCP port, cross-platform."""
    pids = set()
    try:
        if IS_WINDOWS:
            out = subprocess.check_output(
                ["powershell", "-NoProfile", "-Command",
                 f"(Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue).OwningProcess"],
                stderr=subprocess.DEVNULL, timeout=10).decode().strip()
            pids.update(int(p) for p in out.split() if p.strip().isdigit())
        else:
            out = subprocess.check_output(["lsof", "-t", f"-i:{port}"], stderr=subprocess.DEVNULL).decode().strip()
            pids.update(int(p) for p in out.split() if p.isdigit())
    except Exception:
        pass
    # PIDs recorded by start.ps1 / start.sh launchers are authoritative.
    try:
        import json
        recorded = json.loads(PID_FILE.read_text(encoding="utf-8"))
        for pid in recorded.values():
            if isinstance(pid, int):
                pids.add(pid)
    except Exception:
        pass
    return sorted(pids)


def _terminate(pid: int):
    try:
        if IS_WINDOWS:
            subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
        else:
            os.kill(pid, signal.SIGTERM)
        print(f"[SystemTray] Stopped PID {pid}")
    except OSError:
        pass


def start_services():
    """Start all services via the platform launcher (start.ps1 / start.sh).

    Launchers run every child at BelowNormal priority and record PIDs in
    .services.pids so Quit can stop exactly the processes it started.
    """
    print("[SystemTray] Launching Lattice Arcade ecosystem...")
    if IS_WINDOWS:
        launcher = REPO_ROOT / "start.ps1"
        if not launcher.exists():
            print(f"[SystemTray] Error: {launcher} not found.")
            return False
        proc = subprocess.Popen(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(launcher)],
            cwd=str(REPO_ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        launcher = REPO_ROOT / "start.sh"
        if not launcher.exists():
            print(f"[SystemTray] Error: {launcher} not found.")
            return False
        proc = subprocess.Popen(["bash", str(launcher)], cwd=str(REPO_ROOT),
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"[SystemTray] {launcher.name} executed with root PID {proc.pid}")
    return True


def stop_services():
    """Stop services recorded in .services.pids, then sweep known ports."""
    print("[SystemTray] Stopping all Lattice Arcade services...")
    seen = set()
    for port in PORTS.values():
        for pid in _pids_on_port(port):
            if pid not in seen and pid != os.getpid():
                seen.add(pid)
                _terminate(pid)
    if not IS_WINDOWS:
        subprocess.run(["pkill", "-f", "npc_agent.py"], stderr=subprocess.DEVNULL)
        subprocess.run(["pkill", "-f", "go-casino"], stderr=subprocess.DEVNULL)
    try:
        PID_FILE.unlink(missing_ok=True)
    except OSError:
        pass
    print("[SystemTray] All services signaled to stop.")

def restart_services():
    """Restarts all ecosystem services."""
    stop_services()
    time.sleep(2)
    start_services()

def open_dashboard():
    """Opens the web dashboard in user's browser."""
    url = "http://localhost:4173"
    print(f"[SystemTray] Opening dashboard at {url}")
    try:
        import webbrowser
        webbrowser.open(url)
    except Exception as e:
        print(f"[SystemTray] Failed to open browser: {e}")

def create_tray_image():
    """Generates a dynamic 64x64 RGBA icon using Pillow."""
    from PIL import Image, ImageDraw
    img = Image.new("RGBA", (64, 64), color=(0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Draw neon cyan diamond lattice
    d.polygon([(32, 4), (60, 32), (32, 60), (4, 32)], outline=(0, 255, 255, 255), width=3)
    d.polygon([(32, 16), (48, 32), (32, 48), (16, 32)], fill=(255, 0, 85, 220))
    return img

def run_gui_tray():
    """Runs the graphical tray icon with interactive menu."""
    import pystray
    from pystray import MenuItem as item

    icon_image = create_tray_image()

    def on_open(icon, item):
        open_dashboard()

    def on_start(icon, item):
        start_services()

    def on_stop(icon, item):
        stop_services()

    def on_restart(icon, item):
        restart_services()

    def on_quit(icon, item):
        stop_services()
        icon.stop()

    def on_start_sp1(icon, item):
        start_sp1_services()

    def on_stop_sp1(icon, item):
        stop_sp1_services()

    menu = pystray.Menu(
        item("Lattice Arcade (Bobcoin)", lambda icon, item: None, enabled=False),
        pystray.Menu.SEPARATOR,
        item("Open Dashboard (Web UI)", on_open),
        item("Start All Services", on_start),
        item("Restart All Services", on_restart),
        item("Stop All Services", on_stop),
        pystray.Menu.SEPARATOR,
        item("Start SP1 Daemon + Prover (WSL)", on_start_sp1),
        item("Stop SP1 Daemon + Prover", on_stop_sp1),
        pystray.Menu.SEPARATOR,
        item("Quit & Terminate All", on_quit)
    )

    tray = pystray.Icon("lattice_arcade", icon_image, "Lattice Arcade Sovereign Node", menu)
    print("[SystemTray] System tray icon initialized and running.")
    tray.run()

def run_cli_daemon():
    """Runs a resilient CLI daemon when headless."""
    print("=" * 60)
    print("  LATTICE ARCADE SOVEREIGN NODE CONTROLLER (HEADLESS)")
    print("=" * 60)
    print("Commands:")
    print("  [s] Status check")
    print("  [u] Up / Start all services")
    print("  [r] Restart services")
    print("  [k] Kill / Stop all services")
    print("  [o] Open web dashboard")
    print("  [q] Quit daemon")
    print("=" * 60)

    status = get_services_status()
    for svc, online in status.items():
        print(f"  * {svc:16}: {'ONLINE' if online else 'OFFLINE'} (Port {PORTS[svc]})")
    print("=" * 60)

    if not sys.stdin.isatty():
        print("[SystemTray Daemon] Non-interactive mode detected. Monitoring background services...")
        try:
            while True:
                time.sleep(30)
                status = get_services_status()
                online_count = sum(1 for v in status.values() if v)
                print(f"[SystemTray Daemon Heartbeat] {online_count}/{len(status)} services online.")
        except KeyboardInterrupt:
            print("[SystemTray Daemon] Terminating...")
            return

    while True:
        try:
            cmd = input("lattice-node> ").strip().lower()
            if cmd == 'q':
                stop_services()
                break
            elif cmd == 's':
                status = get_services_status()
                for svc, online in status.items():
                    print(f"  * {svc:16}: {'ONLINE' if online else 'OFFLINE'} (Port {PORTS[svc]})")
            elif cmd == 'u':
                start_services()
            elif cmd == 'k':
                stop_services()
            elif cmd == 'r':
                restart_services()
            elif cmd == 'o':
                open_dashboard()
            else:
                print("Unknown command. Options: s, u, r, k, o, q")
        except (KeyboardInterrupt, EOFError):
            print("\nExiting controller.")
            break

def main():
    # Windows has no DISPLAY variable; a desktop session is assumed there.
    # POSIX needs DISPLAY/WAYLAND_DISPLAY for pystray.
    has_display = IS_WINDOWS or os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")
    if has_display:
        try:
            run_gui_tray()
            return
        except Exception as e:
            print(f"[SystemTray] GUI tray failed ({e}). Falling back to CLI daemon.")
    run_cli_daemon()

if __name__ == "__main__":
    main()
