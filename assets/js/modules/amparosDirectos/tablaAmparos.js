// ============================================================
// TABLA COMÚN DE AMPAROS DIRECTOS
// assets/js/modules/amparosDirectos/tablaAmparos.js
//
// "Amparos pendientes de realizar" y "Pendiente de enviar al TCC"
// muestran LOS MISMOS DATOS (mismas columnas y mismo orden); lo único
// que cambia entre pestañas es la columna de Acciones. Por eso las
// columnas viven aquí y ambas pestañas las reutilizan.
//
// Columnas: Documento · Expediente · Quejoso · Recibido · Radicación ·
//           Firma / lista · Informe · Ubicación · [Acciones]
// ============================================================

import { escapeHTML } from "../../utils.js";

import { quejosoDe, formatFecha } from "./datos.js";

import { firmasDe, ESTADO_FIRMADO } from "./firma.js";

// Días HÁBILES para presentar el informe justificado, contados desde
// el día siguiente a la llegada del documento desde Actuaría. El plazo
// vence al terminar el último día hábil.
export const DIAS_INFORME_TCC = 3;

// Sábados y domingos no cuentan. ⚠️ PENDIENTE: agregar aquí los días
// inhábiles del tribunal (festivos, vacaciones) como "AAAA-MM-DD".
export const DIAS_INHABILES = [];

// "Tiene radicación" = se eligió el tipo Y se subió el documento.
export function tieneRadicacion(seg) {
  return Boolean(seg?.radicacion?.tipo && seg.radicacion.documentoId);
}

export function estadoFirma(seg) {
  const firmas = firmasDe(seg);

  if (!firmas.length) return "Sin enviar a firma";

  const ultima = firmas[firmas.length - 1];

  if (ultima.listaNumero) return `Listado · lista #${ultima.listaNumero}`;

  return ultima.estado === ESTADO_FIRMADO
    ? "Firmado · pendiente de lista"
    : "En firma de la Magistrada";
}

// Momento en que el documento llegó de Actuaría (etapa Informe).
export function llegadaTcc(seg) {
  return seg?.tcc?.llegadaEn || seg?.desde || "";
}

function claveDia(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");

  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function esDiaHabil(fecha) {
  const dia = fecha.getDay();

  return dia !== 0 && dia !== 6 && !DIAS_INHABILES.includes(claveDia(fecha));
}

// Día resultante de sumar `n` días hábiles (el día de `desde` no cuenta).
export function sumarDiasHabiles(desde, n) {
  const fecha = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());

  let contados = 0;

  while (contados < n) {
    fecha.setDate(fecha.getDate() + 1);

    if (esDiaHabil(fecha)) contados++;
  }

  return fecha;
}

// Fin del plazo: último instante del último día hábil.
export function venceInforme(seg) {
  const llegada = new Date(llegadaTcc(seg));

  if (Number.isNaN(llegada.getTime())) return null;

  const fin = sumarDiasHabiles(llegada, DIAS_INFORME_TCC);

  fin.setHours(23, 59, 59, 999);

  return fin;
}

// Días hábiles que faltan después de hoy hasta el día de vencimiento.
function diasHabilesRestantes(vence, ahora) {
  const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

  const fin = new Date(vence.getFullYear(), vence.getMonth(), vence.getDate());

  let restantes = 0;

  while (fecha < fin) {
    fecha.setDate(fecha.getDate() + 1);

    if (esDiaHabil(fecha)) restantes++;
  }

  return restantes;
}

// "Vence 29/10/2026 · quedan 2 días hábiles" | "Vence hoy" | "Venció 27/10/2026"
export function textoVencimiento(seg, ahora = Date.now()) {
  const vence = venceInforme(seg);

  if (!vence) return "—";

  const fecha = formatFecha(vence);

  if (ahora > vence.getTime()) return `Venció ${fecha}`;

  const dias = diasHabilesRestantes(vence, new Date(ahora));

  if (dias === 0) return `Vence hoy (${fecha})`;

  return `Vence ${fecha} · ${dias === 1 ? "queda 1 día hábil" : `quedan ${dias} días hábiles`}`;
}

export function ubicacionDe(seg) {
  if (!seg) return "Oficialía de Partes";

  return seg.actuaria?.activo ? "Actuaría" : "Mesa de Amparos";
}

function htmlRadicacion(seg) {
  const rad = seg?.radicacion;

  if (tieneRadicacion(seg)) {
    return `<span class="mesas-stage-badge mamp-ok">${escapeHTML(rad.tipoEtiqueta || rad.tipo)}</span>
      <small class="mampd-pend-sub">Documento: ${escapeHTML(rad.archivo || "subido")}</small>`;
  }

  if (rad?.tipo) {
    return `<span class="mesas-stage-badge mamp-warn">${escapeHTML(rad.tipoEtiqueta || rad.tipo)}</span>
      <small class="mampd-pend-sub">Falta subir el documento</small>`;
  }

  return `<span class="mesas-stage-badge">Sin radicación</span>`;
}

function htmlInforme(seg) {
  if (!seg) return "—";

  if (seg.etapa === "informe" && !seg.actuaria?.activo) {
    const doc = seg.cuadernillo?.docs?.["informe-justificado"];

    return `<strong>${escapeHTML(textoVencimiento(seg))}</strong>
      <small class="mampd-pend-sub">${doc?.documentoId ? `Informe: ${escapeHTML(doc.archivo || "subido")}` : "Informe sin subir"}</small>`;
  }

  return seg.informe?.numero ? `Oficio ${escapeHTML(seg.informe.numero)}` : "—";
}

export function htmlEncabezadoTabla() {
  return `
    <thead>
      <tr>
        <th>Documento</th>
        <th>Expediente</th>
        <th>Quejoso</th>
        <th>Recibido</th>
        <th>Radicación</th>
        <th>Firma / lista</th>
        <th>Informe</th>
        <th>Ubicación</th>
        <th>Acciones</th>
      </tr>
    </thead>`;
}

// Todas las celdas de datos (sin Acciones). Cada pestaña agrega la suya.
export function htmlCeldasDatos({ amparo, seg }) {
  return `
      <td>
        <strong>Amparo ${escapeHTML(amparo.id)}</strong>
        <small class="mampd-pend-sub">${escapeHTML(amparo.actoReclamado || "—")}</small>
      </td>
      <td><strong class="mesas-expediente-number">${escapeHTML(amparo.expediente || "—")}</strong></td>
      <td>${escapeHTML(quejosoDe(amparo, seg))}</td>
      <td>${escapeHTML(formatFecha(amparo.dia))}</td>
      <td>${htmlRadicacion(seg)}</td>
      <td>${seg ? escapeHTML(estadoFirma(seg)) : "—"}</td>
      <td>${htmlInforme(seg)}</td>
      <td><span class="mesas-stage-badge">${escapeHTML(ubicacionDe(seg))}</span></td>`;
}
