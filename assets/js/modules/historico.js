// ============================================================
// RESUMEN HISTÓRICO
// ============================================================
//
// Muestra todos los documentos capturados en Oficialía y permite
// enviarlos a su módulo de destino. A dónde va cada uno depende
// del tipo de documento:
//
//   Demandas, Exhortos y Promociones ......... Mesas
//   Amparos directos ......................... Mesa de Amparo Directo
//   Amparos indirectos ....................... Mesa de Amparo Indirecto
//   Registrales .............................. Presidencia
//   Oficios .................................. el destino que se eligió
//                                              al capturarlos
//                                              (Administrativo, Presidencia u Otro)
//
// Los envíos se guardan en la clave "enviosMesas" de localStorage.
// ============================================================

import { getData, saveData } from "../storage.js";

import {
  createId,
  escapeHTML,
  getTipoAmparo,
} from "../utils.js";

import { showModal, closeForm } from "../forms/formHelper.js";

// ============================================================
// CONFIGURACIÓN DE ENVÍOS
// ============================================================

// grupo del destino -> qué botones lo incluyen
const MODOS = {
  todo: {
    titulo: "Enviar todo",
    descripcion:
      "Se enviarán todos los documentos pendientes, cada uno a su módulo de destino.",
    vacio: "No hay documentos pendientes de enviar.",
    icono: "fa-paper-plane",
    incluye: () => true,
  },

  amparos: {
    titulo: "Enviar amparos",
    descripcion:
      "Se enviarán los amparos pendientes: los directos a la Mesa de Amparo Directo y los indirectos a la Mesa de Amparo Indirecto.",
    vacio: "No hay amparos pendientes de enviar.",
    icono: "fa-shield-halved",
    incluye: (destino) => destino.grupo === "amparos",
  },

  mesas: {
    titulo: "Enviar a mesas",
    descripcion:
      "Se enviarán a Mesas las demandas, exhortos y promociones pendientes.",
    vacio: "No hay demandas, exhortos ni promociones pendientes de enviar.",
    icono: "fa-table-columns",
    incluye: (destino) => destino.grupo === "mesas",
  },

  presidencia: {
    titulo: "Enviar a presidencia",
    descripcion:
      "Se enviarán a Presidencia los registrales y los oficios cuyo destino sea Presidencia.",
    vacio: "No hay documentos pendientes de enviar a Presidencia.",
    icono: "fa-landmark",
    incluye: (destino) => destino.grupo === "presidencia",
  },
};

const ETIQUETA_ENVIO = {
  todo: "Todo",
  amparos: "Amparos",
  mesas: "Mesas",
  presidencia: "Presidencia",
  // Valores de versiones anteriores
  general: "Todo",
  "solo-amparos": "Amparos",
};

// ============================================================
// ESTADO
// ============================================================

let currentFilter = "";

let movimientosEjemplo = [];

// ============================================================
// INICIALIZAR
// ============================================================

export async function initHistorico() {
  window.renderHistorico = renderHistorico;

  // Compatibilidad con el nombre anterior.
  window.openMesasConfirmation = () => openEnvioConfirmation("mesas");

  currentFilter = "";

  setupHistoricoSearch();

  setupSendButtons();

  await loadHistoricoEjemplo();

  renderHistorico();

  renderUltimoEnvio();
}

// Compatibilidad por si app.js usa el nombre anterior.
export const initResumenHistorico = initHistorico;

// ============================================================
// CARGAR JSON DE EJEMPLO
// ============================================================

async function loadHistoricoEjemplo() {
  try {
    const url = new URL("../../data/historico-ejemplo.json", import.meta.url);

    const response = await fetch(url);

    if (!response.ok) {
      console.warn("No se pudo cargar historico-ejemplo.json");

      movimientosEjemplo = [];

      return;
    }

    const data = await response.json();

    movimientosEjemplo = Array.isArray(data) ? data : data.movimientos || [];
  } catch (error) {
    console.error("Error cargando historial de ejemplo:", error);

    movimientosEjemplo = [];
  }
}

// ============================================================
// MOVIMIENTOS REALES
// ============================================================

function getMovimientosLocales() {
  const movimientos = [];

  getData("demandas", []).forEach((item) => {
    movimientos.push({
      id: item.id,
      fecha: item.creadoEn || item.fecha,
      tipo: "Demanda",
      referencia: item.expediente || "Sin expediente",
    });
  });

  getData("amparos", []).forEach((item) => {
    movimientos.push({
      id: item.id,
      fecha: item.creadoEn || buildDateTime(item.dia, item.hora),
      tipo: "Amparo",
      subtipo: getTipoAmparo(item),
      referencia: item.expediente || "Sin expediente",
    });
  });

  getData("exhortos", []).forEach((item) => {
    movimientos.push({
      id: item.id,
      fecha: item.creadoEn || item.fecha,
      tipo: "Exhorto",
      referencia: item.numero || item.expediente || "Sin referencia",
    });
  });

  getData("promociones", []).forEach((item) => {
    movimientos.push({
      id: item.id,
      fecha: item.creadoEn || item.fecha,
      tipo: "Promoción",
      referencia: item.expediente || item.numero || "Sin referencia",
    });
  });

  getData("registrales", []).forEach((item) => {
    movimientos.push({
      id: item.id,
      fecha: item.creadoEn || item.fecha,
      tipo: "Registral",
      referencia: item.expediente || "Sin referencia",
    });
  });

  getData("oficios", []).forEach((item) => {
    movimientos.push({
      id: item.id,
      fecha: item.creadoEn || item.fecha,
      tipo: item.tipo === "Promoción" ? "Promoción" : "Oficio",
      referencia: item.expediente || item.numero || "Sin referencia",
      destino: item.destino || "",
      destinoOtro: item.destinoOtro || "",
    });
  });

  return movimientos;
}

// ============================================================
// OBTENER TODOS
// ============================================================

function getMovimientos() {
  const reales = getMovimientosLocales();

  /*
   * Por ahora mezclamos datos reales + demo.
   *
   * Después cuando conectemos backend/base de datos
   * podemos eliminar movimientosEjemplo.
   */

  const todos = [...reales, ...movimientosEjemplo];

  const mapa = new Map();

  todos.forEach((movimiento) => {
    const key = String(
      movimiento.id ||
        `${movimiento.tipo}-${movimiento.referencia}-${movimiento.fecha}`,
    );

    if (!mapa.has(key)) {
      mapa.set(key, movimiento);
    }
  });

  return Array.from(mapa.values()).sort(
    (a, b) => getTime(b.fecha) - getTime(a.fecha),
  );
}

// ============================================================
// DESTINO Y ESTADO DE CADA DOCUMENTO
// ============================================================

// Devuelve { grupo, etiqueta } o null si todavía no tiene destino.
function resolverDestino(item) {
  switch (item.tipo) {
    case "Demanda":
    case "Exhorto":
    case "Promoción":
      return { grupo: "mesas", etiqueta: "Mesas" };

    case "Amparo":
      return item.subtipo === "directo"
        ? { grupo: "amparos", etiqueta: "Mesa de Amparo Directo" }
        : { grupo: "amparos", etiqueta: "Mesa de Amparo Indirecto" };

    case "Registral":
      return { grupo: "presidencia", etiqueta: "Presidencia" };

    case "Oficio":
      if (item.destino === "Presidencia") {
        return { grupo: "presidencia", etiqueta: "Presidencia" };
      }

      if (item.destino === "Administrativo") {
        return { grupo: "administrativo", etiqueta: "Administrativo" };
      }

      if (item.destino === "Otro") {
        return {
          grupo: "otro",
          etiqueta: item.destinoOtro ? `Otro: ${item.destinoOtro}` : "Otro",
        };
      }

      return null;

    default:
      return null;
  }
}

function claveMovimiento(item) {
  return `${item.tipo || ""}::${item.id}`;
}

// Mapa clave -> { destino, fecha } con lo que ya fue enviado.
function getEnviados() {
  const mapa = new Map();

  // Los envíos más recientes están primero.
  getData("enviosMesas", []).forEach((envio) => {
    if (!Array.isArray(envio.registros)) {
      return;
    }

    envio.registros.forEach((registro) => {
      if (!registro?.id) {
        return;
      }

      const clave = `${registro.tipo || ""}::${registro.id}`;

      if (!mapa.has(clave)) {
        mapa.set(clave, { destino: registro.destino || "", fecha: envio.fecha });
      }
    });
  });

  return mapa;
}

function getEstado(item, enviados) {
  const destino = resolverDestino(item);

  const envio = enviados.get(claveMovimiento(item));

  if (envio) {
    return {
      clase: "enviado",
      texto: `Enviado a ${envio.destino || destino?.etiqueta || "su destino"}`,
      detalle: formatDateTime(envio.fecha),
    };
  }

  if (!destino) {
    return {
      clase: "sin-destino",
      texto: "Sin destino asignado",
      detalle: "Asigna un destino al oficio",
    };
  }

  return {
    clase: "pendiente",
    texto: "Pendiente de envío",
    detalle: `Destino: ${destino.etiqueta}`,
  };
}

// ============================================================
// RENDER TABLA
// ============================================================

export function renderHistorico() {
  const tbody = document.getElementById("historicoTable");

  const empty = document.getElementById("historicoEmpty");

  if (!tbody) {
    return;
  }

  const enviados = getEnviados();

  const movimientos = getMovimientos().filter((item) => {
    if (!currentFilter) {
      return true;
    }

    const estado = getEstado(item, enviados);

    const text = `
      ${item.tipo || ""}
      ${item.subtipo || ""}
      ${item.referencia || ""}
      ${estado.texto}
      ${estado.detalle || ""}
      ${formatDateTime(item.fecha)}
    `.toLowerCase();

    return text.includes(currentFilter);
  });

  // ========================================================
  // SIN RESULTADOS
  // ========================================================

  if (movimientos.length === 0) {
    tbody.innerHTML = "";

    if (empty) {
      empty.hidden = false;
    }

    updateResumen([]);

    return;
  }

  if (empty) {
    empty.hidden = true;
  }

  // ========================================================
  // FILAS
  // ========================================================

  tbody.innerHTML = movimientos
    .map((item) => {
      const estado = getEstado(item, enviados);

      const subtipo =
        item.tipo === "Amparo" && item.subtipo
          ? ` · ${item.subtipo === "directo" ? "Directo" : "Indirecto"}`
          : "";

      return `
        <tr>
          <td>${escapeHTML(formatDateTime(item.fecha))}</td>
          <td>${escapeHTML((item.tipo || "—") + subtipo)}</td>
          <td>${escapeHTML(item.referencia || "—")}</td>
          <td>
            <span class="historico-estado ${estado.clase}">
              ${escapeHTML(estado.texto)}
            </span>
            ${estado.detalle ? `<small class="historico-estado-detalle">${escapeHTML(estado.detalle)}</small>` : ""}
          </td>
        </tr>
      `;
    })
    .join("");

  updateResumen(movimientos);
}

// ============================================================
// BUSCADOR
// ============================================================

function setupHistoricoSearch() {
  const input = document.getElementById("historicoSearch");

  if (!input) {
    return;
  }

  input.oninput = (event) => {
    currentFilter = event.target.value.trim().toLowerCase();

    renderHistorico();
  };
}

// ============================================================
// RESUMEN
// ============================================================

function updateResumen(movimientos) {
  const resumen = createResumen(movimientos);

  setText("historicoTotal", resumen.total);

  setText("historicoDemandas", resumen.demandas);

  setText("historicoAmparos", resumen.amparos);

  setText("historicoExhortos", resumen.exhortos);

  setText("historicoPromociones", resumen.promociones);

  setText("historicoRegistrales", resumen.registrales);

  setText("historicoOficios", resumen.oficios);
}

// ============================================================
// BOTONES DE ENVÍO
// ============================================================

function setupSendButtons() {
  const botones = {
    sendAllBtn: "todo",
    sendAmparosBtn: "amparos",
    sendMesasBtn: "mesas",
    sendPresidenciaBtn: "presidencia",
  };

  Object.entries(botones).forEach(([id, modo]) => {
    const button = document.getElementById(id);

    if (!button) {
      console.warn(`No se encontró #${id}`);

      return;
    }

    // onclick evita acumular listeners al volver a entrar a la página.
    button.onclick = () => openEnvioConfirmation(modo);
  });
}

// Documentos pendientes que le corresponden a un botón.
function getPendientes(modo) {
  const enviados = getEnviados();

  return getMovimientos().filter((item) => {
    if (enviados.has(claveMovimiento(item))) {
      return false;
    }

    const destino = resolverDestino(item);

    return destino && MODOS[modo].incluye(destino);
  });
}

// ============================================================
// CONFIRMACIÓN DE ENVÍO
// ============================================================

function openEnvioConfirmation(modo) {
  const config = MODOS[modo];

  const pendientes = getPendientes(modo);

  if (pendientes.length === 0) {
    alert(config.vacio);

    return;
  }

  const resumen = createResumen(pendientes);

  const destinos = contarDestinos(pendientes);

  // Solo "Enviar todo" menciona los oficios que aún no tienen destino.
  const sinDestino =
    modo === "todo"
      ? getMovimientos().filter(
          (item) =>
            !getEnviados().has(claveMovimiento(item)) && !resolverDestino(item),
        ).length
      : 0;

  showModal(`
    <div class="mesas-confirm">

      <div class="mesas-confirm-icon">
        <i class="fa-solid ${config.icono}"></i>
      </div>

      <h2>${escapeHTML(config.titulo)}</h2>

      <p>${escapeHTML(config.descripcion)}</p>

      ${renderResumenModal(resumen)}

      ${renderDestinosModal(destinos)}

      ${
        sinDestino
          ? `<p class="historico-confirm-note">
               ${sinDestino} oficio(s) no tienen destino asignado y no se enviarán.
             </p>`
          : ""
      }

      <div class="mesas-confirm-actions">

        <button type="button" id="cancelEnvioBtn" class="mesas-modal-btn secondary">
          Cancelar
        </button>

        <button type="button" id="confirmEnvioBtn" class="mesas-modal-btn primary">
          <i class="fa-solid fa-paper-plane"></i>
          Confirmar envío
        </button>

      </div>

    </div>
  `);

  document.getElementById("cancelEnvioBtn").onclick = closeForm;

  document.getElementById("confirmEnvioBtn").onclick = () => {
    sendEnvio(modo, pendientes);
  };
}

// ============================================================
// GUARDAR ENVÍO
// ============================================================

function sendEnvio(modo, items) {
  const resumen = createResumen(items);

  const envios = getData("enviosMesas", []);

  const envio = {
    id: createId(),

    fecha: new Date().toISOString(),

    tipoEnvio: modo,

    total: resumen.total,

    demandas: resumen.demandas,

    amparos: resumen.amparos,

    exhortos: resumen.exhortos,

    promociones: resumen.promociones,

    registrales: resumen.registrales,

    oficios: resumen.oficios,

    destinos: contarDestinos(items),

    registros: items.map((item) => {
      const destino = resolverDestino(item);

      return {
        id: item.id,
        tipo: item.tipo,
        referencia: item.referencia,
        destino: destino.etiqueta,
        grupo: destino.grupo,
      };
    }),
  };

  envios.unshift(envio);

  saveData("enviosMesas", envios);

  // La columna Estado cambia a "Enviado a ..."
  renderHistorico();

  renderUltimoEnvio();

  showSuccessModal(envio);
}

// ============================================================
// MODAL ÉXITO
// ============================================================

function showSuccessModal(envio) {
  showModal(`
    <div class="mesas-confirm success">

      <div class="mesas-confirm-icon">
        <i class="fa-solid fa-check"></i>
      </div>

      <h2>Documentos enviados</h2>

      <p>Los documentos fueron enviados a su módulo de destino.</p>

      ${renderResumenModal(envio)}

      ${renderDestinosModal(envio.destinos)}

      <div class="mesas-confirm-actions">
        <button type="button" id="finishEnvioBtn" class="mesas-modal-btn primary">
          Aceptar
        </button>
      </div>

    </div>
  `);

  document.getElementById("finishEnvioBtn").onclick = closeForm;
}

// ============================================================
// ÚLTIMO ENVÍO
// ============================================================

function renderUltimoEnvio() {
  const container = document.getElementById("ultimoEnvioMesas");

  if (!container) {
    return;
  }

  const last = getData("enviosMesas", [])[0];

  if (!last) {
    container.hidden = true;

    return;
  }

  container.hidden = false;

  const item = (label, value) => `
    <span class="last-send-item">
      ${label}: <strong>${value ?? 0}</strong>
    </span>
  `;

  const etiqueta = ETIQUETA_ENVIO[last.tipoEnvio] || "Todo";

  container.innerHTML = `
    <div class="last-send-header">
      <strong>
        <i class="fa-solid fa-circle-check"></i>
        Último envío · ${escapeHTML(etiqueta)}
      </strong>
      <span>${escapeHTML(formatDateTime(last.fecha))}</span>
    </div>

    <div class="last-send-items">
      ${item("Total", last.total)}
      ${item("Demandas", last.demandas)}
      ${item("Amparos", last.amparos)}
      ${item("Exhortos", last.exhortos)}
      ${item("Promociones", last.promociones)}
      ${item("Registrales", last.registrales)}
      ${item("Oficios", last.oficios)}
    </div>
  `;
}

// ============================================================
// CREAR RESUMEN
// ============================================================

function createResumen(movimientos) {
  const resumen = {
    total: movimientos.length,
    demandas: 0,
    amparos: 0,
    exhortos: 0,
    promociones: 0,
    registrales: 0,
    oficios: 0,
  };

  movimientos.forEach((item) => {
    switch (item.tipo) {
      case "Demanda":
        resumen.demandas++;
        break;

      case "Amparo":
        resumen.amparos++;
        break;

      case "Exhorto":
        resumen.exhortos++;
        break;

      case "Promoción":
        resumen.promociones++;
        break;

      case "Registral":
        resumen.registrales++;
        break;

      case "Oficio":
        resumen.oficios++;
        break;
    }
  });

  return resumen;
}

// { "Mesas": 3, "Presidencia": 2, ... }
function contarDestinos(items) {
  const destinos = {};

  items.forEach((item) => {
    const destino = resolverDestino(item);

    if (destino) {
      destinos[destino.etiqueta] = (destinos[destino.etiqueta] || 0) + 1;
    }
  });

  return destinos;
}

// ============================================================
// CONTENIDO MODAL RESUMEN
// ============================================================

function renderResumenModal(resumen) {
  const fila = (label, value) => `
    <div class="mesas-confirm-row">
      <span>${label}</span>
      <strong>${value ?? 0}</strong>
    </div>
  `;

  return `
    <div class="mesas-confirm-summary">

      ${fila("Demandas", resumen.demandas)}
      ${fila("Amparos", resumen.amparos)}
      ${fila("Exhortos", resumen.exhortos)}
      ${fila("Promociones", resumen.promociones)}
      ${fila("Registrales", resumen.registrales)}
      ${fila("Oficios", resumen.oficios)}

      <div class="mesas-confirm-row mesas-confirm-total">
        <span>Total</span>
        <strong>${resumen.total}</strong>
      </div>

    </div>
  `;
}

function renderDestinosModal(destinos = {}) {
  const entradas = Object.entries(destinos);

  if (!entradas.length) {
    return "";
  }

  return `
    <div class="historico-confirm-destinos">
      <span>Destinos</span>
      ${entradas
        .map(
          ([destino, cantidad]) => `
            <div class="historico-confirm-destino">
              <i class="fa-solid fa-arrow-right"></i>
              ${escapeHTML(destino)}
              <strong>${cantidad}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

// ============================================================
// HELPERS
// ============================================================

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function buildDateTime(date, time) {
  if (!date) {
    return "";
  }

  if (!time) {
    return date;
  }

  return `${date}T${time}:00`;
}

function getTime(value) {
  if (!value) {
    return 0;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getTime();
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-MX", {
    day: "2-digit",

    month: "2-digit",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",
  });
}
