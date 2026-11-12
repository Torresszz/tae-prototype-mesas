// ============================================================
// FLUJO AUTOMÁTICO DE ESTADOS
// assets/js/modules/mesas/flujoEstados.js
//
// El usuario ya NO elige el estado en un selector: ejecuta una
// ACCIÓN (enviar a firma, firmar, pasar a Actuaría...) y el
// sistema calcula el estado nuevo.
//
//   Oficialía -> Mesa -> Firma -> (En lista) -> Actuaría
//                                  Actuaría -> Mesa  (nueva atención)
//                                  Actuaría -> Archivo
//                                  Archivo  -> Mesa  (nueva promoción)
//
// Este módulo solo contiene las REGLAS (tabla de transiciones) y
// utilidades. Cada tabla (expedientes, promociones, calificación,
// demanda, audiencia, exhortos) guarda el resultado en su propia
// llave de localStorage.
// ============================================================

import { getData, saveData } from "../../storage.js";
import { escapeHTML } from "../../utils.js";
import { canSign } from "../../auth.js";
import { etiquetaEstado } from "./estados.js";
import { getNumeroExpediente, mesaDeExpediente } from "./mesaUtils.js";

const KEY_SEGUIMIENTO = "mesasSeguimiento";
const KEY_EXPEDIENTES = "expedientes";

// ------------------------------------------------------------
// TABLA DE TRANSICIONES
//   de:        estados desde los que la acción es válida
//   a:         estado resultante (se asigna solo)
//   rol:       "mesa" | "magistrada" | "auto" (sin botón)
//   ubicacion: dónde queda el asunto ("mesa" = Mesa N del expediente)
// ------------------------------------------------------------
export const ACCIONES_FLUJO = {
  "enviar-firma": {
    de: ["en-proceso", "en-revision-interna"],
    a: "en-firma",
    rol: "mesa",
    etiqueta: "Enviar a firma",
    icono: "fa-solid fa-paper-plane",
    primaria: true,
    movimiento: "Enviado a firma de la Magistrada",
    ubicacion: "Presidencia",
  },

  firmar: {
    de: ["en-firma"],
    a: "en-lista",
    rol: "magistrada",
    etiqueta: "Firmar",
    icono: "fa-solid fa-signature",
    primaria: true,
    movimiento: "Firmado por la Magistrada; pasa a En lista",
    ubicacion: "mesa",
  },

  "a-actuaria": {
    de: ["en-lista"],
    a: "en-actuaria",
    rol: "mesa",
    etiqueta: "Pasar a Actuaría",
    icono: "fa-solid fa-building-columns",
    primaria: true,
    movimiento: "Turnado a Actuaría",
    ubicacion: "Actuaría",
  },

  // Salida 1 de Actuaría: el asunto requiere nueva atención.
  "regresar-mesa": {
    de: ["en-actuaria"],
    a: "en-proceso",
    rol: "mesa",
    etiqueta: "Regresar a Mesa",
    icono: "fa-solid fa-rotate-left",
    primaria: false,
    movimiento: "Actuaría regresa el asunto a Mesa",
    ubicacion: "mesa",
  },

  // Salida 2 de Actuaría: el trámite terminó.
  archivar: {
    de: ["en-actuaria"],
    a: "en-archivo",
    rol: "mesa",
    etiqueta: "Pasar a Archivo",
    icono: "fa-solid fa-box-archive",
    primaria: true,
    movimiento: "Turnado a Archivo",
    ubicacion: "Archivo",
  },

  // Automática: llega una promoción nueva a un asunto en Actuaría o Archivo.
  reactivar: {
        de: ["en-archivo", "en-actuaria"],
    a: "en-proceso",
    rol: "auto",
    etiqueta: "Reactivar",
    icono: "fa-solid fa-rotate-left",
    primaria: false,
    movimiento: "Regresa a Mesa por una nueva promoción",
    ubicacion: "mesa",
  },
};

// Variaciones por tipo de asunto.
//   exhorto: no pasa por firma; se envía a Actuaría directamente
//   desde "En proceso". // PENDIENTE: confirmar si los exhortos
//   también deben pasar por firma de la Magistrada.
const ACCIONES_EXCLUIDAS = {
  exhorto: ["enviar-firma", "firmar"],
};

const ORIGENES_EXTRA = {
  exhorto: { "a-actuaria": ["en-proceso"] },
};

function origenesDe(accion, tipo) {
  const base = ACCIONES_FLUJO[accion]?.de || [];

  return [...base, ...(ORIGENES_EXTRA[tipo]?.[accion] || [])];
}

// ------------------------------------------------------------
// CONSULTAS
// ------------------------------------------------------------

export function puedeAplicar(accion, estado, tipo = "") {
  if (!ACCIONES_FLUJO[accion]) return false;

  if (ACCIONES_EXCLUIDAS[tipo]?.includes(accion)) return false;

  return origenesDe(accion, tipo).includes(estado);
}

// Acciones con botón que el usuario actual puede ejecutar.
export function accionesDisponibles(
  estado,
  { esMagistrada = canSign(), tipo = "" } = {},
) {
  const rolActual = esMagistrada ? "magistrada" : "mesa";

  return Object.entries(ACCIONES_FLUJO)
    .filter(
      ([clave, def]) =>
        def.rol === rolActual && puedeAplicar(clave, estado, tipo),
    )
    .map(([clave, def]) => ({ clave, ...def }));
}

// ------------------------------------------------------------
// APLICAR UNA ACCIÓN A UN REGISTRO (el estado lo calcula el sistema)
// Modifica `registro` y devuelve { ok, def } | { ok:false, error }.
// ------------------------------------------------------------

export function aplicarAccion(
  registro,
  accion,
  {
    campo = "estado",
    campoHistorial = "historial",
    tipo = "",
    extra = {},
    movimiento = "",
    usuario = "",
  } = {},
) {
  const def = ACCIONES_FLUJO[accion];

  if (!registro || !def) {
    return { ok: false, error: "Acción no válida." };
  }

  if (!puedeAplicar(accion, registro[campo], tipo)) {
    return {
      ok: false,
      error: `"${def.etiqueta}" no aplica cuando el estado es ${etiquetaEstado(registro[campo])}.`,
    };
  }

  const ahora = new Date().toISOString();

  registro[campo] = def.a;

  if (!Array.isArray(registro[campoHistorial])) {
    registro[campoHistorial] = [];
  }

  registro[campoHistorial].push({
    fecha: ahora,
    movimiento: movimiento || def.movimiento,
    ...(usuario ? { usuario } : {}),
  });

  Object.assign(registro, extra);

  return { ok: true, def, ahora };
}

// ------------------------------------------------------------
// EXPEDIENTES (mesasSeguimiento[numero] + ubicación)
// ------------------------------------------------------------

export function actualizarUbicacionExpediente(numero, ubicacion) {
  if (!ubicacion) return;

  const expedientes = getData(KEY_EXPEDIENTES, []);

  if (!Array.isArray(expedientes)) return;

  const expediente = expedientes.find(
    (item) => getNumeroExpediente(item) === String(numero),
  );

  if (!expediente) return;

  expediente.ubicacion =
    ubicacion === "mesa" ? `Mesa ${mesaDeExpediente(expediente)}` : ubicacion;

  saveData(KEY_EXPEDIENTES, expedientes);
}

// Aplica la acción al seguimiento del expediente y sincroniza ubicación.
export function aplicarAccionSeguimiento(
  numero,
  accion,
  { extra = {}, movimiento = "", usuario = "" } = {},
) {
  const seguimiento = getData(KEY_SEGUIMIENTO, {});

  const registro = seguimiento?.[numero];

  if (!registro) {
    return { ok: false, error: "El expediente no tiene seguimiento." };
  }

  const resultado = aplicarAccion(registro, accion, {
    extra,
    movimiento,
    usuario,
  });

  if (!resultado.ok) return resultado;

  registro.ultimoMovimiento = movimiento || resultado.def.movimiento;

  saveData(KEY_SEGUIMIENTO, seguimiento);

  actualizarUbicacionExpediente(numero, resultado.def.ubicacion);

  return resultado;
}

// Actuaría / Archivo -> En proceso cuando entra una promoción nueva.
// Devuelve true si el expediente se reactivó.
export function reactivarPorPromocionNueva(numero) {
  const seguimiento = getData(KEY_SEGUIMIENTO, {});

  if (!puedeAplicar("reactivar", seguimiento?.[numero]?.estado)) return false;

  return aplicarAccionSeguimiento(numero, "reactivar").ok;
}

// ------------------------------------------------------------
// UI COMPARTIDA
// ------------------------------------------------------------

export function renderEstadoBadge(estado) {
  return `
    <span class="mesas-estado-badge ${escapeHTML(estado || "")}">
      ${escapeHTML(etiquetaEstado(estado))}
    </span>
  `;
}

// Botones de las acciones disponibles para el estado dado.
//   actionAttr: atributo que escucha cada tabla (ej. "data-promociones-action")
//   attrs:      atributos extra para identificar la fila (ej. data-promocion-id="...")
export function renderBotonesFlujo(
  estado,
  { actionAttr, attrs = "", tipo = "", esMagistrada = canSign() } = {},
) {
  const acciones = accionesDisponibles(estado, { esMagistrada, tipo });

  const botones = acciones
    .map(
      (accion) => `
        <button
          type="button"
          class="${accion.primaria ? "mesas-primary-btn" : "mesas-secondary-btn"}"
          ${actionAttr}="flujo"
          data-flujo="${accion.clave}"
          ${attrs}
        >
          <i class="${accion.icono}"></i>
          ${escapeHTML(accion.etiqueta)}
        </button>
      `,
    )
    .join("");

  // La Magistrada no ve el botón mientras esté en otra etapa;
  // Mesa ve un aviso mientras espera la firma.
  if (!esMagistrada && estado === "en-firma" && tipo !== "exhorto") {
    return `
      <button
        type="button"
        class="mesas-secondary-btn"
        disabled
        title="Solo la Magistrada de Presidencia puede firmar"
      >
        <i class="fa-solid fa-hourglass-half"></i>
        Pendiente de firma
      </button>
    `;
  }

  return botones;
}

// Lee data-flujo del botón pulsado y valida que sea una acción conocida.
export function accionDeBoton(boton) {
  const accion = boton?.dataset?.flujo || "";

  return ACCIONES_FLUJO[accion] ? accion : "";
}
