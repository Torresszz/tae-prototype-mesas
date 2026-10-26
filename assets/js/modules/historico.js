// ============================================================
// RESUMEN HISTÓRICO
// ============================================================

import { getData, saveData } from "../storage.js";

import { createId, escapeHTML } from "../utils.js";

import { showModal, closeForm } from "../forms/formHelper.js";

// ============================================================
// ESTADO
// ============================================================

let currentFilter = "";

let movimientosEjemplo = [];

let movimientosActuales = [];

// ============================================================
// INICIALIZAR
// ============================================================

export async function initHistorico() {
  window.renderHistorico = renderHistorico;

  // Dejamos también disponible la acción del botón.
  window.openMesasConfirmation = openMesasConfirmation;

  currentFilter = "";

  setupHistoricoSearch();

  setupMesasButton();
  setupAmparosMesasButton();

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
  const demandas = getData("demandas", []);

  const amparos = getData("amparos", []);

  const exhortos = getData("exhortos", []);

  const promociones = getData("promociones", []);

  const oficios = getData("oficios", []);

  const movimientos = [];

  // ========================================================
  // DEMANDAS
  // ========================================================

  demandas.forEach((item) => {
    movimientos.push({
      id: item.id,

      fecha: item.creadoEn || item.fecha,

      tipo: "Demanda",

      referencia: item.expediente || "Sin expediente",

      movimiento: "Registro de demanda",
    });
  });

  // ========================================================
  // AMPAROS
  // ========================================================

  amparos.forEach((item) => {
    movimientos.push({
      id: item.id,

      fecha: item.creadoEn || buildDateTime(item.dia, item.hora),

      tipo: "Amparo",

      referencia: item.expediente || "Sin expediente",

      movimiento: "Registro de amparo",
    });
  });

  // ========================================================
  // EXHORTOS
  // ========================================================

  exhortos.forEach((item) => {
    movimientos.push({
      id: item.id,

      fecha: item.creadoEn || item.fecha,

      tipo: "Exhorto",

      referencia: item.numero || item.expediente || "Sin referencia",

      movimiento: "Registro de exhorto",
    });
  });

  // ========================================================
  // PROMOCIONES
  // ========================================================

  promociones.forEach((item) => {
    movimientos.push({
      id: item.id,

      fecha: item.creadoEn || item.fecha,

      tipo: "Promoción",

      referencia: item.expediente || item.numero || "Sin referencia",

      movimiento: "Registro de promoción",
    });
  });

  // ========================================================
  // OFICIOS
  // ========================================================

  oficios.forEach((item) => {
    const tipo = item.tipo === "Promoción" ? "Promoción" : "Oficio";

    movimientos.push({
      id: item.id,

      fecha: item.creadoEn || item.fecha,

      tipo,

      referencia: item.expediente || item.numero || "Sin referencia",

      movimiento:
        tipo === "Promoción" ? "Registro de promoción" : "Registro de oficio",
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
// RENDER TABLA
// ============================================================

export function renderHistorico() {
  const tbody = document.getElementById("historicoTable");

  const empty = document.getElementById("historicoEmpty");

  if (!tbody) {
    return;
  }

  const movimientos = getMovimientos();

  movimientosActuales = movimientos.filter((item) => {
    if (!currentFilter) {
      return true;
    }

    const text = `

                    ${item.tipo || ""}
                    ${item.referencia || ""}
                    ${item.movimiento || ""}
                    ${formatDateTime(item.fecha)}

                `.toLowerCase();

    return text.includes(currentFilter);
  });

  // ========================================================
  // SIN RESULTADOS
  // ========================================================

  if (movimientosActuales.length === 0) {
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

  tbody.innerHTML = movimientosActuales
    .map(
      (item) => `

                    <tr>

                        <td>

                            ${escapeHTML(formatDateTime(item.fecha))}

                        </td>

                        <td>

                            ${escapeHTML(item.tipo || "—")}

                        </td>

                        <td>

                            ${escapeHTML(item.referencia || "—")}

                        </td>

                        <td>

                            ${escapeHTML(item.movimiento || "—")}

                        </td>

                    </tr>

                `,
    )
    .join("");

  updateResumen(movimientosActuales);
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

  setText("historicoOficios", resumen.oficios);
}

// ============================================================
// BOTÓN MANDAR A MESAS
// ============================================================

function setupMesasButton() {
  const button = document.getElementById("sendToMesasBtn");

  if (!button) {
    console.warn("No se encontró #sendToMesasBtn");

    return;
  }

  // Evita problemas por listeners anteriores.
  button.onclick = openMesasConfirmation;
}


function setupAmparosMesasButton() {
  const button = document.getElementById("sendAmparosToMesasBtn");
  if (!button) return;
  button.onclick = openAmparosMesasConfirmation;
}

function openAmparosMesasConfirmation() {
  const pendientes = getMovimientosPendientes().filter(item => item.tipo === "Amparo");
  if (!pendientes.length) {
    alert("No hay amparos pendientes de enviar a mesas.");
    return;
  }

  movimientosActuales = pendientes;
  const resumen = createResumen(pendientes);
  showModal(`
    <div class="mesas-confirm">
      <div class="mesas-confirm-icon"><i class="fa-solid fa-shield-halved"></i></div>
      <h2>Mandar solo amparos a mesas</h2>
      <p>Se enviarán únicamente los amparos que todavía no hayan sido enviados.</p>
      ${renderResumenModal(resumen)}
      <div class="mesas-confirm-actions">
        <button type="button" id="cancelAmparosMesasBtn" class="mesas-modal-btn secondary">Cancelar</button>
        <button type="button" id="confirmAmparosMesasBtn" class="mesas-modal-btn primary"><i class="fa-solid fa-paper-plane"></i> Confirmar envío</button>
      </div>
    </div>`);

  document.getElementById("cancelAmparosMesasBtn")?.addEventListener("click", closeForm);
  document.getElementById("confirmAmparosMesasBtn")?.addEventListener("click", () => sendAmparosToMesas(resumen));
}

function sendAmparosToMesas(resumen) {
  const envios = getData("enviosMesas", []);
  const envio = {
    id: createId(), fecha: new Date().toISOString(), tipoEnvio: "solo-amparos",
    total: resumen.total, demandas: 0, amparos: resumen.amparos, exhortos: 0, promociones: 0, oficios: 0,
    registros: movimientosActuales.map(item => ({ id: item.id, tipo: item.tipo, referencia: item.referencia, movimiento: item.movimiento }))
  };
  envios.unshift(envio);
  saveData("enviosMesas", envios);
  renderUltimoEnvio();
  showSuccessModal(envio);
}

// ============================================================
// MOVIMIENTOS YA ENVIADOS A MESAS
// ============================================================

function getClavesEnviadas() {
  const envios = getData("enviosMesas", []);
  const claves = new Set();

  envios.forEach((envio) => {
    if (!Array.isArray(envio.registros)) {
      return;
    }

    envio.registros.forEach((registro) => {
      if (registro?.id) {
        claves.add(`${registro.tipo || ""}::${registro.id}`);
      }
    });
  });

  return claves;
}

function getMovimientosPendientes() {
  const enviados = getClavesEnviadas();

  return getMovimientos().filter((item) => {
    if (!item.id) {
      return true;
    }

    return !enviados.has(`${item.tipo || ""}::${item.id}`);
  });
}

// ============================================================
// ABRIR CONFIRMACIÓN
// ============================================================

function openMesasConfirmation() {
  /*
   * Volvemos a obtener los datos para asegurar
   * que el resumen esté actualizado.
   */

  const movimientos = getMovimientosPendientes();

  const filtrados = movimientos.filter((item) => {
    if (!currentFilter) {
      return true;
    }

    const text = `

                    ${item.tipo || ""}
                    ${item.referencia || ""}
                    ${item.movimiento || ""}

                `.toLowerCase();

    return text.includes(currentFilter);
  });

  movimientosActuales = filtrados;

  if (movimientosActuales.length === 0) {
    alert("No hay movimientos para mandar a mesas.");

    return;
  }

  const resumen = createResumen(movimientosActuales);

  showModal(`

        <div class="mesas-confirm">


            <div class="mesas-confirm-icon">

                <i class="fa-solid fa-paper-plane"></i>

            </div>


            <h2>
                Mandar resumen a mesas
            </h2>


            <p>
                Se enviará el concentrado actual.
                Confirma que deseas continuar.
            </p>


            ${renderResumenModal(resumen)}


            <div class="mesas-confirm-actions">


                <button
                    type="button"
                    id="cancelMesasBtn"
                    class="mesas-modal-btn secondary"
                >

                    Cancelar

                </button>


                <button
                    type="button"
                    id="confirmMesasBtn"
                    class="mesas-modal-btn primary"
                >

                    <i class="fa-solid fa-paper-plane"></i>

                    Confirmar envío

                </button>


            </div>


        </div>

    `);

  const cancelButton = document.getElementById("cancelMesasBtn");

  const confirmButton = document.getElementById("confirmMesasBtn");

  if (cancelButton) {
    cancelButton.onclick = closeForm;
  }

  if (confirmButton) {
    confirmButton.onclick = () => {
      sendToMesas(resumen);
    };
  }
}

// ============================================================
// GUARDAR ENVÍO
// ============================================================

function sendToMesas(resumen) {
  const envios = getData("enviosMesas", []);

  const envio = {
    id: createId(),

    fecha: new Date().toISOString(),

    tipoEnvio: "general",

    total: resumen.total,

    demandas: resumen.demandas,

    amparos: resumen.amparos,

    exhortos: resumen.exhortos,

    promociones: resumen.promociones,

    oficios: resumen.oficios,

    registros: movimientosActuales.map((item) => ({
      id: item.id,

      tipo: item.tipo,

      referencia: item.referencia,

      movimiento: item.movimiento,
    })),
  };

  envios.unshift(envio);

  saveData("enviosMesas", envios);

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


            <h2>
                Resumen enviado
            </h2>


            <p>
                El concentrado fue enviado correctamente a mesas.
            </p>


            ${renderResumenModal(envio)}


            <div class="mesas-confirm-actions">

                <button
                    type="button"
                    id="finishMesasBtn"
                    class="mesas-modal-btn primary"
                >

                    Aceptar

                </button>

            </div>


        </div>

    `);

  const button = document.getElementById("finishMesasBtn");

  if (button) {
    button.onclick = closeForm;
  }
}

// ============================================================
// ÚLTIMO ENVÍO
// ============================================================

function renderUltimoEnvio() {
  const container = document.getElementById("ultimoEnvioMesas");

  if (!container) {
    return;
  }

  const envios = getData("enviosMesas", []);

  const last = envios[0];

  if (!last) {
    container.hidden = true;

    return;
  }

  container.hidden = false;

  container.innerHTML = `

        <div class="last-send-header">

            <strong>

                <i class="fa-solid fa-circle-check"></i>

                Último envío a mesas

            </strong>


            <span>

                ${escapeHTML(formatDateTime(last.fecha))}

            </span>

        </div>


        <div class="last-send-items">


            <span class="last-send-item">

                Total:
                <strong>
                    ${last.total}
                </strong>

            </span>


            <span class="last-send-item">

                Demandas:
                <strong>
                    ${last.demandas}
                </strong>

            </span>


            <span class="last-send-item">

                Amparos:
                <strong>
                    ${last.amparos}
                </strong>

            </span>


            <span class="last-send-item">

                Exhortos:
                <strong>
                    ${last.exhortos}
                </strong>

            </span>


            <span class="last-send-item">

                Promociones:
                <strong>
                    ${last.promociones}
                </strong>

            </span>


            <span class="last-send-item">

                Oficios:
                <strong>
                    ${last.oficios}
                </strong>

            </span>


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

      case "Oficio":
        resumen.oficios++;

        break;
    }
  });

  return resumen;
}

// ============================================================
// CONTENIDO MODAL RESUMEN
// ============================================================

function renderResumenModal(resumen) {
  return `

        <div class="mesas-confirm-summary">


            <div class="mesas-confirm-row">

                <span>
                    Demandas
                </span>

                <strong>
                    ${resumen.demandas}
                </strong>

            </div>


            <div class="mesas-confirm-row">

                <span>
                    Amparos
                </span>

                <strong>
                    ${resumen.amparos}
                </strong>

            </div>


            <div class="mesas-confirm-row">

                <span>
                    Exhortos
                </span>

                <strong>
                    ${resumen.exhortos}
                </strong>

            </div>


            <div class="mesas-confirm-row">

                <span>
                    Promociones
                </span>

                <strong>
                    ${resumen.promociones}
                </strong>

            </div>


            <div class="mesas-confirm-row">

                <span>
                    Oficios
                </span>

                <strong>
                    ${resumen.oficios}
                </strong>

            </div>


            <div
                class="
                    mesas-confirm-row
                    mesas-confirm-total
                "
            >

                <span>
                    Total enviado
                </span>

                <strong>
                    ${resumen.total}
                </strong>

            </div>


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
