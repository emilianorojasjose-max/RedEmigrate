// Selector de día y horario (usa la función get_available_slots de la base: única fuente de verdad).
import { sb, html, mount, dayKey, fmtTime, fmtDay, tzLabel, ico, TZ } from "./core.js";

const part = (iso, o) => new Intl.DateTimeFormat("es", { timeZone: TZ, ...o }).format(new Date(iso));

export async function loadSlots(mentorId, durationMin, days = 28) {
  const from = new Date();
  const to = new Date(from.getTime() + days * 86400000);
  const { data, error } = await sb.rpc("get_available_slots", {
    p_mentor: mentorId, p_duration_min: durationMin, p_from: from.toISOString(), p_to: to.toISOString(),
  });
  if (error) throw error;
  return (data || []).map((r) => ({ start: r.slot_start, end: r.slot_end }));
}

// Dibuja los días con horarios y los horarios del día elegido. onSelect(slot|null) avisa la elección.
export function slotPicker(el, slots, onSelect) {
  const byDay = new Map();
  for (const s of slots) { const k = dayKey(s.start); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(s); }
  const keys = [...byDay.keys()];
  let day = keys[0] || null, picked = null, shown = 14;

  const draw = () => {
    if (!keys.length) {
      mount(el, html`<div class="notice notice--warn">${ico("info")}<span>Este mentor no tiene horarios libres en los próximos días. Volvé a mirar más adelante.</span></div>`);
      return;
    }
    const visible = keys.slice(0, shown);
    mount(el, html`
      <p class="muted small" style="margin-bottom:10px">Horarios en tu zona horaria: <strong>${tzLabel()}</strong></p>
      <div class="days" role="group" aria-label="Elegí un día">
        ${visible.map((k) => { const first = byDay.get(k)[0].start; return html`<button type="button" class="day" data-day="${k}" aria-pressed="${k === day}">${part(first, { weekday: "short" })}<strong>${part(first, { day: "numeric" })}</strong>${part(first, { month: "short" })}</button>`; })}
        ${keys.length > shown ? html`<button type="button" class="day" data-more>Más días<strong>+</strong></button>` : ""}
      </div>
      ${day ? html`<p class="small" style="margin-top:12px;color:var(--navy-900);font-weight:600">${fmtDay(byDay.get(day)[0].start)}</p>
      <div class="slots" role="group" aria-label="Elegí un horario">${byDay.get(day).map((s) => html`<button type="button" class="slot" data-start="${s.start}" aria-pressed="${picked?.start === s.start}">${fmtTime(s.start)}</button>`)}</div>` : ""}`);
    el.querySelectorAll("[data-day]").forEach((b) => b.addEventListener("click", () => { day = b.dataset.day; picked = null; onSelect(null); draw(); }));
    el.querySelector("[data-more]")?.addEventListener("click", () => { shown += 14; draw(); });
    el.querySelectorAll("[data-start]").forEach((b) => b.addEventListener("click", () => {
      picked = byDay.get(day).find((s) => s.start === b.dataset.start); onSelect(picked); draw();
      el.querySelector(`[data-start="${picked.start}"]`)?.focus();
    }));
  };
  draw();
  return { get selected() { return picked; }, redraw: draw };
}
