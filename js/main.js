// Arranque de la aplicación: configuración, sesión, catálogo y rutas.
import { configured, sb, state, html, mount } from "./lib/core.js";
import { route, start, setHooks, go } from "./lib/router.js";
import { refreshMe, loadCatalog } from "./lib/session.js";
import { renderHeader, renderFooter } from "./lib/layout.js";

const page = (file, name = "default") => () => import(`./pages/${file}.js`).then((m) => m[name]);

// ---- Rutas (ver el documento de esquema: 23 pantallas)
route("/registro", page("auth", "register"));
route("/ingresar", page("auth", "login"));
route("/recuperar", page("auth", "recover"));
route("/mentores", page("mentors", "list"));
route("/mentores/:slug", page("mentors", "profile"));
route("/reservar/:service", page("booking", "book"), { auth: true });
route("/reservas/exito", page("booking", "success"), { auth: true });
route("/reservas/:id", page("booking", "detail"), { auth: true });
route("/reservas/:id/resena", page("booking", "review"), { auth: true });
route("/cuenta", page("account", "account"), { auth: true });
route("/cuenta/reservas", page("account", "bookings"), { auth: true });
route("/mensajes", page("chat", "inbox"), { auth: true });
route("/mensajes/:id", page("chat", "thread"), { auth: true });
route("/mentor/perfil", page("mentor", "profile"), { auth: true });
route("/mentor/onboarding", page("mentor", "onboarding"), { mentor: true });
route("/mentor/servicios", page("mentor", "services"), { mentor: true });
route("/mentor/disponibilidad", page("mentor", "availability"), { mentor: true });
route("/mentor/reservas", page("mentor", "bookings"), { mentor: true });
route("/mentor/cobros", page("mentor", "payouts"), { mentor: true });
route("/admin/mentores", page("admin", "mentors"), { admin: true });
route("/admin/reservas", page("admin", "bookings"), { admin: true });
route("/admin/reportes", page("admin", "reports"), { admin: true });
route("/admin/paises", page("admin", "countries"), { admin: true });
route("/admin/ajustes", page("admin", "settings"), { admin: true });
route("/legal/:doc", page("legal", "doc"));

function setupScreen() {
  mount(document.getElementById("main"), html`<div class="setup-screen"><div class="card">
    <h1>Falta conectar Supabase</h1>
    <p style="margin-top:12px">Abrí el archivo <code>web/js/config.js</code> y completá <code>SUPABASE_URL</code> y <code>SUPABASE_ANON_KEY</code> con los datos de tu proyecto (Supabase → Project Settings → API). Los pasos completos están en <code>SETUP.md</code>.</p>
    <p class="muted small" style="margin-top:12px">Este mensaje desaparece solo cuando la configuración está completa.</p>
  </div></div>`);
}

(async function boot() {
  if (!configured || !sb) { setupScreen(); return; }

  const { data } = await sb.auth.getSession();
  state.session = data.session; state.user = data.session?.user || null;
  await Promise.all([loadCatalog(), refreshMe()]);

  setHooks({ after: () => { renderHeader(); } });
  renderHeader(); renderFooter();

  sb.auth.onAuthStateChange((event, session) => {
    state.session = session; state.user = session?.user || null;
    // (no se llama a Supabase directamente dentro de este callback: se difiere)
    setTimeout(async () => {
      if (event === "PASSWORD_RECOVERY") { sessionStorage.setItem("re_recovery", "1"); await refreshMe(); renderHeader(); go("/recuperar"); return; }
      if (["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED", "TOKEN_REFRESHED"].includes(event)) { await refreshMe(); renderHeader(); }
    }, 0);
  });

  await start();
})();
