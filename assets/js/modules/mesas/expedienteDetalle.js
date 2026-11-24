// ============================================================
// DETALLE DEL EXPEDIENTE
// assets/js/modules/mesas/expedienteDetalle.js
// ============================================================

import { escapeHTML } from "../../utils.js";

import { getDetalleExpediente } from "./expedienteService.js";

import { renderEstadoBadge } from "./flujoEstados.js";

import {
  renderExpedientePromociones,
  activarConsultaPromociones,
} from "./expedientePromociones.js";

import {
  renderExpedienteDemanda,
  activarConsultaDemanda,
} from "./expedienteDemanda.js";

import {
  renderExpedienteActuaciones,
} from "./expedienteActuaciones.js";

// ============================================================
// CONFIGURACIÓN DE PESTAÑAS
// ============================================================

const TABS = [
  {
    id: "demanda",
    titulo: "Demanda inicial",
    icono: "fa-file-lines",
  },

  {
    id: "promociones",
    titulo: "Promociones",
    icono: "fa-folder-open",
  },

  {
    id: "actuaciones",
    titulo: "Actuaciones y audiencias",
    icono: "fa-calendar-days",
  },
];

// ============================================================
// ESTADO DE LA VISTA
// ============================================================

let expedienteActual = null;

let pestañaActiva = "demanda";

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderExpedienteDetalle(vista, numero, onBack = null) {
  if (!vista) {
    return;
  }

  const expediente = getDetalleExpediente(numero);

  if (!expediente) {
    window.alert("No se encontró el expediente seleccionado.");

    if (typeof onBack === "function") {
      onBack();
    }

    return;
  }

  // Al cambiar de expediente, volvemos a la
  // pestaña inicial.

  if (expedienteActual !== expediente.numero) {
    expedienteActual = expediente.numero;

    pestañaActiva = "demanda";
  }

  vista.innerHTML = `

    <section class="expediente-detalle">


      <!-- REGRESAR AL LISTADO -->

      <div class="expediente-detalle-navigation">

        <button
          type="button"
          class="expediente-volver-btn"
          data-detalle-action="volver"
        >

          <i class="fa-solid fa-arrow-left"></i>

          Volver a expedientes

        </button>


        <div class="expediente-breadcrumb">

          <span>
            Expedientes
          </span>

          <i class="fa-solid fa-chevron-right"></i>

          <strong>

            ${escapeHTML(expediente.numero)}

          </strong>

        </div>

      </div>


      <!-- CARÁTULA -->

      ${renderCaratula(expediente)}


      <!-- PESTAÑAS INTERNAS -->

      <section class="expediente-detalle-card">


        <nav
          class="expediente-detalle-tabs"
          aria-label="Información del expediente"
        >

          ${renderTabs(expediente)}

        </nav>


        <!-- CONTENIDO DINÁMICO -->

        <div
          class="expediente-detalle-content"
          id="expedienteDetalleContent"
        >

        </div>


      </section>


    </section>

  `;

  renderPestaña(vista, expediente);

  configurarEventosDetalle(vista, expediente, onBack);
}

// ============================================================
// CARÁTULA DEL EXPEDIENTE
// ============================================================

function renderCaratula(expediente) {
  return `

    <section class="expediente-caratula">


      <!-- ENCABEZADO -->

      <header class="expediente-caratula-header">


        <div class="expediente-caratula-identidad">


          <div class="expediente-caratula-icon">

            <i class="fa-regular fa-folder-open"></i>

          </div>


          <div>

            <span class="mesas-mini-eyebrow">

              Carátula del expediente

            </span>


            <h2>

              ${escapeHTML(expediente.numero)}

            </h2>


            <p>

              Secretaría de Acuerdos ·
              ${escapeHTML(formatMesa(expediente.mesa))}

            </p>

          </div>


        </div>


        <div class="expediente-caratula-estado">

          <span>

            Estado actual

          </span>

          ${renderEstadoBadge(expediente.estado)}

        </div>


      </header>


      <!-- INFORMACIÓN GENERAL -->

      <div class="expediente-caratula-grid">


        ${renderCampoCaratula("Actor", expediente.actor, "fa-user", "actor")}


        ${renderCampoCaratula(
          "Demandado",
          expediente.demandado,
          "fa-building-columns",
          "demandado",
        )}


        ${renderCampoCaratula(
          "Fecha de recepción",
          formatFecha(expediente.fecha),
          "fa-calendar",
        )}


        ${renderCampoCaratula(
          "Mesa asignada",
          formatMesa(expediente.mesa),
          "fa-briefcase",
        )}


      </div>


    </section>

  `;
}

// ============================================================
// CAMPO DE CARÁTULA
// ============================================================

function renderCampoCaratula(titulo, valor, icono, clase = "") {
  return `

    <div class="expediente-caratula-field ${clase}">


      <div class="expediente-field-icon">

        <i class="fa-solid ${icono}"></i>

      </div>


      <div class="expediente-field-info">

        <span>

          ${escapeHTML(titulo)}

        </span>


        <strong>

          ${escapeHTML(valor || "—")}

        </strong>

      </div>


    </div>

  `;
}

// ============================================================
// PESTAÑAS
// ============================================================

function renderTabs(expediente) {
  return TABS.map((tab) => {
    const active = pestañaActiva === tab.id;

    const contador =
      tab.id === "promociones" ? expediente.promociones.length : null;

    return `

        <button
          type="button"
          class="expediente-detalle-tab ${active ? "active" : ""}"
          data-detalle-action="tab"
          data-tab="${tab.id}"
          aria-pressed="${active}"
        >


          <i class="fa-solid ${tab.icono}"></i>


          <span>

            ${escapeHTML(tab.titulo)}

          </span>


          ${
            contador !== null
              ? `

                <span class="expediente-tab-counter">

                  ${contador}

                </span>

              `
              : ""
          }


        </button>

      `;
  })

    .join("");
}

// ============================================================
// RENDERIZAR CONTENIDO DE PESTAÑA
// ============================================================

function renderPestaña(vista, expediente) {
  const contenido = vista.querySelector("#expedienteDetalleContent");

  if (!contenido) {
    return;
  }

  switch (pestañaActiva) {
    // ========================================================
    // DEMANDA INICIAL
    // ========================================================

    case "demanda":
      contenido.innerHTML = renderExpedienteDemanda(expediente);

      activarConsultaDemanda(contenido, expediente);

      break;

    // ========================================================
    // PROMOCIONES
    // ========================================================

    case "promociones":
      contenido.innerHTML = renderExpedientePromociones(expediente);

      activarConsultaPromociones(contenido, expediente);

      break;

    // ========================================================
    // ACTUACIONES Y AUDIENCIAS
    // ========================================================

    case "actuaciones":

  contenido.innerHTML =
    renderExpedienteActuaciones(
      expediente,
    );

  break;
  }
}


// ============================================================
// ACTUACIONES · CONTENIDO PROVISIONAL
// ============================================================

function renderActuacionesProvisional(expediente) {
  return `

    <div class="expediente-tab-panel">


      <header class="expediente-panel-header">

        <div>

          <h3>

            Actuaciones y audiencias

          </h3>

          <p>

            Historial de movimientos y eventos del expediente.

          </p>

        </div>

      </header>


      <div class="expediente-resumen-card">

        <span>

          Audiencias registradas

        </span>

        <strong>

          ${expediente.audiencias.length}

        </strong>

      </div>


      <div class="expediente-resumen-card">

        <span>

          Actuaciones registradas

        </span>

        <strong>

          ${expediente.actuaciones.length}

        </strong>

      </div>


    </div>

  `;
}

// ============================================================
// ESTADO VACÍO
// ============================================================

// function renderEmpty(mensaje) {
//   return `

//     <div class="expediente-detalle-empty">

//       <i class="fa-regular fa-folder-open"></i>

//       <strong>

//         ${escapeHTML(mensaje)}

//       </strong>

//     </div>

//   `;
// }

// ============================================================
// EVENTOS
// ============================================================

function configurarEventosDetalle(vista, expediente, onBack) {
  vista.onclick = (event) => {
    const button = event.target.closest("[data-detalle-action]");

    if (!button) {
      return;
    }

    const action = button.dataset.detalleAction;

    switch (action) {
      // ======================================================
      // VOLVER
      // ======================================================

      case "volver":
        expedienteActual = null;

        pestañaActiva = "demanda";

        if (typeof onBack === "function") {
          onBack();
        }

        break;

      // ======================================================
      // CAMBIAR PESTAÑA
      // ======================================================

      case "tab":
        cambiarPestaña(vista, expediente, button.dataset.tab);

        break;
    }
  };
}

// ============================================================
// CAMBIAR PESTAÑA
// ============================================================

function cambiarPestaña(vista, expediente, tab) {
  const valida = TABS.some((item) => item.id === tab);

  if (!valida) {
    return;
  }

  pestañaActiva = tab;

  const tabsContainer = vista.querySelector(".expediente-detalle-tabs");

  if (tabsContainer) {
    tabsContainer.innerHTML = renderTabs(expediente);
  }

  renderPestaña(vista, expediente);
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function formatFecha(value) {
  if (!value) {
    return "—";
  }

  const parts = String(value).slice(0, 10).split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return String(value);
}

function formatMesa(mesa) {
  if (!mesa) {
    return "Sin asignar";
  }

  const texto = String(mesa);

  if (texto.toLowerCase().startsWith("mesa")) {
    return texto;
  }

  return `Mesa ${texto}`;
}
