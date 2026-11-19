// ============================================================
// AMPAROS INDIRECTOS - INICIO
// Recepción desde Oficialía
// ============================================================

import {
  getData,
  saveData
} from "../storage.js";

import {
  escapeHTML,
  getTipoAmparo
} from "../utils.js";

import {
  showModal,
  closeForm
} from "../forms/formHelper.js";

import {
  getSession
} from "../auth.js";

import {
  cargarDemoAmparosIndirectos
} from "./mesasAmparosIndirectosDemo.js";


// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY_SEGUIMIENTO =
  "mesasAmparosSeguimiento";


// ============================================================
// RENDER / EVENTOS DE INICIO
// ============================================================

export function renderInicioAmparosIndirectos() {

  // ----------------------------------------------------------
  // RECIBIR
  // ----------------------------------------------------------

  const receiveButton =
    document.getElementById(
      "mampReceiveBtn"
    );

  if (receiveButton) {

    receiveButton.onclick =
      () => {

        abrirModalRecepcion();

      };

  }


  // ----------------------------------------------------------
  // DATOS DEMO
  // ----------------------------------------------------------

  const demoButton =
    document.getElementById(
      "mampLoadDemoBtn"
    );

  if (demoButton) {

    demoButton.onclick =
      () => {

        cargarDemoAmparosIndirectos();

        window
          .renderMesasAmparos
          ?.();

        renderInicioAmparosIndirectos();

      };

  }


  // ----------------------------------------------------------
  // CUADERNILLO
  // ----------------------------------------------------------

  const cuadernilloButton =
    document.getElementById(
      "mampGoCuadernillo"
    );

  if (cuadernilloButton) {

    cuadernilloButton.onclick =
      () => {

        const navButton =
          document.querySelector(
            '[data-page="mesas-amparos-indirectos-cuadernillo"]'
          );

        navButton?.click();

      };

  }

}


// ============================================================
// PENDIENTES DE RECEPCIÓN
// ============================================================

function getPendientesRecepcion() {

  const amparos =
    getData(
      "amparos",
      []
    );


  const seguimiento =
    getData(
      KEY_SEGUIMIENTO,
      {}
    );


  return amparos
    .filter(
      amparo =>
        getTipoAmparo(amparo) ===
        "indirecto"
    )
    .filter(
      amparo => {

        const estado =
          seguimiento[
            String(amparo.id)
          ];


        return (
          !estado ||
          estado.recibidoMesaIndirectos !== true
        );

      }
    );

}


// ============================================================
// ABRIR MODAL DE RECEPCIÓN
// ============================================================

function abrirModalRecepcion() {

  const pendientes =
    getPendientesRecepcion();


  showModal(`
    <div class="mesas-modal-shell mamp-receive-modal">

      <header class="mesas-modal-header">

        <div class="mesas-modal-header-text">

          <span class="mesas-mini-eyebrow">
            Oficialía de Partes
          </span>

          <h2>
            Amparos por recibir
          </h2>

          <p>
            Revisa los amparos indirectos enviados desde Oficialía
            y el plazo asignado a cada uno.
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        ${
          pendientes.length

            ? pendientes
                .map(
                  renderPendiente
                )
                .join("")

            : `
              <div class="mesas-empty-state">

                <div class="mesas-empty-icon">
                  <i class="fa-solid fa-inbox"></i>
                </div>

                <strong>
                  No hay amparos pendientes
                </strong>

                <span>
                  Todos los amparos indirectos enviados por Oficialía
                  ya fueron recibidos.
                </span>

              </div>
            `
        }

      </div>


      <footer class="mesas-modal-footer mamp-receive-actions">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="mampCloseReceive"
        >
          Cerrar
        </button>

        ${
          pendientes.length

            ? `
              <button
                type="button"
                class="mesas-modal-confirm"
                id="mampReceiveAll"
              >
                <i class="fa-solid fa-check-double"></i>
                Recibir todo
              </button>
            `

            : ""
        }

      </footer>

    </div>
  `);


  // ----------------------------------------------------------
  // CERRAR
  // ----------------------------------------------------------

  document
    .getElementById(
      "mampCloseReceive"
    )
    ?.addEventListener(
      "click",
      closeForm
    );


  // ----------------------------------------------------------
  // RECIBIR TODO
  // ----------------------------------------------------------

  document
    .getElementById(
      "mampReceiveAll"
    )
    ?.addEventListener(
      "click",
      recibirTodos
    );


  // ----------------------------------------------------------
  // RECIBIR INDIVIDUAL
  // ----------------------------------------------------------

  document
    .querySelectorAll(
      "[data-mamp-receive]"
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            recibirAmparo(
              button.dataset.mampReceive
            );

          };

      }
    );

}


// ============================================================
// TARJETA DE PENDIENTE
// ============================================================

function renderPendiente(
  amparo
) {

  const plazo =
    obtenerPlazoAmparo(
      amparo
    );


  return `
    <article class="mamp-receive-item">

      <div class="mamp-receive-main">

        <div>
          <span class="mamp-receive-label">
            Amparo
          </span>

          <strong>
            ${escapeHTML(
              amparo.id ||
              "—"
            )}
          </strong>
        </div>


        <div>
          <span class="mamp-receive-label">
            Expediente
          </span>

          <strong>
            ${escapeHTML(
              amparo.expediente ||
              "—"
            )}
          </strong>
        </div>


        <div>
          <span class="mamp-receive-label">
            Promovente
          </span>

          <strong>
            ${escapeHTML(
              amparo.promovente ||
              "—"
            )}
          </strong>
        </div>


        <div>
          <span class="mamp-receive-label">
            Juzgado
          </span>

          <strong>
            ${escapeHTML(
              amparo.juzgado ||
              amparo.juzgadoOrigen ||
              "—"
            )}
          </strong>
        </div>

      </div>


      <div class="mamp-receive-footer">

        <div class="mamp-receive-deadline">

          <span>
            Plazo
          </span>

          <strong>
            ${escapeHTML(
              plazo
            )}
          </strong>

          <small>
            Contado desde la llegada a Oficialía
          </small>

        </div>


        <button
          type="button"
          class="mesas-primary-btn"
          data-mamp-receive="${escapeHTML(
            String(amparo.id)
          )}"
        >

          <i class="fa-solid fa-check"></i>

          Recibir

        </button>

      </div>

    </article>
  `;

}


// ============================================================
// OBTENER TEXTO DEL PLAZO
// ============================================================

function obtenerPlazoAmparo(
  amparo
) {

  if (
    amparo.plazoCantidad &&
    amparo.plazoUnidad
  ) {

    const unidad =
      amparo.plazoUnidad === "horas"
        ? "h"
        : "días";


    return (
      `${amparo.plazoCantidad} ${unidad}`
    );

  }


  if (
    amparo.plazoClave === "24h"
  ) {
    return "24 h";
  }


  if (
    amparo.plazoClave === "48h"
  ) {
    return "48 h";
  }


  if (
    amparo.plazoClave === "3d"
  ) {
    return "3 días";
  }


  if (
    amparo.plazoClave === "5d"
  ) {
    return "5 días";
  }


  if (
    amparo.plazoClave === "10d"
  ) {
    return "10 días";
  }


  return "15 días";

}


// ============================================================
// RECIBIR INDIVIDUAL
// ============================================================

function recibirAmparo(
  id
) {

  const seguimiento =
    getData(
      KEY_SEGUIMIENTO,
      {}
    );


  const estado =
    seguimiento[
      String(id)
    ];


  if (!estado) {

    console.warn(
      "No existe seguimiento para el amparo:",
      id
    );

    return;

  }


  marcarComoRecibido(
    estado
  );


  saveData(
    KEY_SEGUIMIENTO,
    seguimiento
  );


  // Refrescar modal
  abrirModalRecepcion();


  // Refrescar tabla principal
  window
    .renderMesasAmparos
    ?.();

}


// ============================================================
// RECIBIR TODO
// ============================================================

function recibirTodos() {

  const pendientes =
    getPendientesRecepcion();


  if (!pendientes.length) {
    return;
  }


  const seguimiento =
    getData(
      KEY_SEGUIMIENTO,
      {}
    );


  pendientes.forEach(
    amparo => {

      const estado =
        seguimiento[
          String(amparo.id)
        ];


      if (!estado) {
        return;
      }


      marcarComoRecibido(
        estado
      );

    }
  );


  saveData(
    KEY_SEGUIMIENTO,
    seguimiento
  );


  closeForm();


  window
    .renderMesasAmparos
    ?.();

}


// ============================================================
// MARCAR ESTADO COMO RECIBIDO
// ============================================================

function marcarComoRecibido(
  estado
) {

  const ahora =
    new Date()
      .toISOString();


  const usuario =
    getSession()?.nombre ||
    "Mesa de Amparos Indirectos";


  estado.recibidoMesaIndirectos =
    true;


  estado.recibidoMesaIndirectosEn =
    ahora;


  estado.recibidoMesaIndirectosPor =
    usuario;


  if (
    !estado.situacion
  ) {

    estado.situacion =
      "esperando-cumplimiento";

  }


  if (
    !Array.isArray(
      estado.historial
    )
  ) {

    estado.historial =
      [];

  }


  estado.historial.push({

    fecha:
      ahora,

    movimiento:
      "Amparo indirecto recibido desde Oficialía de Partes",

    por:
      usuario

  });

}