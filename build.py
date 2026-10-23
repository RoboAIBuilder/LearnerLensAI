"""Builds the deployable site from src/:
   index.html (app + storage adapter + install support) and sw.js (service worker, versioned by content)."""
import hashlib, pathlib, sys

here = pathlib.Path(__file__).parent
src = here / "src"
page = (src / "app.html").read_text()
adapter = (src / "client-db.js").read_text()
pwa = (src / "pwa.js").read_text()

head = (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
    '<meta name="description" content="See which students need help with which skills, and give each one the right practice.">'
    '<link rel="manifest" href="/manifest.webmanifest">'
    '<meta name="theme-color" content="#2C59CC">'
    '<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">'
    '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">'
    '<meta name="apple-mobile-web-app-capable" content="yes">'
    '<meta name="mobile-web-app-capable" content="yes">'
    '<meta name="apple-mobile-web-app-title" content="Learner Lens">'
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">'
    "<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}"
    "body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>"
    "<script>" + adapter + "</script></head><body>\n"
)
html = head + page + "\n<script>" + pwa + "</script>\n</body></html>\n"
(here / "index.html").write_text(html)

files = [html] + [(here / p).read_bytes().hex() for p in ["manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"]]
version = hashlib.sha256("".join(files).encode()).hexdigest()[:12]
(here / "sw.js").write_text((src / "sw.template.js").read_text().replace("__VERSION__", version))
print(f"wrote index.html ({len(html)} bytes) and sw.js (version {version})")
