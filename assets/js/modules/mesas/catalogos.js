// ============================================================
// CATÁLOGOS DEL MÓDULO MESAS (distintos de los estados)
// assets/js/modules/mesas/catalogos.js
// Las fases siguientes agregan aquí el resto de los catálogos
// (tipos de audiencia, destinos de Consultas, etc.).
// ============================================================

export const PLANTILLA_CATEGORIAS = [
  { clave: "demanda", etiqueta: "Demanda", icono: "fa-file-lines" },
  { clave: "promociones", etiqueta: "Promociones", icono: "fa-file-pen" },
  { clave: "calificacion", etiqueta: "Calificación", icono: "fa-scale-balanced" },
  { clave: "consultas", etiqueta: "Consultas", icono: "fa-right-left" },
  { clave: "oficios", etiqueta: "Oficios", icono: "fa-envelope-open-text" },
];

export function etiquetaCategoriaPlantilla(clave) {
  return PLANTILLA_CATEGORIAS.find((c) => c.clave === clave)?.etiqueta || clave || "—";
}
