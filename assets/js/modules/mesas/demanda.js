// ============================================================
// DEMANDA
// assets/js/modules/mesas/demanda.js
// FASE 4 - T-13
// ============================================================

import { getData, saveData } from "../../storage.js";
import { escapeHTML } from "../../utils.js";
import { showModal, closeForm } from "../../forms/formHelper.js";

import {
  aplicarFiltrosGlobales,
} from "./filtros.js";

import {
  etiquetaEstado,
} from "./estados.js";

import {
  etiquetaCategoriaDemanda,
} from "./catalogos.js";

import {
  getExpedientesMesaActual,
  getNumeroExpediente,
  buscarExpedienteExacto,
} from "./mesaUtils.js";


// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY_DEMANDAS = "mesasDemandas";

const ESTADOS_RADICACION = [
  "en-proceso",
  "en-firma",
  "en-lista",
  "en-actuaria",
  "en-archivo",
];

let busquedaGeneral = "";
let categoriaActiva = "todas";


// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderDemanda() {
  const vista = document.querySelector(
    '[data-mesas-vista="demanda"]',
  );

  if (!vista) {
    return;
  }

  prepararDemandas();

  const registros = getRegistrosDemanda();

  const porRadicar = registros.filter(
    (item) =>
      item.demanda.categoria === "por-radicar",
  );

  const radicados = registros.filter(
    (item) =>
      item.demanda.categoria === "radicado",
  );


  vista.innerHTML = `
    <section class="mesas-fase4-section">

      <!-- ================================================
      ENCABEZADO
      ================================================= -->
      <div class="mesas-fase4-header">

        <div>
          <span class="mesas-mini-eyebrow">
            Fase 4 · T-13
          </span>

          <h2>
            Demanda
          </h2>

          <p>
            Radicación y seguimiento inicial de las demandas.
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
            categoriaActiva === "todas"
              ? "active"
              : ""
          }"
          data-demanda-action="categoria"
          data-categoria="todas"
        >
          <span>Todos</span>
          <strong>${registros.length}</strong>
        </button>


        <button
          type="button"
          class="mesas-fase4-counter ${
            categoriaActiva === "por-radicar"
              ? "active"
              : ""
          }"
          data-demanda-action="categoria"
          data-categoria="por-radicar"
        >
          <span>Por radicar</span>
          <strong>${porRadicar.length}</strong>
        </button>


        <button
          type="button"
          class="mesas-fase4-counter ${
            categoriaActiva === "radicado"
              ? "active"
              : ""
          }"
          data-demanda-action="categoria"
          data-categoria="radicado"
        >
          <span>Radicados</span>
          <strong>${radicados.length}</strong>
        </button>

      </div>


      <!-- ================================================
      BUSCADORES
      ================================================= -->
      <div class="mesas-demanda-search-grid">

        <label class="mesas-fase4-field">

          <span>
            Expediente general
          </span>

          <div class="mesas-search">

            <i class="fa-solid fa-magnifying-glass"></i>

            <input
              id="demandaBusquedaGeneral"
              type="search"
              value="${escapeHTML(busquedaGeneral)}"
              placeholder="Buscar coincidencias, ej. 124..."
              autocomplete="off"
            >

          </div>

          <small>
            Busca parcialmente y muestra todas las coincidencias.
          </small>

        </label>


        <label class="mesas-fase4-field">

          <span>
            Expediente específico
          </span>

          <div class="mesas-demanda-exact-search">

            <input
              id="demandaBusquedaExacta"
              type="search"
              placeholder="Ej. 124/2026"
              autocomplete="off"
            >

            <button
              type="button"
              class="mesas-primary-btn"
              data-demanda-action="buscar-exacto"
            >
              <i class="fa-solid fa-arrow-right"></i>
              Abrir
            </button>

          </div>

          <small>
            Requiere el número exacto del expediente.
          </small>

        </label>

      </div>


      <p
        class="mesas-form-error"
        id="demandaSearchError"
        hidden
      ></p>


      <!-- ================================================
      TABLA
      ================================================= -->
      <section class="mesas-secretaria-table-card">

        <div class="mesas-table-wrapper">

          <table class="mesas-demanda-table">

            <thead>
              <tr>
                <th>Expediente</th>
                <th>Fecha</th>
                <th>Actor</th>
                <th>Demandado</th>
                <th>Radicación</th>
                <th>Categoría</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              ${renderFilasDemanda(registros)}
            </tbody>

          </table>

        </div>

        <div
          class="mesas-empty-state"
          id="demandaEmpty"
          hidden
        >
          <div class="mesas-empty-icon">
            <i class="fa-regular fa-folder-open"></i>
          </div>

          <strong>
            No hay demandas en esta vista
          </strong>

          <span>
            Cambia la búsqueda, categoría o filtros globales.
          </span>
        </div>

      </section>


      <!-- ================================================
      PLANTILLAS
      IMPORTANTE: navegacion.js llena este slot.
      ================================================= -->
      <div data-plantillas-slot></div>

    </section>
  `;


  renderListadoDemanda();

  configurarEventosDemanda(vista);
}


// ============================================================
// PREPARAR ALMACENAMIENTO
// ============================================================

function prepararDemandas() {
  const expedientes =
    getExpedientesMesaActual();

  const demandas =
    getData(
      KEY_DEMANDAS,
      {},
    );

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

      if (demandas[numero]) {
        return;
      }

      demandas[numero] = {
        radicacion:
          "en-proceso",

        categoria:
          "por-radicar",
      };

      changed = true;
    },
  );


  if (changed) {
    saveData(
      KEY_DEMANDAS,
      demandas,
    );
  }
}


// ============================================================
// OBTENER REGISTROS
// ============================================================

function getRegistrosDemanda() {
  const expedientes =
    getExpedientesMesaActual();

  const demandas =
    getData(
      KEY_DEMANDAS,
      {},
    );


  return expedientes.map(
    (expediente) => {
      const numero =
        getNumeroExpediente(
          expediente,
        );

      return {
        expediente,

        numero,

        fecha:
          expediente.fechaRecepcion ||
          expediente.fecha ||
          expediente.creadoEn ||
          "",

        actor:
          expediente.actor ||
          expediente.promovente ||
          "—",

        demandado:
          expediente.demandado ||
          "—",

        asunto:
          expediente.actoDemandado ||
          expediente.asunto ||
          expediente.accion ||
          "—",

        demanda:
          demandas[numero] || {
            radicacion:
              "en-proceso",

            categoria:
              "por-radicar",
          },
      };
    },
  );
}


// ============================================================
// FILTRADO
// ============================================================

function getRegistrosVisibles() {
  let registros =
    getRegistrosDemanda();


  // Filtros globales del módulo Mesas.
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
            item.demanda.radicacion,
      },
    );


  // Buscador general propio.
  const texto =
    busquedaGeneral
      .trim()
      .toLowerCase();

  if (texto) {
    registros =
      registros.filter(
        (item) =>
          item.numero
            .toLowerCase()
            .includes(texto),
      );
  }


  // Categoría.
  if (
    categoriaActiva !==
    "todas"
  ) {
    registros =
      registros.filter(
        (item) =>
          item.demanda.categoria ===
          categoriaActiva,
      );
  }


  return registros;
}


// ============================================================
// RENDER TABLA
// ============================================================

function renderListadoDemanda() {
  const vista =
    document.querySelector(
      '[data-mesas-vista="demanda"]',
    );

  if (!vista) {
    return;
  }

  const tbody =
    vista.querySelector(
      ".mesas-demanda-table tbody",
    );

  const empty =
    vista.querySelector(
      "#demandaEmpty",
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
    renderFilasDemanda(
      registros,
    );
}


function renderFilasDemanda(
  registros,
) {
  return registros
    .map(
      (item) => {
        const radicado =
          item.demanda.categoria ===
          "radicado";

        return `
          <tr>

            <td>
              <strong class="mesas-expediente-number">
                ${escapeHTML(item.numero)}
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

              <select
                class="mesas-fase4-state-select"
                data-demanda-radicacion
                data-expediente="${escapeHTML(item.numero)}"
                aria-label="Radicación ${escapeHTML(item.numero)}"
              >

                ${ESTADOS_RADICACION
                  .map(
                    (estado) => `
                      <option
                        value="${estado}"
                        ${
                          item.demanda.radicacion === estado
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
                  )
                  .join("")}

              </select>

            </td>


            <td>

              <span class="mesas-fase4-category-badge ${
                radicado
                  ? "done"
                  : "pending"
              }">
                ${escapeHTML(
                  etiquetaCategoriaDemanda(
                    item.demanda.categoria,
                  ),
                )}
              </span>

            </td>


            <td>

              <div class="mesas-actions">

                <button
                  type="button"
                  class="mesas-secondary-btn"
                  data-demanda-action="ver"
                  data-expediente="${escapeHTML(item.numero)}"
                >
                  <i class="fa-regular fa-eye"></i>
                  Ver
                </button>


                ${
                  !radicado
                    ? `
                      <button
                        type="button"
                        class="mesas-primary-btn"
                        data-demanda-action="radicar"
                        data-expediente="${escapeHTML(item.numero)}"
                      >
                        <i class="fa-solid fa-check"></i>
                        Marcar radicada
                      </button>
                    `
                    : ""
                }

              </div>

            </td>

          </tr>
        `;
      },
    )
    .join("");
}


// ============================================================
// EVENTOS
// ============================================================

function configurarEventosDemanda(
  vista,
) {
  const general =
    vista.querySelector(
      "#demandaBusquedaGeneral",
    );


  if (general) {
    general.oninput =
      (event) => {
        busquedaGeneral =
          event.target.value;

        renderListadoDemanda();
      };
  }


  vista.onclick =
    (event) => {
      const button =
        event.target.closest(
          "[data-demanda-action]",
        );

      if (!button) {
        return;
      }

      const action =
        button.dataset.demandaAction;

      const numero =
        button.dataset.expediente;


      switch (action) {
        case "categoria":
          categoriaActiva =
            button.dataset.categoria ||
            "todas";

          renderDemanda();
          break;


        case "buscar-exacto":
          buscarExacto();
          break;


        case "ver":
          openDetalleDemanda(
            numero,
          );
          break;


        case "radicar":
          marcarComoRadicada(
            numero,
          );
          break;
      }
    };


  vista
    .querySelectorAll(
      "[data-demanda-radicacion]",
    )
    .forEach(
      (select) => {
        select.onchange =
          () => {
            cambiarRadicacion(
              select.dataset.expediente,
              select.value,
            );
          };
      },
    );
}


// ============================================================
// CAMBIAR RADICACIÓN
// ============================================================

function cambiarRadicacion(
  numero,
  nuevoEstado,
) {
  if (
    !ESTADOS_RADICACION.includes(
      nuevoEstado,
    )
  ) {
    return;
  }


  const demandas =
    getData(
      KEY_DEMANDAS,
      {},
    );


  if (!demandas[numero]) {
    return;
  }


  demandas[numero].radicacion =
    nuevoEstado;


  saveData(
    KEY_DEMANDAS,
    demandas,
  );


  renderDemanda();
}


// ============================================================
// MARCAR RADICADA
// ============================================================

function marcarComoRadicada(
  numero,
) {
  const demandas =
    getData(
      KEY_DEMANDAS,
      {},
    );


  if (!demandas[numero]) {
    return;
  }


  demandas[numero].categoria =
    "radicado";


  saveData(
    KEY_DEMANDAS,
    demandas,
  );


  renderDemanda();
}


// ============================================================
// BÚSQUEDA EXACTA
// ============================================================

function buscarExacto() {
  const input =
    document.getElementById(
      "demandaBusquedaExacta",
    );

  const error =
    document.getElementById(
      "demandaSearchError",
    );


  const numero =
    input?.value.trim() ||
    "";


  if (error) {
    error.hidden = true;
    error.textContent = "";
  }


  if (!numero) {
    mostrarErrorBusqueda(
      "Escribe el número exacto del expediente.",
    );

    return;
  }


  const expediente =
    buscarExpedienteExacto(
      numero,
    );


  if (!expediente) {
    mostrarErrorBusqueda(
      "No se encontró ese expediente en la mesa actual.",
    );

    return;
  }


  openDetalleDemanda(
    getNumeroExpediente(
      expediente,
    ),
  );
}


function mostrarErrorBusqueda(
  mensaje,
) {
  const error =
    document.getElementById(
      "demandaSearchError",
    );

  if (!error) {
    return;
  }

  error.textContent =
    mensaje;

  error.hidden =
    false;
}


// ============================================================
// DETALLE
// ============================================================

function openDetalleDemanda(
  numero,
) {
  const item =
    getRegistrosDemanda()
      .find(
        (registro) =>
          registro.numero === numero,
      );


  if (!item) {
    return;
  }


  showModal(`
    <div class="mesas-modal-shell">

      <header class="mesas-modal-header">

        <div class="mesas-modal-step">
          <i class="fa-solid fa-file-lines"></i>
        </div>

        <div class="mesas-modal-header-text">

          <h2>
            Demanda
          </h2>

          <p>
            Expediente
            ${escapeHTML(item.numero)}
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        <div class="mesas-modal-info">

          <div class="mesas-modal-info-item">
            <span>Actor</span>

            <strong>
              ${escapeHTML(
                item.actor,
              )}
            </strong>
          </div>


          <div class="mesas-modal-info-item">
            <span>Demandado</span>

            <strong>
              ${escapeHTML(
                item.demandado,
              )}
            </strong>
          </div>


          <div class="mesas-modal-info-item">
            <span>Radicación</span>

            <strong>
              ${escapeHTML(
                etiquetaEstado(
                  item.demanda.radicacion,
                ),
              )}
            </strong>
          </div>


          <div class="mesas-modal-info-item">
            <span>Categoría</span>

            <strong>
              ${escapeHTML(
                etiquetaCategoriaDemanda(
                  item.demanda.categoria,
                ),
              )}
            </strong>
          </div>

        </div>


        <div class="mesas-modal-info-item">

          <span>
            Acto demandado
          </span>

          <strong>
            ${escapeHTML(
              item.asunto,
            )}
          </strong>

        </div>

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="closeDetalleDemanda"
        >
          Cerrar
        </button>

      </footer>

    </div>
  `);


  document
    .getElementById(
      "closeDetalleDemanda",
    )
    ?.addEventListener(
      "click",
      closeForm,
    );
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