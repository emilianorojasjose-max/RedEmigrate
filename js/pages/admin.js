// Administración: mentores, reservas, reportes, países/rutas y ajustes.
// El acceso lo controla la base (RLS + is_admin); acá solo se dibuja la interfaz.
import { sb, state, html, ico, money, fmtDateTime, fmtShort, esc, dialog, confirmDialog, toast, errMsg, busy, countryName } from "../lib/core.js";
import { MENTOR_STATUS, BOOKING, tag } from "../lib/labels.js";

const nav = (active) => html`<nav class="tabs" aria-label="Administración">
  ${[["/admin/mentores", "Mentores"], ["/admin/reservas", "Reservas"], ["/admin/reportes", "Reportes"], ["/admin/paises", "Países y rutas"], ["/admin/ajustes", "Ajustes"]]
    .map(([h, n]) => html`<a href="${h}" aria-current="${h === active}">${n}</a>`)}</nav>`;

// ------------------------------------------------------------------------------------------ Mentores
export async function mentors(ctx) {
  ctx.title("Administración · Mentores");
  ctx.set(html`<div class="container page"><div class="skeleton" style="height:300px"></div></div>`);
  let list = [];
  const load = async () => { list = (await sb.from("mentor_profiles").select("*").order("created_at", { ascending: false })).data || []; };
  await load();
  if (!ctx.alive()) return;
  let tab = ctx.query.estado || "pending_review";
  const TABS = [["pending_review", "En revisión"], ["approved", "Aprobados"], ["draft", "Borradores"], ["suspended", "Suspendidos"]];
  const VS = { pending: ["En revisión", "amber"], approved: ["Aprobada", "green"], rejected: ["Rechazada", "red"] };
  const KIND = { identity: "Identidad", residence: "Residencia", interview: "Entrevista" };

  const setStatus = async (m, status, msg) => {
    const patch = { status };
    if (status === "approved" && !m.approved_at) patch.approved_at = new Date().toISOString();
    const { error } = await sb.from("mentor_profiles").update(patch).eq("user_id", m.user_id);
    if (error) return toast(errMsg(error), "bad");
    toast(msg, "ok"); await load(); draw();
  };

  const showVerifs = async (m) => {
    const { data } = await sb.from("mentor_verifications").select("*").eq("mentor_id", m.user_id).order("created_at", { ascending: false });
    const d = document.createElement("dialog");
    d.style.width = "min(94vw, 620px)";
    d.innerHTML = `<div class="dlg" style="width:100%"><h2>Verificaciones de ${esc(m.display_name)}</h2><div id="vlist" class="stack"></div><div class="dlg__actions"><button class="btn btn--ghost btn--sm" id="close">Cerrar</button></div></div>`;
    document.body.appendChild(d); d.showModal();
    const box = d.querySelector("#vlist");
    const paint = (rows) => {
      box.innerHTML = rows.length ? rows.map((v) => html`<div class="row" style="gap:10px;border-bottom:1px solid var(--gray-100);padding-bottom:10px"><strong>${KIND[v.kind] || v.kind}</strong>${tag(VS, v.status)}<span class="muted small">${fmtShort(v.created_at)}</span><span class="spacer"></span>
        ${v.evidence_path ? html`<button class="btn btn--ghost btn--sm" data-open="${v.evidence_path}">Ver documento</button>` : ""}
        ${v.status === "pending" ? html`<button class="btn btn--primary btn--sm" data-ok="${v.id}">Aprobar</button><button class="btn btn--ghost btn--sm" data-no="${v.id}">Rechazar</button>` : ""}</div>`).join("") : "<p class='muted'>No subió documentos.</p>";
      box.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", async () => {
        const { data: s, error } = await sb.storage.from("verificaciones").createSignedUrl(b.dataset.open, 120);
        if (error) return toast(errMsg(error), "bad"); window.open(s.signedUrl, "_blank", "noopener");
      }));
      const decide = (id, status) => async () => {
        const { error } = await sb.from("mentor_verifications").update({ status, reviewed_by: state.user.id, reviewed_at: new Date().toISOString() }).eq("id", id);
        if (error) return toast(errMsg(error), "bad");
        rows.find((r) => r.id === id).status = status; paint(rows); toast("Guardado.", "ok");
      };
      box.querySelectorAll("[data-ok]").forEach((b) => b.addEventListener("click", decide(b.dataset.ok, "approved")));
      box.querySelectorAll("[data-no]").forEach((b) => b.addEventListener("click", decide(b.dataset.no, "rejected")));
    };
    paint(data || []);
    d.querySelector("#close").addEventListener("click", () => { d.close(); d.remove(); });
  };

  const draw = () => {
    const rows = list.filter((m) => m.status === tab);
    ctx.set(html`<div class="container page"><div class="stack-lg">
      <div class="page-head"><h1>Administración</h1></div>${nav("/admin/mentores")}
      <div class="statgrid"><div class="stat"><strong>${list.filter((m) => m.status === "pending_review").length}</strong><span>Esperando revisión</span></div><div class="stat"><strong>${list.filter((m) => m.status === "approved").length}</strong><span>Aprobados</span></div><div class="stat"><strong>${list.filter((m) => m.payouts_enabled).length}</strong><span>Con cobros listos</span></div></div>
      <div class="tabs" role="tablist">${TABS.map(([k, n]) => html`<button role="tab" data-tab="${k}" aria-selected="${k === tab}">${n} (${list.filter((m) => m.status === k).length})</button>`)}</div>
      ${rows.length ? rows.map((m) => html`<article class="brow"><div>
          <div class="row" style="gap:8px">${tag(MENTOR_STATUS, m.status)}${m.is_example ? html`<span class="tag tag--example">Ejemplo</span>` : ""}${m.payouts_enabled ? html`<span class="tag tag--green">Cobros listos</span>` : html`<span class="tag">Sin cobros</span>`}</div>
          <h3 style="margin-top:6px">${m.display_name} <span class="muted small" style="font-weight:400">/${m.slug}</span></h3>
          <p class="muted small">${countryName(m.origin_country)} → ${countryName(m.residence_country)}${m.arrived_on ? ` · desde ${m.arrived_on}` : ""}</p>
          ${m.headline ? html`<p class="small" style="margin-top:6px"><strong>${m.headline}</strong></p>` : ""}
          ${m.bio ? html`<details style="margin-top:6px"><summary class="small" style="cursor:pointer">Ver historia</summary><p class="small" style="white-space:pre-line;margin-top:6px">${m.bio}</p></details>` : ""}</div>
        <div class="brow__actions">
          <a class="btn btn--ghost btn--sm" href="/mentores/${m.slug}">Ver perfil</a>
          <button class="btn btn--ghost btn--sm" data-v="${m.user_id}">Verificaciones</button>
          ${m.status === "pending_review" ? html`<button class="btn btn--primary btn--sm" data-a="approved" data-id="${m.user_id}">Aprobar</button><button class="btn btn--ghost btn--sm" data-a="draft" data-id="${m.user_id}">Devolver</button>` : ""}
          ${m.status === "approved" ? html`<button class="btn btn--ghost btn--sm" data-a="suspended" data-id="${m.user_id}">Suspender</button>` : ""}
          ${m.status === "suspended" ? html`<button class="btn btn--primary btn--sm" data-a="approved" data-id="${m.user_id}">Reactivar</button>` : ""}
        </div></article>`) : html`<div class="empty card"><h3>No hay mentores en este estado</h3></div>`}
    </div></div>`);
    ctx.root.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; draw(); }));
    ctx.root.querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", () => showVerifs(list.find((m) => m.user_id === b.dataset.v))));
    ctx.root.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", async () => {
      const m = list.find((x) => x.user_id === b.dataset.id); const a = b.dataset.a;
      const label = { approved: "Aprobar y publicar", draft: "Devolver a borrador", suspended: "Suspender" }[a];
      if (!(await confirmDialog({ title: `${label} a ${m.display_name}`, body: a === "suspended" ? "El perfil deja de mostrarse y no se aceptan reservas nuevas. Las reservas ya pagadas no se cancelan solas." : a === "approved" ? "El perfil pasa a ser público." : "El perfil vuelve a ser privado para que lo corrija.", confirmText: label, danger: a === "suspended" }))) return;
      setStatus(m, a, "Estado actualizado.");
    }));
  };
  draw();
}

// ------------------------------------------------------------------------------------------ Reservas
export async function bookings(ctx) {
  ctx.title("Administración · Reservas");
  ctx.set(html`<div class="container page"><div class="skeleton" style="height:300px"></div></div>`);
  const { data: bs } = await sb.from("bookings").select("*").order("created_at", { ascending: false }).limit(150);
  const ids = [...new Set((bs || []).map((b) => b.traveler_id))];
  const { data: ps } = ids.length ? await sb.from("profiles").select("id,full_name").in("id", ids) : { data: [] };
  if (!ctx.alive()) return;
  const names = new Map((ps || []).map((p) => [p.id, p.full_name]));
  const count = (s) => (bs || []).filter((b) => b.status === s).length;
  const gross = (bs || []).filter((b) => ["confirmed", "completed"].includes(b.status)).reduce((a, b) => a + b.price_cents, 0);
  ctx.set(html`<div class="container page"><div class="stack-lg">
    <div class="page-head"><h1>Administración</h1></div>${nav("/admin/reservas")}
    <div class="statgrid"><div class="stat"><strong>${count("confirmed")}</strong><span>Confirmadas</span></div><div class="stat"><strong>${count("completed")}</strong><span>Completadas</span></div><div class="stat"><strong>${count("pending_payment")}</strong><span>Sin pagar</span></div><div class="stat"><strong>${money(gross)}</strong><span>Cobrado en confirmadas y completadas (últimas 150)</span></div></div>
    <div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Servicio</th><th>Quien reservó</th><th>Mentor</th><th>Estado</th><th>Precio</th><th></th></tr></thead><tbody>
      ${(bs || []).map((b) => html`<tr><td>${fmtShort(b.created_at)}</td><td>${b.service_title || "—"}</td><td>${names.get(b.traveler_id) || "—"}</td><td>${b.mentor_name || "—"}</td><td>${tag(BOOKING, b.status)}</td><td>${money(b.price_cents, b.currency)}</td><td><a class="btn btn--ghost btn--sm" href="/reservas/${b.id}">Abrir</a></td></tr>`)}
    </tbody></table></div>
    ${(bs || []).length ? "" : html`<div class="empty card"><h3>Todavía no hay reservas</h3></div>`}
    <p class="small muted">Desde el detalle de una reserva podés cancelarla; si se cancela como administración, se reembolsa el total.</p>
  </div></div>`);
}

// ------------------------------------------------------------------------------------------ Reportes
export async function reports(ctx) {
  ctx.title("Administración · Reportes");
  ctx.set(html`<div class="container page"><div class="skeleton" style="height:300px"></div></div>`);
  let list = [];
  const load = async () => { list = (await sb.from("reports").select("*").order("created_at", { ascending: false }).limit(200)).data || []; };
  await load();
  const uids = [...new Set(list.map((r) => r.reporter_id))];
  const mids = [...new Set(list.filter((r) => r.target_type === "mentor").map((r) => r.target_id))];
  const [pr, mp] = await Promise.all([
    uids.length ? sb.from("profiles").select("id,full_name").in("id", uids) : { data: [] },
    mids.length ? sb.from("mentor_profiles").select("user_id,display_name,slug,status").in("user_id", mids) : { data: [] },
  ]);
  if (!ctx.alive()) return;
  const who = new Map((pr.data || []).map((p) => [p.id, p.full_name]));
  const mentors = new Map((mp.data || []).map((m) => [m.user_id, m]));
  const TABS = [["open", "Abiertos"], ["reviewing", "En revisión"], ["closed", "Cerrados"]];
  const ST = { open: ["Abierto", "amber"], reviewing: ["En revisión", "blue"], closed: ["Cerrado", ""] };
  let tab = "open";
  const setSt = async (r, status) => {
    const { error } = await sb.from("reports").update({ status, handled_by: state.user.id }).eq("id", r.id);
    if (error) return toast(errMsg(error), "bad"); r.status = status; draw();
  };
  const draw = () => {
    const rows = list.filter((r) => r.status === tab);
    ctx.set(html`<div class="container page"><div class="stack-lg">
      <div class="page-head"><h1>Administración</h1></div>${nav("/admin/reportes")}
      <div class="tabs" role="tablist">${TABS.map(([k, n]) => html`<button role="tab" data-tab="${k}" aria-selected="${k === tab}">${n} (${list.filter((r) => r.status === k).length})</button>`)}</div>
      ${rows.length ? rows.map((r) => { const m = mentors.get(r.target_id); return html`<article class="brow"><div>
        <div class="row" style="gap:8px">${tag(ST, r.status)}<span class="tag">${{ mentor: "Mentor", booking: "Reserva", review: "Reseña", message: "Mensaje" }[r.target_type]}</span><span class="muted small">${fmtShort(r.created_at)}</span></div>
        <h3 style="margin-top:6px">${r.reason}</h3>
        ${r.details ? html`<p class="small" style="margin-top:4px;white-space:pre-line">${r.details}</p>` : ""}
        <p class="muted small" style="margin-top:6px">Reportó: ${who.get(r.reporter_id) || "—"}${m ? html` · Mentor: <a href="/mentores/${m.slug}">${m.display_name}</a> (${m.status})` : ""}${r.target_type === "booking" ? html` · <a href="/reservas/${r.target_id}">Abrir reserva</a>` : ""}</p></div>
        <div class="brow__actions">
          ${r.status === "open" ? html`<button class="btn btn--ghost btn--sm" data-st="reviewing" data-id="${r.id}">Tomar</button>` : ""}
          ${r.status !== "closed" ? html`<button class="btn btn--primary btn--sm" data-st="closed" data-id="${r.id}">Cerrar</button>` : html`<button class="btn btn--ghost btn--sm" data-st="open" data-id="${r.id}">Reabrir</button>`}
          ${r.target_type === "mentor" && m && m.status === "approved" ? html`<button class="btn btn--ghost btn--sm" data-susp="${m.user_id}">Suspender mentor</button>` : ""}
          ${r.target_type === "review" ? html`<button class="btn btn--ghost btn--sm" data-hide="${r.target_id}">Ocultar reseña</button>` : ""}
        </div></article>`; }) : html`<div class="empty card"><h3>No hay reportes en este estado</h3></div>`}
    </div></div>`);
    ctx.root.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; draw(); }));
    ctx.root.querySelectorAll("[data-st]").forEach((b) => b.addEventListener("click", () => setSt(list.find((x) => x.id === b.dataset.id), b.dataset.st)));
    ctx.root.querySelectorAll("[data-susp]").forEach((b) => b.addEventListener("click", async () => {
      if (!(await confirmDialog({ title: "Suspender mentor", body: "El perfil deja de mostrarse y no recibe reservas nuevas.", confirmText: "Suspender", danger: true }))) return;
      const { error } = await sb.from("mentor_profiles").update({ status: "suspended" }).eq("user_id", b.dataset.susp);
      if (error) return toast(errMsg(error), "bad"); mentors.get(b.dataset.susp).status = "suspended"; toast("Mentor suspendido.", "ok"); draw();
    }));
    ctx.root.querySelectorAll("[data-hide]").forEach((b) => b.addEventListener("click", async () => {
      const { error } = await sb.from("reviews").update({ is_published: false }).eq("id", b.dataset.hide);
      if (error) return toast(errMsg(error), "bad"); toast("Reseña oculta.", "ok");
    }));
  };
  draw();
}

// ------------------------------------------------------------------------------------------ Países y rutas
export async function countries(ctx) {
  ctx.title("Administración · Países y rutas");
  ctx.set(html`<div class="container page"><div class="skeleton" style="height:300px"></div></div>`);
  let cs = [], rs = [], cities = [];
  const load = async () => {
    const [a, b, c] = await Promise.all([sb.from("countries").select("*").order("name_es"), sb.from("routes").select("*"), sb.from("cities").select("*").order("name")]);
    cs = a.data || []; rs = b.data || []; cities = c.data || [];
  };
  await load();
  if (!ctx.alive()) return;
  const name = (c) => cs.find((x) => x.code === c)?.name_es || c;

  const draw = () => {
    ctx.set(html`<div class="container page"><div class="stack-lg">
      <div class="page-head"><h1>Administración</h1><p>Ampliar la red es cargar filas: países, ciudades y rutas.</p></div>${nav("/admin/paises")}
      <section class="card"><div class="row row--between"><h2>Países</h2><button class="btn btn--primary btn--sm" id="addc">${ico("plus")} Agregar país</button></div>
        <div class="table-wrap"><table><thead><tr><th>Código</th><th>Nombre</th><th>Origen</th><th>Destino</th></tr></thead><tbody>
          ${cs.map((c) => html`<tr><td>${c.code}</td><td>${c.name_es}</td><td><input type="checkbox" data-c="${c.code}" data-f="is_origin" ${c.is_origin ? "checked" : ""} aria-label="${c.name_es} es país de origen"></td><td><input type="checkbox" data-c="${c.code}" data-f="is_destination" ${c.is_destination ? "checked" : ""} aria-label="${c.name_es} es país de destino"></td></tr>`)}
        </tbody></table></div></section>
      <section class="card"><div class="row row--between"><h2>Ciudades</h2><button class="btn btn--ghost btn--sm" id="addcity">${ico("plus")} Agregar ciudad</button></div>
        <p class="small muted">${cities.map((c) => `${c.name} (${c.country_code})`).join(" · ") || "Sin ciudades."}</p></section>
      <section class="card"><div class="row row--between"><h2>Rutas</h2><button class="btn btn--ghost btn--sm" id="addr">${ico("plus")} Agregar ruta</button></div>
        <div class="table-wrap"><table><thead><tr><th>Ruta</th><th>Activa</th><th>Foco</th></tr></thead><tbody>
          ${rs.map((r) => html`<tr><td>${name(r.origin_country)} → ${name(r.destination_country)}</td><td><input type="checkbox" data-r="${r.origin_country}:${r.destination_country}" data-f="is_active" ${r.is_active ? "checked" : ""} aria-label="Ruta activa"></td><td><input type="checkbox" data-r="${r.origin_country}:${r.destination_country}" data-f="is_focus" ${r.is_focus ? "checked" : ""} aria-label="Ruta de foco"></td></tr>`)}
        </tbody></table></div></section>
    </div></div>`);

    ctx.root.querySelectorAll("input[data-c]").forEach((i) => i.addEventListener("change", async () => {
      const { error } = await sb.from("countries").update({ [i.dataset.f]: i.checked }).eq("code", i.dataset.c);
      if (error) { i.checked = !i.checked; return toast(errMsg(error), "bad"); } toast("Guardado.", "ok");
    }));
    ctx.root.querySelectorAll("input[data-r]").forEach((i) => i.addEventListener("change", async () => {
      const [o, d] = i.dataset.r.split(":");
      const { error } = await sb.from("routes").update({ [i.dataset.f]: i.checked }).eq("origin_country", o).eq("destination_country", d);
      if (error) { i.checked = !i.checked; return toast(errMsg(error), "bad"); } toast("Guardado.", "ok");
    }));
    ctx.root.querySelector("#addc").addEventListener("click", async () => {
      const r = await dialog({ title: "Agregar país", confirmText: "Agregar", form: true, body: html`
        <div class="field"><label for="code">Código ISO de 2 letras</label><input id="code" name="code" required maxlength="2" pattern="[A-Za-z]{2}" placeholder="IT"></div>
        <div class="field"><label for="n">Nombre en español</label><input id="n" name="name_es" required maxlength="60"></div>
        <label class="check" style="margin-top:12px"><input type="checkbox" name="is_origin"><span>Es país de origen</span></label>
        <label class="check" style="margin-top:8px"><input type="checkbox" name="is_destination"><span>Es país de destino</span></label>` });
      if (!r) return;
      const { error } = await sb.from("countries").insert({ code: r.code.toUpperCase(), name_es: r.name_es.trim(), is_origin: r.is_origin === "on", is_destination: r.is_destination === "on" });
      if (error) return toast(errMsg(error), "bad"); toast("País agregado.", "ok"); await load(); draw();
    });
    ctx.root.querySelector("#addcity").addEventListener("click", async () => {
      const r = await dialog({ title: "Agregar ciudad", confirmText: "Agregar", form: true, body: html`
        <div class="field"><label for="cc">País</label><select id="cc" name="country_code" required>${cs.map((c) => html`<option value="${c.code}">${c.name_es}</option>`)}</select></div>
        <div class="field"><label for="cn">Ciudad</label><input id="cn" name="name" required maxlength="60"></div>` });
      if (!r) return;
      const { error } = await sb.from("cities").insert({ country_code: r.country_code, name: r.name.trim() });
      if (error) return toast(errMsg(error), "bad"); toast("Ciudad agregada.", "ok"); await load(); draw();
    });
    ctx.root.querySelector("#addr").addEventListener("click", async () => {
      const r = await dialog({ title: "Agregar ruta", confirmText: "Agregar", form: true, body: html`
        <div class="field"><label for="ro">Origen</label><select id="ro" name="o" required>${cs.map((c) => html`<option value="${c.code}">${c.name_es}</option>`)}</select></div>
        <div class="field"><label for="rd">Destino</label><select id="rd" name="d" required>${cs.map((c) => html`<option value="${c.code}">${c.name_es}</option>`)}</select></div>` });
      if (!r) return;
      if (r.o === r.d) return toast("El origen y el destino no pueden ser el mismo país.", "bad");
      const { error } = await sb.from("routes").insert({ origin_country: r.o, destination_country: r.d });
      if (error) return toast(errMsg(error), "bad"); toast("Ruta agregada.", "ok"); await load(); draw();
    });
  };
  draw();
}

// ------------------------------------------------------------------------------------------ Ajustes
export async function settings(ctx) {
  ctx.title("Administración · Ajustes");
  const { data } = await sb.from("platform_settings").select("*").order("key");
  if (!ctx.alive()) return;
  ctx.set(html`<div class="container page"><div class="mid stack-lg">
    <div class="page-head"><h1>Administración</h1></div>${nav("/admin/ajustes")}
    <div class="notice notice--warn">${ico("info")}<span>Estos valores son <strong>propuestas iniciales</strong>: la comisión, la política de cancelación y los plazos todavía hay que decidirlos. Los cambios rigen desde el momento en que los guardás, para las reservas nuevas.</span></div>
    <section class="card stack">${(data || []).map((s) => html`<form class="field" data-key="${s.key}"><label for="s-${s.key}"><code>${s.key}</code></label>
      <div class="row"><input id="s-${s.key}" type="text" value="${s.value}" style="flex:1;min-width:160px"><button class="btn btn--ghost btn--sm" type="submit">Guardar</button></div><p class="hint">${s.description || ""}</p></form>`)}</section>
  </div></div>`);
  ctx.root.querySelectorAll("form[data-key]").forEach((f) => f.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const v = f.querySelector("input").value.trim();
    if (f.dataset.key === "hold_minutes" && !(Number(v) >= 30 && Number(v) <= 1380)) return toast("El bloqueo debe estar entre 30 y 1380 minutos (límites de Stripe Checkout).", "bad");
    const { error } = await sb.from("platform_settings").update({ value: v }).eq("key", f.dataset.key);
    if (error) return toast(errMsg(error), "bad"); state.settings[f.dataset.key] = v; toast("Ajuste guardado.", "ok");
  }));
}
