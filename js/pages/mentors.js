// Búsqueda de mentores y perfil público.
import { sb, state, html, ico, avatar, stars, money, countryName, langName, LANGS, yearsSince, esc, dialog, toast, errMsg, formData, debounce } from "../lib/core.js";

const SORTS = [["rating", "Mejor puntuados"], ["price_asc", "Precio: menor a mayor"], ["price_desc", "Precio: mayor a menor"], ["recent", "Más nuevos"]];

export function routeLine(m, city) {
  return `${countryName(m.origin_country)} → ${countryName(m.residence_country)}${city ? ` (${city})` : ""}`;
}
export function yearsText(m) {
  const y = yearsSince(m.arrived_on);
  if (y == null) return "";
  return y < 1 ? `Menos de 1 año en ${countryName(m.residence_country)}` : `${y} ${y === 1 ? "año" : "años"} en ${countryName(m.residence_country)}`;
}

export function mentorCard(m) {
  return html`<article class="mcard">
    <div class="mcard__top">
      ${avatar(m.display_name, m.avatar_url, m.residence_country)}
      <div><h3>${m.display_name}</h3><p class="mcard__meta">${routeLine(m, m.city_name)}</p></div>
    </div>
    <div class="row" style="gap:8px">
      ${stars(m.rating_avg, m.rating_count)}
      ${m.is_example ? html`<span class="tag tag--example">Perfil de ejemplo</span>` : ""}
    </div>
    ${m.headline ? html`<p class="mcard__quote"><strong style="color:var(--navy-900)">${m.headline}</strong></p>` : ""}
    ${m.quote ? html`<p class="mcard__quote">“${m.quote}”</p>` : ""}
    <p class="mcard__meta">${[yearsText(m), (m.languages || []).map(langName).join(", ")].filter(Boolean).join(" · ")}</p>
    <div class="mcard__foot">
      <div class="price"><small>Desde</small> ${money(m.from_price_cents, m.currency)}</div>
      <a class="btn btn--ghost btn--sm" href="/mentores/${m.slug}">Ver perfil ${ico("arrow")}</a>
    </div>
  </article>`;
}

export async function list(ctx) {
  ctx.title("Mentores");
  const q = ctx.query;
  const f = { q: q.q || "", destino: q.destino || "", origen: q.origen || "", idioma: q.idioma || "", max: q.max || "", orden: q.orden || "rating" };
  const dests = state.countries.filter((c) => c.is_destination);
  const origins = state.countries.filter((c) => c.is_origin);

  ctx.set(html`
  <div class="container page">
    <div class="page-head"><h1>Encontrá a alguien que ya hizo lo que vos querés hacer</h1>
      <p>Filtrá por el país donde querés vivir y por dónde naciste: es más fácil hablar con alguien que vivió tu misma mudanza.</p></div>
    <form class="filters" id="filters" role="search">
      <div class="field"><label for="q">Buscar</label><input id="q" name="q" type="search" placeholder="Nombre, profesión, tema…" value="${f.q}"></div>
      <div class="field"><label for="destino">Quiero vivir en</label><select id="destino" name="destino"><option value="">Cualquier país</option>${dests.map((c) => html`<option value="${c.code}" ${c.code === f.destino ? "selected" : ""}>${c.name_es}</option>`)}</select></div>
      <div class="field"><label for="origen">Mentor de</label><select id="origen" name="origen"><option value="">Cualquier origen</option>${origins.map((c) => html`<option value="${c.code}" ${c.code === f.origen ? "selected" : ""}>${c.name_es}</option>`)}</select></div>
      <div class="field"><label for="idioma">Idioma</label><select id="idioma" name="idioma"><option value="">Cualquiera</option>${LANGS.map(([c, n]) => html`<option value="${c}" ${c === f.idioma ? "selected" : ""}>${n}</option>`)}</select></div>
      <div class="field"><label for="orden">Ordenar por</label><select id="orden" name="orden">${SORTS.map(([v, n]) => html`<option value="${v}" ${v === f.orden ? "selected" : ""}>${n}</option>`)}</select></div>
      <div class="field"><label for="max">Precio máximo (€)</label><input id="max" name="max" type="number" min="1" step="1" inputmode="numeric" placeholder="Sin límite" value="${f.max}"></div>
    </form>
    <div id="results" aria-live="polite"><div class="mentor-grid"><div class="skeleton" style="height:260px"></div><div class="skeleton" style="height:260px"></div><div class="skeleton" style="height:260px"></div></div></div>
  </div>`);

  const form = ctx.root.querySelector("#filters");
  const box = ctx.root.querySelector("#results");
  let seq = 0;

  async function run() {
    const my = ++seq;
    const d = formData(form);
    const params = new URLSearchParams(Object.entries(d).filter(([k, v]) => v && !(k === "orden" && v === "rating")));
    history.replaceState({}, "", location.pathname + (params.toString() ? `?${params}` : ""));
    const { data, error } = await sb.rpc("search_mentors", {
      p_destination: d.destino || null, p_origin: d.origen || null, p_language: d.idioma || null,
      p_max_price: d.max ? Math.round(Number(d.max) * 100) : null, p_query: d.q?.trim() || null, p_sort: d.orden || "rating",
    });
    if (my !== seq || !ctx.alive()) return;
    if (error) { box.innerHTML = `<div class="notice notice--bad">No pudimos cargar los mentores. Probá de nuevo.</div>`; console.error(error); return; }
    const hasFilters = [...params.keys()].length > 0;
    box.innerHTML = (data?.length
      ? html`<p class="muted small" style="margin-bottom:14px">${data.length} ${data.length === 1 ? "mentor" : "mentores"}</p><div class="mentor-grid">${data.map(mentorCard)}</div>`
      : html`<div class="empty card"><h3>${hasFilters ? "No encontramos mentores con esos filtros" : "Todavía no hay mentores publicados"}</h3>
          <p style="max-width:460px;margin:0 auto 18px">${hasFilters ? "Probá quitar algún filtro." : "Estamos sumando a las primeras personas de la red."}</p>
          ${hasFilters ? html`<a class="btn btn--ghost btn--sm" href="/mentores">Quitar filtros</a>` : html`<a class="btn btn--primary btn--sm" href="/registro?rol=mentor">Quiero ser mentor</a>`}</div>`).toString();
  }
  form.addEventListener("input", debounce(run, 250));
  form.addEventListener("submit", (e) => { e.preventDefault(); run(); });
  run();
}

export async function profile(ctx) {
  const slug = ctx.params.slug;
  ctx.set(html`<div class="container page"><div class="skeleton" style="height:300px"></div></div>`);
  const { data: m } = await sb.from("mentor_profiles").select("*").eq("slug", slug).maybeSingle();
  if (!ctx.alive()) return;
  if (!m) {
    ctx.title("Mentor no encontrado");
    return ctx.set(html`<div class="container page"><div class="empty card"><h1>No encontramos este perfil</h1><p style="margin:12px 0 20px">Puede que todavía no esté publicado o que la dirección esté mal escrita.</p><a class="btn btn--primary" href="/mentores">Ver mentores</a></div></div>`);
  }
  ctx.title(m.display_name);
  const uid = state.user?.id;
  const isOwner = uid === m.user_id;

  const [svc, rev, ver, city, conv] = await Promise.all([
    sb.from("services").select("*").eq("mentor_id", m.user_id).eq("is_active", true).order("price_cents"),
    sb.from("public_reviews").select("*").eq("mentor_id", m.user_id).order("created_at", { ascending: false }).limit(20),
    sb.from("public_verifications").select("kind").eq("mentor_id", m.user_id),
    m.residence_city_id ? sb.from("cities").select("name").eq("id", m.residence_city_id).maybeSingle() : Promise.resolve({ data: null }),
    uid && !isOwner ? sb.from("conversations").select("id").eq("traveler_id", uid).eq("mentor_id", m.user_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!ctx.alive()) return;
  const services = svc.data || [], reviews = rev.data || [];
  const kinds = new Set((ver.data || []).map((v) => v.kind));
  const cityName = city.data?.name;
  const VER = { identity: "Identidad verificada", residence: "Residencia verificada", interview: "Entrevista con el equipo" };

  const canBook = !m.is_example && !isOwner && m.status === "approved";
  const bookBtn = (s) => isOwner ? html`<span class="muted small">Así se ve tu servicio para el público.</span>`
    : m.is_example ? html`<button class="btn btn--ghost btn--sm" disabled>Perfil de ejemplo: no se puede reservar</button>`
    : m.status !== "approved" ? html`<button class="btn btn--ghost btn--sm" disabled>Todavía no disponible</button>`
    : html`<a class="btn btn--primary btn--sm" href="/reservar/${s.id}">Reservar ${ico("arrow")}</a>`;

  ctx.set(html`
  <div class="container page">
    ${m.status !== "approved" ? html`<div class="notice notice--warn" style="margin-bottom:18px">${ico("info")}<span>Vista previa: tu perfil todavía no es público (estado: ${{ draft: "borrador", pending_review: "en revisión", suspended: "suspendido" }[m.status] || m.status}).</span></div>` : ""}
    ${m.is_example ? html`<div class="notice" style="margin-bottom:18px">${ico("info")}<span>Este es un perfil de ejemplo para mostrar cómo se ve la plataforma. No corresponde a una persona real y no se puede reservar.</span></div>` : ""}
    <section class="card profile-hero">
      <div class="profile-hero__id">
        ${avatar(m.display_name, m.avatar_url, m.residence_country, "avatar--lg")}
        <div class="stack" style="gap:8px">
          <h1>${m.display_name}</h1>
          <p class="muted">${routeLine(m, cityName)}</p>
          <div class="row" style="gap:8px">${stars(m.rating_avg, m.rating_count)}
            ${[...kinds].map((k) => html`<span class="tag tag--blue">${ico("shield")} ${VER[k] || k}</span>`)}</div>
        </div>
      </div>
      ${m.headline ? html`<p style="font-size:1.15rem;color:var(--navy-900);font-family:var(--font-display);font-weight:600">${m.headline}</p>` : ""}
    </section>

    <div class="profile-cols">
      <div class="stack-lg">
        <section class="card"><h2>Su historia</h2>
          ${m.bio ? html`<p style="white-space:pre-line">${m.bio}</p>` : html`<p class="muted">Todavía no escribió su historia.</p>`}
          ${m.quote ? html`<blockquote style="margin:18px 0 0;padding-left:16px;border-left:3px solid var(--orange-500);color:var(--navy-900);font-style:italic">“${m.quote}”</blockquote>` : ""}
        </section>
        <section class="card"><h2>Datos</h2>
          <dl class="summary" style="display:grid;grid-template-columns:auto 1fr;gap:10px 18px;font-size:15px">
            <dt class="muted">Vive en</dt><dd style="text-align:left">${countryName(m.residence_country)}${cityName ? `, ${cityName}` : ""}</dd>
            ${m.arrived_on ? html`<dt class="muted">Tiempo allá</dt><dd style="text-align:left">${yearsText(m)}</dd>` : ""}
            ${m.arrival_type ? html`<dt class="muted">Cómo llegó</dt><dd style="text-align:left">${m.arrival_type}</dd>` : ""}
            ${m.profession ? html`<dt class="muted">Profesión</dt><dd style="text-align:left">${m.profession}</dd>` : ""}
            ${(m.languages || []).length ? html`<dt class="muted">Idiomas</dt><dd style="text-align:left">${m.languages.map(langName).join(", ")}</dd>` : ""}
          </dl>
        </section>
        <section class="card"><h2>Reseñas</h2>
          ${reviews.length ? reviews.map((r) => html`<div class="review"><div class="row" style="gap:10px"><strong style="color:var(--navy-900)">${r.reviewer_name}</strong>${stars(r.rating)} ${r.is_example ? html`<span class="tag tag--example">Ejemplo</span>` : ""}<span class="muted small">${new Intl.DateTimeFormat("es", { month: "long", year: "numeric" }).format(new Date(r.created_at))}</span></div>${r.comment ? html`<p style="margin-top:6px">${r.comment}</p>` : ""}</div>`)
            : html`<p class="muted">Todavía no tiene reseñas. Las reseñas solo las escriben personas que tomaron una sesión.</p>`}
        </section>
      </div>

      <aside class="stack sticky">
        <section class="card"><h2>Servicios</h2>
          ${services.length ? services.map((s) => html`<div class="svc">
              <div class="row row--between" style="align-items:flex-start"><h3>${s.title}</h3><div class="price">${money(s.price_cents, s.currency)}</div></div>
              <p class="muted small">${s.duration_min} min${s.calls_included > 1 ? ` · ${s.calls_included} llamadas incluidas` : ""}</p>
              ${s.description ? html`<p class="small" style="margin-top:8px">${s.description}</p>` : ""}
              ${(s.includes || []).length ? html`<ul>${s.includes.map((i) => html`<li>${ico("check")}<span>${i}</span></li>`)}</ul>` : ""}
              <div style="margin-top:10px">${bookBtn(s)}</div>
            </div>`) : html`<p class="muted">Todavía no publicó servicios.</p>`}
        </section>
        ${conv.data ? html`<a class="btn btn--ghost btn--block" href="/mensajes/${conv.data.id}">${ico("chat")} Enviar un mensaje</a>` : !isOwner ? html`<p class="muted small">Podés escribirle por chat después de reservar tu primera sesión.</p>` : ""}
        <div class="notice">${ico("shield")}<span>RedEmigra ofrece acompañamiento basado en experiencia personal y <strong>no reemplaza el asesoramiento legal, migratorio o financiero</strong>.</span></div>
        ${!isOwner ? html`<button class="btn btn--link small" id="report">${ico("flag")} Reportar este perfil</button>` : ""}
      </aside>
    </div>
  </div>`);

  ctx.root.querySelector("#report")?.addEventListener("click", async () => {
    if (!state.user) return ctx.go(`/ingresar?next=${encodeURIComponent(location.pathname)}`);
    const r = await dialog({
      title: "Reportar este perfil", confirmText: "Enviar reporte", form: true,
      body: html`<p class="small muted">Tu reporte lo revisa el equipo de RedEmigra.</p>
        <div class="field"><label for="reason">Motivo</label><select id="reason" name="reason" required><option value="">Elegí un motivo</option><option>Información falsa o engañosa</option><option>Comportamiento inapropiado</option><option>Me pidió pagar fuera de la plataforma</option><option>Otro</option></select></div>
        <div class="field"><label for="details">Contanos más (opcional)</label><textarea id="details" name="details" maxlength="1000"></textarea></div>`,
    });
    if (!r) return;
    const { error } = await sb.from("reports").insert({ reporter_id: state.user.id, target_type: "mentor", target_id: m.user_id, reason: r.reason, details: r.details || null });
    if (error) toast(errMsg(error), "bad"); else toast("Gracias. Recibimos tu reporte.", "ok");
  });
}
