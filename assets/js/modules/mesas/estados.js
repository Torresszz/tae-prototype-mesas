// ============================================================
// CATÁLOGO DE ESTADOS DE LA INSTRUCCIÓN
// assets/js/modules/mesas/estados.js
// Fuente: Excel "Modificaciones_Modulo_Secretaria_de_Acuerdos".
// ============================================================

export const ESTADOS = [
  { clave: "en-proceso", etiqueta: "En proceso" },
  { clave: "en-revision-interna", etiqueta: "En revisión interna" },
  { clave: "en-firma", etiqueta: "En firma" },
  { clave: "en-lista", etiqueta: "En lista" },
  { clave: "en-actuaria", etiqueta: "En Actuaría" },
  { clave: "en-archivo", etiqueta: "En Archivo" },
];

export const ESTADO_INICIAL = "en-proceso";

export const ESTADO_LABELS = Object.fromEntries(
  ESTADOS.map((estado) => [estado.clave, estado.etiqueta]),
);

export function etiquetaEstado(clave) {
  return ESTADO_LABELS[clave] || clave || "—";
}

// Subconjuntos por sección (se usan a partir de las Fases 4 y 5).
const subconjunto = (claves) => ESTADOS.filter((e) => claves.includes(e.clave));

export const ESTADOS_POR_SECCION = {
  mesas: ESTADOS,
  demanda: subconjunto([
    "en-proceso",
    "en-firma",
    "en-lista",
    "en-actuaria",
    "en-archivo",
  ]),
  promociones: ESTADOS,
  calificacion: subconjunto([
    "en-proceso",
    "en-revision-interna",
    "en-firma",
    "en-lista",
    "en-actuaria",
  ]),
  audiencia: subconjunto(["en-firma", "en-lista", "en-actuaria", "en-archivo"]),
};

// Solo para limpiar datos guardados con el catálogo anterior del prototipo.
export const MAPA_ESTADOS_ANTIGUOS = {
  pendiente: "en-proceso",
  acuerdo: "en-proceso",
  firma: "en-firma",
  firmado: "en-lista",
  archivo: "en-archivo",
};
