// Panel del mentor: perfil, checklist de alta, servicios, disponibilidad, reservas y cobros.
import { sb, state, html, ico, avatar, money, fmtDateTime, fmtShort, fmtDay, fmtTime, esc, dialog, confirmDialog, toast, errMsg, busy, formData, showFormError, callFn, slugify, LANGS, langName, countryName, TZ, tzLabel, raw } from "../lib/core.js";
import { MENTOR_STATUS, TRANSFER, tag } from "../lib/labels.js";
import { refreshAll } from "../lib/session.js";
import { uploadAvatar } from "../lib/image.js";
import { bookingRows, groupOf } from "./account.js";
import { loadSlots } from "../lib/slots.js";

const subnav = (active) => html`<nav class="tabs" aria-label="Panel de mentor">
  ${[["/mentor/onboarding", "Resumen"], ["/mentor/perfil", "Perfil"], ["/mentor/servicios", "Servicios"], ["/mentor/disponibilidad", "Disponibilidad"], ["/mentor/reservas", "Reservas"], ["/mentor/cobros", "Cobros"]]
    .map(([h, n]) => html`<a href="${h}" aria-current="${h === active}">${n}</a>`)}</nav>`;

// ------------------------------------------------------------------------------------------ Perfil
export async function profile(ctx) {
  const m = state.mentor;
  const isNew = !m;
  ctx.title(isNew ? "Crear perfil de mentor" : "Mi perfil");
  const cities = (await sb.from("cities").select("*").order("name")).data || [];
  if (!ctx.alive()) return;
  const dests = state.countries.filter((c) => c.is_destination);
  const first = (state.profile?.full_name || "").split(" ")[0];
  const v = m || { display_name: first, slug: slugify(first), languages: state.profile?.languages || [], origin_country: state.profile?.origin_country || "", residence_country: "", avatar_url: state.profile?.avatar_url || "" };
  let avatarUrl = v.avatar_url || "";

  const cityOptions = (cc, sel) => cities.filter((c) => c.country_code === cc).map((c) => html`<option value="${c.id}" ${c.id === sel ? "selected" : ""}>${c.name}</option>`);

  ctx.set(html`
  <div class="container page"><div class="mid stack-lg">
    ${isNew ? html`<div class="page-head"><h1>Creá tu perfil de mentor</h1><p>Contá quién sos y qué experiencia podés compartir. Después definís tus servicios y tus horarios. Tu perfil se publica cuando el equipo de RedEmigra lo revisa.</p></div>` : html`<div class="page-head row row--between"><h1>Mi perfil</h1>${tag(MENTOR_STATUS, m.status)}</div>${subnav("/mentor/perfil")}`}
    <form class="card stack" id="f" novalidate>
      <div class="row" style="gap:18px"><div id="ava">${avatar(v.display_name || "?", avatarUrl, null, "avatar--lg")}</div>
        <div><label class="btn btn--ghost btn--sm" for="photo">Subir foto</label><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only"><p class="small muted" style="margin-top:6px">Una foto tuya de cara genera más confianza.</p></div></div>
      <div class="grid2">
        <div class="field"><label for="display_name">Nombre público</label><input id="display_name" name="display_name" type="text" required maxlength="60" value="${v.display_name || ""}"><p class="hint">Así te ven en la plataforma. Tu nombre completo queda privado.</p></div>
        <div class="field"><label for="slug">Dirección de tu perfil</label><input id="slug" name="slug" type="text" required maxlength="40" pattern="[a-z0-9]+(-[a-z0-9]+)*" value="${v.slug || ""}"><p class="hint">redemigra.com/mentores/<strong id="slug-prev">${v.slug || ""}</strong></p></div>
      </div>
      <div class="field"><label for="headline">Titular</label><input id="headline" name="headline" type="text" maxlength="90" placeholder="Ej.: Llegué con visa de estudiante y hoy trabajo en tecnología" value="${v.headline || ""}"></div>
      <div class="field"><label for="bio">Tu historia</label><textarea id="bio" name="bio" maxlength="3000" style="min-height:170px" placeholder="Cómo decidiste irte, qué te costó, qué harías distinto, en qué podés ayudar…">${v.bio || ""}</textarea></div>
      <div class="field"><label for="quote">Una frase que te represente (opcional)</label><input id="quote" name="quote" type="text" maxlength="160" value="${v.quote || ""}"></div>
      <div class="grid2">
        <div class="field"><label for="origin_country">País de origen</label><select id="origin_country" name="origin_country" required><option value="">Elegí</option>${state.countries.map((c) => html`<option value="${c.code}" ${c.code === v.origin_country ? "selected" : ""}>${c.name_es}</option>`)}</select></div>
        <div class="field"><label for="residence_country">País donde vivís</label><select id="residence_country" name="residence_country" required><option value="">Elegí</option>${dests.map((c) => html`<option value="${c.code}" ${c.code === v.residence_country ? "selected" : ""}>${c.name_es}</option>`)}</select></div>
        <div class="field"><label for="residence_city_id">Ciudad</label><select id="residence_city_id" name="residence_city_id"><option value="">—</option>${cityOptions(v.residence_country, v.residence_city_id)}</select></div>
        <div class="field"><label for="arrived_on">¿Desde cuándo vivís allá?</label><input id="arrived_on" name="arrived_on" type="date" max="${new Date().toISOString().slice(0, 10)}" value="${v.arrived_on || ""}"></div>
        <div class="field"><label for="arrival_type">Cómo llegaste</label><input id="arrival_type" name="arrival_type" type="text" maxlength="80" placeholder="Ej.: visa de estudiante, visa de trabajo…" value="${v.arrival_type || ""}"></div>
        <div class="field"><label for="profession">Profesión</label><input id="profession" name="profession" type="text" maxlength="80" value="${v.profession || ""}"></div>
      </div>
      <div class="field"><span class="label">Idiomas en los que podés dar la sesión</span><div class="chips-input">${LANGS.map(([c, n]) => html`<label><input type="checkbox" name="languages" value="${c}" ${(v.languages || []).includes(c) ? "checked" : ""}>${n}</label>`)}</div></div>
      <div class="notice">${ico("info")}<span>Compartí tu experiencia personal. No des asesoramiento legal, migratorio o financiero como si fueras profesional en la materia: esa parte la resuelven abogados y gestores.</span></div>
      <div class="row"><button class="btn btn--primary" type="submit" data-busy="Guardando…">${isNew ? "Crear perfil y seguir" : "Guardar cambios"}</button>${!isNew && m.status === "approved" ? html`<a class="btn btn--ghost" href="/mentores/${m.slug}">Ver mi perfil público</a>` : ""}</div>
    </form>
  </div></div>`);

  const form = ctx.root.querySelector("#f");
  let slugTouched = !isNew;
  form.display_name.addEventListener("input", () => { if (!slugTouched) { form.slug.value = slugify(form.display_name.value); ctx.root.querySelector("#slug-prev").textContent = form.slug.value; } });
  form.slug.addEventListener("input", () => { slugTouched = true; form.slug.value = slugify(form.slug.value); ctx.root.querySelector("#slug-prev").textContent = form.slug.value; });
  form.residence_country.addEventListener("change", () => { form.residence_city_id.innerHTML = `<option value="">—</option>` + cityOptions(form.residence_country.value, null).join(""); });
  ctx.root.querySelector("#photo").addEventListener("change", async (ev) => {
    const f = ev.target.files?.[0]; if (!f) return;
    try {
      avatarUrl = await uploadAvatar(sb, state.user.id, f);
      ctx.root.querySelector("#ava").innerHTML = avatar(form.display_name.value || "?", avatarUrl, null, "avatar--lg").toString();
      if (state.mentor) { const { error } = await sb.from("mentor_profiles").update({ avatar_url: avatarUrl }).eq("user_id", state.user.id); if (error) throw error; }
      toast("Foto subida.", "ok");
    } catch (e) { toast(errMsg(e), "bad"); }
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault(); showFormError(form, "");
    const d = formData(form);
    const langs = [...form.querySelectorAll("input[name=languages]:checked")].map((i) => i.value);
    if (!d.display_name.trim()) return showFormError(form, "Elegí el nombre con el que vas a aparecer.");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.slug)) return showFormError(form, "La dirección del perfil solo puede tener letras minúsculas, números y guiones.");
    if (!d.origin_country || !d.residence_country) return showFormError(form, "Elegí tu país de origen y el país donde vivís.");
    const row = {
      display_name: d.display_name.trim(), slug: d.slug, headline: d.headline.trim() || null, bio: d.bio.trim() || null, quote: d.quote.trim() || null,
      origin_country: d.origin_country, residence_country: d.residence_country, residence_city_id: d.residence_city_id || null,
      arrived_on: d.arrived_on || null, arrival_type: d.arrival_type.trim() || null, profession: d.profession.trim() || null,
      languages: langs, avatar_url: avatarUrl || null,
    };
    await busy(form.querySelector("button[type=submit]"), async () => {
      const q = state.mentor
        ? sb.from("mentor_profiles").update(row).eq("user_id", state.user.id)
        : sb.from("mentor_profiles").insert({ ...row, user_id: state.user.id, status: "draft" });
      const { error } = await q;
      if (error) return showFormError(form, errMsg(error));
      await refreshAll();
      toast("Perfil guardado.", "ok");
      ctx.go("/mentor/onboarding");
    });
  });
}

// ------------------------------------------------------------------------------------------ Checklist
export async function onboarding(ctx) {
  ctx.title("Panel de mentor");
  ctx.set(html`<div class="container page"><div class="skeleton" style="height:320px"></div></div>`);
  const uid = state.user.id;
  await refreshAll();
  const m = state.mentor;
  const [svc, rules, ver] = await Promise.all([
    sb.from("services").select("id,is_active").eq("mentor_id", uid),
    sb.from("availability_rules").select("id").eq("mentor_id", uid),
    sb.from("mentor_verifications").select("*").eq("mentor_id", uid).order("created_at", { ascending: false }),
  ]);
  if (!ctx.alive()) return;
  const nSvc = (svc.data || []).filter((s) => s.is_active).length;
  const nRules = (rules.data || []).length;
  const profileOk = !!(m.headline && m.bio && m.arrived_on && (m.languages || []).length);
  const steps = [
    { ok: profileOk, t: "Perfil completo", d: "Titular, historia, desde cuándo vivís allá e idiomas.", href: "/mentor/perfil", cta: profileOk ? "Editar" : "Completar" },
    { ok: nSvc > 0, t: "Al menos un servicio con tu precio", d: `Vos decidís cuánto cobrar. Servicios activos: ${nSvc}.`, href: "/mentor/servicios", cta: nSvc ? "Administrar" : "Crear servicio" },
    { ok: nRules > 0, t: "Tus horarios disponibles", d: "Definí en qué días y franjas podés dar sesiones.", href: "/mentor/disponibilidad", cta: nRules ? "Editar" : "Definir horarios" },
    { ok: m.payouts_enabled, t: "Cobros con Stripe", d: m.payouts_enabled ? "Tu cuenta de cobros en Stripe está lista." : "Necesitás completar tus datos en Stripe para recibir el dinero. Sin esto, todavía no se puede reservar con vos.", href: "/mentor/cobros", cta: m.payouts_enabled ? "Ver cobros" : "Configurar cobros" },
  ];
  const canSubmit = steps[0].ok && steps[1].ok && steps[2].ok;
  const KIND = { identity: "Identidad", residence: "Residencia", interview: "Entrevista" };
  const VS = { pending: ["En revisión", "amber"], approved: ["Aprobada", "green"], rejected: ["Rechazada", "red"] };

  const draw = () => ctx.set(html`
  <div class="container page"><div class="mid stack-lg">
    <div class="page-head row row--between"><div><h1>Hola, ${m.display_name}</h1><p>Tu perfil está: ${tag(MENTOR_STATUS, m.status)}</p></div>
      ${m.status === "approved" ? html`<a class="btn btn--ghost btn--sm" href="/mentores/${m.slug}">Ver mi perfil público</a>` : html`<a class="btn btn--ghost btn--sm" href="/mentores/${m.slug}">Ver vista previa</a>`}</div>
    ${subnav("/mentor/onboarding")}
    ${m.status === "suspended" ? html`<div class="notice notice--bad">${ico("alert")}<span>Tu perfil está suspendido. Para más información, escribile al equipo de RedEmigra.</span></div>` : ""}
    ${m.status === "pending_review" ? html`<div class="notice notice--warn">${ico("clock")}<span>Estamos revisando tu perfil. Te avisamos cuando esté publicado.</span></div>` : ""}
    ${m.status === "approved" && !m.payouts_enabled ? html`<div class="notice notice--warn">${ico("info")}<span>Tu perfil es público, pero <strong>todavía no pueden reservar con vos</strong> hasta que completes la configuración de cobros.</span></div>` : ""}
    <section class="card"><h2>Para publicar tu perfil</h2>
      <ul class="checklist">${steps.map((s, i) => html`<li class="${s.ok ? "is-done" : ""}"><span class="dot">${s.ok ? ico("check") : i + 1}</span><div class="grow"><strong>${s.t}</strong><span class="small muted">${s.d}</span></div><a class="btn btn--ghost btn--sm" href="${s.href}">${s.cta}</a></li>`)}</ul>
      <div style="margin-top:18px" class="row">
        ${m.status === "draft" ? html`<button class="btn btn--primary" id="submit" ${canSubmit ? "" : "disabled"}>Enviar mi perfil a revisión</button>${canSubmit ? "" : html`<span class="small muted">Completá los tres primeros pasos para enviarlo.</span>`}` : ""}
        ${m.status === "pending_review" ? html`<button class="btn btn--ghost" id="withdraw">Volver a borrador</button>` : ""}
      </div>
    </section>
    <section class="card"><h2>Verificación (opcional por ahora)</h2>
      <p class="muted">Podés subir documentos para que el equipo verifique tu identidad y tu residencia. Solo los ve el equipo de RedEmigra, y el perfil muestra la insignia de verificación únicamente si se aprueba.</p>
      ${(ver.data || []).length ? html`<ul class="stack" style="margin-top:12px">${ver.data.map((x) => html`<li class="row" style="gap:10px"><strong>${KIND[x.kind] || x.kind}</strong>${tag(VS, x.status)}<span class="muted small">${fmtShort(x.created_at)}</span></li>`)}</ul>` : ""}
      <div class="row" style="margin-top:14px">
        <label class="btn btn--ghost btn--sm" for="v-identity">${ico("plus")} Documento de identidad</label><input id="v-identity" data-kind="identity" type="file" accept="image/jpeg,image/png,application/pdf" class="sr-only">
        <label class="btn btn--ghost btn--sm" for="v-residence">${ico("plus")} Prueba de residencia</label><input id="v-residence" data-kind="residence" type="file" accept="image/jpeg,image/png,application/pdf" class="sr-only">
      </div><p class="small muted" style="margin-top:8px">JPG, PNG o PDF, hasta 8 MB.</p>
    </section>
  </div></div>`);
  draw();

  const bind = () => {
    ctx.root.querySelector("#submit")?.addEventListener("click", (e) => busy(e.currentTarget, async () => {
      const { error } = await sb.from("mentor_profiles").update({ status: "pending_review" }).eq("user_id", uid);
      if (error) return toast(errMsg(error), "bad");
      await refreshAll(); toast("Enviamos tu perfil a revisión.", "ok"); ctx.go("/mentor/onboarding");
    }));
    ctx.root.querySelector("#withdraw")?.addEventListener("click", (e) => busy(e.currentTarget, async () => {
      const { error } = await sb.from("mentor_profiles").update({ status: "draft" }).eq("user_id", uid);
      if (error) return toast(errMsg(error), "bad");
      await refreshAll(); ctx.go("/mentor/onboarding");
    }));
    ctx.root.querySelectorAll("input[data-kind]").forEach((inp) => inp.addEventListener("change", async () => {
      const f = inp.files?.[0]; if (!f) return;
      if (f.size > 8 * 1024 * 1024) return toast("El archivo pesa más de 8 MB.", "bad");
      const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${uid}/${inp.dataset.kind}-${Date.now()}.${ext}`;
      const up = await sb.storage.from("verificaciones").upload(path, f, { contentType: f.type, upsert: false });
      if (up.error) return toast(errMsg(up.error), "bad");
      const { error } = await sb.from("mentor_verifications").insert({ mentor_id: uid, kind: inp.dataset.kind, evidence_path: path });
      if (error) return toast(errMsg(error), "bad");
      toast("Documento enviado. Lo va a revisar el equipo.", "ok"); ctx.go("/mentor/onboarding");
    }));
  };
  bind();
}

// ------------------------------------------------------------------------------------------ Servicios
const KINDS = { first_call: "Primera llamada", arrival_plan: "Plan de llegada", first_month: "Primer mes", custom: "Personalizado" };

export async function services(ctx) {
  ctx.title("Mis servicios");
  const uid = state.user.id;
  const load = async () => (await sb.from("services").select("*").eq("mentor_id", uid).order("created_at")).data || [];
  let list = await load();
  if (!ctx.alive()) return;

  const editor = async (s) => {
    const r = await dialog({
      title: s ? "Editar servicio" : "Nuevo servicio", confirmText: "Guardar", form: true,
      body: html`
        <div class="field"><label for="kind">Tipo</label><select id="kind" name="kind">${Object.entries(KINDS).map(([k, n]) => html`<option value="${k}" ${s?.kind === k ? "selected" : ""}>${n}</option>`)}</select></div>
        <div class="field"><label for="title">Nombre del servicio</label><input id="title" name="title" type="text" required maxlength="80" value="${s?.title || ""}" placeholder="Ej.: Primera llamada"></div>
        <div class="field"><label for="description">Descripción</label><textarea id="description" name="description" maxlength="600" style="min-height:90px">${s?.description || ""}</textarea></div>
        <div class="grid2">
          <div class="field"><label for="duration_min">Duración (minutos)</label><input id="duration_min" name="duration_min" type="number" min="15" max="240" step="5" required value="${s?.duration_min || 45}"></div>
          <div class="field"><label for="calls_included">Llamadas incluidas</label><input id="calls_included" name="calls_included" type="number" min="1" max="12" step="1" required value="${s?.calls_included || 1}"></div>
        </div>
        <div class="field"><label for="price">Tu precio total (€)</label><input id="price" name="price" type="number" min="1" step="0.01" required value="${s ? (s.price_cents / 100).toFixed(2) : ""}"><p class="hint">Es el precio que paga quien reserva, por todo el servicio. Vos decidís cuánto.</p></div>
        <div class="field"><label for="includes">Qué incluye (una cosa por línea)</label><textarea id="includes" name="includes" style="min-height:90px">${(s?.includes || []).join("\n")}</textarea></div>
        <label class="check" style="margin-top:14px"><input type="checkbox" name="is_active" ${s ? (s.is_active ? "checked" : "") : "checked"}><span>Visible para reservar</span></label>`,
    });
    if (!r) return;
    const cents = Math.round(Number(r.price) * 100);
    if (!(cents >= 100)) return toast("El precio mínimo es 1 €.", "bad");
    const row = {
      kind: r.kind, title: r.title.trim(), description: r.description.trim() || null, duration_min: Number(r.duration_min), calls_included: Number(r.calls_included),
      price_cents: cents, currency: "EUR", includes: (r.includes || "").split("\n").map((x) => x.trim()).filter(Boolean), is_active: r.is_active === "on",
    };
    const { error } = s ? await sb.from("services").update(row).eq("id", s.id) : await sb.from("services").insert({ ...row, mentor_id: uid });
    if (error) return toast(errMsg(error), "bad");
    toast("Servicio guardado.", "ok"); list = await load(); draw();
  };

  const draw = () => {
    ctx.set(html`<div class="container page"><div class="mid stack-lg">
      <div class="page-head row row--between"><h1>Mis servicios</h1><button class="btn btn--primary btn--sm" id="new">${ico("plus")} Nuevo servicio</button></div>
      ${subnav("/mentor/servicios")}
      ${list.length ? list.map((s) => html`<article class="brow"><div>
          <div class="row" style="gap:8px">${s.is_active ? html`<span class="tag tag--green">Visible</span>` : html`<span class="tag">Pausado</span>`}<span class="tag tag--blue">${KINDS[s.kind]}</span></div>
          <h3 style="margin-top:6px">${s.title}</h3>
          <p class="muted small">${s.duration_min} min${s.calls_included > 1 ? ` · ${s.calls_included} llamadas` : ""} · <strong style="color:var(--navy-900)">${money(s.price_cents, s.currency)}</strong></p>
          ${s.description ? html`<p class="small" style="margin-top:6px">${s.description}</p>` : ""}</div>
          <div class="brow__actions"><button class="btn btn--ghost btn--sm" data-edit="${s.id}">${ico("edit")} Editar</button><button class="btn btn--ghost btn--sm" data-toggle="${s.id}">${s.is_active ? "Pausar" : "Activar"}</button><button class="btn btn--ghost btn--sm" data-del="${s.id}" aria-label="Eliminar ${s.title}">${ico("trash")}</button></div></article>`)
        : html`<div class="empty card"><h3>Todavía no creaste servicios</h3><p style="margin-bottom:16px">Un servicio es lo que ofrecés: por ejemplo una primera llamada de 45 minutos.</p><button class="btn btn--primary" id="new2">Crear mi primer servicio</button></div>`}
    </div></div>`);
    ctx.root.querySelector("#new")?.addEventListener("click", () => editor(null));
    ctx.root.querySelector("#new2")?.addEventListener("click", () => editor(null));
    ctx.root.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => editor(list.find((x) => x.id === b.dataset.edit))));
    ctx.root.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", async () => {
      const s = list.find((x) => x.id === b.dataset.toggle);
      const { error } = await sb.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
      if (error) return toast(errMsg(error), "bad");
      list = await load(); draw();
    }));
    ctx.root.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      const s = list.find((x) => x.id === b.dataset.del);
      if (!(await confirmDialog({ title: "¿Eliminar este servicio?", body: `“${s.title}” dejará de mostrarse. Esta acción no se puede deshacer.`, confirmText: "Eliminar", danger: true }))) return;
      const { error } = await sb.from("services").delete().eq("id", s.id);
      if (error) return toast(/foreign key|violates/i.test(error.message) ? "Este servicio ya tiene reservas: en vez de eliminarlo, pausalo." : errMsg(error), "bad");
      toast("Servicio eliminado.", "ok"); list = await load(); draw();
    }));
  };
  draw();
}

// ------------------------------------------------------------------------------------------ Disponibilidad
const DAYS = [[1, "Lunes"], [2, "Martes"], [3, "Miércoles"], [4, "Jueves"], [5, "Viernes"], [6, "Sábado"], [0, "Domingo"]];
const hhmm = (t) => String(t || "").slice(0, 5);

export async function availability(ctx) {
  ctx.title("Mi disponibilidad");
  const uid = state.user.id;
  const [rulesR, excR, svcR] = await Promise.all([
    sb.from("availability_rules").select("*").eq("mentor_id", uid),
    sb.from("availability_exceptions").select("*").eq("mentor_id", uid).gte("ends_at", new Date().toISOString()).order("starts_at"),
    sb.from("services").select("duration_min").eq("mentor_id", uid).eq("is_active", true).order("duration_min").limit(1),
  ]);
  if (!ctx.alive()) return;
  let rules = rulesR.data || [], exc = excR.data || [];
  let tz = rules[0]?.timezone || TZ;
  const zones = (typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["UTC", "Europe/Dublin", "Europe/Madrid", "Europe/Lisbon", "Europe/Berlin", "America/Argentina/Buenos_Aires"]);
  if (!zones.includes(tz)) zones.unshift(tz);
  const week = new Map(DAYS.map(([d]) => [d, rules.filter((r) => r.weekday === d).map((r) => ({ s: hhmm(r.start_time), e: hhmm(r.end_time) })).sort((a, b) => a.s.localeCompare(b.s))]));
  const minDur = svcR.data?.[0]?.duration_min;

  const draw = () => {
    ctx.set(html`<div class="container page"><div class="mid stack-lg">
      <div class="page-head"><h1>Mi disponibilidad</h1></div>${subnav("/mentor/disponibilidad")}
      <section class="card stack"><h2>Horario semanal</h2>
        <p class="muted small">Marcá las franjas en las que podés dar sesiones. Quien reserva ve los horarios en su propia zona horaria.</p>
        <div class="field"><label for="tz">Tu zona horaria</label><select id="tz">${zones.map((z) => html`<option value="${z}" ${z === tz ? "selected" : ""}>${z.replace(/_/g, " ")}</option>`)}</select></div>
        <div class="weekgrid">${DAYS.map(([d, n]) => html`<div class="wday"><div class="row row--between"><h3>${n}</h3><button type="button" class="btn btn--ghost btn--sm" data-add="${d}">${ico("plus")} Franja</button></div>
          ${week.get(d).length ? week.get(d).map((r, i) => html`<div class="range" style="margin-top:8px"><input type="time" value="${r.s}" data-d="${d}" data-i="${i}" data-f="s" aria-label="${n} desde"><span>a</span><input type="time" value="${r.e}" data-d="${d}" data-i="${i}" data-f="e" aria-label="${n} hasta"><button type="button" class="btn btn--ghost btn--sm" data-rm="${d}:${i}" aria-label="Quitar franja">${ico("x")}</button></div>`) : html`<p class="muted small" style="margin-top:6px">No disponible</p>`}</div>`)}</div>
        <div id="rules-err" class="form-error" role="alert"></div>
        <div><button class="btn btn--primary" id="save-rules" data-busy="Guardando…">Guardar horario</button></div>
      </section>
      <section class="card stack"><h2>Días especiales</h2>
        <p class="muted small">Bloqueá un período (vacaciones, un imprevisto) o sumá un horario extra. Fechas en tu hora local (${tzLabel()}).</p>
        ${exc.length ? exc.map((x) => html`<div class="row" style="gap:10px;border-top:1px solid var(--gray-100);padding-top:10px">${x.kind === "blocked" ? html`<span class="tag tag--red">Bloqueado</span>` : html`<span class="tag tag--green">Horario extra</span>`}<span>${fmtDateTime(x.starts_at)} → ${fmtDateTime(x.ends_at)}</span><span class="spacer"></span><button class="btn btn--ghost btn--sm" data-xdel="${x.id}" aria-label="Quitar">${ico("trash")}</button></div>`) : html`<p class="muted small">No hay días especiales cargados.</p>`}
        <form class="grid2" id="xform" novalidate style="align-items:end">
          <div class="field"><label for="xk">Tipo</label><select id="xk" name="kind"><option value="blocked">Bloquear</option><option value="extra">Horario extra</option></select></div><div></div>
          <div class="field"><label for="xs">Desde</label><input id="xs" name="s" type="datetime-local" required></div>
          <div class="field"><label for="xe">Hasta</label><input id="xe" name="e" type="datetime-local" required></div>
          <div><button class="btn btn--ghost btn--sm" type="submit">${ico("plus")} Agregar</button></div>
        </form>
      </section>
      <section class="card stack"><h2>Cómo lo ven las personas</h2><div id="preview" class="muted small">Cargando…</div></section>
    </div></div>`);
    bind();
    preview();
  };

  const preview = async () => {
    const box = ctx.root.querySelector("#preview"); if (!box) return;
    if (state.mentor.status !== "approved") { box.innerHTML = "Los horarios se muestran al público cuando tu perfil esté aprobado."; return; }
    if (!minDur) { box.innerHTML = "Creá un servicio activo para ver tus próximos horarios."; return; }
    try {
      const sl = await loadSlots(uid, minDur, 14);
      if (!ctx.alive()) return;
      box.innerHTML = sl.length ? `${sl.length} horarios libres en los próximos 14 días. El próximo: <strong>${esc(fmtDateTime(sl[0].start))}</strong>.` : "No hay horarios libres en los próximos 14 días.";
    } catch { if (ctx.alive()) box.innerHTML = "No pudimos calcular la vista previa."; }
  };

  const bind = () => {
    const root = ctx.root;
    root.querySelector("#tz").addEventListener("change", (e) => { tz = e.target.value; });
    root.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => { const d = Number(b.dataset.add); week.get(d).push({ s: "10:00", e: "13:00" }); draw(); }));
    root.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => { const [d, i] = b.dataset.rm.split(":").map(Number); week.get(d).splice(i, 1); draw(); }));
    root.querySelectorAll("input[type=time]").forEach((inp) => inp.addEventListener("change", () => { week.get(Number(inp.dataset.d))[Number(inp.dataset.i)][inp.dataset.f] = inp.value; }));
    root.querySelector("#save-rules").addEventListener("click", (ev) => busy(ev.currentTarget, async () => {
      const errBox = root.querySelector("#rules-err"); errBox.classList.remove("is-on");
      const rows = [];
      for (const [d, arr] of week) {
        const sorted = [...arr].sort((a, b) => a.s.localeCompare(b.s));
        for (let i = 0; i < sorted.length; i++) {
          const r = sorted[i];
          if (!r.s || !r.e || r.e <= r.s) { errBox.textContent = `Revisá las franjas del ${DAYS.find((x) => x[0] === d)[1].toLowerCase()}: la hora de fin tiene que ser posterior a la de inicio.`; errBox.classList.add("is-on"); return; }
          if (i > 0 && sorted[i - 1].e > r.s) { errBox.textContent = `Hay franjas superpuestas el ${DAYS.find((x) => x[0] === d)[1].toLowerCase()}.`; errBox.classList.add("is-on"); return; }
          rows.push({ mentor_id: uid, weekday: d, start_time: r.s, end_time: r.e, timezone: tz });
        }
      }
      const oldIds = rules.map((r) => r.id);
      let inserted = [];
      if (rows.length) { const ins = await sb.from("availability_rules").insert(rows).select("id"); if (ins.error) return toast(errMsg(ins.error), "bad"); inserted = ins.data; }
      if (oldIds.length) { const del = await sb.from("availability_rules").delete().in("id", oldIds); if (del.error) return toast(errMsg(del.error), "bad"); }
      rules = rows.map((r, i) => ({ ...r, id: inserted[i]?.id }));
      toast("Horario guardado.", "ok"); draw();
    }));
    root.querySelectorAll("[data-xdel]").forEach((b) => b.addEventListener("click", async () => {
      const { error } = await sb.from("availability_exceptions").delete().eq("id", b.dataset.xdel);
      if (error) return toast(errMsg(error), "bad");
      exc = exc.filter((x) => x.id !== b.dataset.xdel); draw();
    }));
    root.querySelector("#xform").addEventListener("submit", async (ev) => {
      ev.preventDefault(); const d = formData(ev.target);
      if (!d.s || !d.e) return toast("Completá desde y hasta.", "bad");
      const s = new Date(d.s), e = new Date(d.e);
      if (!(e > s)) return toast("El fin tiene que ser posterior al inicio.", "bad");
      const { data, error } = await sb.from("availability_exceptions").insert({ mentor_id: uid, kind: d.kind, starts_at: s.toISOString(), ends_at: e.toISOString() }).select().single();
      if (error) return toast(errMsg(error), "bad");
      exc = [...exc, data].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)); toast("Agregado.", "ok"); draw();
    });
  };
  draw();
}

// ------------------------------------------------------------------------------------------ Reservas del mentor
export async function bookings(ctx) {
  ctx.title("Reservas");
  ctx.set(html`<div class="container page"><div class="skeleton" style="height:260px"></div></div>`);
  const uid = state.user.id;
  const { data: bs } = await sb.from("bookings").select("*").eq("mentor_id", uid).in("status", ["confirmed", "completed", "cancelled_by_traveler", "cancelled_by_mentor"]).order("created_at", { ascending: false });
  if (!ctx.alive()) return;
  const ids = (bs || []).map((b) => b.id);
  const tids = [...new Set((bs || []).map((b) => b.traveler_id))];
  const [ss, ps] = await Promise.all([
    ids.length ? sb.from("sessions").select("*").in("booking_id", ids) : { data: [] },
    tids.length ? sb.from("profiles").select("id,full_name").in("id", tids) : { data: [] },
  ]);
  const by = new Map(); (ss.data || []).forEach((x) => { if (!by.has(x.booking_id)) by.set(x.booking_id, []); by.get(x.booking_id).push(x); });
  const names = new Map((ps.data || []).map((p) => [p.id, p.full_name]));
  const TABS = [["active", "Próximas"], ["done", "Completadas"], ["closed", "Canceladas"]];
  let tab = ctx.query.tab || "active";
  const draw = () => {
    const rows = (bs || []).filter((b) => groupOf(b) === tab);
    ctx.set(html`<div class="container page"><div class="mid stack-lg">
      <div class="page-head"><h1>Reservas</h1></div>${subnav("/mentor/reservas")}
      <div class="tabs" role="tablist">${TABS.map(([k, n]) => html`<button role="tab" data-tab="${k}" aria-selected="${k === tab}">${n} (${(bs || []).filter((b) => groupOf(b) === k).length})</button>`)}</div>
      ${rows.length ? bookingRows(rows, by, (b) => `Con ${names.get(b.traveler_id) || "viajero/a"}`) : html`<div class="empty card"><h3>Todavía no hay reservas acá</h3><p>Cuando alguien reserve una sesión con vos, la vas a ver en esta lista.</p></div>`}
    </div></div>`);
    ctx.root.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; draw(); }));
  };
  draw();
}

// ------------------------------------------------------------------------------------------ Cobros
export async function payouts(ctx) {
  ctx.title("Cobros");
  const uid = state.user.id;
  ctx.set(html`<div class="container page"><div class="skeleton" style="height:260px"></div></div>`);
  let status = null, statusErr = null;
  const refreshStatus = async () => {
    if (!state.mentor.stripe_account_id) { status = { has_account: false, ready: false }; return; }
    try { status = await callFn("connect-onboarding", { action: "status" }); await refreshAll(); }
    catch (e) { statusErr = errMsg(e); status = { has_account: true, ready: state.mentor.payouts_enabled }; }
  };
  await refreshStatus();
  const { data: tr } = await sb.from("transfers").select("*").eq("mentor_id", uid).order("id");
  const sids = (tr || []).map((t) => t.session_id);
  const { data: ss } = sids.length ? await sb.from("sessions").select("id,starts_at").in("id", sids) : { data: [] };
  if (!ctx.alive()) return;
  const when = new Map((ss || []).map((s) => [s.id, s.starts_at]));
  const sum = (st) => (tr || []).filter((t) => t.status === st).reduce((a, t) => a + t.amount_cents, 0);
  const ready = status?.ready;

  ctx.set(html`<div class="container page"><div class="mid stack-lg">
    <div class="page-head"><h1>Cobros</h1></div>${subnav("/mentor/cobros")}
    ${ctx.query.retorno && !ready ? html`<div class="notice notice--warn">${ico("info")}<span>Volviste desde Stripe, pero todavía faltan datos por completar. Podés retomar donde lo dejaste.</span></div>` : ""}
    ${statusErr ? html`<div class="notice notice--bad">${ico("alert")}<span>${statusErr}</span></div>` : ""}
    <section class="card stack"><h2>Cuenta de cobros (Stripe)</h2>
      ${ready ? html`<div class="notice notice--ok">${ico("check")}<span>Tu cuenta de cobros está lista. Ya pueden reservar con vos y vas a recibir tus pagos.</span></div>`
        : status?.has_account ? html`<div class="notice notice--warn">${ico("clock")}<span>Tu cuenta de Stripe está creada pero incompleta o en revisión. ${(status.pending || []).length ? `Falta completar ${status.pending.length} dato${status.pending.length > 1 ? "s" : ""}.` : ""}</span></div>`
        : html`<p>Para recibir el dinero de tus sesiones necesitás una cuenta de cobros en Stripe. Stripe te pide tus datos y una cuenta bancaria; RedEmigra nunca ve esos datos.</p>`}
      <div class="row">
        ${!ready ? html`<button class="btn btn--primary" id="start" data-busy="Abriendo Stripe…">${status?.has_account ? "Completar datos en Stripe" : "Configurar cobros"} ${ico("external")}</button>` : html`<button class="btn btn--ghost" id="dash" data-busy="Abriendo…">Abrir mi panel de Stripe ${ico("external")}</button>`}
        ${status?.has_account ? html`<button class="btn btn--ghost btn--sm" id="recheck" data-busy="Comprobando…">Actualizar estado</button>` : ""}
      </div>
      <p class="small muted">El país de tu cuenta de Stripe es el país donde vivís (${countryName(state.mentor.residence_country)}), y tiene que coincidir con el de tu cuenta bancaria.</p>
    </section>
    <section class="card"><h2>Mis pagos</h2>
      <div class="statgrid"><div class="stat"><strong>${money(sum("pending"))}</strong><span>Pendiente de enviarte</span></div><div class="stat"><strong>${money(sum("paid"))}</strong><span>Enviado a tu cuenta</span></div></div>
      <p class="small muted" style="margin-bottom:12px">El pago de cada sesión se libera cuando quien reservó confirma que se realizó${state.settings.auto_complete_hours ? `, o automáticamente ${state.settings.auto_complete_hours} horas después de terminar si no hay reclamos` : ""}.</p>
      ${(tr || []).length ? html`<div class="table-wrap"><table><thead><tr><th>Sesión</th><th>Importe</th><th>Estado</th></tr></thead><tbody>${tr.map((t) => html`<tr><td>${when.get(t.session_id) ? fmtDateTime(when.get(t.session_id)) : "—"}</td><td>${money(t.amount_cents)}</td><td>${tag(TRANSFER, t.status)}${t.released_at ? html` <span class="muted small">${fmtShort(t.released_at)}</span>` : ""}</td></tr>`)}</tbody></table></div>` : html`<p class="muted">Todavía no tenés pagos. Van a aparecer acá cuando completes tu primera sesión.</p>`}
    </section>
  </div></div>`);

  const startBtn = ctx.root.querySelector("#start");
  startBtn?.addEventListener("click", () => busy(startBtn, async () => {
    try { const r = await callFn("connect-onboarding", { action: "start" }); location.assign(r.url); return new Promise(() => {}); }
    catch (e) { toast(errMsg(e), "bad"); }
  }));
  const dash = ctx.root.querySelector("#dash");
  dash?.addEventListener("click", () => busy(dash, async () => {
    try { const r = await callFn("connect-onboarding", { action: "dashboard" }); window.open(r.url, "_blank", "noopener"); }
    catch (e) { toast(errMsg(e), "bad"); }
  }));
  const rc = ctx.root.querySelector("#recheck");
  rc?.addEventListener("click", () => busy(rc, async () => { await payouts(ctx); }));
}
