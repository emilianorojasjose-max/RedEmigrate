// Núcleo compartido: cliente de Supabase, estado, plantillas HTML seguras, formatos y utilidades.
export const CFG = window.REDEMIGRA_CONFIG || {};
export const configured = !!CFG.SUPABASE_URL && !/TU-PROYECTO/.test(CFG.SUPABASE_URL) && !!CFG.SUPABASE_ANON_KEY && !/TU-CLAVE/.test(CFG.SUPABASE_ANON_KEY);

export const sb = configured && window.supabase
  ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

// Estado global de la sesión
export const state = { session: null, user: null, profile: null, mentor: null, isAdmin: false, countries: [], settings: {}, unread: 0 };

// ------------------------------------------------------------------ HTML seguro
class Safe { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Safe(String(s ?? ""));
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const toHtml = (v) => (v == null || v === false ? "" : v instanceof Safe ? v.s : Array.isArray(v) ? v.map(toHtml).join("") : esc(v));
export function html(strings, ...vals) {
  let out = "";
  strings.forEach((s, i) => { out += s; if (i < vals.length) out += toHtml(vals[i]); });
  return new Safe(out);
}
export const mount = (el, safe) => { el.innerHTML = safe instanceof Safe ? safe.s : esc(safe); };

// ------------------------------------------------------------------ Íconos (trazos simples, 24x24)
const ICONS = {
  arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  video: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  card: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  chevron: '<polyline points="9 18 15 12 9 6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  dash: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
};
export const ico = (name, cls = "") => raw(`<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`);

export const LOGO = raw('<svg viewBox="0 0 64 64" role="img" aria-hidden="true"><path d="M32 2.5C18.4 2.5 7.5 13.2 7.5 26.4c0 8.8 5.2 16.6 12.4 23.8 4.6 4.6 8.6 8.5 12.1 12.3 3.5-3.8 7.5-7.7 12.1-12.3 7.2-7.2 12.4-15 12.4-23.8C56.5 13.2 45.6 2.5 32 2.5z" fill="#0B1F3A"/><circle cx="25" cy="19.6" r="4.9" fill="#fff"/><path d="M16.2 40.5a8.8 11 0 0 1 17.6 0z" fill="#fff"/><circle cx="39" cy="19.6" r="4.9" fill="#FF7A1A"/><path d="M30.2 40.5a8.8 11 0 0 1 17.6 0z" fill="#FF7A1A" stroke="#0B1F3A" stroke-width="1.6" stroke-linejoin="round"/></svg>');
export const LOGO_INV = raw('<svg viewBox="0 0 64 64" role="img" aria-hidden="true"><path d="M32 2.5C18.4 2.5 7.5 13.2 7.5 26.4c0 8.8 5.2 16.6 12.4 23.8 4.6 4.6 8.6 8.5 12.1 12.3 3.5-3.8 7.5-7.7 12.1-12.3 7.2-7.2 12.4-15 12.4-23.8C56.5 13.2 45.6 2.5 32 2.5z" fill="#fff"/><circle cx="25" cy="19.6" r="4.9" fill="#0B1F3A"/><path d="M16.2 40.5a8.8 11 0 0 1 17.6 0z" fill="#0B1F3A"/><circle cx="39" cy="19.6" r="4.9" fill="#FF7A1A"/><path d="M30.2 40.5a8.8 11 0 0 1 17.6 0z" fill="#FF7A1A" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>');

// ------------------------------------------------------------------ Formatos
export const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; } })();
export const money = (cents, cur = "EUR") => {
  const c = Number(cents || 0);
  return new Intl.NumberFormat("es", { style: "currency", currency: cur, minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(c / 100);
};
const up1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
export const fmtDay = (iso) => up1(new Intl.DateTimeFormat("es", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso)));
export const fmtDayShort = (iso) => new Intl.DateTimeFormat("es", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
export const fmtTime = (iso) => new Intl.DateTimeFormat("es", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
export const fmtDateTime = (iso) => `${fmtDay(iso)}, ${fmtTime(iso)}`;
export const fmtShort = (iso) => new Intl.DateTimeFormat("es", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
export const dayKey = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
export const tzLabel = () => {
  let off = "";
  try { off = new Intl.DateTimeFormat("es", { timeZone: TZ, timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value || ""; } catch { /* */ }
  return `${TZ.replace(/_/g, " ")}${off ? ` (${off})` : ""}`;
};
export const yearsSince = (date) => {
  if (!date) return null;
  const d = new Date(date); const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) y--;
  return Math.max(0, y);
};
export const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";
export const slugify = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export const LANGS = [["es", "Español"], ["en", "Inglés"], ["pt", "Portugués"], ["de", "Alemán"], ["fr", "Francés"], ["it", "Italiano"]];
export const langName = (c) => (LANGS.find((l) => l[0] === c) || [c, c])[1];

export const countryName = (code) => state.countries.find((c) => c.code === code)?.name_es || code || "";
const PALETTE = ["#1B437D", "#2F6FDB", "#12305A", "#C24E00", "#17693F", "#6B3FA0", "#A12626"];
export const avatar = (name, url, cc, size = "") => {
  const bg = PALETTE[[...String(name || "?")].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  return html`<span class="avatar ${size}" style="background:${bg}" aria-hidden="true">${url ? html`<img src="${url}" alt="" loading="lazy">` : initials(name)}${cc ? html`<span class="cc">${cc}</span>` : ""}</span>`;
};
export const stars = (rating, count) => rating == null
  ? html`<span class="muted small">Sin reseñas todavía</span>`
  : html`<span class="stars">${ico("star")} ${Number(rating).toFixed(1)}${count > 0 ? html` <span class="muted" style="font-weight:400">(${count})</span>` : ""}</span>`;

// ------------------------------------------------------------------ Errores en castellano
export const ERR = {
  no_autenticado: "Tenés que ingresar para hacer esto.",
  sin_sesion: "Tenés que ingresar para hacer esto.",
  horario_no_disponible: "Ese horario ya no está disponible. Elegí otro.",
  servicio_no_disponible: "Este servicio no está disponible en este momento.",
  mentor_no_aprobado: "Este perfil todavía no está habilitado para recibir reservas.",
  mentor_sin_cobros: "Este mentor todavía no completó la configuración de cobros. Probá más adelante.",
  auto_reserva: "No podés reservar tu propio servicio.",
  demasiadas_reservas_pendientes: "Tenés varias reservas sin pagar. Pagalas o esperá a que venzan para hacer otra.",
  reserva_vencida: "El tiempo para pagar esta reserva venció. Elegí un horario de nuevo.",
  reserva_no_encontrada: "No encontramos esa reserva.",
  no_se_pudo_crear_el_pago: "No pudimos iniciar el pago. Probá de nuevo en unos minutos.",
  sin_llamadas_disponibles: "Ya agendaste todas las llamadas incluidas en este servicio.",
  reserva_no_confirmada: "La reserva todavía no está confirmada.",
  sin_permiso: "No tenés permiso para hacer esto.",
  no_cancelable: "Esta sesión ya no se puede cancelar.",
  ya_empezo: "La sesión ya empezó, no se puede cancelar.",
  pago_no_encontrado: "No encontramos el pago de esta reserva.",
  todavia_no_termino: "La sesión todavía no terminó.",
  estado_invalido: "La sesión no está en un estado que permita esta acción.",
  no_sos_mentor: "Primero completá tu perfil de mentor.",
  archivo_no_es_imagen: "Ese archivo no es una imagen.",
  no_se_pudo_procesar: "No pudimos procesar la imagen. Probá con otra foto.",
  error_interno: "Algo salió mal de nuestro lado. Probá de nuevo en un momento.",
  network: "No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.",
};
export const errMsg = (e) => {
  if (!e) return ERR.error_interno;
  if (typeof e === "string") return ERR[e] || "No pudimos completar la acción. Probá de nuevo.";
  // Las funciones de la base (RPC) devuelven el código como mensaje de la excepción
  // (p. ej. "horario_no_disponible"), con un código de Postgres genérico en `code`
  // (p. ej. "P0001"): por eso hay que probar ambos contra el mapa de errores.
  if (ERR[e.code]) return ERR[e.code];
  if (ERR[e.message]) return ERR[e.message];
  const m = String(e.message || "");
  if (/Invalid login credentials/i.test(m)) return "El correo o la contraseña no son correctos.";
  if (/Email not confirmed/i.test(m)) return "Todavía no confirmaste tu correo. Revisá tu bandeja de entrada.";
  if (/already registered|already been registered/i.test(m)) return "Ese correo ya tiene una cuenta. Probá ingresar.";
  if (/Password should be at least/i.test(m)) return "La contraseña es muy corta.";
  if (/rate limit|too many/i.test(m)) return "Hiciste muchos intentos. Esperá unos minutos y probá de nuevo.";
  if (/duplicate key.*slug|mentor_profiles_slug/i.test(m)) return "Esa dirección de perfil ya está en uso. Elegí otra.";
  if (/campo protegido|estado del mentor/i.test(m)) return "Ese dato solo lo puede cambiar el equipo de RedEmigra.";
  if (/Failed to fetch|NetworkError/i.test(m)) return ERR.network;
  return "No pudimos completar la acción. Probá de nuevo.";
};

// ------------------------------------------------------------------ Llamadas a las Edge Functions
export async function callFn(name, body) {
  const { data } = await sb.auth.getSession();
  const token = data?.session?.access_token || CFG.SUPABASE_ANON_KEY;
  let res;
  try {
    res = await fetch(`${CFG.SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CFG.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      body: JSON.stringify(body || {}),
    });
  } catch { const e = new Error("network"); e.code = "network"; throw e; }
  let out = null; try { out = await res.json(); } catch { /* */ }
  if (!res.ok) { const e = new Error(out?.error || "error_interno"); e.code = out?.error || "error_interno"; e.data = out; throw e; }
  return out;
}

// ------------------------------------------------------------------ Avisos y diálogos
export function toast(msg, type = "") {
  const box = document.getElementById("toasts");
  if (!box) return;
  const el = document.createElement("div");
  el.className = `toast ${type ? "toast--" + type : ""}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), type === "bad" ? 6500 : 4000);
}

export function dialog({ title, body, confirmText = "Aceptar", cancelText = "Cancelar", danger = false, form = null }) {
  return new Promise((resolve) => {
    const d = document.createElement("dialog");
    d.innerHTML = `<form method="dialog" class="dlg"><h2>${esc(title)}</h2><div class="dlg__body">${body instanceof Safe ? body.s : esc(body || "")}</div>
      <div class="dlg__actions">${cancelText ? `<button class="btn btn--ghost btn--sm" value="cancel" type="button" data-x>${esc(cancelText)}</button>` : ""}
      <button class="btn btn--sm ${danger ? "btn--danger" : "btn--primary"}" value="ok" type="submit">${esc(confirmText)}</button></div></form>`;
    document.body.appendChild(d);
    const finish = (v) => { try { d.close(); } catch { /* */ } d.remove(); resolve(v); };
    d.querySelector("[data-x]")?.addEventListener("click", () => finish(null));
    d.addEventListener("cancel", (ev) => { ev.preventDefault(); finish(null); });
    d.querySelector("form").addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (form) {
        const f = d.querySelector("form");
        if (!f.reportValidity()) return;
        finish(Object.fromEntries(new FormData(f).entries()));
      } else finish(true);
    });
    d.showModal();
    d.querySelector("input,select,textarea,button[type=submit]")?.focus();
  });
}
export const confirmDialog = (o) => dialog(o).then((v) => v === true);

// Botón con "cargando": deshabilita, muestra la ruedita y siempre lo restaura
export async function busy(btn, fn) {
  if (!btn) return fn();
  const prev = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin"></span> ${btn.dataset.busy || "Un momento…"}`;
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = prev; }
}

export function showFormError(form, msg) {
  let box = form.querySelector(".form-error");
  if (!box) { box = document.createElement("div"); box.className = "form-error"; box.setAttribute("role", "alert"); form.appendChild(box); }
  box.textContent = msg || ""; box.classList.toggle("is-on", !!msg);
  if (msg) box.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

export const formData = (form) => Object.fromEntries(new FormData(form).entries());
export const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
