// ============================================================
// AMPAROS DIRECTOS: acceso a datos compartido
// assets/js/modules/amparosDirectos/datos.js
//
// Los módulos de esta carpeta (cuadernillo, firma, listas) leen y
// escriben el seguimiento que lleva mesasAmparos.js
// (llave "mesasAmparosSeguimiento"). Se centraliza aquí para no
// importar mesasAmparos.js desde ellos (evita imports circulares).
// ============================================================

import { getData, saveData } from "../../storage.js";

import { getSession } from "../../auth.js";

import { getNumeroExpediente } from "../mesas/mesaUtils.js";

export const KEY_SEGUIMIENTO = "mesasAmparosSeguimiento";

export function nombreUsuario() {
  return getSession()?.nombre || "Mesa de Amparos";
}

// Amparos directos con seguimiento: [{ amparo, seg }]
export function amparosDirectos() {
  const seguimiento = getData(KEY_SEGUIMIENTO, {}) || {};

  const amparos = getData("amparos", []);

  return (Array.isArray(amparos) ? amparos : [])
    .filter((amparo) => seguimiento[String(amparo.id)]?.tipo === "directo")
    .map((amparo) => ({ amparo, seg: seguimiento[String(amparo.id)] }));
}

export function obtenerAmparo(id) {
  const amparo = getData("amparos", []).find(
    (item) => String(item.id) === String(id),
  );

  const seg = (getData(KEY_SEGUIMIENTO, {}) || {})[String(id)];

  return amparo && seg ? { amparo, seg } : null;
}

// fn(seg) modifica el seguimiento; se guarda al terminar.
export function actualizarSeg(id, fn) {
  const todo = getData(KEY_SEGUIMIENTO, {}) || {};

  const seg = todo[String(id)];

  if (!seg) return false;

  fn(seg);

  saveData(KEY_SEGUIMIENTO, todo);

  return true;
}

export function logSeg(seg, movimiento) {
  if (!Array.isArray(seg.historial)) seg.historial = [];

  seg.historial.push({
    fecha: new Date().toISOString(),
    movimiento,
    por: nombreUsuario(),
  });
}

export function quejosoDe(amparo, seg) {
  const quejosos = seg?.partes?.quejosos || [];

  if (!quejosos.length) return amparo.promovente || "—";

  return quejosos.length > 1
    ? `${quejosos[0].nombre} +${quejosos.length - 1}`
    : quejosos[0].nombre;
}

// Actor y demandado del juicio laboral: salen del expediente al que
// pertenece el amparo; si no existe, de lo que traiga el propio amparo.
export function actorDemandadoDe(amparo) {
  const numero = String(amparo?.expediente || "").trim();

  const expedientes = getData("expedientes", []);

  const expediente = (Array.isArray(expedientes) ? expedientes : []).find(
    (item) => numero && getNumeroExpediente(item) === numero,
  );

  return {
    actor: expediente?.actor || expediente?.promovente || amparo?.actor || "—",
    demandado: expediente?.demandado || amparo?.demandado || "—",
  };
}

export function formatFecha(valor) {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return "—";

  return fecha.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
