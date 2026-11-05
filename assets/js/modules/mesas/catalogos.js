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
];

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