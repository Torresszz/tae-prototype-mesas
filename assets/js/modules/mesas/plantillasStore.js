// ============================================================
// ALMACÉN DE PLANTILLAS
// assets/js/modules/mesas/plantillasStore.js
//
// Único lugar que conoce DÓNDE se guardan las plantillas.
// Hoy es localStorage (llave "mesasPlantillas"); cuando exista un
// servidor, solo hay que reescribir estas funciones y mantener las
// firmas: listar, obtener, guardar, borrar.
//
// Registro: { id, nombre, categoria, tipoArchivo, nombreArchivo,
//             tamano, dataUrl, subidoPor, fecha }
// ============================================================

import { getData, saveData } from "../../storage.js";

import { createId, todayISO } from "../../utils.js";

import { MESAS_CONFIG } from "./config.js";

const KEY = "mesasPlantillas";

export const EXTENSIONES_PERMITIDAS = ["docx", "pdf"];

// ------------------------------------------------------------
// LECTURA
// ------------------------------------------------------------

// Más recientes primero. Todas las mesas comparten las plantillas.
export function listar({ categoria = "" } = {}) {
  const lista = getData(KEY, []);

  return (Array.isArray(lista) ? lista : [])
    .filter((item) => !categoria || item.categoria === categoria)
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

export function obtener(id) {
  return getData(KEY, []).find((item) => item.id === id) || null;
}

// Aproximado: caracteres guardados por las plantillas.
export function espacioUsadoBytes() {
  return getData(KEY, []).reduce(
    (total, item) => total + String(item.dataUrl || "").length,
    0,
  );
}

// ------------------------------------------------------------
// VALIDACIÓN DEL ARCHIVO
// ------------------------------------------------------------

export function extensionDe(nombreArchivo) {
  const partes = String(nombreArchivo || "").toLowerCase().split(".");

  return partes.length > 1 ? partes.pop() : "";
}

// Devuelve un mensaje de error, o "" si el archivo es válido.
export function validarArchivo(archivo) {
  if (!archivo) {
    return "Selecciona un archivo.";
  }

  if (!EXTENSIONES_PERMITIDAS.includes(extensionDe(archivo.name))) {
    return "Solo se permiten archivos .docx o .pdf.";
  }

  const maxBytes = MESAS_CONFIG.PLANTILLA_MAX_MB * 1024 * 1024;

  if (archivo.size > maxBytes) {
    return `El archivo supera el límite de ${MESAS_CONFIG.PLANTILLA_MAX_MB} MB.`;
  }

  return "";
}

export function leerComoDataUrl(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();

    lector.onload = () => resolve(String(lector.result));

    lector.onerror = () => reject(lector.error || new Error("Lectura fallida"));

    lector.readAsDataURL(archivo);
  });
}

// ------------------------------------------------------------
// ESCRITURA
// ------------------------------------------------------------

// Devuelve { ok: true, plantilla } o { ok: false, error: "cuota" | "otro" }.
export function guardar({ nombre, categoria, archivo, dataUrl, subidoPor }) {
  const plantilla = {
    id: createId(),
    nombre: String(nombre || "").trim(),
    categoria,
    tipoArchivo: extensionDe(archivo.name),
    nombreArchivo: archivo.name,
    tamano: archivo.size,
    dataUrl,
    subidoPor: subidoPor || "—",
    fecha: todayISO(),
  };

  try {
    saveData(KEY, [...getData(KEY, []), plantilla]);

    return { ok: true, plantilla };
  } catch (error) {
    console.error("No se pudo guardar la plantilla:", error);

    const cuota =
      error?.name === "QuotaExceededError" ||
      error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error?.code === 22 ||
      error?.code === 1014;

    return { ok: false, error: cuota ? "cuota" : "otro" };
  }
}

export function borrar(id) {
  const lista = getData(KEY, []);

  const restantes = lista.filter((item) => item.id !== id);

  if (restantes.length === lista.length) {
    return false;
  }

  saveData(KEY, restantes);

  return true;
}
