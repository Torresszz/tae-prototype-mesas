// ============================================================
// CATÁLOGOS DEL MÓDULO MESAS
// assets/js/modules/mesas/catalogos.js
// ============================================================


// ============================================================
// PLANTILLAS
// FASE 2
// ============================================================

export const PLANTILLA_CATEGORIAS = [
  {
    clave: "demanda",
    etiqueta: "Demanda",
    icono: "fa-file-lines",
  },
  {
    clave: "promociones",
    etiqueta: "Promociones",
    icono: "fa-file-pen",
  },
  {
    clave: "calificacion",
    etiqueta: "Calificación",
    icono: "fa-scale-balanced",
  },
    {
    clave: "audiencia",
    etiqueta: "Audiencia",
    icono: "fa-gavel",
  },
  {
    clave: "consultas",
    etiqueta: "Consultas",
    icono: "fa-right-left",
  },
  {
    clave: "oficios",
    etiqueta: "Oficios",
    icono: "fa-envelope-open-text",
  },
];

export function etiquetaCategoriaPlantilla(clave) {
  return (
    PLANTILLA_CATEGORIAS.find(
      (categoria) =>
        categoria.clave === clave,
    )?.etiqueta ||
    clave ||
    "—"
  );
}


// ============================================================
// AGENDA
// FASE 3
// ============================================================

export const TIPOS_EVENTO_AGENDA = [
  {
    clave: "audiencia",
    etiqueta: "Audiencia",
    icono: "fa-gavel",
  },
    {
    clave: "calificacion",
    etiqueta: "Calificación",
    icono: "fa-scale-balanced",
  },
  {
    clave: "promocion",
    etiqueta: "Promoción",
    icono: "fa-file-pen",
  },
  {
    clave: "exhorto",
    etiqueta: "Exhorto",
    icono: "fa-file-import",
  },
];

// Dos agendas finales:
//   1. Audiencias (apartado Audiencia)
//   2. Promociones / Calificaciones / Exhortos (apartado Agenda)
export const TIPOS_AGENDA_AUDIENCIAS = ["audiencia"];

export const TIPOS_AGENDA_PROMOCIONES = [
  "promocion",
  "calificacion",
  "exhorto",
];

// Los eventos de exhorto se crean solo desde el apartado Exhortos.
export const TIPOS_AGENDA_MANUALES = [
  "audiencia",
  "calificacion",
  "promocion",
];

// Agenda de Promociones / Calificaciones / Exhortos: dos agendas, y cada
// una contiene los tres tipos de evento.
export const AGENDAS = [
  { clave: "auxiliar", etiqueta: "Agenda Auxiliar" },
  { clave: "titular", etiqueta: "Agenda Titular" },
];

// Agenda a la que pertenece un evento. Los eventos nuevos guardan su
// agenda; los anteriores (sin el campo) caen por tipo:
// calificación -> Auxiliar; promoción / exhorto -> Titular. ⚠️
export function agendaDeEvento(evento) {
  if (evento?.agenda === "auxiliar" || evento?.agenda === "titular") {
    return evento.agenda;
  }

  return evento?.tipo === "calificacion" ? "auxiliar" : "titular";
}

export function etiquetaAgenda(clave) {
  return AGENDAS.find((agenda) => agenda.clave === clave)?.etiqueta || clave || "—";
}

export function etiquetaTipoEventoAgenda(clave) {
  return (
    TIPOS_EVENTO_AGENDA.find(
      (tipo) =>
        tipo.clave === clave,
    )?.etiqueta ||
    clave ||
    "—"
  );
}

export function iconoTipoEventoAgenda(clave) {
  return (
    TIPOS_EVENTO_AGENDA.find(
      (tipo) =>
        tipo.clave === clave,
    )?.icono ||
    "fa-calendar-day"
  );
}


// ============================================================
// DESTINATARIOS DE AGENDA
// FASE 3
// ============================================================

export const DESTINATARIOS_AGENDA = [
  {
    clave: "auxiliar",
    etiqueta: "Auxiliar",
  },
  {
    clave: "actuaria",
    etiqueta: "Actuaría",
  },
  {
    clave: "archivo",
    etiqueta: "Archivo",
  },
];

export function etiquetaDestinatarioAgenda(clave) {
  return (
    DESTINATARIOS_AGENDA.find(
      (destinatario) =>
        destinatario.clave === clave,
    )?.etiqueta ||
    clave ||
    "—"
  );
}


// ============================================================
// DEMANDA
// FASE 4 - T-13
// ============================================================

export const CATEGORIAS_DEMANDA = [
  {
    clave: "por-radicar",
    etiqueta: "Por radicar",
  },
  {
    clave: "radicado",
    etiqueta: "Radicado",
  },
];

export function etiquetaCategoriaDemanda(clave) {
  return (
    CATEGORIAS_DEMANDA.find(
      (categoria) =>
        categoria.clave === clave,
    )?.etiqueta ||
    clave ||
    "—"
  );
}


// ============================================================
// PROMOCIONES Y CALIFICACIÓN
// FASE 4 - T-14 / T-15
// ============================================================

export const ESTADOS_ACUERDO = [
  {
    clave: "por-acordar",
    etiqueta: "Por acordar",
  },
  {
    clave: "acordado",
    etiqueta: "Acordado",
  },
];

export function etiquetaEstadoAcuerdo(clave) {
  return (
    ESTADOS_ACUERDO.find(
      (estado) =>
        estado.clave === clave,
    )?.etiqueta ||
    clave ||
    "—"
  );
}
// ============================================================
// AUDIENCIA
// FASE 5 - T-16
// ============================================================

export const TIPOS_AUDIENCIA = [
  "Trifásica",
  "Testimonial",
  "Confesionales",
  "Cotejos",
  "Inspección",
  "Ratificación de la contestación",
  "Ratificación de convenio",
  "Ratificación de desistimiento",
  "Incidental",
];


// ============================================================
// ESTADOS DE AUDIENCIA
// ============================================================

export const ESTADOS_AUDIENCIA = [
  {
    clave: "por-desahogar",
    etiqueta: "Por desahogar",
  },
  {
    clave: "desahogada",
    etiqueta: "Desahogada",
  },
];

export function etiquetaEstadoAudiencia(clave) {
  return (
    ESTADOS_AUDIENCIA.find(
      (estado) =>
        estado.clave === clave,
    )?.etiqueta ||
    clave ||
    "—"
  );
}

// ============================================================
// CONSULTAS
// FASE 6 - T-17
// ============================================================
export const ACCIONES_CONSULTA = [
  {
    clave: "enviar",
    etiqueta: "Enviar",
    pasado: "Enviado",
  },
  {
    clave: "regresar",
    etiqueta: "Regresar",
    pasado: "Regresado",
  },
];

export function etiquetaAccionConsulta(clave) {
  return (
    ACCIONES_CONSULTA.find(
      (accion) =>
        accion.clave === clave,
    )?.pasado ||
    clave ||
    "—"
  );
}

// Destinos de Consultas (enviar / regresar)
export const DESTINOS_CONSULTA = [
  "Presidencia",
  "Actuaría",
  "Archivo",
  "Proyectos",
  "Mesas",
];
