// ============================================================
// CALIFICACIÓN
// assets/js/modules/mesas/calificacion.js
// FASE 4 - T-15
// ============================================================

import { getData, saveData } from "../../storage.js";
import { createId, escapeHTML, todayISO } from "../../utils.js";

import {
  aplicarFiltrosGlobales,
} from "./filtros.js";

import {
  etiquetaEstado,
} from "./estados.js";

import {
  etiquetaEstadoAcuerdo,
} from "./catalogos.js";

import {
  getExpedientesMesaActual,
  getNumeroExpediente,
} from "./mesaUtils.js";

import {
  montarAgendaEn,
} from "./agenda.js";


// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY_CALIFICACIONES = "mesasCalificaciones";

const ESTADOS_CALIFICACION = [
  "en-proceso",
  "en-revision-interna",
  "en-firma",
  "en-lista",
  "en-actuaria",
];

let busquedaPersona = "";
let resultadoActivo = "todas";


// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderCalificacion() {
  const vista = document.querySelector(
    '[data-mesas-vista="calificacion"]',
  );

  if (!vista) {
    return;
  }

  prepararCalificaciones();

  const registros =
    getRegistrosCalificacion();

  const porAcordar =
    registros.filter(
      (item) =>
        item.calificacion.resultado ===
        "por-acordar",
    );

  const acordados =
    registros.filter(
      (item) =>
        item.calificacion.resultado ===
        "acordado",
    );


  vista.innerHTML = `
    <section class="mesas-fase4-section">

      <!-- ================================================
      ENCABEZADO
      ================================================= -->
      <div class="mesas-fase4-header">

        <div>
          <span class="mesas-mini-eyebrow">
            Fase 4 · T-15
          </span>

          <h2>
            Calificación
          </h2>

          <p>
            Calificación de la demanda y agendas de auxiliar y titular.
          </p>
        </div>

      </div>


      <!-- ================================================
      CONTADORES
      ================================================= -->
      <div class="mesas-fase4-counters">

        <button
          type="button"
          class="mesas-fase4-counter ${
            resultadoActivo === "todas"
              ? "active"
              : ""
          }"
          data-calificacion-action="resultado"
          data-resultado="todas"
        >
          <span>Todos</span>
          <strong>${registros.length}</strong>
        </button>


        <button
          type="button"
          class="mesas-fase4-counter ${
            resultadoActivo === "por-acordar"
              ? "active"
              : ""
          }"
          data-calificacion-action="resultado"
          data-resultado="por-acordar"
        >
          <span>Por acordar</span>
          <strong>${porAcordar.length}</strong>
        </button>


        <button
          type="button"
          class="mesas-fase4-counter ${
            resultadoActivo === "acordado"
              ? "active"
              : ""
          }"
          data-calificacion-action="resultado"
          data-resultado="acordado"
        >
          <span>Acordados</span>
          <strong>${acordados.length}</strong>
        </button>

      </div>


      <!-- ================================================
      BÚSQUEDA ACTOR / DEMANDADO
      El expediente usa la barra global.
      ================================================= -->
      <div class="mesas-calificacion-toolbar">

        <label class="mesas-fase4-field">

          <span>
            Actor o demandado
          </span>

          <div class="mesas-search">

            <i class="fa-solid fa-magnifying-glass"></i>

            <input
              id="calificacionBusquedaPersona"
              type="search"
              value="${escapeHTML(busquedaPersona)}"
              placeholder="Buscar por actor o demandado..."
              autocomplete="off"
            >

          </div>

          <small>
            El expediente se busca desde la barra global superior.
          </small>

        </label>

      </div>


      <!-- ================================================
      LISTADO
      ================================================= -->
      <section class="mesas-secretaria-table-card">

        <div class="mesas-table-wrapper">

          <table class="mesas-calificacion-table">

            <thead>
              <tr>
                <th>Expediente</th>
                <th>Actor</th>
                <th>Demandado</th>
                <th>Estado</th>
                <th>Calificación</th>
                <th>Notas</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              ${renderFilasCalificacion(
                getRegistrosVisibles(),
              )}
            </tbody>

          </table>

        </div>


        <div
          class="mesas-empty-state"
          id="calificacionEmpty"
          hidden
        >

          <div class="mesas-empty-icon">
            <i class="fa-regular fa-folder-open"></i>
          </div>

          <strong>
            No hay expedientes en esta vista
          </strong>

          <span>
            Cambia la búsqueda o los filtros.
          </span>

        </div>

      </section>


      <!-- ================================================
      AGENDA AUXILIAR
      Calificaciones → 1 aviso a auxiliar
      ================================================= -->
      <div class="mesas-fase4-agenda-block">

        <div class="mesas-fase4-subheader">

          <div>
            <span class="mesas-mini-eyebrow">
              Agenda
            </span>

            <h3>
              Agenda auxiliar
            </h3>

            <p>
              Programación de calificaciones.
            </p>
          </div>

        </div>

        <div data-calificacion-agenda-auxiliar></div>

      </div>


      <!-- ================================================
      AGENDA TITULAR
      Audiencias → Actuaría + Archivo
      ================================================= -->
      <div class="mesas-fase4-agenda-block">

        <div class="mesas-fase4-subheader">

          <div>
            <span class="mesas-mini-eyebrow">
              Agenda
            </span>

            <h3>
              Agenda del titular
            </h3>

            <p>
              Audiencias programadas para la mesa.
            </p>
          </div>

        </div>

        <div data-calificacion-agenda-titular></div>

      </div>


      <!-- ================================================
      PLANTILLAS
      ================================================= -->
      <div data-plantillas-slot></div>

    </section>
  `;


  actualizarListado();

  configurarEventosCalificacion(
    vista,
  );


  // ========================================================
  // AGENDA AUXILIAR
  // ========================================================

  montarAgendaEn(
    vista.querySelector(
      "[data-calificacion-agenda-auxiliar]",
    ),
    {
      tipoInicial:
        "calificacion",

      filtroInicial:
        "calificacion",

      titulo:
        "Agenda auxiliar · Calificaciones",
    },
  );


  // ========================================================
  // AGENDA TITULAR
  // ========================================================

  montarAgendaEn(
    vista.querySelector(
      "[data-calificacion-agenda-titular]",
    ),
    {
      tipoInicial:
        "audiencia",

      filtroInicial:
        "audiencia",

      titulo:
        "Agenda del titular · Audiencias",
    },
  );
}


// ============================================================
// PREPARAR DATOS
// ============================================================

function prepararCalificaciones() {
  const expedientes =
    getExpedientesMesaActual();

  let calificaciones =
    getData(
      KEY_CALIFICACIONES,
      [],
    );


  if (!Array.isArray(calificaciones)) {
    calificaciones = [];
  }


  let changed = false;


  expedientes.forEach(
    (expediente) => {
      const numero =
        getNumeroExpediente(
          expediente,
        );


      if (!numero) {
        return;
      }


      const existente =
        calificaciones.find(
          (item) =>
            item.expediente ===
            numero,
        );


      if (existente) {
        // Normaliza datos antiguos/incompletos.
        if (
          !ESTADOS_CALIFICACION.includes(
            existente.estado,
          )
        ) {
          existente.estado =
            "en-proceso";

          changed = true;
        }


        if (
          ![
            "por-acordar",
            "acordado",
          ].includes(
            existente.resultado,
          )
        ) {
          existente.resultado =
            "por-acordar";

          changed = true;
        }


        if (
          typeof existente.notas !==
          "string"
        ) {
          existente.notas = "";

          changed = true;
        }

        return;
      }


      calificaciones.push({
        id:
          createId(),

        expediente:
          numero,

        estado:
          "en-proceso",

        resultado:
          "por-acordar",

        notas:
          "",
      });


      changed = true;
    },
  );


  if (changed) {
    saveData(
      KEY_CALIFICACIONES,
      calificaciones,
    );
  }
}


// ============================================================
// REGISTROS
// ============================================================

function getRegistrosCalificacion() {
  const expedientes =
    getExpedientesMesaActual();

  const calificaciones =
    getData(
      KEY_CALIFICACIONES,
      [],
    );


  const lista =
    Array.isArray(calificaciones)
      ? calificaciones
      : [];


  const mapa =
    new Map(
      lista.map(
        (item) => [
          item.expediente,
          item,
        ],
      ),
    );


  return expedientes
    .map(
      (expediente) => {
        const numero =
          getNumeroExpediente(
            expediente,
          );

        const calificacion =
          mapa.get(
            numero,
          );


        if (!calificacion) {
          return null;
        }


        return {
          numero,

          expediente,

          actor:
            expediente.actor ||
            expediente.promovente ||
            "—",

          demandado:
            expediente.demandado ||
            "—",

          fecha:
            expediente.fechaRecepcion ||
            expediente.fecha ||
            expediente.creadoEn ||
            "",

          calificacion,
        };
      },
    )
    .filter(Boolean);
}


// ============================================================
// FILTROS
// ============================================================

function getRegistrosVisibles() {
  let registros =
    getRegistrosCalificacion();


  registros =
    aplicarFiltrosGlobales(
      registros,
      {
        numero:
          (item) =>
            item.numero,

        fecha:
          (item) =>
            item.fecha,

        estado:
          (item) =>
            item.calificacion.estado,
      },
    );


  const texto =
    busquedaPersona
      .trim()
      .toLowerCase();


  if (texto) {
    registros =
      registros.filter(
        (item) => {
          const personas = `
            ${item.actor}
            ${item.demandado}
          `.toLowerCase();

          return personas.includes(
            texto,
          );
        },
      );
  }


  if (
    resultadoActivo !==
    "todas"
  ) {
    registros =
      registros.filter(
        (item) =>
          item.calificacion.resultado ===
          resultadoActivo,
      );
  }


  return registros;
}


// ============================================================
// FILAS
// ============================================================

function renderFilasCalificacion(
  registros,
) {
  return registros
    .map(
      (item) => {
        const acordado =
          item.calificacion.resultado ===
          "acordado";


        return `
          <tr>

            <td>

              <strong class="mesas-expediente-number">
                ${escapeHTML(
                  item.numero,
                )}
              </strong>

            </td>


            <td>
              ${escapeHTML(
                item.actor,
              )}
            </td>


            <td>
              ${escapeHTML(
                item.demandado,
              )}
            </td>


            <td>

              <select
                class="mesas-fase4-state-select"
                data-calificacion-estado
                data-calificacion-id="${escapeHTML(
                  item.calificacion.id,
                )}"
              >

                ${ESTADOS_CALIFICACION.map(
                  (estado) => `
                    <option
                      value="${estado}"
                      ${
                        item.calificacion.estado ===
                        estado
                          ? "selected"
                          : ""
                      }
                    >
                      ${escapeHTML(
                        etiquetaEstado(
                          estado,
                        ),
                      )}
                    </option>
                  `,
                ).join("")}

              </select>

            </td>


            <td>

              <span class="mesas-fase4-category-badge ${
                acordado
                  ? "done"
                  : "pending"
              }">

                ${escapeHTML(
                  etiquetaEstadoAcuerdo(
                    item.calificacion.resultado,
                  ),
                )}

              </span>

            </td>


            <td>

              <input
                type="text"
                class="mesas-calificacion-notas"
                data-calificacion-notas
                data-calificacion-id="${escapeHTML(
                  item.calificacion.id,
                )}"
                value="${escapeHTML(
                  item.calificacion.notas ||
                  "",
                )}"
                placeholder="Notas..."
              >

            </td>


            <td>

              <button
                type="button"
                class="${
                  acordado
                    ? "mesas-secondary-btn"
                    : "mesas-primary-btn"
                }"
                data-calificacion-action="toggle-resultado"
                data-calificacion-id="${escapeHTML(
                  item.calificacion.id,
                )}"
              >

                <i class="fa-solid ${
                  acordado
                    ? "fa-rotate-left"
                    : "fa-check"
                }"></i>

                ${
                  acordado
                    ? "Reabrir"
                    : "Marcar acordado"
                }

              </button>

            </td>

          </tr>
        `;
      },
    )
    .join("");
}


// ============================================================
// ACTUALIZAR TABLA
// ============================================================

function actualizarListado() {
  const vista =
    document.querySelector(
      '[data-mesas-vista="calificacion"]',
    );

  if (!vista) {
    return;
  }


  const tbody =
    vista.querySelector(
      ".mesas-calificacion-table tbody",
    );

  const empty =
    vista.querySelector(
      "#calificacionEmpty",
    );


  if (!tbody) {
    return;
  }


  const registros =
    getRegistrosVisibles();


  if (!registros.length) {
    tbody.innerHTML = "";

    if (empty) {
      empty.hidden = false;
    }

    return;
  }


  if (empty) {
    empty.hidden = true;
  }


  tbody.innerHTML =
    renderFilasCalificacion(
      registros,
    );


  configurarCamposListado(
    vista,
  );
}


// ============================================================
// EVENTOS
// ============================================================

function configurarEventosCalificacion(
  vista,
) {
  const search =
    vista.querySelector(
      "#calificacionBusquedaPersona",
    );


  if (search) {
    search.oninput =
      (event) => {
        busquedaPersona =
          event.target.value;

        actualizarListado();
      };
  }


  vista.onclick =
    (event) => {
      const button =
        event.target.closest(
          "[data-calificacion-action]",
        );

      if (!button) {
        return;
      }


      const action =
        button.dataset
          .calificacionAction;


      switch (action) {
        case "resultado":
          resultadoActivo =
            button.dataset.resultado ||
            "todas";

          renderCalificacion();
          break;


        case "toggle-resultado":
          toggleResultado(
            button.dataset
              .calificacionId,
          );
          break;
      }
    };


  configurarCamposListado(
    vista,
  );
}


// ============================================================
// CAMPOS DE TABLA
// ============================================================

function configurarCamposListado(
  vista,
) {
  vista
    .querySelectorAll(
      "[data-calificacion-estado]",
    )
    .forEach(
      (select) => {
        select.onchange =
          () => {
            cambiarEstado(
              select.dataset
                .calificacionId,

              select.value,
            );
          };
      },
    );


  vista
    .querySelectorAll(
      "[data-calificacion-notas]",
    )
    .forEach(
      (input) => {
        input.onchange =
          () => {
            guardarNotas(
              input.dataset
                .calificacionId,

              input.value,
            );
          };
      },
    );
}


// ============================================================
// ESTADO
// ============================================================

function cambiarEstado(
  id,
  nuevoEstado,
) {
  if (
    !ESTADOS_CALIFICACION.includes(
      nuevoEstado,
    )
  ) {
    return;
  }


  const calificaciones =
    getData(
      KEY_CALIFICACIONES,
      [],
    );


  if (
    !Array.isArray(
      calificaciones,
    )
  ) {
    return;
  }


  const item =
    calificaciones.find(
      (registro) =>
        registro.id === id,
    );


  if (!item) {
    return;
  }


  item.estado =
    nuevoEstado;


  saveData(
    KEY_CALIFICACIONES,
    calificaciones,
  );


  actualizarListado();
}


// ============================================================
// RESULTADO
// ============================================================

function toggleResultado(
  id,
) {
  const calificaciones =
    getData(
      KEY_CALIFICACIONES,
      [],
    );


  if (
    !Array.isArray(
      calificaciones,
    )
  ) {
    return;
  }


  const item =
    calificaciones.find(
      (registro) =>
        registro.id === id,
    );


  if (!item) {
    return;
  }


  item.resultado =
    item.resultado ===
    "acordado"
      ? "por-acordar"
      : "acordado";

  // Fase 7 (Estadística): fecha en que se concluyó la calificación
  if (item.resultado === "acordado") {
    item.concluidaEn = todayISO();
  } else {
    delete item.concluidaEn;
  }


  saveData(
    KEY_CALIFICACIONES,
    calificaciones,
  );


  renderCalificacion();
}


// ============================================================
// NOTAS
// ============================================================

function guardarNotas(
  id,
  notas,
) {
  const calificaciones =
    getData(
      KEY_CALIFICACIONES,
      [],
    );


  if (
    !Array.isArray(
      calificaciones,
    )
  ) {
    return;
  }


  const item =
    calificaciones.find(
      (registro) =>
        registro.id === id,
    );


  if (!item) {
    return;
  }


  item.notas =
    String(
      notas || "",
    ).trim();


  saveData(
    KEY_CALIFICACIONES,
    calificaciones,
  );
}