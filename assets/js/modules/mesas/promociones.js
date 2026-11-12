// ============================================================
// PROMOCIONES
// assets/js/modules/mesas/promociones.js
// ============================================================

import {
  getData,
  saveData,
} from "../../storage.js";

import {
  createId,
  escapeHTML,
} from "../../utils.js";

import {
  aplicarFiltrosGlobales,
  setFiltro,
  sincronizarBarraFiltros,
} from "./filtros.js";

import {
  aplicarAccion,
  accionDeBoton,
  renderBotonesFlujo,
  renderEstadoBadge,
} from "./flujoEstados.js";

import {
  getSession,
} from "../../auth.js";

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
  openAgendarAudienciaPromocion,
} from "./promocionAgenda.js";


// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY_PROMOCIONES =
  "promociones";

const KEY_AGENDA =
  "mesasAgenda";

let busquedaPersona =
  "";

let categoriaActiva =
  "todas";


// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderPromociones() {
  const vista =
    document.querySelector(
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
            Promociones
          </span>

          <h2>
            Promociones
          </h2>

          <p>
            Seguimiento de promociones y acuerdos recibidos por la mesa.
          </p>

        </div>

      </div>


      <!-- ================================================
      PRIORIDAD
      ================================================= -->

      ${renderPrioridad(
        prioridad,
      )}


      <!-- ================================================
      CONTADORES
      ================================================= -->

      <div class="mesas-fase4-counters">


        <button
          type="button"
          class="mesas-fase4-counter ${
            categoriaActiva ===
            "todas"
              ? "active"
              : ""
          }"
          data-promociones-action="categoria"
          data-categoria="todas"
        >

          <span>
            Todos
          </span>

          <strong>
            ${registros.length}
          </strong>

        </button>


        <button
          type="button"
          class="mesas-fase4-counter ${
            categoriaActiva ===
            "por-acordar"
              ? "active"
              : ""
          }"
          data-promociones-action="categoria"
          data-categoria="por-acordar"
        >

          <span>
            Por acordar
          </span>

          <strong>
            ${porAcordar.length}
          </strong>

        </button>


        <button
          type="button"
          class="mesas-fase4-counter ${
            categoriaActiva ===
            "acordado"
              ? "active"
              : ""
          }"
          data-promociones-action="categoria"
          data-categoria="acordado"
        >

          <span>
            Acordadas
          </span>

          <strong>
            ${acordadas.length}
          </strong>

        </button>


      </div>


      <!-- ================================================
      BÚSQUEDA
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
              value="${escapeHTML(
                busquedaPersona,
              )}"
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

                <th>
                  Expediente
                </th>

                <th>
                  Fecha
                </th>

                <th>
                  Actor
                </th>

                <th>
                  Demandado
                </th>

                <th>
                  Promoción
                </th>

                <th>
                  Estado del acuerdo
                </th>

                <th>
                  Situación
                </th>

                <th>
                  Acciones
                </th>

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
      PLANTILLAS
      ================================================= -->

      <div data-plantillas-slot></div>


    </section>
  `;


  actualizarListado();


  configurarEventosPromociones(
    vista,
  );
}


// ============================================================
// NORMALIZAR PROMOCIONES
// ============================================================

function prepararPromociones() {
  const datos =
    getData(
      KEY_PROMOCIONES,
      [],
    );


  if (
    !Array.isArray(
      datos,
    )
  ) {
    saveData(
      KEY_PROMOCIONES,
      [],
    );

    return;
  }


  let changed =
    false;


  datos.forEach(
    (promocion) => {


      if (
        !promocion.id
      ) {
        promocion.id =
          createId();

        changed =
          true;
      }


      if (
        !promocion.estadoPromocion
      ) {
        promocion.estadoPromocion =
          "por-acordar";

        changed =
          true;
      }


      if (
        !promocion.estadoAcuerdo
      ) {
        promocion.estadoAcuerdo =
          "en-proceso";

        changed =
          true;
      }


    },
  );


  if (
    changed
  ) {
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


  if (
    !Array.isArray(
      promociones,
    )
  ) {
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


  const agenda =
    getAgenda();


  return promociones

    // Solo promociones ya recibidas por la mesa.
    .filter(
      (promocion) =>
        promocion.recibidaMesa ===
        true,
    )

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


        if (
          !expediente
        ) {
          return null;
        }


        const audiencia =
          buscarAudienciaPromocion(
            promocion,
            agenda,
          );


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


          audiencia,


          promocion,

          expediente,

        };
      },
    )

    .filter(
      Boolean,
    );
}


// ============================================================
// AGENDA
// ============================================================

function getAgenda() {
  const datos =
    getData(
      KEY_AGENDA,
      [],
    );


  return Array.isArray(
    datos,
  )
    ? datos
    : [];
}


// ============================================================
// BUSCAR AUDIENCIA DE PROMOCIÓN
// ============================================================

function buscarAudienciaPromocion(
  promocion,
  agenda,
) {

  if (
    promocion.audienciaEventoId
  ) {

    const evento =
      agenda.find(
        (item) =>
          item.id ===
          promocion.audienciaEventoId,
      );


    if (
      evento
    ) {
      return evento;
    }

  }


  return (
    agenda.find(
      (evento) =>
        evento.tipo ===
          "audiencia" &&
        evento.origen ===
          "promocion" &&
        evento.promocionId ===
          promocion.id,
    ) ||
    null
  );
}


// ============================================================
// FILTRADO
// ============================================================

function getRegistrosVisibles() {
  let registros =
    getRegistrosPromociones();


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


  if (
    texto
  ) {

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

  if (
    !registros.length
  ) {
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


  let numero =
    "";

  let cantidad =
    0;


  conteo.forEach(
    (
      total,
      expediente,
    ) => {

      if (
        total >
        cantidad
      ) {

        numero =
          expediente;

        cantidad =
          total;

      }

    },
  );


  if (
    !numero
  ) {
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


// ============================================================
// RENDER PRIORIDAD
// ============================================================

function renderPrioridad(
  prioridad,
) {

  if (
    !prioridad
  ) {
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
            prioridad.cantidad ===
            1
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


        const tieneAudiencia =
          Boolean(
            item.audiencia,
          );


        return `
          <tr>


            <!-- EXPEDIENTE -->

            <td>

              <strong class="mesas-expediente-number">

                ${escapeHTML(
                  item.numero,
                )}

              </strong>

            </td>


            <!-- FECHA -->

            <td>

              ${escapeHTML(
                formatFecha(
                  item.fecha,
                ),
              )}

            </td>


            <!-- ACTOR -->

            <td>

              ${escapeHTML(
                item.actor,
              )}

            </td>


            <!-- DEMANDADO -->

            <td>

              ${escapeHTML(
                item.demandado,
              )}

            </td>


            <!-- PROMOCIÓN -->

            <td>

              ${escapeHTML(
                item.descripcion,
              )}

              ${
                tieneAudiencia
                  ? `
                    <div class="mesas-promocion-audiencia-tag">

                      <i class="fa-regular fa-calendar-check"></i>

                      Audiencia:
                      ${escapeHTML(
                        formatFecha(
                          item.audiencia.fecha,
                        ),
                      )}

                      ${
                        item.audiencia.hora
                          ? ` · ${escapeHTML(
                              item.audiencia.hora,
                            )}`
                          : ""
                      }

                    </div>
                  `
                  : ""
              }

            </td>


            <!-- ESTADO DEL ACUERDO -->

            <td>

              ${renderEstadoBadge(
                item.estadoAcuerdo,
              )}

            </td>


            <!-- SITUACIÓN -->

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


            <!-- ACCIONES -->

            <td>

              <div class="mesas-actions">


                <!-- FLUJO AUTOMÁTICO -->

                ${renderBotonesFlujo(
                  item.estadoAcuerdo,
                  {
                    actionAttr:
                      "data-promociones-action",
                    attrs: `data-promocion-id="${escapeHTML(
                      item.id,
                    )}"`,
                  },
                )}


                <!-- AUDIENCIA -->

                <button
                  type="button"
                  class="mesas-secondary-btn"
                  data-promociones-action="agendar-audiencia"
                  data-promocion-id="${escapeHTML(
                    item.id,
                  )}"
                >

                  <i class="fa-regular ${
                    tieneAudiencia
                      ? "fa-calendar-check"
                      : "fa-calendar-plus"
                  }"></i>

                  ${
                    tieneAudiencia
                      ? "Ver audiencia"
                      : "Agendar audiencia"
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


  if (
    !vista
  ) {
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


  if (
    !tbody
  ) {
    return;
  }


  const registros =
    getRegistrosVisibles();


  if (
    !registros.length
  ) {

    tbody.innerHTML =
      "";


    if (
      empty
    ) {
      empty.hidden =
        false;
    }


    return;
  }


  if (
    empty
  ) {
    empty.hidden =
      true;
  }


  tbody.innerHTML =
    renderFilasPromociones(
      registros,
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


  if (
    search
  ) {

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


      if (
        !button
      ) {
        return;
      }


      const action =
        button.dataset
          .promocionesAction;


      switch (
        action
      ) {


        // ================================================
        // CATEGORÍAS
        // ================================================

        case "categoria":

          categoriaActiva =
            button.dataset.categoria ||
            "todas";


          renderPromociones();

          break;


        // ================================================
        // PRIORIDAD
        // ================================================

        case "prioridad":

          irAExpedientePrioritario(
            button.dataset.expediente,
          );

          break;


        // ================================================
        // ACORDADA
        // ================================================

                case "flujo":

          ejecutarAccionPromocion(
            button.dataset.promocionId,
            accionDeBoton(
              button,
            ),
          );

          break;


        // ================================================
        // AGENDAR AUDIENCIA
        // ================================================

        case "agendar-audiencia":

          openAgendarAudienciaPromocion(
            button.dataset.promocionId,

            () => {
              renderPromociones();
            },
          );

          break;

      }

    };
}


// ============================================================
// FLUJO AUTOMÁTICO DEL ACUERDO
// El estado ya no se elige: lo calcula flujoEstados.js según la acción.
// ============================================================

function ejecutarAccionPromocion(
  id,
  accion,
) {

  if (
    !accion
  ) {
    return;
  }


  const promociones =
    getData(
      KEY_PROMOCIONES,
      [],
    );


  const promocion =
    Array.isArray(
      promociones,
    )
      ? promociones.find(
          (item) =>
            item.id ===
            id,
        )
      : null;


  if (
    !promocion
  ) {
    return;
  }


  const resultado =
    aplicarAccion(
      promocion,
      accion,
      {
        // Regla: la promoción pasa a "Acordada" al firmarse.
        extra:
          accion ===
          "firmar"
            ? {
                estadoPromocion:
                  "acordado",
              }
            : {},

        campo:
          "estadoAcuerdo",
        campoHistorial:
          "historialAcuerdo",
        usuario:
          getSession()?.nombre ||
          "",
      },
    );


  if (
    !resultado.ok
  ) {
    window.alert(
      resultado.error,
    );

    return;
  }


  saveData(
    KEY_PROMOCIONES,
    promociones,
  );


  renderPromociones();
}


// ============================================================
// PRIORIDAD
// ============================================================

function irAExpedientePrioritario(
  numero,
) {

  if (
    !numero
  ) {
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

  if (
    !value
  ) {
    return "—";
  }


  const parts =
    String(
      value,
    )
      .slice(
        0,
        10,
      )
      .split(
        "-",
      );


  if (
    parts.length ===
    3
  ) {

    return `${parts[2]}/${parts[1]}/${parts[0]}`;

  }


  return String(
    value,
  );
}