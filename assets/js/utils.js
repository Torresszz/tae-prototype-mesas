// =====================================================
// UTILIDADES GENERALES
// =====================================================

export function createId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");
}

export function escapeJS(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")

    .replaceAll("'", "\\'")

    .replaceAll("\n", "\\n");
}

export function todayISO() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatDate(value) {
  if (!value) {
    return "—";
  }

  const parts = value.split("-");

  if (parts.length === 3) {
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  return value;
}

export function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("es-MX", {
    day: "2-digit",

    month: "2-digit",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",
  });
}

export function truncate(text, length = 60) {
  text = String(text ?? "");

  if (text.length <= length) {
    return text;
  }

  return text.substring(0, length) + "...";
}

// =====================================================
// AMPAROS: TIPO Y JUZGADOS (compartido por Oficialía y Mesas)
// =====================================================

export const JUZGADOS_DISTRITO = [
  "Juzgado Primero de Distrito del Estado",
  "Juzgado Segundo de Distrito del Estado",
  "Juzgado Tercero de Distrito del Estado",
];

export const AUTORIDAD_DIRECTO = "Tribunal Colegiado de Circuito (TCC)";

// Devuelve "directo" o "indirecto". Los amparos nuevos traen
// `tipoAmparo`; para registros viejos se deduce por texto.
export function getTipoAmparo(amparo = {}) {
  if (amparo.tipoAmparo === "directo" || amparo.tipoAmparo === "indirecto") {
    return amparo.tipoAmparo;
  }

  const texto = [
    amparo.juzgado,
    amparo.oficio,
    amparo.observaciones,
    amparo.actoReclamado,
  ]
    .filter(Boolean)
    .join(" ");

  if (/indirecto/i.test(texto)) {
    return "indirecto";
  }

  return /colegiado|directo|TCC/i.test(texto) ? "directo" : "indirecto";
}

// Texto del destino de un oficio: Administrativo / Presidencia / Otro: xxx
export function destinoOficioTexto(oficio = {}) {
  if (!oficio.destino) {
    return "";
  }

  if (oficio.destino === "Otro") {
    return oficio.destinoOtro ? `Otro: ${oficio.destinoOtro}` : "Otro";
  }

  return oficio.destino;
}
