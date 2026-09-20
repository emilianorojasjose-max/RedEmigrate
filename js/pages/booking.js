// Reserva y pago, confirmación, detalle de la reserva y reseña.
import { sb, state, html, ico, avatar, money, fmtDateTime, fmtDay, fmtTime, fmtShort, esc, dialog, confirmDialog, toast, errMsg, callFn, busy, formData, showFormError, countryName } from "../lib/core.js";
import { loadSlots, slotPicker } from "../lib/slots.js";
import { BOOKING, SESSION, tag } from "../lib/labels.js";
import { refreshAll } from "../lib/session.js";

const refundHours = () => Number(state.settings.cancel_full_refund_hours || 24);

export function policyText() {
  const h = refundHours();
  return `Podés cancelar y recibir el reembolso total hasta ${h} horas antes de la sesión. Con menos anticipación, no hay reembolso. Si el mentor cancela, te devolvemos todo.`;
}

// ---------------------------------------------------------------------------- /reservar/:service
export async function book(ctx) {
  ctx.set(html`<div class="container page"><div class="skeleton" style="height:320px"></div></div>`);
  const { data: s } = await sb.from("services").select("*").eq("id", ctx.params.service).maybeSingle();
  if (!ctx.alive()) return;
  const { data: m } = s ? await sb.from("mentor_profiles").select("*").eq("user_id", s.mentor_id).maybeSingle() : { data: null };
  if (!ctx.alive()) return;
  if (!s || !m) return ctx.set(html`<div class="container page"><div class="empty card"><h1>Este servicio no está disponible</h1><p style="margin:12px 0 20px">Puede que el mentor lo haya pausado.</p><a class="btn btn--primary" href="/mentores">Ver mentores</a></div></div>`);
  ctx.title(`Reservar con ${m.display_name}`);

  if (m.user_id === state.user.id) return ctx.set(html`<div class="container page"><div class="empty card"><h1>Este es tu propio servicio</h1><p style="margin:12px 0 20px">No podés reservarte a vos mismo.</p><a class="btn btn--primary" href="/mentor/servicios">Administrar mis servicios</a></div></div>`);
  if (m.is_example) return ctx.set(html`<div class="container page"><div class="empty card"><h1>Perfil de ejemplo</h1><p style="margin:12px 0 20px">Este perfil sirve para mostrar cómo se ve la plataforma y no se puede reservar.</p><a class="btn btn--primary" href="/mentores">Ver mentores</a></div></div>`);

  let slots = [];
  try { slots = await loadSlots(m.user_id, s.duration_min); } catch (e) { console.error(e); }
  if (!ctx.alive()) return;

  const resumeId = ctx.query.cancelado ? ctx.query.booking : null;
  ctx.set(html`
  <div class="container page">
    <p class="small"><a href="/mentores/${m.slug}">← Volver al perfil de ${m.display_name}</a></p>
    <div class="page-head" style="margin-top:8px"><h1>Elegí día y horario</h1></div>
    ${resumeId ? html`<div class="notice notice--warn" style="margin-bottom:18px">${ico("info")}<div><strong>Cancelaste el pago.</strong> Tu horario sigue reservado por unos minutos.
      <div style="margin-top:8px"><button class="btn btn--primary btn--sm" id="resume">Retomar el pago</button></div></div></div>` : ""}
    <div class="profile-cols">
      <section class="card"><h2>Horarios disponibles</h2><div id="picker"></div></section>
      <aside class="stack sticky">
        <section class="card summary">
          <div class="row" style="gap:12px;margin-bottom:14px">${avatar(m.display_name, m.avatar_url, m.residence_country, "avatar--sm")}<div><strong style="color:var(--navy-900)">${m.display_name}</strong><div class="muted small">${countryName(m.origin_country)} → ${countryName(m.residence_country)}</div></div></div>
          <dl>
            <dt>Servicio</dt><dd>${s.title}</dd>
            <dt>Duración</dt><dd>${s.duration_min} min</dd>
            ${s.calls_included > 1 ? html`<dt>Llamadas incluidas</dt><dd>${s.calls_included}</dd>` : ""}
            <dt>Horario</dt><dd id="sum-when" class="muted">Elegí uno</dd>
          </dl>
          <dl class="total" style="margin-top:8px"><dt style="color:var(--navy-900)">Total</dt><dd>${money(s.price_cents, s.currency)}</dd></dl>
          ${s.calls_included > 1 ? html`<p class="small muted" style="margin-top:10px">Reservás ahora la primera llamada. Las otras las agendás desde tu reserva cuando quieras.</p>` : ""}
        </section>
        <form class="card stack" id="pay-form" novalidate>
          <label class="check"><input type="checkbox" name="ok" required><span>Entiendo que RedEmigra ofrece acompañamiento basado en experiencia personal y <strong>no reemplaza el asesoramiento legal, migratorio o financiero</strong>. Acepto los <a href="/legal/terminos" target="_blank" rel="noopener">Términos</a> y las <a href="/legal/cancelaciones" target="_blank" rel="noopener">reglas de cancelación</a>.</span></label>
          <p class="small muted">${policyText()}</p>
          <button class="btn btn--primary btn--block" type="submit" id="pay" disabled data-busy="Llevándote al pago…">${ico("lock")} Pagar ${money(s.price_cents, s.currency)}</button>
          <p class="small muted" style="display:flex;gap:8px;align-items:flex-start">${ico("card")}<span>El pago se hace en la página segura de Stripe (tarjeta, Google Pay y otros medios disponibles en tu dispositivo). RedEmigra no ve los datos de tu tarjeta.</span></p>
        </form>
      </aside>
    </div>
  </div>`);

  const payBtn = ctx.root.querySelector("#pay");
  const form = ctx.root.querySelector("#pay-form");
  const when = ctx.root.querySelector("#sum-when");
  let picked = null;
  const sync = () => { payBtn.disabled = !(picked && form.ok.checked); };
  const picker = slotPicker(ctx.root.querySelector("#picker"), slots, (sl) => {
    picked = sl;
    when.textContent = sl ? `${fmtDay(sl.start)}, ${fmtTime(sl.start)}` : "Elegí uno";
    when.className = sl ? "" : "muted";
    sync();
  });
  form.ok.addEventListener("change", sync);

  const go = async (body) => {
    try {
      const r = await callFn("create-checkout", body);
      if (r.already_paid) { toast("Tu pago ya estaba acreditado. ¡Reserva confirmada!"); await refreshAll(); return ctx.go(`/reservas/${r.booking_id}`); }
      location.assign(r.url);
      return new Promise(() => {});           // la página se va: se deja el botón "cargando"
    } catch (e) {
      toast(errMsg(e), "bad");
      if (e.code === "horario_no_disponible") {
        try { slots = await loadSlots(m.user_id, s.duration_min); picked = null; when.textContent = "Elegí uno"; ctx.root.querySelector("#picker") && slotPicker(ctx.root.querySelector("#picker"), slots, (sl) => { picked = sl; when.textContent = sl ? `${fmtDay(sl.start)}, ${fmtTime(sl.start)}` : "Elegí uno"; sync(); }); sync(); } catch { /* */ }
      }
    }
  };
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (!picked || !form.ok.checked) return;
    busy(payBtn, () => go({ service_id: s.id, starts_at: picked.start }));
  });
  ctx.root.querySelector("#resume")?.addEventListener("click", (ev) => busy(ev.currentTarget, () => go({ booking_id: resumeId })));
}

// ---------------------------------------------------------------------------- /reservas/exito
export async function success(ctx) {
  ctx.title("Reserva");
  const id = ctx.query.booking;
  if (!id) return ctx.go("/cuenta/reservas", { replace: true });
  ctx.set(html`<div class="container page"><div class="narrow"><div class="card stack" style="text-align:center"><div class="skeleton" style="height:120px"></div><p class="muted">Confirmando tu pago…</p></div></div></div>`);

  let b = null;
  for (let i = 0; i < 12 && ctx.alive(); i++) {
    if (i === 0 || (b && b.status === "pending_payment")) { try { await callFn("sync-checkout", { booking_id: id }); } catch (e) { console.warn("sync-checkout", e.code); } }
    const r = await sb.from("bookings").select("*").eq("id", id).maybeSingle();
    b = r.data;
    if (!b || b.status !== "pending_payment") break;
    await new Promise((r2) => setTimeout(r2, 2000));
  }
  if (!ctx.alive()) return;
  if (!b) return ctx.go("/cuenta/reservas", { replace: true });

  const [{ data: ses }, { data: conv }] = await Promise.all([
    sb.from("sessions").select("*").eq("booking_id", id).order("starts_at"),
    sb.from("conversations").select("id").eq("traveler_id", b.traveler_id).eq("mentor_id", b.mentor_id).maybeSingle(),
  ]);
  await refreshAll();
  if (!ctx.alive()) return;

  if (b.status === "confirmed" || b.status === "completed") {
    const first = ses?.find((x) => x.status === "scheduled") || ses?.[0];
    ctx.set(html`<div class="container page"><div class="narrow"><div class="card stack">
      <div class="notice notice--ok">${ico("check")}<strong>¡Reserva confirmada!</strong></div>
      <h1>${b.service_title || "Tu sesión"}</h1>
      <p>con <strong>${b.mentor_name || "tu mentor"}</strong>${first ? html`<br>${fmtDateTime(first.starts_at)} (${b.duration_min} min)` : ""}</p>
      <p class="muted small">El mentor te va a compartir el enlace de la videollamada. Lo vas a ver en el detalle de tu reserva. Podés escribirle por chat para coordinar.</p>
      <div class="row"><a class="btn btn--primary" href="/reservas/${b.id}">Ver mi reserva</a>${conv ? html`<a class="btn btn--ghost" href="/mensajes/${conv.id}">${ico("chat")} Escribirle al mentor</a>` : ""}</div>
    </div></div></div>`);
  } else if (b.status === "pending_payment") {
    ctx.set(html`<div class="container page"><div class="narrow"><div class="card stack">
      <div class="notice notice--warn">${ico("clock")}<span>Todavía no recibimos la confirmación del pago. Puede tardar unos minutos.</span></div>
      <p>Si ya pagaste, tu reserva aparecerá confirmada en cuanto Stripe nos avise. Si no pagaste, podés retomar el pago desde tu reserva.</p>
      <div class="row"><a class="btn btn--primary" href="/reservas/${b.id}">Ver mi reserva</a><button class="btn btn--ghost" onclick="location.reload()">Volver a comprobar</button></div>
    </div></div></div>`);
  } else {
    ctx.set(html`<div class="container page"><div class="narrow"><div class="card stack">
      <div class="notice notice--bad">${ico("alert")}<span>Esta reserva ya no está activa (${BOOKING[b.status]?.[0] || b.status}). Si se te cobró, el importe se te devuelve automáticamente.</span></div>
      <a class="btn btn--primary" href="/cuenta/reservas">Mis reservas</a>
    </div></div></div>`);
  }
}

// ---------------------------------------------------------------------------- /reservas/:id
export async function detail(ctx) {
  const id = ctx.params.id;
  ctx.set(html`<div class="container page"><div class="skeleton" style="height:320px"></div></div>`);
  let timer = null;
  ctx.onLeave(() => timer && clearInterval(timer));

  async function draw() {
    const uid = state.user.id;
    const { data: b } = await sb.from("bookings").select("*").eq("id", id).maybeSingle();
    if (!ctx.alive()) return;
    if (!b) return ctx.set(html`<div class="container page"><div class="empty card"><h1>No encontramos esta reserva</h1><a class="btn btn--primary" href="/cuenta/reservas" style="margin-top:16px">Mis reservas</a></div></div>`);
    const role = uid === b.traveler_id ? "traveler" : uid === b.mentor_id ? "mentor" : "admin";
    ctx.title(b.service_title || "Reserva");

    const [ses, pay, rev, conv, other] = await Promise.all([
      sb.from("sessions").select("*").eq("booking_id", id).order("starts_at"),
      role !== "mentor" ? sb.from("payments").select("*").eq("booking_id", id).maybeSingle() : Promise.resolve({ data: null }),
      sb.from("reviews").select("id").eq("booking_id", id).maybeSingle(),
      sb.from("conversations").select("id").eq("traveler_id", b.traveler_id).eq("mentor_id", b.mentor_id).maybeSingle(),
      role === "mentor" ? sb.from("profiles").select("full_name").eq("id", b.traveler_id).maybeSingle() : sb.from("mentor_profiles").select("display_name,slug,avatar_url").eq("user_id", b.mentor_id).maybeSingle(),
    ]);
    if (!ctx.alive()) return;
    const sessions = ses.data || [];
    const now = Date.now();
    const otherName = role === "mentor" ? (other.data?.full_name || "Viajero/a") : (other.data?.display_name || b.mentor_name || "Mentor");
    const used = sessions.filter((x) => x.status !== "cancelled").length;
    const credits = Math.max(0, (b.calls_included || 1) - used);

    ctx.set(html`
    <div class="container page"><div class="mid stack-lg">
      <p class="small"><a href="${role === "mentor" ? "/mentor/reservas" : "/cuenta/reservas"}">← Volver a las reservas</a></p>
      <section class="card">
        <div class="row row--between" style="align-items:flex-start">
          <div><h1>${b.service_title || "Sesión de mentoría"}</h1>
            <p class="muted" style="margin-top:6px">${role === "mentor" ? "Con" : "Mentor:"} <strong>${otherName}</strong>${role !== "mentor" && other.data?.slug ? html` · <a href="/mentores/${other.data.slug}">ver perfil</a>` : ""}</p></div>
          <div style="text-align:right">${tag(BOOKING, b.status)}<div class="price" style="margin-top:8px">${money(b.price_cents, b.currency)}</div></div>
        </div>
        ${b.status === "pending_payment" && role === "traveler" ? html`<div class="notice notice--warn" style="margin-top:16px">${ico("clock")}<div><strong>Falta pagar.</strong> Tu horario está reservado por <span class="countdown" id="cd"></span>.
          <div style="margin-top:8px"><button class="btn btn--primary btn--sm" id="resume">Pagar ahora</button></div></div></div>` : ""}
        ${b.cancel_reason ? html`<p class="small muted" style="margin-top:12px">Motivo: ${b.cancel_reason}</p>` : ""}
        ${pay.data && pay.data.refunded_cents > 0 ? html`<div class="notice notice--ok" style="margin-top:14px">${ico("check")}<span>Se reembolsaron ${money(pay.data.refunded_cents, b.currency)}. Puede tardar unos días en verse en tu tarjeta.</span></div>` : ""}
      </section>

      <section class="card"><h2>${(b.calls_included || 1) > 1 ? `Sesiones (${used} de ${b.calls_included} agendadas)` : "Sesión"}</h2>
        ${sessions.length ? sessions.map((x) => {
          const ended = new Date(x.ends_at).getTime() <= now;
          const started = new Date(x.starts_at).getTime() <= now;
          return html`<div class="sess" data-sess="${x.id}">
            <div style="flex:1;min-width:220px"><strong style="color:var(--navy-900)">${fmtDay(x.starts_at)}</strong><br>${fmtTime(x.starts_at)} – ${fmtTime(x.ends_at)}</div>
            ${tag(SESSION, x.status)}
            ${x.status === "scheduled" && b.status === "confirmed" ? html`
              ${x.meeting_url ? html`<a class="btn btn--primary btn--sm" href="${x.meeting_url}" target="_blank" rel="noopener noreferrer">${ico("video")} Unirse a la videollamada</a>` : role === "traveler" ? html`<span class="muted small">El mentor todavía no cargó el enlace de la videollamada.</span>` : ""}
              ${role === "mentor" ? html`<form class="row" data-meet="${x.id}" style="flex:1 1 100%"><input type="url" name="url" placeholder="https://… enlace de tu videollamada" value="${x.meeting_url || ""}" style="flex:1;min-width:200px" aria-label="Enlace de la videollamada"><button class="btn btn--ghost btn--sm" type="submit">Guardar enlace</button></form>` : ""}
              ${!started || role === "admin" ? html`<button class="btn btn--ghost btn--sm" data-cancel="${x.id}">Cancelar</button>` : ""}
              ${ended && role === "traveler" ? html`<button class="btn btn--navy btn--sm" data-done="${x.id}">${ico("check")} Confirmar que se realizó</button>` : ""}
              ${ended && role === "mentor" ? html`<span class="muted small">Quien reservó confirma la sesión y se libera tu pago${state.settings.auto_complete_hours ? `; si no lo hace, se confirma sola a las ${state.settings.auto_complete_hours} h` : ""}.</span>` : ""}` : ""}
          </div>`;
        }) : html`<p class="muted">Todavía no hay sesiones programadas.</p>`}
        ${role === "traveler" && b.status === "confirmed" && credits > 0 ? html`<div style="margin-top:14px"><button class="btn btn--primary btn--sm" id="extra">${ico("plus")} Agendar otra llamada (${credits} disponible${credits > 1 ? "s" : ""})</button></div>` : ""}
      </section>

      <div class="row">
        ${conv.data ? html`<a class="btn btn--ghost" href="/mensajes/${conv.data.id}">${ico("chat")} Ir al chat</a>` : ""}
        ${role === "traveler" && b.status === "completed" && !rev.data ? html`<a class="btn btn--primary" href="/reservas/${b.id}/resena">${ico("star")} Dejar una reseña</a>` : ""}
        ${rev.data ? html`<span class="tag tag--green">${ico("check")} Reseña enviada</span>` : ""}
        ${role === "traveler" && ["confirmed", "completed"].includes(b.status) ? html`<button class="btn btn--link small" id="problem">${ico("flag")} Reportar un problema</button>` : ""}
      </div>
      ${role !== "mentor" && pay.data ? html`<p class="small muted">Pago: ${money(pay.data.amount_cents, pay.data.currency)} · ${{ succeeded: "cobrado", refunded: "reembolsado", partially_refunded: "reembolsado parcialmente", failed: "fallido", requires_payment: "pendiente" }[pay.data.status] || pay.data.status}</p>` : ""}
    </div></div>`);

    // ---- cuenta regresiva del bloqueo
    if (b.status === "pending_payment" && b.expires_at) {
      const el = ctx.root.querySelector("#cd");
      const tick = () => {
        const left = Math.max(0, Math.floor((new Date(b.expires_at) - Date.now()) / 1000));
        if (el) el.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
        if (left === 0) { clearInterval(timer); draw(); }
      };
      tick(); timer = setInterval(tick, 1000);
    }

    // ---- acciones
    ctx.root.querySelector("#resume")?.addEventListener("click", (e) => busy(e.currentTarget, async () => {
      try {
        const r = await callFn("create-checkout", { booking_id: b.id });
        if (r.already_paid) { toast("Tu pago ya estaba acreditado. ¡Reserva confirmada!"); await refreshAll(); return ctx.go(`/reservas/${b.id}`); }
        location.assign(r.url); return new Promise(() => {});
      }
      catch (err) { toast(errMsg(err), "bad"); draw(); }
    }));

    ctx.root.querySelectorAll("[data-meet]").forEach((f) => f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const url = f.url.value.trim();
      if (url && !/^https:\/\/[^\s]+$/i.test(url)) return toast("El enlace tiene que empezar con https://", "bad");
      const { error } = await sb.from("sessions").update({ meeting_url: url || null }).eq("id", f.dataset.meet);
      if (error) toast(errMsg(error), "bad"); else { toast("Enlace guardado.", "ok"); draw(); }
    }));

    ctx.root.querySelectorAll("[data-cancel]").forEach((btn) => btn.addEventListener("click", async () => {
      const sid = btn.dataset.cancel;
      let q;
      try { q = await callFn("session-actions", { action: "quote", session_id: sid }); } catch (e) { return toast(errMsg(e), "bad"); }
      if (!q.allowed) return toast(errMsg(q.reason), "bad");
      const refundLine = !q.whole_booking
        ? "Esta sesión se cancela y esa llamada vuelve a quedar disponible para que la agendes de nuevo. No se hace un reembolso por sesión."
        : q.refund_cents > 0 ? `Se te reembolsa ${money(q.refund_cents, b.currency)}.` : `Cancelás con menos de ${q.window_hours} horas de anticipación: no corresponde reembolso.`;
      const forWho = q.role === "mentor" ? "Vas a cancelar esta sesión. Quien reservó recibirá el reembolso total." : q.role === "admin" ? "Vas a cancelar esta sesión como administrador. Se reembolsa el total." : refundLine;
      const r = await dialog({
        title: "¿Cancelar esta sesión?", confirmText: "Sí, cancelar", cancelText: "Volver", danger: true, form: true,
        body: html`<p>${forWho}</p><div class="field"><label for="reason">Motivo (opcional)</label><input id="reason" name="reason" type="text" maxlength="300"></div>`,
      });
      if (!r) return;
      await busy(btn, async () => {
        try { await callFn("session-actions", { action: "cancel", session_id: sid, reason: r.reason }); toast("Sesión cancelada.", "ok"); await draw(); }
        catch (e) { toast(errMsg(e), "bad"); }
      });
    }));

    ctx.root.querySelectorAll("[data-done]").forEach((btn) => btn.addEventListener("click", async () => {
      const ok = await confirmDialog({ title: "¿Se realizó la sesión?", body: html`<p>Al confirmar, se libera el pago al mentor. Si hubo un problema, mejor reportalo antes.</p>`, confirmText: "Sí, se realizó", cancelText: "Todavía no" });
      if (!ok) return;
      await busy(btn, async () => {
        try { await callFn("session-actions", { action: "complete", session_id: btn.dataset.done }); toast("¡Gracias! Confirmaste la sesión.", "ok"); await draw(); }
        catch (e) { toast(errMsg(e), "bad"); }
      });
    }));

    ctx.root.querySelector("#problem")?.addEventListener("click", async () => {
      const r = await dialog({
        title: "Reportar un problema", confirmText: "Enviar", form: true,
        body: html`<p class="small muted">Lo revisa el equipo de RedEmigra. Mientras haya un reporte abierto, el pago al mentor queda en pausa.</p>
          <div class="field"><label for="reason">¿Qué pasó?</label><select id="reason" name="reason" required><option value="">Elegí una opción</option><option>El mentor no se presentó</option><option>La sesión fue muy distinta a lo que se ofrecía</option><option>Comportamiento inapropiado</option><option>Problema con el pago</option><option>Otro</option></select></div>
          <div class="field"><label for="details">Detalles</label><textarea id="details" name="details" maxlength="1000"></textarea></div>`,
      });
      if (!r) return;
      const { error } = await sb.from("reports").insert({ reporter_id: uid, target_type: "booking", target_id: b.id, reason: r.reason, details: r.details || null });
      if (error) toast(errMsg(error), "bad"); else toast("Recibimos tu reporte. Te vamos a responder por correo.", "ok");
    });

    ctx.root.querySelector("#extra")?.addEventListener("click", async () => {
      const dur = b.duration_min || 60;
      let slots = [];
      try { slots = await loadSlots(b.mentor_id, dur); } catch (e) { return toast(errMsg(e), "bad"); }
      const d = document.createElement("dialog");
      d.innerHTML = `<div class="dlg" style="width:100%"><h2>Agendar otra llamada</h2><div id="xpick"></div><div class="dlg__actions"><button class="btn btn--ghost btn--sm" id="xno">Cancelar</button><button class="btn btn--primary btn--sm" id="xok" disabled>Agendar</button></div></div>`;
      d.style.width = "min(94vw, 620px)";
      document.body.appendChild(d); d.showModal();
      let picked = null;
      slotPicker(d.querySelector("#xpick"), slots, (sl) => { picked = sl; d.querySelector("#xok").disabled = !sl; });
      const close = () => { d.close(); d.remove(); };
      d.querySelector("#xno").addEventListener("click", close);
      d.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
      d.querySelector("#xok").addEventListener("click", async (ev) => {
        await busy(ev.currentTarget, async () => {
          const { error } = await sb.rpc("schedule_extra_session", { p_booking: b.id, p_starts: picked.start });
          if (error) { toast(errMsg(error), "bad"); return; }
          close(); toast("Llamada agendada.", "ok"); await draw();
        });
      });
    });
  }
  await draw();
}

// ---------------------------------------------------------------------------- /reservas/:id/resena
export async function review(ctx) {
  ctx.title("Dejar una reseña");
  const id = ctx.params.id;
  const uid = state.user.id;
  const { data: b } = await sb.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!ctx.alive()) return;
  if (!b || b.traveler_id !== uid) return ctx.set(html`<div class="container page"><div class="empty card"><h1>No encontramos esta reserva</h1></div></div>`);
  const [{ data: ex }, { data: done }] = await Promise.all([
    sb.from("reviews").select("id").eq("booking_id", id).maybeSingle(),
    sb.from("sessions").select("id").eq("booking_id", id).eq("status", "completed").limit(1),
  ]);
  if (!ctx.alive()) return;
  if (ex) return ctx.set(html`<div class="container page"><div class="narrow card stack"><h1>Ya dejaste tu reseña</h1><p>¡Gracias por contar tu experiencia!</p><a class="btn btn--primary" href="/reservas/${id}">Volver a la reserva</a></div></div>`);
  if (!done?.length) return ctx.set(html`<div class="container page"><div class="narrow card stack"><h1>Todavía no podés dejar una reseña</h1><p>Las reseñas se habilitan cuando la sesión está completada.</p><a class="btn btn--primary" href="/reservas/${id}">Volver a la reserva</a></div></div>`);

  const CRIT = [["rating_quality", "Calidad de la información"], ["rating_communication", "Comunicación"], ["rating_help", "Ayuda recibida"]];
  const vals = { rating_quality: 0, rating_communication: 0, rating_help: 0 };
  ctx.set(html`<div class="container page"><div class="narrow"><form class="card stack" id="f" novalidate>
    <h1>¿Cómo te fue con ${b.mentor_name || "tu mentor"}?</h1>
    <p class="muted">Tu reseña ayuda a otras personas a elegir. Se muestra con tu primer nombre.</p>
    ${CRIT.map(([k, label]) => html`<div class="field"><span class="label">${label}</span>
      <div class="rating-input" data-k="${k}" role="radiogroup" aria-label="${label}">${[1, 2, 3, 4, 5].map((n) => html`<button type="button" data-n="${n}" role="radio" aria-checked="false" aria-label="${n} de 5">${ico("star")}</button>`)}</div></div>`)}
    <div class="field"><label for="comment">Tu comentario (opcional)</label><textarea id="comment" name="comment" maxlength="1500" placeholder="Contá qué te sirvió y qué mejorarías."></textarea></div>
    <button class="btn btn--primary" type="submit" data-busy="Enviando…">Publicar reseña</button>
  </form></div></div>`);
  const form = ctx.root.querySelector("#f");
  form.querySelectorAll(".rating-input").forEach((g) => g.addEventListener("click", (e) => {
    const btn = e.target.closest("button"); if (!btn) return;
    vals[g.dataset.k] = Number(btn.dataset.n);
    g.querySelectorAll("button").forEach((x) => { const on = Number(x.dataset.n) <= vals[g.dataset.k]; x.classList.toggle("is-on", on); x.setAttribute("aria-checked", String(Number(x.dataset.n) === vals[g.dataset.k])); });
  }));
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault(); showFormError(form, "");
    if (Object.values(vals).some((v) => !v)) return showFormError(form, "Puntuá los tres aspectos (de 1 a 5 estrellas).");
    await busy(form.querySelector("button[type=submit]"), async () => {
      const { error } = await sb.from("reviews").insert({ booking_id: id, traveler_id: uid, mentor_id: b.mentor_id, ...vals, comment: form.comment.value.trim() || null });
      if (error) return showFormError(form, errMsg(error));
      toast("¡Gracias por tu reseña!", "ok");
      ctx.go(`/reservas/${id}`);
    });
  });
}
