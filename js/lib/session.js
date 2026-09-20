// Datos de la sesión y del catálogo (países, ajustes). Lo usan main.js y las pantallas.
import { sb, state, TZ } from "./core.js";
import { renderHeader } from "./layout.js";

export async function refreshMe() {
  if (!state.user) { state.profile = null; state.mentor = null; state.isAdmin = false; state.unread = 0; return; }
  const uid = state.user.id;
  const [p, m, u] = await Promise.all([
    sb.from("profiles").select("*").eq("id", uid).maybeSingle(),
    sb.from("mentor_profiles").select("*").eq("user_id", uid).maybeSingle(),
    sb.from("messages").select("id", { count: "exact", head: true }).is("read_at", null).neq("sender_id", uid),
  ]);
  state.profile = p.data || null;
  state.mentor = m.data || null;
  state.isAdmin = !!p.data?.is_admin;
  state.unread = u.count || 0;
  if (state.profile && state.profile.timezone === "UTC" && TZ !== "UTC") {
    sb.from("profiles").update({ timezone: TZ }).eq("id", uid).then(() => {});
  }
}

// Recarga los datos y redibuja la barra superior (tras iniciar sesión, editar el perfil, etc.)
export async function refreshAll() { await refreshMe(); renderHeader(); }

export async function refreshUnread() {
  if (!state.user) return;
  const u = await sb.from("messages").select("id", { count: "exact", head: true }).is("read_at", null).neq("sender_id", state.user.id);
  state.unread = u.count || 0;
  renderHeader();
}

export async function loadCatalog() {
  const [c, s] = await Promise.all([
    sb.from("countries").select("*").order("name_es"),
    sb.from("platform_settings").select("key,value"),
  ]);
  state.countries = c.data || [];
  state.settings = Object.fromEntries((s.data || []).map((r) => [r.key, r.value]));
}
