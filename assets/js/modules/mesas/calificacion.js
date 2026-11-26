// ============================================================
// CALIFICACIÓN
// assets/js/modules/mesas/calificacion.js
// FASE 4 - T-15
//
// Una sola columna "Estado": el catálogo de Calificación empieza en
// "Por acordar" y sigue con el flujo normal (En proceso, En revisión
// interna, En firma, En lista, En Actuaría). Ya no hay una columna
// aparte "Calificación" ni botón manual "Marcar acordado".
//
// ⚠️ Interpretación: "Por acordar" es el estado inicial; la Mesa lo
// pasa a "En proceso" con un botón. La calificación se da por
// concluida (dato interno `resultado: "acordado"` + `concluidaEn`,
// que usa Estadística) cuando la Magistrada firma.
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
  getExpedientesMesaActual,
  getNumeroExpediente,
} from "./mesaUtils.js";

import { montarPlantillasEn } from "./plantillas.js";

import {
  aplicarAccion,
  accionDeBoton,
  renderBotonesFlujo,
  renderEstadoBadge,
} from "./flujoEstados.js";
import { abrirEnvioFirma } from "./documentosFirma.js";
import {
  renderSeccionActiva,
} from "./navegacion.js";
import {
  getSession,
} from "../../auth.js";


// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY_CALIFICACIONES = "mesasCalificaciones";

const ESTADOS_CALIFICACION = [
  "por-acordar",
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
        item.calificacion.estado ===
        "por-acordar",
    );

  const enProceso =
    registros.filter(
      (item) =>
        item.calificacion.estado ===
        "en-proceso",
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
            Calificación de la demanda. Su agenda está en el apartado Agenda.
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
            resultadoActivo === "en-proceso"
              ? "active"
              : ""
          }"
          data-calificacion-action="resultado"
          data-resultado="en-proceso"
        >
          <span>En proceso</span>
          <strong>${enProceso.length}</strong>
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
      PLANTILLAS
      ================================================= -->
      <div data-plantillas-slot></div>

    </section>
  `;


     actualizarListado();

  configurarEventosCalificacion(
    vista,
  );

  // Cargar las plantillas de Calificación.
  const slotPlantillas =
    vista.querySelector("[data-plantillas-slot]");

  if (slotPlantillas) {
    montarPlantillasEn(slotPlantillas, {
      categoria: "calificacion",
    });
  }
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


        // Unificación de columnas: lo que estaba "En proceso / Por
        // acordar" y aún no se trabajaba pasa a "Por acordar".
        if (!existente.estadoUnificado) {
          if (
            existente.estado === "en-proceso" &&
            existente.resultado !== "acordado" &&
            !existente.acuerdo &&
            !(existente.historial || []).length
          ) {
            existente.estado = "por-acordar";
          }

          existente.estadoUnificado = true;

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
          "por-acordar",

        estadoUnificado:
          true,

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
          item.calificacion.estado ===
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

              ${renderEstadoBadge(
                item.calificacion.estado,
              )}

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
              <div class="mesas-actions">
              ${renderBotonesFlujo(
                item.calificacion.estado,
                {
                  actionAttr: "data-calificacion-action",
                  attrs: `data-calificacion-id="${escapeHTML(
                    item.calificacion.id,
                  )}"`,
                  acuerdo: item.calificacion.acuerdo,
                },
              )}
              </div>

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

  renderSeccionActiva();
  break;


        case "flujo":
          ejecutarAccionCalificacion(
            button.dataset.calificacionId,
            accionDeBoton(button),
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
// FLUJO AUTOMÁTICO (sin selector manual de estado)
// ============================================================
function ejecutarAccionCalificacion(id, accion) {
  if (!accion) return;
  const calificaciones = getData(KEY_CALIFICACIONES, []);
  const item = Array.isArray(calificaciones)
    ? calificaciones.find((registro) => registro.id === id)
    : null;
  if (!item) return;

  // Enviar a firma pide documento adjunto y concepto "Acuerdo".
  if (accion === "enviar-firma") {
    abrirEnvioFirma({
      referencia: `Calificación · Expediente ${item.expediente}`,
      acuerdo: item.acuerdo,
      aplicar: (acuerdo) => {
        const enviado = aplicarAccion(item, accion, {
          extra: { acuerdo },
          usuario: getSession()?.nombre || "",
        });

        if (enviado.ok) saveData(KEY_CALIFICACIONES, calificaciones);

        return enviado;
      },
      alTerminar: renderSeccionActiva,
    });

    return;
  }

  const resultado = aplicarAccion(item, accion, {
    usuario: getSession()?.nombre || "",
  });
  if (!resultado.ok) {
    window.alert(resultado.error);
    return;
  }
  // Al firmar la Magistrada, la calificación queda concluida.
  if (accion === "firmar") {
    item.resultado = "acordado";
    item.concluidaEn = todayISO();
  }

  saveData(KEY_CALIFICACIONES, calificaciones);
renderSeccionActiva();
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