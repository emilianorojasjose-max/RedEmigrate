// Barra superior y pie de página (se redibujan cuando cambia la sesión o la ruta).
import { html, mount, LOGO, LOGO_INV, ico, avatar, state, sb, toast } from "./core.js";
import { go } from "./router.js";

const NAV_LINKS = () => [
  { href: "/mentores", label: "Mentores", icon: "search", show: true },
  { href: "/cuenta/reservas", label: "Mis reservas", icon: "calendar", show: !!state.user },
  { href: "/mensajes", label: "Mensajes", icon: "chat", show: !!state.user, badge: state.unread },
  { href: "/mentor/onboarding", label: "Panel de mentor", icon: "dash", show: !!state.mentor },
  { href: "/admin/mentores", label: "Administración", icon: "shield", show: state.isAdmin },
];

export function renderHeader() {
  const el = document.getElementById("app-header");
  if (!el) return;
  const path = location.pathname;
  const links = NAV_LINKS().filter((l) => l.show);
  const first = (state.profile?.full_name || state.user?.email || "").split(" ")[0];
  mount(el, html`
  <header class="nav">
    <div class="container nav__inner">
      <a class="brand" href="/" aria-label="RedEmigra, ir al inicio" data-external>${LOGO}<span class="wordmark"><span>Red</span>Emigra</span></a>
      <nav class="nav__links" aria-label="Principal">
        ${links.map((l) => html`<a href="${l.href}">${l.label}${l.badge ? html` <span class="badge-count" aria-label="${l.badge} sin leer">${l.badge}</span>` : ""}</a>`)}
      </nav>
      <div class="nav__actions">
        ${state.user ? html`
          <div class="menu" id="user-menu">
            <button class="menu__btn" aria-haspopup="true" aria-expanded="false" id="user-menu-btn">${avatar(state.profile?.full_name || state.user.email, state.profile?.avatar_url)}<span class="hide-sm">${first}</span></button>
            <div class="menu__panel" role="menu">
              <div class="who">${state.user.email}</div>
              <a href="/cuenta" role="menuitem">${ico("user")} Mi cuenta</a>
              <a href="/cuenta/reservas" role="menuitem">${ico("calendar")} Mis reservas</a>
              <a href="/mensajes" role="menuitem">${ico("chat")} Mensajes${state.unread ? html` <span class="badge-count">${state.unread}</span>` : ""}</a>
              <hr>
              ${state.mentor ? html`<a href="/mentor/onboarding" role="menuitem">${ico("dash")} Panel de mentor</a>` : html`<a href="/mentor/perfil" role="menuitem">${ico("globe")} Quiero ser mentor</a>`}
              ${state.isAdmin ? html`<a href="/admin/mentores" role="menuitem">${ico("shield")} Administración</a>` : ""}
              <hr>
              <button role="menuitem" id="logout-btn">${ico("logout")} Salir</button>
            </div>
          </div>` : html`
          <a class="btn btn--ghost btn--sm hide-sm" href="/ingresar">Ingresar</a>
          <a class="btn btn--primary btn--sm hide-xs" href="/registro?rol=emigrante">Quiero emigrar</a>`}
        <button class="btn btn--ghost btn--sm nav__burger" id="burger" aria-label="Abrir menú" aria-expanded="false" style="padding:0 10px">${ico("menu")}</button>
      </div>
    </div>
    <div class="mobile-links" id="mobile-links">
      ${links.map((l) => html`<a href="${l.href}">${ico(l.icon)} ${l.label}${l.badge ? html` <span class="badge-count">${l.badge}</span>` : ""}</a>`)}
      ${state.user ? "" : html`<a href="/registro?rol=emigrante" style="font-weight:700;color:var(--orange-600, var(--navy-900))">${ico("arrow")} Quiero emigrar</a><a href="/ingresar">${ico("user")} Ingresar</a><a href="/registro?rol=mentor">${ico("globe")} Quiero ser mentor</a>`}
    </div>
  </header>`);

  // marcar página actual
  el.querySelectorAll(".nav__links a").forEach((a) => {
    const h = a.getAttribute("href");
    if (path === h || path.startsWith(h + "/")) a.setAttribute("aria-current", "page");
  });

  const menu = el.querySelector("#user-menu");
  const btn = el.querySelector("#user-menu-btn");
  const close = () => { menu?.classList.remove("is-open"); btn?.setAttribute("aria-expanded", "false"); };
  btn?.addEventListener("click", (e) => { e.stopPropagation(); const open = menu.classList.toggle("is-open"); btn.setAttribute("aria-expanded", String(open)); });
  menu?.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  document.onclick = (e) => { if (menu && !menu.contains(e.target)) close(); };
  document.onkeydown = (e) => { if (e.key === "Escape") close(); };
  const burger = el.querySelector("#burger");
  burger?.addEventListener("click", () => {
    const m = el.querySelector("#mobile-links"); const o = m.classList.toggle("is-open"); burger.setAttribute("aria-expanded", String(o));
  });
  el.querySelector("#mobile-links")?.addEventListener("click", (e) => { if (e.target.closest("a")) e.currentTarget.classList.remove("is-open"); });
  el.querySelector("#logout-btn")?.addEventListener("click", async () => {
    close();
    await sb.auth.signOut();
    toast("Cerraste sesión.");
    go("/");
    if (location.pathname === "/") location.assign("/");
  });
}

export function renderFooter() {
  const el = document.getElementById("app-footer");
  if (!el) return;
  mount(el, html`
  <footer class="footer">
    <div class="container footer__grid">
      <div>
        <a class="brand" href="/" data-external aria-label="RedEmigra, ir al inicio">${LOGO_INV}<span class="wordmark"><span>Red</span>Emigra</span></a>
        <p style="margin-top:12px">Una red de confianza entre inmigrantes.</p>
      </div>
      <div>
        <p><strong style="color:#fff">Aviso importante.</strong> RedEmigra ofrece acompañamiento basado en experiencia personal y no reemplaza el asesoramiento profesional legal, migratorio o financiero cuando este sea necesario.</p>
        <nav class="footer__links" aria-label="Legales">
          <a href="/legal/aviso">Aviso legal</a><a href="/legal/terminos">Términos y condiciones</a><a href="/legal/privacidad">Privacidad</a><a href="/legal/cancelaciones">Cancelaciones y reembolsos</a>
        </nav>
      </div>
    </div>
  </footer>`);
}
