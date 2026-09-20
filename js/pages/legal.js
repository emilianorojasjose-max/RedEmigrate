// Textos legales. SON BORRADORES: los completa y revisa un abogado antes de abrir al público.
// Todo lo que está entre [CORCHETES] es un dato de la empresa que todavía no se conoce.
import { state, html, ico } from "../lib/core.js";

const DRAFT = html`<div class="notice notice--warn" style="margin-bottom:24px">${ico("alert")}<span><strong>Borrador.</strong> Este texto es una base para trabajar con tu abogado. Los datos entre [corchetes] hay que completarlos y todo el documento debe revisarse antes de publicar la plataforma.</span></div>`;

const DOCS = {
  aviso: {
    title: "Aviso legal importante",
    body: () => html`
      <h2>RedEmigra no reemplaza el asesoramiento profesional</h2>
      <p>RedEmigra es una plataforma donde personas que ya viven en otro país (mentores) comparten su <strong>experiencia personal</strong> con quienes están pensando en emigrar. Las conversaciones son de acompañamiento y orientación basada en vivencias.</p>
      <p>Lo que se dice en una sesión o en el chat <strong>no constituye asesoramiento legal, migratorio, financiero, fiscal ni de ningún otro tipo profesional</strong>, y no reemplaza la consulta con abogados, gestores, contadores u organismos oficiales cuando sean necesarios.</p>
      <ul><li>Los requisitos migratorios, plazos y costos cambian. Verificá siempre la información con fuentes oficiales.</li>
      <li>Los mentores no son funcionarios ni representantes de ningún gobierno y no pueden garantizar resultados de trámites.</li>
      <li>La decisión de emigrar y sus consecuencias son tuyas.</li></ul>`,
  },
  terminos: {
    title: "Términos y condiciones",
    body: () => html`
      <h2>1. Quiénes somos</h2>
      <p>RedEmigra es operada por [NOMBRE LEGAL DE LA EMPRESA], con domicilio en [DOMICILIO] y contacto en [EMAIL DE CONTACTO] (“RedEmigra”).</p>
      <h2>2. Qué es el servicio</h2>
      <p>RedEmigra conecta a personas que quieren emigrar (“viajeros”) con personas que ya viven en el país de destino (“mentores”), que ofrecen sesiones de acompañamiento por videollamada. RedEmigra provee la plataforma de búsqueda, reserva, pago y mensajería; el servicio de mentoría lo presta cada mentor por su cuenta.</p>
      <p>Leé también el <a href="/legal/aviso">Aviso legal importante</a>: el servicio no reemplaza el asesoramiento profesional.</p>
      <h2>3. Cuentas</h2>
      <p>Para reservar o publicar un perfil necesitás una cuenta con datos verdaderos. Sos responsable de tu contraseña y de la actividad de tu cuenta. Una misma cuenta puede ser viajero y mentor.</p>
      <h2>4. Reservas y pagos</h2>
      <p>Cada mentor fija el precio de sus servicios. El pago se hace a través de Stripe al reservar, y RedEmigra no almacena los datos de tu tarjeta. El horario queda bloqueado durante un tiempo limitado mientras completás el pago. [COMISIÓN DE LA PLATAFORMA: COMPLETAR]. Los fondos se transfieren al mentor luego de realizada cada sesión, según se describe en la sección de cancelaciones y reembolsos.</p>
      <h2>5. Cancelaciones y reembolsos</h2>
      <p>Se rigen por <a href="/legal/cancelaciones">Cancelaciones y reembolsos</a>.</p>
      <h2>6. Conducta</h2>
      <p>Está prohibido suplantar identidades, publicar información falsa, acosar, pedir o realizar pagos fuera de la plataforma para evitar sus reglas, o usar el servicio con fines ilícitos. RedEmigra puede suspender cuentas que incumplan estas reglas.</p>
      <h2>7. Reseñas</h2>
      <p>Solo pueden dejar reseñas quienes tomaron una sesión. Las reseñas reflejan opiniones personales; RedEmigra puede ocultar las que incumplan estas reglas.</p>
      <h2>8. Responsabilidad</h2>
      <p>[LIMITACIÓN DE RESPONSABILIDAD: COMPLETAR CON ASESORAMIENTO LEGAL].</p>
      <h2>9. Ley aplicable y jurisdicción</h2>
      <p>[LEY Y JURISDICCIÓN APLICABLES: COMPLETAR].</p>
      <h2>10. Cambios</h2>
      <p>Podemos actualizar estos términos. Si el cambio es importante, te avisaremos.</p>`,
  },
  privacidad: {
    title: "Política de privacidad",
    body: () => html`
      <h2>1. Responsable</h2>
      <p>[NOMBRE LEGAL DE LA EMPRESA], [DOMICILIO], [EMAIL DE CONTACTO / DELEGADO DE PROTECCIÓN DE DATOS SI CORRESPONDE].</p>
      <h2>2. Qué datos tratamos</h2>
      <ul><li><strong>Cuenta:</strong> nombre, correo electrónico, país de origen, país de interés, idiomas y zona horaria.</li>
      <li><strong>Mentores:</strong> perfil público (nombre público, historia, foto, servicios, precios) y, si los subís, documentos de verificación (privados).</li>
      <li><strong>Reservas y mensajes:</strong> datos de las sesiones y el contenido del chat entre los participantes.</li>
      <li><strong>Pagos:</strong> los procesa Stripe. RedEmigra no almacena números de tarjeta; guarda identificadores de pago e importes.</li></ul>
      <h2>3. Para qué los usamos</h2>
      <p>Para crear y mantener tu cuenta, permitir reservas, pagos y mensajes, verificar mentores, prevenir fraude y abusos, y cumplir obligaciones legales. [BASES LEGALES POR FINALIDAD: COMPLETAR].</p>
      <h2>4. Con quién los compartimos</h2>
      <p>Con los proveedores que hacen funcionar el servicio: Supabase (base de datos y autenticación), Stripe (pagos) y [OTROS PROVEEDORES: correo, análisis, etc.]. Un mentor ve el nombre de quienes reservaron con él. Tu correo no se muestra públicamente.</p>
      <h2>5. Transferencias internacionales y conservación</h2>
      <p>[UBICACIÓN DE LOS SERVIDORES Y GARANTÍAS DE TRANSFERENCIA: COMPLETAR]. [PLAZOS DE CONSERVACIÓN: COMPLETAR].</p>
      <h2>6. Tus derechos</h2>
      <p>Podés pedir acceso, rectificación, supresión, oposición, limitación y portabilidad de tus datos escribiendo a [EMAIL DE CONTACTO]. También podés reclamar ante la autoridad de protección de datos que corresponda.</p>`,
  },
  cancelaciones: {
    title: "Cancelaciones y reembolsos",
    body: () => {
      const h = Number(state.settings.cancel_full_refund_hours || 24);
      const a = Number(state.settings.auto_complete_hours || 24);
      return html`
      <div class="notice" style="margin-bottom:16px">${ico("info")}<span>Estas reglas son una <strong>propuesta</strong> pendiente de aprobación definitiva. Los plazos se toman de los ajustes de la plataforma.</span></div>
      <h2>Si cancela quien reservó</h2>
      <ul><li>Con al menos <strong>${h} horas</strong> de anticipación: reembolso total.</li><li>Con menos anticipación: sin reembolso.</li></ul>
      <h2>Si cancela el mentor</h2>
      <p>Reembolso total a quien reservó.</p>
      <h2>Servicios con varias llamadas</h2>
      <p>Al cancelar una sesión de un servicio con varias llamadas, esa llamada vuelve a quedar disponible para agendar de nuevo. No se reembolsa por sesión suelta; cualquier otro caso lo resuelve el equipo de RedEmigra.</p>
      <h2>Cuándo cobra el mentor</h2>
      <p>El pago se libera al mentor por cada sesión realizada: cuando quien reservó confirma que se hizo o, si no hay confirmación ni reclamos, automáticamente a las ${a} horas de terminar.</p>
      <h2>Problemas con una sesión</h2>
      <p>Desde el detalle de tu reserva podés reportar un problema. Mientras haya un reporte abierto, el pago al mentor queda en pausa hasta que el equipo lo revise.</p>
      <h2>Plazos del reembolso</h2>
      <p>Los reembolsos se envían al medio de pago original. El tiempo en que aparecen depende de tu banco o emisor de tarjeta.</p>`;
    },
  },
};

export async function doc(ctx) {
  const d = DOCS[ctx.params.doc];
  if (!d) return ctx.set(html`<div class="container page"><div class="empty card"><h1>No encontramos este documento</h1><a class="btn btn--primary" href="/legal/aviso" style="margin-top:16px">Aviso legal</a></div></div>`);
  ctx.title(d.title);
  ctx.set(html`<div class="container page"><div class="mid"><article class="card legal"><h1>${d.title}</h1><div style="margin-top:18px">${DRAFT}${d.body()}</div></article></div></div>`);
}
