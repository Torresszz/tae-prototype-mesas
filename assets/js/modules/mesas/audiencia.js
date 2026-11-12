// ============================================================
// AUDIENCIA
// assets/js/modules/mesas/audiencia.js
// FASE 5 - T-16
// ============================================================

import { getData, saveData } from "../../storage.js";
import { escapeHTML } from "../../utils.js";

import {
  aplicarFiltrosGlobales,
} from "./filtros.js";

import {
  etiquetaEstado,
} from "./estados.js";

import {
  TIPOS_AGENDA_AUDIENCIAS,
  TIPOS_AUDIENCIA,
  etiquetaEstadoAudiencia,
} from "./catalogos.js";

import {
  getExpedientesMesaActual,
  getNumeroExpediente,
} from "./mesaUtils.js";

import {
  montarAgendaEn,
} from "./agenda.js";
import {
  aplicarAccionSeguimiento,
  accionDeBoton,
  renderBotonesFlujo,
  renderEstadoBadge,
} from "./flujoEstados.js";
import {
  getSession,
} from "../../auth.js";


// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY_AGENDA = "mesasAgenda";
const KEY_SEGUIMIENTO = "mesasSeguimiento";

const ESTADOS_EXPEDIENTE_AUDIENCIA = [
  "en-firma",
  "en-lista",
  "en-actuaria",
  "en-archivo",
];

let busquedaExpediente = "";
let estadoAudienciaActivo = "todas";


// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderAudiencia() {
  const vista = document.querySelector(
    '[data-mesas-vista="audiencia"]',
  );

  if (!vista) {
    return;
  }

  normalizarAudiencias();

  const registros =
    getRegistrosAudiencia();

  const porDesahogar =
    registros.filter(
      (item) =>
        item.estadoAudiencia ===
        "por-desahogar",
    );

  const desahogadas =
    registros.filter(
      (item) =>
        item.estadoAudiencia ===
        "desahogada",
    );


  vista.innerHTML = `
    <section class="mesas-fase5-section">

      <!-- ================================================
      ENCABEZADO
      ================================================= -->
      <div class="mesas-fase4-header">

        <div>
          <span class="mesas-mini-eyebrow">
            Fase 5 · T-16
          </span>

          <h2>
            Audiencia
          </h2>

          <p>
            Programación y seguimiento de audiencias.
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
            estadoAudienciaActivo === "todas"
              ? "active"
              : ""
          }"
          data-audiencia-action="estado-filtro"
          data-estado="todas"
        >
          <span>Todos</span>
          <strong>${registros.length}</strong>
        </button>


        <button
          type="button"
          class="mesas-fase4-counter ${
            estadoAudienciaActivo === "por-desahogar"
              ? "active"
              : ""
          }"
          data-audiencia-action="estado-filtro"
          data-estado="por-desahogar"
        >
          <span>Por desahogar</span>
          <strong>${porDesahogar.length}</strong>
        </button>


        <button
          type="button"
          class="mesas-fase4-counter ${
            estadoAudienciaActivo === "desahogada"
              ? "active"
              : ""
          }"
          data-audiencia-action="estado-filtro"
          data-estado="desahogada"
        >
          <span>Desahogadas</span>
          <strong>${desahogadas.length}</strong>
        </button>

      </div>


      <!-- ================================================
      BUSCADOR
      ================================================= -->
      <div class="mesas-audiencia-toolbar">

        <label class="mesas-fase4-field">

          <span>
            Buscar expediente
          </span>

          <div class="mesas-search">

            <i class="fa-solid fa-magnifying-glass"></i>

            <input
              id="audienciaBusquedaExpediente"
              type="search"
              value="${escapeHTML(busquedaExpediente)}"
              placeholder="Ej. 124/2026..."
              autocomplete="off"
            >

          </div>

          <small>
            Busca coincidencias dentro de los expedientes de la mesa actual.
          </small>

        </label>

      </div>


      <!-- ================================================
      LISTADO DE AUDIENCIAS
      ================================================= -->
      <section class="mesas-secretaria-table-card">

        <div class="mesas-table-wrapper">

          <table class="mesas-audiencia-table">

            <thead>
              <tr>
                <th>Expediente</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Tipo de audiencia</th>
                <th>Estado audiencia</th>
                <th>Estado expediente</th>
                <th>Notas</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              ${renderFilasAudiencia(
                getRegistrosVisibles(),
              )}
            </tbody>

          </table>

        </div>


        <div
          class="mesas-empty-state"
          id="audienciaEmpty"
          hidden
        >

          <div class="mesas-empty-icon">
            <i class="fa-regular fa-calendar-xmark"></i>
          </div>

          <strong>
            No hay audiencias en esta vista
          </strong>

          <span>
            Programa una audiencia desde el calendario o cambia los filtros.
          </span>

        </div>

      </section>


      <!-- ================================================
      CALENDARIO
      ================================================= -->
      <div class="mesas-fase4-agenda-block">

        <div class="mesas-fase4-subheader">

          <div>
            <span class="mesas-mini-eyebrow">
              Agenda
            </span>

            <h3>
              Calendario de audiencias
            </h3>

            <p>
              Programa, edita o elimina audiencias desde el calendario.
            </p>
          </div>

        </div>


        <div
          data-audiencia-agenda
        ></div>
      </div>
      <div data-plantillas-slot></div>
    </section>
  `;


  actualizarListadoAudiencias();

  configurarEventosAudiencia(
    vista,
  );


  const agendaSlot =
    vista.querySelector(
      "[data-audiencia-agenda]",
    );


  montarAgendaEn(
    agendaSlot,
    {
      tipos:
        TIPOS_AGENDA_AUDIENCIAS,
      tipoInicial:
        "audiencia",
      filtroInicial:
        "audiencia",
      titulo:
        "Agenda de audiencias",
    },
  );


  // Mantiene sincronizado el listado cuando el calendario
  // crea, edita o elimina una audiencia.
  if (agendaSlot) {
    const observer =
      new MutationObserver(
        () => {
          normalizarAudiencias();
          actualizarListadoAudiencias();
        },
      );

    observer.observe(
      agendaSlot,
      {
        childList: true,
        subtree: true,
      },
    );
  }
}


// ============================================================
// NORMALIZAR AUDIENCIAS EXISTENTES
// ============================================================

function normalizarAudiencias() {
  const agenda =
    getData(
      KEY_AGENDA,
      [],
    );


  if (!Array.isArray(agenda)) {
    saveData(
      KEY_AGENDA,
      [],
    );

    return;
  }


  let changed = false;


  agenda.forEach(
    (evento) => {
      if (
        evento.tipo !==
        "audiencia"
      ) {
        return;
      }


      if (
        typeof evento.tipoAudiencia !==
        "string"
      ) {
        evento.tipoAudiencia = "";

        changed = true;
      }


      if (
        ![
          "por-desahogar",
          "desahogada",
        ].includes(
          evento.estadoAudiencia,
        )
      ) {
        evento.estadoAudiencia =
          "por-desahogar";

        changed = true;
      }
    },
  );


  if (changed) {
    saveData(
      KEY_AGENDA,
      agenda,
    );
  }
}


// ============================================================
// REGISTROS
// ============================================================

function getRegistrosAudiencia() {
  const agenda =
    getData(
      KEY_AGENDA,
      [],
    );


  if (!Array.isArray(agenda)) {
    return [];
  }


  const expedientes =
    getExpedientesMesaActual();


  const mapaExpedientes =
    new Map(
      expedientes.map(
        (expediente) => [
          getNumeroExpediente(
            expediente,
          ),
          expediente,
        ],
      ),
    );


  const seguimiento =
    getData(
      KEY_SEGUIMIENTO,
      {},
    );


  return agenda
    .filter(
      (evento) =>
        evento.tipo ===
        "audiencia",
    )
    .map(
      (evento) => {
        const numero =
          String(
            evento.expediente ||
            "",
          );


        const expediente =
          mapaExpedientes.get(
            numero,
          );


        if (!expediente) {
          return null;
        }


        const estadoActual =
          seguimiento?.[
            numero
          ]?.estado ||
          "";


        return {
          id:
            evento.id,

          numero,

          fecha:
            evento.fecha ||
            "",

          hora:
            evento.hora ||
            "",

          notas:
            evento.notas ||
            "",

          tipoAudiencia:
            evento.tipoAudiencia ||
            "",

          estadoAudiencia:
            evento.estadoAudiencia ||
            "por-desahogar",

          estadoExpediente:
            estadoActual,

          evento,
          expediente,
        };
      },
    )
    .filter(Boolean)
    .sort(
      (a, b) => {
        const fechaA =
          `${a.fecha} ${a.hora}`;

        const fechaB =
          `${b.fecha} ${b.hora}`;

        return fechaA.localeCompare(
          fechaB,
        );
      },
    );
}


// ============================================================
// FILTRADO
// ============================================================

function getRegistrosVisibles() {
  let registros =
    getRegistrosAudiencia();


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
            item.estadoExpediente,
      },
    );


  const texto =
    busquedaExpediente
      .trim()
      .toLowerCase();


  if (texto) {
    registros =
      registros.filter(
        (item) =>
          item.numero
            .toLowerCase()
            .includes(
              texto,
            ),
      );
  }


  if (
    estadoAudienciaActivo !==
    "todas"
  ) {
    registros =
      registros.filter(
        (item) =>
          item.estadoAudiencia ===
          estadoAudienciaActivo,
      );
  }


  return registros;
}


// ============================================================
// TABLA
// ============================================================

function renderFilasAudiencia(
  registros,
) {
  return registros
    .map(
      (item) => {
        const desahogada =
          item.estadoAudiencia ===
          "desahogada";


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
                formatFecha(
                  item.fecha,
                ),
              )}
            </td>


            <td>
              ${escapeHTML(
                item.hora ||
                "—",
              )}
            </td>


            <td>

              <select
                class="mesas-fase4-state-select"
                data-audiencia-tipo
                data-evento-id="${escapeHTML(
                  item.id,
                )}"
              >

                <option value="">
                  Seleccionar...
                </option>

                ${TIPOS_AUDIENCIA.map(
                  (tipo) => `
                    <option
                      value="${escapeHTML(
                        tipo,
                      )}"
                      ${
                        item.tipoAudiencia ===
                        tipo
                          ? "selected"
                          : ""
                      }
                    >
                      ${escapeHTML(
                        tipo,
                      )}
                    </option>
                  `,
                ).join("")}

              </select>

            </td>


            <td>

              <span class="mesas-fase4-category-badge ${
                desahogada
                  ? "done"
                  : "pending"
              }">

                ${escapeHTML(
                  etiquetaEstadoAudiencia(
                    item.estadoAudiencia,
                  ),
                )}

              </span>

            </td>


            <td>

              ${
                item.estadoExpediente
                  ? renderEstadoBadge(
                      item.estadoExpediente,
                    )
                  : "—"
              }

            </td>


            <td>
              <span class="mesas-audiencia-notas-text">
                ${escapeHTML(
                  item.notas ||
                  "—",
                )}
              </span>
            </td>


            <td>
              <div class="mesas-actions">
              ${renderBotonesFlujo(
                item.estadoExpediente,
                {
                  actionAttr: "data-audiencia-action",
                  attrs: `data-expediente="${escapeHTML(
                    item.numero,
                  )}"`,
                },
              )}
              <button
                type="button"
                class="${
                  desahogada
                    ? "mesas-secondary-btn"
                    : "mesas-primary-btn"
                }"
                data-audiencia-action="toggle-estado"
                data-evento-id="${escapeHTML(
                  item.id,
                )}"
              >

                <i class="fa-solid ${
                  desahogada
                    ? "fa-rotate-left"
                    : "fa-check"
                }"></i>

                ${
                  desahogada
                    ? "Reabrir"
                    : "Desahogada"
                }

              </button>
              </div>

            </td>

          </tr>
        `;
      },
    )
    .join("");
}


// ============================================================
// ACTUALIZAR LISTADO
// ============================================================

function actualizarListadoAudiencias() {
  const vista =
    document.querySelector(
      '[data-mesas-vista="audiencia"]',
    );


  if (!vista) {
    return;
  }


  const tbody =
    vista.querySelector(
      ".mesas-audiencia-table tbody",
    );

  const empty =
    vista.querySelector(
      "#audienciaEmpty",
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
    renderFilasAudiencia(
      registros,
    );


  configurarCamposAudiencia(
    vista,
  );
}


// ============================================================
// EVENTOS
// ============================================================

function configurarEventosAudiencia(
  vista,
) {
  const search =
    vista.querySelector(
      "#audienciaBusquedaExpediente",
    );


  if (search) {
    search.oninput =
      (event) => {
        busquedaExpediente =
          event.target.value;

        actualizarListadoAudiencias();
      };
  }


  vista.onclick =
    (event) => {
      const button =
        event.target.closest(
          "[data-audiencia-action]",
        );


      if (!button) {
        return;
      }


      const action =
        button.dataset
          .audienciaAction;


      switch (action) {
        case "estado-filtro":
          estadoAudienciaActivo =
            button.dataset.estado ||
            "todas";

          renderAudiencia();
          break;


        case "flujo": {
          const accion = accionDeBoton(button);
          if (!accion) break;
          const resultado = aplicarAccionSeguimiento(
            button.dataset.expediente,
            accion,
            { usuario: getSession()?.nombre || "" },
          );
          if (!resultado.ok) {
            window.alert(resultado.error);
            break;
          }
          renderAudiencia();
          break;
        }
        case "toggle-estado":
          toggleEstadoAudiencia(
            button.dataset.eventoId,
          );
          break;
      }
    };


  configurarCamposAudiencia(
    vista,
  );
}


// ============================================================
// CAMPOS EDITABLES
// ============================================================

function configurarCamposAudiencia(
  vista,
) {
  vista
    .querySelectorAll(
      "[data-audiencia-tipo]",
    )
    .forEach(
      (select) => {
        select.onchange =
          () => {
            cambiarTipoAudiencia(
              select.dataset.eventoId,
              select.value,
            );
          };
      },
    );
}


// ============================================================
// TIPO DE AUDIENCIA
// ============================================================

function cambiarTipoAudiencia(
  id,
  nuevoTipo,
) {
  if (
    nuevoTipo &&
    !TIPOS_AUDIENCIA.includes(
      nuevoTipo,
    )
  ) {
    return;
  }


  const agenda =
    getData(
      KEY_AGENDA,
      [],
    );


  if (!Array.isArray(agenda)) {
    return;
  }


  const evento =
    agenda.find(
      (item) =>
        item.id === id,
    );


  if (!evento) {
    return;
  }


  evento.tipoAudiencia =
    nuevoTipo;


  saveData(
    KEY_AGENDA,
    agenda,
  );


  actualizarListadoAudiencias();
}


// ============================================================
// ESTADO DE AUDIENCIA
// ============================================================

function toggleEstadoAudiencia(
  id,
) {
  const agenda =
    getData(
      KEY_AGENDA,
      [],
    );


  if (!Array.isArray(agenda)) {
    return;
  }


  const evento =
    agenda.find(
      (item) =>
        item.id === id,
    );


  if (!evento) {
    return;
  }


  evento.estadoAudiencia =
    evento.estadoAudiencia ===
    "desahogada"
      ? "por-desahogar"
      : "desahogada";


  saveData(
    KEY_AGENDA,
    agenda,
  );


  renderAudiencia();
}


// ============================================================
// FECHA
// ============================================================

function formatFecha(
  value,
) {
  if (!value) {
    return "—";
  }


  const parts =
    String(value)
      .slice(0, 10)
      .split("-");


  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }


  return String(value);
}