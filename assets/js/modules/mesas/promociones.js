// ============================================================
// PROMOCIONES
// assets/js/modules/mesas/promociones.js
// FASE 4 - T-14
// ============================================================

import { getData, saveData } from "../../storage.js";
import { createId, escapeHTML } from "../../utils.js";

import {
  aplicarFiltrosGlobales,
  setFiltro,
  sincronizarBarraFiltros,
} from "./filtros.js";

import {
  ESTADOS,
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
  esCritico,
} from "./config.js";

import {
  montarAgendaEn,
} from "./agenda.js";


// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY_PROMOCIONES = "promociones";

let busquedaPersona = "";
let categoriaActiva = "todas";


// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderPromociones() {
  const vista = document.querySelector(
    '[data-mesas-vista="promociones"]',
  );

  if (!vista) {
    return;
  }

  prepararPromociones();

  const registros =
    getRegistrosPromociones();

  const porAcordar =
    registros.filter(
      (item) =>
        item.estadoPromocion ===
        "por-acordar",
    );

  const acordadas =
    registros.filter(
      (item) =>
        item.estadoPromocion ===
        "acordado",
    );

  const prioridad =
    getExpedientePrioritario(
      registros,
    );


  vista.innerHTML = `
    <section class="mesas-fase4-section">

      <!-- ================================================
      ENCABEZADO
      ================================================= -->
      <div class="mesas-fase4-header">

        <div>
          <span class="mesas-mini-eyebrow">
            Fase 4 · T-14
          </span>

          <h2>
            Promociones
          </h2>

          <p>
            Seguimiento de promociones, acuerdos y agenda del titular.
          </p>
        </div>

      </div>


      <!-- ================================================
      PRIORIDAD
      ================================================= -->
      ${renderPrioridad(prioridad)}


      <!-- ================================================
      CONTADORES
      ================================================= -->
      <div class="mesas-fase4-counters">

        <button
          type="button"
          class="mesas-fase4-counter ${
            categoriaActiva === "todas"
              ? "active"
              : ""
          }"
          data-promociones-action="categoria"
          data-categoria="todas"
        >
          <span>Todos</span>
          <strong>${registros.length}</strong>
        </button>


        <button
          type="button"
          class="mesas-fase4-counter ${
            categoriaActiva === "por-acordar"
              ? "active"
              : ""
          }"
          data-promociones-action="categoria"
          data-categoria="por-acordar"
        >
          <span>Por acordar</span>
          <strong>${porAcordar.length}</strong>
        </button>


        <button
          type="button"
          class="mesas-fase4-counter ${
            categoriaActiva === "acordado"
              ? "active"
              : ""
          }"
          data-promociones-action="categoria"
          data-categoria="acordado"
        >
          <span>Acordadas</span>
          <strong>${acordadas.length}</strong>
        </button>

      </div>


      <!-- ================================================
      BÚSQUEDA PROPIA
      El expediente se busca con la barra global superior.
      ================================================= -->
      <div class="mesas-promociones-toolbar">

        <label class="mesas-fase4-field">

          <span>
            Actor o demandado
          </span>

          <div class="mesas-search">

            <i class="fa-solid fa-magnifying-glass"></i>

            <input
              id="promocionesBusquedaPersona"
              type="search"
              value="${escapeHTML(busquedaPersona)}"
              placeholder="Buscar por actor o demandado..."
              autocomplete="off"
            >

          </div>

          <small>
            El número de expediente se filtra desde la barra global superior.
          </small>

        </label>

      </div>


      <!-- ================================================
      TABLA
      ================================================= -->
      <section class="mesas-secretaria-table-card">

        <div class="mesas-table-wrapper">

          <table class="mesas-promociones-table">

            <thead>
              <tr>
                <th>Expediente</th>
                <th>Fecha</th>
                <th>Actor</th>
                <th>Demandado</th>
                <th>Promoción</th>
                <th>Estado del acuerdo</th>
                <th>Situación</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              ${renderFilasPromociones(
                getRegistrosVisibles(),
              )}
            </tbody>

          </table>

        </div>


        <div
          class="mesas-empty-state"
          id="promocionesEmpty"
          hidden
        >

          <div class="mesas-empty-icon">
            <i class="fa-regular fa-folder-open"></i>
          </div>

          <strong>
            No hay promociones en esta vista
          </strong>

          <span>
            Cambia los filtros o la búsqueda.
          </span>

        </div>

      </section>


      <!-- ================================================
      AGENDA DEL TITULAR
      T-14 → audiencia
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

        <div
          data-promociones-agenda
        ></div>

      </div>


      <!-- ================================================
      PLANTILLAS
      ================================================= -->
      <div data-plantillas-slot></div>

    </section>
  `;


  actualizarListado();

  configurarEventosPromociones(
    vista,
  );


  const agendaSlot =
    vista.querySelector(
      "[data-promociones-agenda]",
    );

  montarAgendaEn(
    agendaSlot,
    {
      tipoInicial:
        "audiencia",

      filtroInicial:
        "audiencia",

      titulo:
        "Agenda del titular",
    },
  );
}


// ============================================================
// NORMALIZAR PROMOCIONES EXISTENTES
// ============================================================

function prepararPromociones() {
  const datos =
    getData(
      KEY_PROMOCIONES,
      [],
    );

  if (!Array.isArray(datos)) {
    saveData(
      KEY_PROMOCIONES,
      [],
    );

    return;
  }


  let changed = false;


  datos.forEach(
    (promocion) => {
      if (!promocion.id) {
        promocion.id =
          createId();

        changed = true;
      }


      if (
        !promocion.estadoPromocion
      ) {
        promocion.estadoPromocion =
          "por-acordar";

        changed = true;
      }


      if (
        !promocion.estadoAcuerdo
      ) {
        promocion.estadoAcuerdo =
          "en-proceso";

        changed = true;
      }
    },
  );


  if (changed) {
    saveData(
      KEY_PROMOCIONES,
      datos,
    );
  }
}


// ============================================================
// REGISTROS
// ============================================================

function getRegistrosPromociones() {
  const promociones =
    getData(
      KEY_PROMOCIONES,
      [],
    );

  if (!Array.isArray(promociones)) {
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


  return promociones
    .map(
      (promocion) => {
        const numero =
          String(
            promocion.expediente ||
            promocion.numero ||
            "",
          );

        const expediente =
          mapaExpedientes.get(
            numero,
          );

        if (!expediente) {
          return null;
        }


        return {
          id:
            promocion.id,

          numero,

          fecha:
            promocion.fecha ||
            promocion.creadoEn ||
            "",

          actor:
            expediente.actor ||
            expediente.promovente ||
            "—",

          demandado:
            expediente.demandado ||
            "—",

          descripcion:
            promocion.descripcion ||
            promocion.tipo ||
            "Promoción",

          estadoPromocion:
            promocion.estadoPromocion ||
            "por-acordar",

          estadoAcuerdo:
            promocion.estadoAcuerdo ||
            "en-proceso",

          promocion,
          expediente,
        };
      },
    )
    .filter(Boolean);
}


// ============================================================
// FILTRADO
// ============================================================

function getRegistrosVisibles() {
  let registros =
    getRegistrosPromociones();


  // Filtros globales:
  // expediente, fecha y estado del acuerdo.
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
            item.estadoAcuerdo,
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
          const persona = `
            ${item.actor}
            ${item.demandado}
          `.toLowerCase();

          return persona.includes(
            texto,
          );
        },
      );
  }


  if (
    categoriaActiva !==
    "todas"
  ) {
    registros =
      registros.filter(
        (item) =>
          item.estadoPromocion ===
          categoriaActiva,
      );
  }


  return registros;
}


// ============================================================
// PRIORIDAD
// ============================================================

function getExpedientePrioritario(
  registros,
) {
  if (!registros.length) {
    return null;
  }


  const conteo =
    new Map();


  registros.forEach(
    (item) => {
      conteo.set(
        item.numero,
        (
          conteo.get(
            item.numero,
          ) ||
          0
        ) + 1,
      );
    },
  );


  let numero = "";
  let cantidad = 0;


  conteo.forEach(
    (total, expediente) => {
      if (total > cantidad) {
        numero =
          expediente;

        cantidad =
          total;
      }
    },
  );


  if (!numero) {
    return null;
  }


  return {
    numero,
    cantidad,
    critico:
      esCritico(
        cantidad,
      ),
  };
}


function renderPrioridad(
  prioridad,
) {
  if (!prioridad) {
    return "";
  }


  return `
    <section class="mesas-promociones-priority ${
      prioridad.critico
        ? "danger"
        : ""
    }">

      <div class="mesas-promociones-priority-icon">

        <i class="fa-solid ${
          prioridad.critico
            ? "fa-triangle-exclamation"
            : "fa-arrow-up-wide-short"
        }"></i>

      </div>


      <div class="mesas-promociones-priority-body">

        <span>
          Prioridad
        </span>

        <strong>
          Expediente
          ${escapeHTML(
            prioridad.numero,
          )}
        </strong>

        <small>
          ${prioridad.cantidad}
          ${
            prioridad.cantidad === 1
              ? "promoción"
              : "promociones"
          }
          ${
            prioridad.critico
              ? "· Nivel crítico"
              : ""
          }
        </small>

      </div>


      <button
        type="button"
        class="${
          prioridad.critico
            ? "mesas-promociones-priority-btn danger"
            : "mesas-secondary-btn"
        }"
        data-promociones-action="prioridad"
        data-expediente="${escapeHTML(
          prioridad.numero,
        )}"
      >
        <i class="fa-solid fa-arrow-right"></i>
        Ir al expediente
      </button>

    </section>
  `;
}


// ============================================================
// TABLA
// ============================================================

function renderFilasPromociones(
  registros,
) {
  return registros
    .map(
      (item) => {
        const acordada =
          item.estadoPromocion ===
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
                formatFecha(
                  item.fecha,
                ),
              )}
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
              ${escapeHTML(
                item.descripcion,
              )}
            </td>


            <td>

              <select
                class="mesas-fase4-state-select"
                data-promociones-estado
                data-promocion-id="${escapeHTML(
                  item.id,
                )}"
              >

                ${ESTADOS.map(
                  (estado) => `
                    <option
                      value="${estado.clave}"
                      ${
                        item.estadoAcuerdo ===
                        estado.clave
                          ? "selected"
                          : ""
                      }
                    >
                      ${escapeHTML(
                        estado.etiqueta,
                      )}
                    </option>
                  `,
                ).join("")}

              </select>

            </td>


            <td>

              <span class="mesas-fase4-category-badge ${
                acordada
                  ? "done"
                  : "pending"
              }">

                ${escapeHTML(
                  etiquetaEstadoAcuerdo(
                    item.estadoPromocion,
                  ),
                )}

              </span>

            </td>


            <td>

              <div class="mesas-actions">

                <button
                  type="button"
                  class="${
                    acordada
                      ? "mesas-secondary-btn"
                      : "mesas-primary-btn"
                  }"
                  data-promociones-action="toggle-acuerdo"
                  data-promocion-id="${escapeHTML(
                    item.id,
                  )}"
                >

                  <i class="fa-solid ${
                    acordada
                      ? "fa-rotate-left"
                      : "fa-check"
                  }"></i>

                  ${
                    acordada
                      ? "Reabrir"
                      : "Marcar acordada"
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

function actualizarListado() {
  const vista =
    document.querySelector(
      '[data-mesas-vista="promociones"]',
    );

  if (!vista) {
    return;
  }


  const tbody =
    vista.querySelector(
      ".mesas-promociones-table tbody",
    );

  const empty =
    vista.querySelector(
      "#promocionesEmpty",
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
    renderFilasPromociones(
      registros,
    );


  configurarSelectsEstado(
    vista,
  );
}


// ============================================================
// EVENTOS
// ============================================================

function configurarEventosPromociones(
  vista,
) {
  const search =
    vista.querySelector(
      "#promocionesBusquedaPersona",
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
          "[data-promociones-action]",
        );

      if (!button) {
        return;
      }


      const action =
        button.dataset
          .promocionesAction;


      switch (action) {
        case "categoria":
          categoriaActiva =
            button.dataset.categoria ||
            "todas";

          renderPromociones();
          break;


        case "prioridad":
          irAExpedientePrioritario(
            button.dataset.expediente,
          );
          break;


        case "toggle-acuerdo":
          toggleEstadoPromocion(
            button.dataset.promocionId,
          );
          break;
      }
    };


  configurarSelectsEstado(
    vista,
  );
}


// ============================================================
// SELECTS DE ESTADO
// ============================================================

function configurarSelectsEstado(
  vista,
) {
  vista
    .querySelectorAll(
      "[data-promociones-estado]",
    )
    .forEach(
      (select) => {
        select.onchange =
          () => {
            cambiarEstadoAcuerdo(
              select.dataset.promocionId,
              select.value,
            );
          };
      },
    );
}


function cambiarEstadoAcuerdo(
  id,
  nuevoEstado,
) {
  const estadoValido =
    ESTADOS.some(
      (estado) =>
        estado.clave ===
        nuevoEstado,
    );


  if (!estadoValido) {
    return;
  }


  const promociones =
    getData(
      KEY_PROMOCIONES,
      [],
    );


  if (!Array.isArray(promociones)) {
    return;
  }


  const promocion =
    promociones.find(
      (item) =>
        item.id === id,
    );


  if (!promocion) {
    return;
  }


  promocion.estadoAcuerdo =
    nuevoEstado;


  saveData(
    KEY_PROMOCIONES,
    promociones,
  );


  actualizarListado();
}


// ============================================================
// POR ACORDAR / ACORDADO
// ============================================================

function toggleEstadoPromocion(
  id,
) {
  const promociones =
    getData(
      KEY_PROMOCIONES,
      [],
    );


  if (!Array.isArray(promociones)) {
    return;
  }


  const promocion =
    promociones.find(
      (item) =>
        item.id === id,
    );


  if (!promocion) {
    return;
  }


  promocion.estadoPromocion =
    promocion.estadoPromocion ===
    "acordado"
      ? "por-acordar"
      : "acordado";


  saveData(
    KEY_PROMOCIONES,
    promociones,
  );


  renderPromociones();
}


// ============================================================
// PRIORIDAD → ACCESO DIRECTO
// ============================================================

function irAExpedientePrioritario(
  numero,
) {
  if (!numero) {
    return;
  }


  setFiltro(
    "expediente",
    numero,
  );


  sincronizarBarraFiltros();

  categoriaActiva =
    "todas";


  renderPromociones();
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