"""Builds web/index.html from the Learner Lens artifact page plus the Vercel storage adapter."""
import sys, pathlib
src, out_dir = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
here = pathlib.Path(__file__).parent
page = src.read_text()
adapter = (here / "src" / "client-db.js").read_text()
html = (
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\">"
    "<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}"
    "body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>"
    "<script>" + adapter + "</script></head><body>\n" + page + "\n</body></html>\n"
)
(out_dir / "index.html").write_text(html)
print("wrote", out_dir / "index.html", len(html), "bytes")
