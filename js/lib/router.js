// Router mínimo con History API (rutas limpias: /mentores/martin). Sin dependencias.
import { html, mount, state } from "./core.js";

const routes = [];
let leaveFns = [];
let navId = 0;
let hooks = { before: () => {}, after: () => {} };

export function route(pattern, loader, opts = {}) {
  const keys = [];
  const re = new RegExp("^" + pattern.replace(/\/:([a-zA-Z_]+)/g, (_, k) => { keys.push(k); return "/([^/]+)"; }) + "/?$");
  routes.push({ pattern, re, keys, loader, opts });
}
export const setHooks = (h) => { hooks = { ...hooks, ...h }; };
export const onLeave = (fn) => { leaveFns.push(fn); };
export const hasRoute = (path) => routes.some((r) => r.re.test(path));

export function go(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, "", path); else history.pushState({}, "", path);
  return render();
}

export const safeNext = (n, fallback = "/") => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : fallback);

export async function render() {
  const my = ++navId;
  leaveFns.forEach((f) => { try { f(); } catch { /* */ } });
  leaveFns = [];
  const url = new URL(location.href);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const main = document.getElementById("main");
  const root = document.createElement("div");
  root.className = "route";
  main.replaceChildren(root);

  let match = null, params = {};
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) { match = r; r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); }); break; }
  }
  const ctx = {
    root, params, path, query: Object.fromEntries(url.searchParams), go, onLeave,
    alive: () => my === navId,
    set: (safe) => { if (my === navId) mount(root, safe); },
    title: (t) => { document.title = t ? `${t} · RedEmigra` : "RedEmigra"; },
  };

  hooks.before(ctx);
  if (!match) {
    ctx.title("Página no encontrada");
    ctx.set(html`<div class="container page"><div class="empty"><h1>No encontramos esta página</h1><p style="margin:12px 0 20px">Puede que el enlace esté mal escrito o que la página ya no exista.</p><a class="btn btn--primary" href="/mentores">Ver mentores</a></div></div>`);
    hooks.after(ctx);
    return;
  }
  const o = match.opts;
  const here = encodeURIComponent(path + url.search);
  if ((o.auth || o.mentor || o.admin) && !state.user) return go(`/ingresar?next=${here}`, { replace: true });
  if (o.mentor && !state.mentor) return go("/mentor/perfil", { replace: true });
  if (o.admin && !state.isAdmin) {
    ctx.set(html`<div class="container page"><div class="empty"><h1>Sin acceso</h1><p style="margin-top:12px">Esta sección es solo para el equipo de administración.</p></div></div>`);
    return;
  }
  try {
    ctx.title("");
    const fn = await match.loader();
    if (my !== navId) return;
    await fn(ctx);
  } catch (e) {
    console.error(e);
    ctx.set(html`<div class="container page"><div class="empty"><h1>Algo salió mal</h1><p style="margin:12px 0 20px">No pudimos cargar esta pantalla. Probá de nuevo.</p><button class="btn btn--primary" onclick="location.reload()">Reintentar</button></div></div>`);
  }
  if (my === navId) { window.scrollTo(0, 0); hooks.after(ctx); }
}

// Los enlaces internos de la app navegan sin recargar; el resto (ej. "/" = landing) carga normal.
export function start() {
  document.addEventListener("click", (ev) => {
    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    const a = ev.target.closest?.("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download") || a.dataset.external !== undefined) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin) return;
    if (u.pathname === location.pathname && u.hash) return;
    const path = u.pathname.replace(/\/+$/, "") || "/";
    if (!hasRoute(path)) return;
    ev.preventDefault();
    go(u.pathname + u.search);
  });
  window.addEventListener("popstate", () => render());
  return render();
}
