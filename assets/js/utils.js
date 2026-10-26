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
