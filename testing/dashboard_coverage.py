#!/usr/bin/env python3
"""Static dashboard-coverage gate (stdlib only, no servers needed).

Asserts:
1. Every route in frontend/src/App.jsx is reachable from the single-page
   Dashboard command console (embedded tab content or a fullscreen Link)
   AND from Navigation (NavLink/sub-nav or Dashboard tab).
2. Every <button> in frontend/src/pages + components carries a title=
   tooltip on the same JSX opening tag (multi-line tags checked by
   scanning to the closing '>' of the opening tag).
Run: python testing/dashboard_coverage.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "frontend" / "src"


def read(p):
    return p.read_text(encoding="utf-8", errors="replace")


def routes():
    app = read(SRC / "App.jsx")
    return sorted(set(re.findall(r'<Route\s+path="([^"]+)"', app)))


def opening_tag(text, start):
    """Return the JSX opening tag starting at `start`, ignoring '>' inside
    {...} expressions (arrow functions, ternaries) and quoted strings."""
    depth = 0
    quote = None
    i = start
    while i < len(text):
        c = text[i]
        if quote:
            if c == quote:
                quote = None
        elif c in "\"'`":
            quote = c
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        elif c == ">" and depth == 0:
            return text[start: i + 1]
        i += 1
    return text[start: start + 400]


def buttons_without_title(text):
    bad = []
    for m in re.finditer(r"<button\b", text):
        if "title=" not in opening_tag(text, m.start()):
            bad.append(text[: m.start()].count("\n") + 1)
    return bad


def main():
    failures = []
    dash = read(SRC / "pages" / "Dashboard.jsx")
    nav = read(SRC / "components" / "Navigation.jsx")
    for r in routes():
        if r == "/":
            continue
        seg = "/" + r.strip("/")
        if seg not in dash:
            failures.append(f"route {seg} not referenced in Dashboard.jsx (single-page console)")
        if seg not in nav and seg not in dash:
            failures.append(f"route {seg} not reachable from Navigation.jsx or Dashboard.jsx")
    for f in sorted((SRC / "pages").glob("*.jsx")) + sorted((SRC / "components").glob("*.jsx")):
        for line in buttons_without_title(read(f)):
            failures.append(f"{f.relative_to(ROOT)}:{line} <button> missing title= tooltip")
    if failures:
        print("DASHBOARD COVERAGE FAILURES:")
        for f in failures:
            print(" -", f)
        return 1
    print(f"OK: {len(routes())} routes covered; all buttons carry title= tooltips.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
