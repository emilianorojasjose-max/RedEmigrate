// Registro, ingreso y recuperación de contraseña.
import { sb, CFG, state, html, esc, ico, busy, showFormError, formData, errMsg, toast, countryName } from "../lib/core.js";
import { safeNext } from "../lib/router.js";
import { refreshAll } from "../lib/session.js";

const googleBtn = () => CFG.GOOGLE_LOGIN ? html`
  <div class="divider">o</div>
  <button type="button" class="btn btn--ghost btn--block" id="google">Continuar con Google</button>` : "";

function bindGoogle(ctx, next) {
  ctx.root.querySelector("#google")?.addEventListener("click", async () => {
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}${safeNext(next, "/mentores")}` } });
    if (error) toast(errMsg(error), "bad");
  });
}

export async function register(ctx) {
  ctx.title("Crear cuenta");
  const wantedNext = safeNext(ctx.query.next, "");
  if (state.user) return ctx.go(wantedNext || (state.mentor ? "/mentor/onboarding" : "/mentores"), { replace: true });
  const rol = ctx.query.rol === "mentor" ? "mentor" : "emigrante";
  const origins = state.countries;

  const view = () => ctx.set(html`
  <div class="container page"><div class="narrow"><div class="card auth-card">
    <h1>Creá tu cuenta</h1>
    <p class="muted">Es gratis registrarse. Solo pagás cuando reservás una sesión.</p>
    <form id="f" class="stack" novalidate style="margin-top:20px">
      <fieldset style="border:0;padding:0;margin:0"><legend class="label" style="font-weight:600;font-size:14px;color:var(--navy-900);margin-bottom:8px">¿Qué querés hacer?</legend>
        <div class="role-pick">
          <label><input type="radio" name="rol" value="emigrante" ${rol === "emigrante" ? "checked" : ""}><strong>Quiero emigrar</strong><span>Busco hablar con alguien que ya vive allá.</span></label>
          <label><input type="radio" name="rol" value="mentor" ${rol === "mentor" ? "checked" : ""}><strong>Quiero ser mentor</strong><span>Ya vivo afuera y quiero compartir mi experiencia.</span></label>
        </div>
      </fieldset>
      <div class="field"><label for="full_name">Nombre y apellido</label><input id="full_name" name="full_name" type="text" autocomplete="name" required maxlength="80"></div>
      <div class="field"><label for="email">Correo electrónico</label><input id="email" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="password">Contraseña</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="8" required><p class="hint">Mínimo 8 caracteres.</p></div>
      <div class="field"><label for="origin_country">País de origen</label>
        <select id="origin_country" name="origin_country"><option value="">Elegí un país</option>${origins.map((c) => html`<option value="${c.code}">${c.name_es}</option>`)}</select></div>
      <label class="check"><input type="checkbox" name="terms" required><span>Leí y acepto los <a href="/legal/terminos" target="_blank" rel="noopener">Términos y condiciones</a> y la <a href="/legal/privacidad" target="_blank" rel="noopener">Política de privacidad</a>. Entiendo que RedEmigra no reemplaza el asesoramiento legal, migratorio o financiero.</span></label>
      <button class="btn btn--primary btn--block" type="submit" data-busy="Creando tu cuenta…">Crear cuenta</button>
    </form>
    ${googleBtn()}
    <p class="small muted" style="margin-top:18px">¿Ya tenés cuenta? <a href="/ingresar${wantedNext || rol === "mentor" ? "?next=" + encodeURIComponent(wantedNext || "/mentor/perfil") : ""}">Ingresá</a></p>
  </div></div></div>`);
  view();

  const form = ctx.root.querySelector("#f");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    showFormError(form, "");
    const d = formData(form);
    if (!d.full_name?.trim()) return showFormError(form, "Contanos tu nombre.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email || "")) return showFormError(form, "Revisá el correo electrónico.");
    if ((d.password || "").length < 8) return showFormError(form, "La contraseña debe tener al menos 8 caracteres.");
    if (!d.terms) return showFormError(form, "Para crear la cuenta tenés que aceptar los términos y la política de privacidad.");
    const btn = form.querySelector("button[type=submit]");
    await busy(btn, async () => {
      const wantsMentor = d.rol === "mentor";
      const next = wantsMentor ? "/mentor/perfil" : (wantedNext || "/mentores");
      const { data, error } = await sb.auth.signUp({
        email: d.email.trim(), password: d.password,
        options: {
          data: { full_name: d.full_name.trim(), origin_country: d.origin_country || "", terms_accepted_at: new Date().toISOString(), role_intent: d.rol },
          emailRedirectTo: `${location.origin}/ingresar?confirmado=1&next=${encodeURIComponent(next)}`,
        },
      });
      if (error) return showFormError(form, errMsg(error));
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return showFormError(form, "Ese correo ya tiene una cuenta. Probá ingresar.");
      if (data.session) { await refreshAll(); return ctx.go(next); }
      ctx.set(html`<div class="container page"><div class="narrow"><div class="card auth-card stack">
        <h1>Revisá tu correo</h1>
        <p>Te mandamos un enlace de confirmación a <strong>${d.email}</strong>. Al abrirlo, tu cuenta queda activa.</p>
        <p class="muted small">Si no lo ves en unos minutos, mirá en la carpeta de correo no deseado.</p>
        <a class="btn btn--ghost" href="/ingresar">Ir a ingresar</a>
      </div></div></div>`);
    });
  });
  bindGoogle(ctx, wantedNext || (rol === "mentor" ? "/mentor/perfil" : "/mentores"));
}

export async function login(ctx) {
  ctx.title("Ingresar");
  const next = safeNext(ctx.query.next, "");
  if (state.user) return ctx.go(next || (state.mentor ? "/mentor/onboarding" : "/mentores"), { replace: true });

  ctx.set(html`
  <div class="container page"><div class="narrow"><div class="card auth-card">
    <h1>Ingresar</h1>
    ${ctx.query.confirmado ? html`<div class="notice notice--ok" style="margin:14px 0">${ico("check")}<span>¡Listo! Confirmaste tu correo. Ya podés ingresar.</span></div>` : ""}
    <form id="f" class="stack" novalidate style="margin-top:18px">
      <div class="field"><label for="email">Correo electrónico</label><input id="email" name="email" type="email" autocomplete="email" required></div>
      <div class="field"><label for="password">Contraseña</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn btn--primary btn--block" type="submit" data-busy="Ingresando…">Ingresar</button>
    </form>
    <p class="small" style="margin-top:14px"><a href="/recuperar">Olvidé mi contraseña</a></p>
    ${googleBtn()}
    <p class="small muted" style="margin-top:18px">¿No tenés cuenta? <a href="/registro?rol=emigrante${next ? "&next=" + encodeURIComponent(next) : ""}">Registrate gratis</a></p>
  </div></div></div>`);

  const form = ctx.root.querySelector("#f");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault(); showFormError(form, "");
    const d = formData(form);
    if (!d.email || !d.password) return showFormError(form, "Completá tu correo y tu contraseña.");
    await busy(form.querySelector("button[type=submit]"), async () => {
      const { error } = await sb.auth.signInWithPassword({ email: d.email.trim(), password: d.password });
      if (error) return showFormError(form, errMsg(error));
      await refreshAll();
      ctx.go(next || (state.mentor ? "/mentor/onboarding" : "/mentores"));
    });
  });
  bindGoogle(ctx, next || "/mentores");
}

export async function recover(ctx) {
  ctx.title("Recuperar contraseña");
  // Con sesión (llegó desde el enlace del correo): elegir una contraseña nueva.
  if (state.user && (ctx.query.type === "recovery" || location.hash.includes("type=recovery") || sessionStorage.getItem("re_recovery"))) {
    return newPassword(ctx);
  }
  ctx.set(html`
  <div class="container page"><div class="narrow"><div class="card auth-card">
    <h1>Recuperar contraseña</h1>
    <p class="muted">Ingresá tu correo y te mandamos un enlace para elegir una contraseña nueva.</p>
    <form id="f" class="stack" novalidate style="margin-top:18px">
      <div class="field"><label for="email">Correo electrónico</label><input id="email" name="email" type="email" autocomplete="email" required></div>
      <button class="btn btn--primary btn--block" type="submit" data-busy="Enviando…">Enviar enlace</button>
    </form>
    <p class="small muted" style="margin-top:18px"><a href="/ingresar">Volver a ingresar</a></p>
  </div></div></div>`);
  const form = ctx.root.querySelector("#f");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault(); showFormError(form, "");
    const email = formData(form).email?.trim();
    if (!email) return showFormError(form, "Escribí tu correo.");
    await busy(form.querySelector("button[type=submit]"), async () => {
      sessionStorage.setItem("re_recovery", "1");
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/recuperar` });
      if (error) { sessionStorage.removeItem("re_recovery"); return showFormError(form, errMsg(error)); }
      ctx.set(html`<div class="container page"><div class="narrow"><div class="card auth-card stack"><h1>Revisá tu correo</h1><p>Si ese correo tiene una cuenta, te mandamos un enlace para cambiar la contraseña.</p></div></div></div>`);
    });
  });
}

function newPassword(ctx) {
  ctx.set(html`
  <div class="container page"><div class="narrow"><div class="card auth-card">
    <h1>Elegí una contraseña nueva</h1>
    <form id="f" class="stack" novalidate style="margin-top:18px">
      <div class="field"><label for="p1">Contraseña nueva</label><input id="p1" name="p1" type="password" autocomplete="new-password" minlength="8" required><p class="hint">Mínimo 8 caracteres.</p></div>
      <div class="field"><label for="p2">Repetila</label><input id="p2" name="p2" type="password" autocomplete="new-password" required></div>
      <button class="btn btn--primary btn--block" type="submit" data-busy="Guardando…">Guardar contraseña</button>
    </form>
  </div></div></div>`);
  const form = ctx.root.querySelector("#f");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault(); showFormError(form, "");
    const d = formData(form);
    if ((d.p1 || "").length < 8) return showFormError(form, "La contraseña debe tener al menos 8 caracteres.");
    if (d.p1 !== d.p2) return showFormError(form, "Las contraseñas no coinciden.");
    await busy(form.querySelector("button[type=submit]"), async () => {
      const { error } = await sb.auth.updateUser({ password: d.p1 });
      if (error) return showFormError(form, errMsg(error));
      sessionStorage.removeItem("re_recovery");
      toast("Contraseña actualizada.", "ok");
      ctx.go(state.mentor ? "/mentor/onboarding" : "/mentores");
    });
  });
}
