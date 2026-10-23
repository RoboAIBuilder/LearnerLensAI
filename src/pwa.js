/* Learner Lens install support: registers the service worker and shows an "Install app" button. */
(function () {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
  }
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (standalone) return;

  let deferred = null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function dismissed() { try { return localStorage.getItem("ll-install-dismissed") === "1"; } catch (e) { return false; } }
  function remember() { try { localStorage.setItem("ll-install-dismissed", "1"); } catch (e) {} }

  function show(text, onClick) {
    if (document.getElementById("ll-install")) return;
    const bar = document.createElement("div");
    bar.id = "ll-install";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Install Learner Lens");
    bar.innerHTML =
      '<img src="/icons/icon-192.png" alt="" width="36" height="36">' +
      '<span class="t">' + text + "</span>" +
      (onClick ? '<button type="button" class="go">Install</button>' : "") +
      '<button type="button" class="x" aria-label="Dismiss">×</button>';
    const st = document.createElement("style");
    st.textContent =
      "#ll-install{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 16px);z-index:50;display:flex;align-items:center;gap:10px;" +
      "background:var(--surface,#fff);color:var(--ink,#172033);border:1px solid var(--line,#DCE1EA);border-radius:14px;padding:10px 12px;box-shadow:0 8px 24px rgba(23,32,51,.18);" +
      "width:min(440px,calc(100% - 32px));box-sizing:border-box;font:600 14px var(--f-body,system-ui)}" +
      "#ll-install img{border-radius:8px;flex:none}#ll-install .t{flex:1;min-width:0}" +
      "#ll-install .go{border:0;background:var(--accent,#2C59CC);color:var(--accent-ink,#fff);font:inherit;padding:8px 14px;border-radius:9px;cursor:pointer}" +
      "#ll-install .x{border:0;background:transparent;color:var(--muted,#5A6377);font-size:20px;line-height:1;padding:4px 6px;cursor:pointer}";
    document.head.appendChild(st);
    document.body.appendChild(bar);
    bar.querySelector(".x").onclick = () => { remember(); bar.remove(); };
    if (onClick) bar.querySelector(".go").onclick = onClick;
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    if (dismissed()) return;
    show("Install Learner Lens for one-tap access, even offline.", async () => {
      document.getElementById("ll-install")?.remove();
      deferred.prompt();
      await deferred.userChoice.catch(() => {});
      deferred = null;
    });
  });
  window.addEventListener("appinstalled", () => { document.getElementById("ll-install")?.remove(); remember(); });

  if (ios && !dismissed()) {
    window.addEventListener("load", () => setTimeout(() => show("Install: tap Share, then “Add to Home Screen”.", null), 1500));
  }
})();
