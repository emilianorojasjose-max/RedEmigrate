// Mi cuenta y Mis reservas (del viajero).
import { sb, state, html, ico, avatar, money, fmtDateTime, fmtShort, esc, toast, errMsg, busy, formData, showFormError, LANGS, countryName, tzLabel } from "../lib/core.js";
import { BOOKING, tag } from "../lib/labels.js";
import { refreshAll } from "../lib/session.js";
import { uploadAvatar } from "../lib/image.js";

export async function account(ctx) {
  ctx.title("Mi cuenta");
  const p = state.profile;
  if (!p) return ctx.set(html`<div class="container page"><div class="empty card"><h1>No pudimos cargar tu perfil</h1><button class="btn btn--primary" onclick="location.reload()">Reintentar</button></div></div>`);
  const dests = state.countries.filter((c) => c.is_destination);

  ctx.set(html`
  <div class="container page"><div class="mid stack-lg">
    <div class="page-head"><h1>Mi cuenta</h1><p>${state.user.email}</p></div>
    <form class="card stack" id="f" novalidate>
      <h2>Mis datos</h2>
      <div class="row" style="gap:18px"><div id="ava">${avatar(p.full_name, p.avatar_url, null, "avatar--lg")}</div>
        <div><label class="btn btn--ghost btn--sm" for="photo">Cambiar foto</label><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only"><p class="hint small muted" style="margin-top:6px">JPG, PNG o WebP.</p></div></div>
      <div class="field"><label for="full_name">Nombre y apellido</label><input id="full_name" name="full_name" type="text" required maxlength="80" value="${p.full_name}"></div>
      <div class="grid2">
        <div class="field"><label for="origin_country">País de origen</label><select id="origin_country" name="origin_country"><option value="">—</option>${state.countries.map((c) => html`<option value="${c.code}" ${c.code === p.origin_country ? "selected" : ""}>${c.name_es}</option>`)}</select></div>
        <div class="field"><label for="target_country">País al que quiero ir</label><select id="target_country" name="target_country"><option value="">—</option>${dests.map((c) => html`<option value="${c.code}" ${c.code === p.target_country ? "selected" : ""}>${c.name_es}</option>`)}</select></div>
      </div>
      <div class="field"><span class="label">Idiomas que hablo</span><div class="chips-input">${LANGS.map(([c, n]) => html`<label><input type="checkbox" name="languages" value="${c}" ${(p.languages || []).includes(c) ? "checked" : ""}>${n}</label>`)}</div></div>
      <p class="small muted">Zona horaria detectada: ${tzLabel()}. Los horarios de las sesiones se muestran en tu zona.</p>
      <div><button class="btn btn--primary" type="submit" data-busy="Guardando…">Guardar cambios</button></div>
    </form>

    <form class="card stack" id="pw" novalidate>
      <h2>Cambiar contraseña</h2>
      <div class="grid2"><div class="field"><label for="p1">Contraseña nueva</label><input id="p1" name="p1" type="password" autocomplete="new-password" minlength="8"></div>
        <div class="field"><label for="p2">Repetila</label><input id="p2" name="p2" type="password" autocomplete="new-password"></div></div>
      <div><button class="btn btn--ghost" type="submit" data-busy="Guardando…">Actualizar contraseña</button></div>
    </form>
    <div class="card"><h2>Mentoría</h2>
      ${state.mentor ? html`<p>Tenés un perfil de mentor. <a href="/mentor/onboarding">Ir a mi panel</a></p>` : html`<p>¿Ya vivís afuera? Podés compartir tu experiencia y recibir reservas. <a href="/mentor/perfil">Crear mi perfil de mentor</a></p>`}
    </div>
  </div></div>`);

  const form = ctx.root.querySelector("#f");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault(); showFormError(form, "");
    const d = formData(form);
    const langs = [...form.querySelectorAll("input[name=languages]:checked")].map((i) => i.value);
    if (!d.full_name.trim()) return showFormError(form, "El nombre no puede quedar vacío.");
    await busy(form.querySelector("button[type=submit]"), async () => {
      const { error } = await sb.from("profiles").update({ full_name: d.full_name.trim(), origin_country: d.origin_country || null, target_country: d.target_country || null, languages: langs }).eq("id", state.user.id);
      if (error) return showFormError(form, errMsg(error));
      await refreshAll(); toast("Datos guardados.", "ok");
    });
  });
  ctx.root.querySelector("#photo").addEventListener("change", async (ev) => {
    const f = ev.target.files?.[0]; if (!f) return;
    try {
      const url = await uploadAvatar(sb, state.user.id, f);
      const { error } = await sb.from("profiles").update({ avatar_url: url }).eq("id", state.user.id);
      if (error) throw error;
      await refreshAll(); toast("Foto actualizada.", "ok");
      ctx.root.querySelector("#ava").innerHTML = avatar(state.profile.full_name, url, null, "avatar--lg").toString();
    } catch (e) { toast(errMsg(e), "bad"); }
  });
  const pw = ctx.root.querySelector("#pw");
  pw.addEventListener("submit", async (ev) => {
    ev.preventDefault(); showFormError(pw, "");
    const d = formData(pw);
    if ((d.p1 || "").length < 8) return showFormError(pw, "La contraseña debe tener al menos 8 caracteres.");
    if (d.p1 !== d.p2) return showFormError(pw, "Las contraseñas no coinciden.");
    await busy(pw.querySelector("button[type=submit]"), async () => {
      const { error } = await sb.auth.updateUser({ password: d.p1 });
      if (error) return showFormError(pw, errMsg(error));
      pw.reset(); toast("Contraseña actualizada.", "ok");
    });
  });
}

// Lista de reservas (la usan el viajero y el mentor)
export function bookingRows(bookings, sessionsByBooking, nameOf) {
  return bookings.map((b) => {
    const ss = sessionsByBooking.get(b.id) || [];
    const next = ss.filter((x) => x.status === "scheduled").sort((a, c) => new Date(a.starts_at) - new Date(c.starts_at))[0] || ss[0];
    return html`<article class="brow">
      <div><div class="row" style="gap:8px">${tag(BOOKING, b.status)}<span class="muted small">${fmtShort(b.created_at)}</span></div>
        <h3 style="margin-top:6px">${b.service_title || "Sesión de mentoría"}</h3>
        <p class="muted small">${nameOf(b)}${next ? html` · <span>${fmtDateTime(next.starts_at)}</span>` : ""}${b.calls_included > 1 ? ` · ${ss.filter((x) => x.status !== "cancelled").length}/${b.calls_included} llamadas agendadas` : ""}</p></div>
      <div class="brow__actions"><span class="price">${money(b.price_cents, b.currency)}</span><a class="btn btn--ghost btn--sm" href="/reservas/${b.id}">Ver detalle</a></div>
    </article>`;
  });
}
export const groupOf = (b) => (b.status === "confirmed" || (b.status === "pending_payment" && (!b.expires_at || new Date(b.expires_at) > new Date()))) ? "active" : b.status === "completed" ? "done" : "closed";

export async function bookings(ctx) {
  ctx.title("Mis reservas");
  ctx.set(html`<div class="container page"><div class="skeleton" style="height:260px"></div></div>`);
  const { data: bs, error } = await sb.from("bookings").select("*").eq("traveler_id", state.user.id).order("created_at", { ascending: false });
  if (!ctx.alive()) return;
  if (error) return ctx.set(html`<div class="container page"><div class="notice notice--bad">No pudimos cargar tus reservas.</div></div>`);
  const ids = (bs || []).map((b) => b.id);
  const { data: ss } = ids.length ? await sb.from("sessions").select("*").in("booking_id", ids) : { data: [] };
  if (!ctx.alive()) return;
  const by = new Map(); (ss || []).forEach((x) => { if (!by.has(x.booking_id)) by.set(x.booking_id, []); by.get(x.booking_id).push(x); });

  const TABS = [["active", "Activas"], ["done", "Completadas"], ["closed", "Canceladas y vencidas"]];
  let tab = ctx.query.tab || "active";
  const draw = () => {
    const rows = (bs || []).filter((b) => groupOf(b) === tab);
    ctx.set(html`<div class="container page"><div class="mid">
      <div class="page-head row row--between"><h1>Mis reservas</h1><a class="btn btn--primary btn--sm" href="/mentores">${ico("search")} Buscar mentores</a></div>
      <div class="tabs" role="tablist">${TABS.map(([k, n]) => html`<button role="tab" data-tab="${k}" aria-selected="${k === tab}">${n} (${(bs || []).filter((b) => groupOf(b) === k).length})</button>`)}</div>
      ${rows.length ? bookingRows(rows, by, (b) => `Con ${b.mentor_name || "tu mentor"}`)
        : html`<div class="empty card"><h3>${tab === "active" ? "No tenés reservas activas" : "No hay nada por acá"}</h3>${tab === "active" ? html`<p style="margin-bottom:16px">Encontrá a alguien que ya vive donde querés vivir.</p><a class="btn btn--primary btn--sm" href="/mentores">Ver mentores</a>` : ""}</div>`}
    </div></div>`);
    ctx.root.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => { tab = b.dataset.tab; draw(); }));
  };
  draw();
}
