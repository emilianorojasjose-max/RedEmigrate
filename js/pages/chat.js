// Mensajes entre quien reservó y el mentor (se habilita al confirmarse la primera reserva).
import { sb, state, html, ico, avatar, fmtTime, fmtShort, esc, toast, errMsg, debounce } from "../lib/core.js";
import { refreshUnread } from "../lib/session.js";

async function loadList() {
  const uid = state.user.id;
  const { data: convs } = await sb.from("conversations").select("*").or(`traveler_id.eq.${uid},mentor_id.eq.${uid}`);
  const list = convs || [];
  if (!list.length) return [];
  const otherId = (c) => (c.traveler_id === uid ? c.mentor_id : c.traveler_id);
  const mentorIds = list.filter((c) => c.traveler_id === uid).map((c) => c.mentor_id);
  const travelerIds = list.filter((c) => c.mentor_id === uid).map((c) => c.traveler_id);
  const [mp, pr, ms] = await Promise.all([
    mentorIds.length ? sb.from("mentor_profiles").select("user_id,display_name,avatar_url,residence_country").in("user_id", mentorIds) : { data: [] },
    travelerIds.length ? sb.from("profiles").select("id,full_name,avatar_url").in("id", travelerIds) : { data: [] },
    sb.from("messages").select("conversation_id,body,created_at,sender_id,read_at").in("conversation_id", list.map((c) => c.id)).order("created_at", { ascending: false }).limit(400),
  ]);
  const mName = new Map((mp.data || []).map((m) => [m.user_id, m]));
  const tName = new Map((pr.data || []).map((p) => [p.id, p]));
  const last = new Map(), unread = new Map();
  for (const m of ms.data || []) {
    if (!last.has(m.conversation_id)) last.set(m.conversation_id, m);
    if (m.sender_id !== uid && !m.read_at) unread.set(m.conversation_id, (unread.get(m.conversation_id) || 0) + 1);
  }
  return list.map((c) => {
    const isTraveler = c.traveler_id === uid;
    const o = isTraveler ? mName.get(c.mentor_id) : tName.get(c.traveler_id);
    return {
      id: c.id, otherId: otherId(c), created_at: c.created_at,
      name: (isTraveler ? o?.display_name : o?.full_name) || (isTraveler ? "Mentor" : "Viajero/a"),
      avatar_url: o?.avatar_url, cc: isTraveler ? o?.residence_country : null,
      last: last.get(c.id), unread: unread.get(c.id) || 0,
    };
  }).sort((a, b) => new Date(b.last?.created_at || b.created_at) - new Date(a.last?.created_at || a.created_at));
}

const listHtml = (items, activeId) => items.length ? items.map((c) => html`
  <a class="chat__item" href="/mensajes/${c.id}" aria-current="${c.id === activeId}">
    ${avatar(c.name, c.avatar_url, c.cc, "avatar--sm")}
    <div style="min-width:0;flex:1"><strong>${c.name}</strong><p>${c.last ? (c.last.sender_id === state.user.id ? "Vos: " : "") + c.last.body : "Sin mensajes todavía"}</p></div>
    ${c.unread ? html`<span class="badge-count">${c.unread}</span>` : ""}
  </a>`) : html`<div class="chat__empty" style="padding:28px 18px"><div><p><strong style="color:var(--navy-900)">Todavía no tenés conversaciones.</strong></p><p class="small" style="margin-top:6px">El chat con un mentor se habilita cuando reservás tu primera sesión.</p></div></div>`;

export async function inbox(ctx) {
  ctx.title("Mensajes");
  ctx.set(html`<div class="container page"><div class="skeleton" style="height:360px"></div></div>`);
  const items = await loadList();
  if (!ctx.alive()) return;
  ctx.set(html`<div class="container page"><div class="page-head"><h1>Mensajes</h1></div>
    <div class="chat"><div class="chat__list">${listHtml(items, null)}</div>
      <div class="chat__pane"><div class="chat__empty" style="flex:1"><div>${ico("chat", "")}<p style="margin-top:8px">Elegí una conversación para ver los mensajes.</p></div></div></div></div></div>`);
  // en pantallas chicas la lista ocupa todo: el panel derecho está oculto por CSS
}

export async function thread(ctx) {
  const id = ctx.params.id;
  const uid = state.user.id;
  ctx.set(html`<div class="container page"><div class="skeleton" style="height:420px"></div></div>`);
  const [items, msgs] = await Promise.all([
    loadList(),
    sb.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true }).limit(300),
  ]);
  if (!ctx.alive()) return;
  const conv = items.find((c) => c.id === id);
  if (!conv) return ctx.set(html`<div class="container page"><div class="empty card"><h1>No encontramos esta conversación</h1><a class="btn btn--primary" href="/mensajes" style="margin-top:16px">Volver a mensajes</a></div></div>`);
  ctx.title(`Chat con ${conv.name}`);

  const seen = new Set();
  const list = [];
  const add = (m) => { if (!seen.has(m.id)) { seen.add(m.id); list.push(m); } };
  (msgs.data || []).forEach(add);

  ctx.set(html`<div class="container page"><div class="page-head row"><a class="btn btn--ghost btn--sm" href="/mensajes" style="display:inline-flex">← Mensajes</a></div>
    <div class="chat chat--mobile-thread">
      <div class="chat__list" id="clist">${listHtml(items, id)}</div>
      <div class="chat__pane">
        <div class="chat__head">${avatar(conv.name, conv.avatar_url, conv.cc, "avatar--sm")}<div><strong style="color:var(--navy-900)">${conv.name}</strong><div class="muted small">Recordá: RedEmigra no reemplaza el asesoramiento legal, migratorio o financiero.</div></div></div>
        <div class="chat__msgs" id="msgs" aria-live="polite" tabindex="0"></div>
        <form class="chat__form" id="send"><label class="sr-only" for="body">Escribí un mensaje</label><textarea id="body" name="body" rows="1" maxlength="4000" placeholder="Escribí un mensaje…" required></textarea><button class="btn btn--primary" type="submit" aria-label="Enviar">${ico("send")}</button></form>
      </div></div></div>`);

  const box = ctx.root.querySelector("#msgs");
  const draw = () => {
    box.innerHTML = list.length ? list.map((m) => html`<div class="msg ${m.sender_id === uid ? "msg--me" : ""}">${m.body}<small>${fmtShort(m.created_at)}, ${fmtTime(m.created_at)}</small></div>`).join("")
      : `<div class="chat__empty" style="flex:1"><p>Todavía no hay mensajes. ¡Saludá!</p></div>`;
    box.scrollTop = box.scrollHeight;
    // mantiene al día el resumen de la lista lateral
    const lastMsg = list[list.length - 1];
    if (lastMsg && conv.last?.id !== lastMsg.id) {
      conv.last = lastMsg;
      items.sort((a, b) => new Date(b.last?.created_at || b.created_at) - new Date(a.last?.created_at || a.created_at));
      const cl = ctx.root.querySelector("#clist");
      if (cl) cl.innerHTML = html`${listHtml(items, id)}`.toString();
    }
  };
  draw();

  const markRead = debounce(async () => {
    if (list.some((m) => m.sender_id !== uid && !m.read_at)) {
      await sb.from("messages").update({ read_at: new Date().toISOString() }).eq("conversation_id", id).neq("sender_id", uid).is("read_at", null);
      list.forEach((m) => { if (m.sender_id !== uid) m.read_at = m.read_at || new Date().toISOString(); });
      refreshUnread();
    }
  }, 300);
  markRead();

  // Tiempo real (Supabase Realtime) + respaldo por consulta cada 10 s por si la conexión se corta
  const channel = sb.channel(`conv-${id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, (p) => {
    add(p.new); draw(); if (p.new.sender_id !== uid) markRead();
  }).subscribe();
  const poll = setInterval(async () => {
    if (document.hidden) return;
    const since = list.length ? list[list.length - 1].created_at : "1970-01-01";
    const { data } = await sb.from("messages").select("*").eq("conversation_id", id).gt("created_at", since).order("created_at");
    if (data?.length) { const n = list.length; data.forEach(add); if (list.length !== n) { draw(); markRead(); } }
  }, 10000);
  ctx.onLeave(() => { clearInterval(poll); sb.removeChannel(channel); });

  const form = ctx.root.querySelector("#send");
  const ta = form.body;
  ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = ta.value.trim(); if (!body) return;
    ta.value = ""; ta.disabled = true;
    const { data, error } = await sb.from("messages").insert({ conversation_id: id, sender_id: uid, body }).select().single();
    ta.disabled = false; ta.focus();
    if (error) { ta.value = body; return toast(errMsg(error), "bad"); }
    add(data); draw();
  });
}
