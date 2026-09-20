// =============================================================================
// Configuración PÚBLICA de RedEmigra. Completá estos dos valores (ver SETUP.md, paso 2).
// Los encontrás en Supabase > Project Settings > API (o "Connect").
//
//  * SUPABASE_URL       : la dirección de tu proyecto, ej. https://abcdefgh.supabase.co
//  * SUPABASE_ANON_KEY  : la clave PÚBLICA ("anon" o "publishable"). Está pensada para estar en el navegador.
//
//  NUNCA pegues acá la clave "service_role" / "secret" de Supabase ni ninguna clave de Stripe:
//  esas viven solo en los secretos de las Edge Functions.
// =============================================================================
window.REDEMIGRA_CONFIG = {
  SUPABASE_URL: "https://pocpgdrizdabqovdlwqo.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_0tDx_8_Z7Prq4qSYOxHYjw_fZ5KTNi5",
  STRIPE_PUBLISHABLE_KEY: "pk_test_TW6vbhp",
  // Botón "Continuar con Google" en el ingreso. Poné true SOLO después de activar el proveedor
  // Google en Supabase > Authentication > Providers (ver SETUP.md, "Opcional").
  GOOGLE_LOGIN: false,
};