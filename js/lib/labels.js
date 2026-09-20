import { html } from "./core.js";
export const BOOKING = {
  pending_payment: ["Pendiente de pago", "amber"], confirmed: ["Confirmada", "blue"], completed: ["Completada", "green"],
  cancelled_by_traveler: ["Cancelada por quien reservó", "red"], cancelled_by_mentor: ["Cancelada por el mentor", "red"], expired: ["Vencida", "" ],
};
export const SESSION = { scheduled: ["Programada", "blue"], completed: ["Realizada", "green"], cancelled: ["Cancelada", "red"] };
export const MENTOR_STATUS = { draft: ["Borrador", ""], pending_review: ["En revisión", "amber"], approved: ["Aprobado", "green"], suspended: ["Suspendido", "red"] };
export const TRANSFER = { pending: ["Pendiente", "amber"], paid: ["Enviado", "green"], reversed: ["Revertido", "red"] };
export const tag = (map, key) => { const [t, c] = map[key] || [key, ""]; return html`<span class="tag ${c ? "tag--" + c : ""}">${t}</span>`; };
