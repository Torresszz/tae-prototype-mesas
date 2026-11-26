// ============================================================
// PROMOCIONES
// assets/js/modules/mesas/promociones.js
// ============================================================

import { getData, saveData } from "../../storage.js";

import { createId, escapeHTML, todayISO } from "../../utils.js";

import {
  aplicarFiltrosGlobales,
  setFiltro,
  sincronizarBarraFiltros,
} from "./filtros.js";

import { aplicarAccion, renderEstadoBadge } from "./flujoEstados.js";

import { abrirEnvioFirma } from "./documentosFirma.js";

import { getSession } from "../../auth.js";

import { getExpedientesMesaActual, getNumeroExpediente } from "./mesaUtils.js";

import { esCritico } from "./config.js";

import { openAgendarAudienciaPromocion } from "./promocionAgenda.js";

import { openAcordarPromocion } from "./promocionAcordar.js";

import { montarPlantillasEn } from "./plantillas.js";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY_PROMOCIONES = "promociones";

const KEY_AGENDA = "mesasAgenda";

let busquedaPersona = "";

let categoriaActiva = "todas";

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderPromociones() {
  const vista = document.querySelector('[data-mesas-vista="promociones"]');

  if (!vista) {
    return;
  }

  prepararPromociones();

  const registros = getRegistrosPromociones();

  const porAcordar = registros.filter(
    (item) => item.estadoPromocion === "por-acordar",
  );

  const acordadas = registros.filter(
    (item) => item.estadoPromocion === "acordado",
  );

  const prioridad = getExpedientePrioritario(registros);

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

      ${renderPrioridad(prioridad)}


      <!-- ================================================
      CONTADORES
      ================================================= -->

      <div class="mesas-fase4-counters">


        <button
          type="button"
          class="mesas-fase4-counter ${
            categoriaActiva === "todas" ? "active" : ""
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
            categoriaActiva === "por-acordar" ? "active" : ""
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
            categoriaActiva === "acordado" ? "active" : ""
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

              ${renderFilasPromociones(getRegistrosVisibles())}

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

  // Cargar las plantillas de Promociones.
  const slotPlantillas =
    vista.querySelector("[data-plantillas-slot]");

  if (slotPlantillas) {
    montarPlantillasEn(slotPlantillas, {
      categoria: "promociones",
    });
  }
}


// ============================================================
// NORMALIZAR PROMOCIONES
// ============================================================

function prepararPromociones() {
  const datos = getData(KEY_PROMOCIONES, []);

  if (!Array.isArray(datos)) {
    saveData(KEY_PROMOCIONES, []);

    return;
  }

  let changed = false;

  datos.forEach((promocion) => {
    if (!promocion.id) {
      promocion.id = createId();

      changed = true;
    }

    if (!promocion.estadoPromocion) {
      promocion.estadoPromocion = "por-acordar";

      changed = true;
    }

    if (!promocion.estadoAcuerdo) {
      promocion.estadoAcuerdo = "en-proceso";

      changed = true;
    }
  });

  if (changed) {
    saveData(KEY_PROMOCIONES, datos);
  }
}
// ============================================================
// REGISTROS
// ============================================================

function getRegistrosPromociones() {
  const promociones = getData(KEY_PROMOCIONES, []);

  if (!Array.isArray(promociones)) {
    return [];
  }

  const expedientes = getExpedientesMesaActual();

  const mapaExpedientes = new Map(
    expedientes.map((expediente) => [
      getNumeroExpediente(expediente),
      expediente,
    ]),
  );

  const agenda = getAgenda();

  return (
    promociones

      // Solo promociones ya recibidas por la mesa.
      .filter((promocion) => promocion.recibidaMesa === true)

      .map((promocion) => {
        const numero = String(promocion.expediente || promocion.numero || "");

        const expediente = mapaExpedientes.get(numero);

        if (!expediente) {
          return null;
        }

        const audiencia = buscarAudienciaPromocion(promocion, agenda);

        const estadoAcuerdo = promocion.estadoAcuerdo || "en-proceso";

        const estadoPromocion = promocion.estadoPromocion || "por-acordar";

        return {
          id: promocion.id,

          numero,

          fecha: promocion.fecha || promocion.creadoEn || "",

          actor: expediente.actor || expediente.promovente || "—",

          demandado: expediente.demandado || "—",

          descripcion: promocion.descripcion || promocion.tipo || "Promoción",

          estadoPromocion,

          estadoAcuerdo,

          situacionVisual: obtenerSituacionVisual(promocion),

          tieneProyecto: tieneProyectoAcuerdo(promocion),

          audiencia,

          promocion,

          expediente,
        };
      })

      .filter(Boolean)
  );
}

// ============================================================
// ¿YA EXISTE PROYECTO DE ACUERDO?
// ============================================================

function tieneProyectoAcuerdo(promocion) {
  if (!promocion || !promocion.acuerdo) {
    return false;
  }

  const acuerdo = promocion.acuerdo;

  // Soporte para acuerdo almacenado como texto.
  if (typeof acuerdo === "string") {
    return Boolean(acuerdo.trim());
  }

  // Soporte para el formato actual y para el
  // modal que agregaremos después.
  if (typeof acuerdo === "object") {
    return Boolean(
      acuerdo.titulo ||
      acuerdo.texto ||
      acuerdo.contenido ||
      acuerdo.extracto ||
      acuerdo.archivo ||
      acuerdo.documento ||
      acuerdo.nombreArchivo,
    );
  }

  return false;
}

// ============================================================
// SITUACIÓN VISUAL
// ============================================================
//
// Esta columna ya no depende únicamente de "estadoPromocion".
// Muestra al usuario en qué parte real del flujo se encuentra.
//
// ============================================================

function obtenerSituacionVisual(promocion) {
  const estadoPromocion = promocion.estadoPromocion || "por-acordar";

  const estadoAcuerdo = promocion.estadoAcuerdo || "en-proceso";

  // Ya quedó acordada.
  if (
    estadoPromocion === "acordado" ||
    estadoAcuerdo === "en-lista" ||
    estadoAcuerdo === "en-actuaria" ||
    estadoAcuerdo === "en-archivo"
  ) {
    return {
      clave: "acordada",

      texto: "Acordada",

      clase: "done",
    };
  }

  // Ya fue enviada a firma.
  if (estadoAcuerdo === "en-firma") {
    return {
      clave: "en-firma",

      texto: "En firma",

      clase: "sign",
    };
  }

  // Existe un acuerdo preparado pero todavía
  // no se ha enviado a firma.
  if (
    tieneProyectoAcuerdo(promocion) ||
    estadoAcuerdo === "en-revision-interna"
  ) {
    return {
      clave: "en-proyecto",

      texto: "En proyecto",

      clase: "project",
    };
  }

  // Estado inicial.
  return {
    clave: "por-acordar",

    texto: "Por acordar",

    clase: "pending",
  };
}

// ============================================================
// AGENDA
// ============================================================

function getAgenda() {
  const datos = getData(KEY_AGENDA, []);

  return Array.isArray(datos) ? datos : [];
}

// ============================================================
// BUSCAR AUDIENCIA RELACIONADA A LA PROMOCIÓN
// ============================================================

function buscarAudienciaPromocion(promocion, agenda) {
  // Primero intentamos localizarla con el ID
  // guardado directamente en la promoción.
  if (promocion.audienciaEventoId) {
    const evento = agenda.find(
      (item) => item.id === promocion.audienciaEventoId,
    );

    if (evento) {
      return evento;
    }
  }

  // Compatibilidad con eventos creados anteriormente.
  return (
    agenda.find(
      (evento) =>
        evento.tipo === "audiencia" &&
        evento.origen === "promocion" &&
        evento.promocionId === promocion.id,
    ) || null
  );
}

// ============================================================
// FILTRADO
// ============================================================

function getRegistrosVisibles() {
  let registros = getRegistrosPromociones();

  registros = aplicarFiltrosGlobales(registros, {
    numero: (item) => item.numero,

    fecha: (item) => item.fecha,

    estado: (item) => item.estadoAcuerdo,
  });

  const texto = busquedaPersona.trim().toLowerCase();

  if (texto) {
    registros = registros.filter((item) => {
      const persona = `
            ${item.actor}
            ${item.demandado}
          `.toLowerCase();

      return persona.includes(texto);
    });
  }

  if (categoriaActiva !== "todas") {
    registros = registros.filter(
      (item) => item.estadoPromocion === categoriaActiva,
    );
  }

  return registros;
}

// ============================================================
// PRIORIDAD
// ============================================================

function getExpedientePrioritario(registros) {
  if (!registros.length) {
    return null;
  }

  const conteo = new Map();

  registros.forEach((item) => {
    conteo.set(item.numero, (conteo.get(item.numero) || 0) + 1);
  });

  let numero = "";

  let cantidad = 0;

  conteo.forEach((total, expediente) => {
    if (total > cantidad) {
      numero = expediente;

      cantidad = total;
    }
  });

  if (!numero) {
    return null;
  }

  return {
    numero,

    cantidad,

    critico: esCritico(cantidad),
  };
}

// ============================================================
// ALERTA / PRIORIDAD SUPERIOR
// ============================================================
//
// ESTA PARTE SE CONSERVA.
// Es la franja roja que ya tienes arriba.
//
// ============================================================

function renderPrioridad(prioridad) {
  if (!prioridad) {
    return "";
  }

  return `
    <section class="mesas-promociones-priority ${
      prioridad.critico ? "danger" : ""
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
          ${escapeHTML(prioridad.numero)}
        </strong>


        <small>

          ${prioridad.cantidad}

          ${prioridad.cantidad === 1 ? "promoción" : "promociones"}

          ${prioridad.critico ? " · Nivel crítico" : ""}

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
        data-expediente="${escapeHTML(prioridad.numero)}"
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

function renderFilasPromociones(registros) {
  return registros

    .map((item) => {
      const tieneAudiencia = Boolean(item.audiencia);

      return `
          <tr>


            <!-- =========================================
            EXPEDIENTE
            ========================================== -->

            <td>

              <strong class="mesas-expediente-number">

                ${escapeHTML(item.numero)}

              </strong>

            </td>


            <!-- =========================================
            FECHA
            ========================================== -->

            <td>

              ${escapeHTML(formatFecha(item.fecha))}

            </td>


            <!-- =========================================
            ACTOR
            ========================================== -->

            <td>

              ${escapeHTML(item.actor)}

            </td>


            <!-- =========================================
            DEMANDADO
            ========================================== -->

            <td>

              ${escapeHTML(item.demandado)}

            </td>


            <!-- =========================================
            PROMOCIÓN
            ========================================== -->

            <td>

              <div class="mesas-promocion-description">

                ${escapeHTML(item.descripcion)}

              </div>


              ${
                tieneAudiencia
                  ? `
                    <div class="mesas-promocion-audiencia-tag">

                      <i class="fa-regular fa-calendar-check"></i>

                      <span>

                        Audiencia:

                        ${escapeHTML(formatFecha(item.audiencia.fecha))}

                        ${
                          item.audiencia.hora
                            ? `
                              · ${escapeHTML(item.audiencia.hora)}
                            `
                            : ""
                        }

                      </span>

                    </div>
                  `
                  : ""
              }

            </td>


            <!-- =========================================
            ESTADO DEL ACUERDO
            ========================================== -->

            <td>

              ${renderEstadoBadge(item.estadoAcuerdo)}

            </td>


            <!-- =========================================
            SITUACIÓN
            ========================================== -->

            <td>

              ${renderSituacionPromocion(item.situacionVisual)}

            </td>


            <!-- =========================================
            ACCIONES
            ========================================== -->

            <td class="mesas-promociones-actions-cell">

              ${renderAccionesPromocion(item)}

            </td>


          </tr>
        `;
    })

    .join("");
}

// ============================================================
// SITUACIÓN
// ============================================================

function renderSituacionPromocion(situacion) {
  if (!situacion) {
    return `
      <span class="mesas-fase4-category-badge pending">
        Por acordar
      </span>
    `;
  }

  return `
    <span
      class="
        mesas-fase4-category-badge
        ${escapeHTML(situacion.clase || "pending")}
      "
    >

      ${escapeHTML(situacion.texto || "Por acordar")}

    </span>
  `;
}

// ============================================================
// ACCIONES DE PROMOCIÓN
// ============================================================
//
// POR ACORDAR:
// Acordar | Enviar a firma bloqueado | Agendar audiencia
//
// EN PROYECTO:
// Editar acuerdo | Enviar a firma | Agendar audiencia
//
// EN FIRMA:
// En firma | Audiencia
//
// ACORDADA:
// Acordada | Audiencia
//
// ============================================================

function renderAccionesPromocion(item) {
  const id = escapeHTML(String(item.id));

  const tieneAudiencia = Boolean(item.audiencia);

  const situacion = item.situacionVisual?.clave || "por-acordar";

  const audienciaButton = `
    <button
      type="button"
      class="mesas-secondary-btn mesas-promocion-action-btn"
      data-promociones-action="agendar-audiencia"
      data-promocion-id="${id}"
    >

      <i class="fa-regular ${
        tieneAudiencia ? "fa-calendar-check" : "fa-calendar-plus"
      }"></i>

      <span>

        ${tieneAudiencia ? "Ver audiencia" : "Agendar audiencia"}

      </span>

    </button>
  `;

  // ==========================================================
  // POR ACORDAR
  // ==========================================================

  if (situacion === "por-acordar") {
    return `
      <div class="mesas-promociones-actions">


        <button
          type="button"
          class="mesas-primary-btn mesas-promocion-action-btn"
          data-promociones-action="acordar"
          data-promocion-id="${id}"
        >

          <i class="fa-solid fa-pen-to-square"></i>

          <span>
            Acordar
          </span>

        </button>


        <button
          type="button"
          class="mesas-secondary-btn mesas-promocion-action-btn"
          disabled
          title="Primero debes acordar la promoción"
        >

          <i class="fa-solid fa-paper-plane"></i>

          <span>
            Enviar a firma
          </span>

        </button>


        ${audienciaButton}


      </div>
    `;
  }

  // ==========================================================
  // EN PROYECTO
  // ==========================================================

  if (situacion === "en-proyecto") {
    return `
      <div class="mesas-promociones-actions">


        <button
          type="button"
          class="mesas-secondary-btn mesas-promocion-action-btn"
          data-promociones-action="acordar"
          data-promocion-id="${id}"
        >

          <i class="fa-solid fa-pen-to-square"></i>

          <span>
            Editar acuerdo
          </span>

        </button>


        <button
          type="button"
          class="mesas-primary-btn mesas-promocion-action-btn"
          data-promociones-action="enviar-firma"
          data-promocion-id="${id}"
        >

          <i class="fa-solid fa-paper-plane"></i>

          <span>
            Enviar a firma
          </span>

        </button>


        ${audienciaButton}


      </div>
    `;
  }

  // ==========================================================
  // EN FIRMA
  // ==========================================================

  if (situacion === "en-firma") {
    return `
      <div class="mesas-promociones-actions">


        <button
          type="button"
          class="mesas-secondary-btn mesas-promocion-action-btn"
          disabled
        >

          <i class="fa-solid fa-hourglass-half"></i>

          <span>
            En firma
          </span>

        </button>


        ${audienciaButton}


      </div>
    `;
  }

  // ==========================================================
  // ACORDADA
  // ==========================================================

  return `
    <div class="mesas-promociones-actions">


      <button
        type="button"
        class="mesas-secondary-btn mesas-promocion-action-btn"
        disabled
      >

        <i class="fa-solid fa-circle-check"></i>

        <span>
          Acordada
        </span>

      </button>


      ${audienciaButton}


    </div>
  `;
}

// ============================================================
// ACTUALIZAR LISTADO
// ============================================================

function actualizarListado() {
  const vista = document.querySelector('[data-mesas-vista="promociones"]');

  if (!vista) {
    return;
  }

  const tbody = vista.querySelector(".mesas-promociones-table tbody");

  const empty = vista.querySelector("#promocionesEmpty");

  if (!tbody) {
    return;
  }

  const registros = getRegistrosVisibles();

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

  tbody.innerHTML = renderFilasPromociones(registros);
}
// ============================================================
// EVENTOS
// ============================================================

function configurarEventosPromociones(vista) {
  const search = vista.querySelector("#promocionesBusquedaPersona");

  // ==========================================================
  // BUSCADOR
  // ==========================================================

  if (search) {
    search.oninput = (event) => {
      busquedaPersona = event.target.value;

      actualizarListado();
    };
  }

  // ==========================================================
  // ACCIONES
  // ==========================================================

  vista.onclick = (event) => {
    const button = event.target.closest("[data-promociones-action]");

    if (!button) {
      return;
    }

    if (button.disabled) {
      return;
    }

    const action = button.dataset.promocionesAction;

    const promocionId = button.dataset.promocionId;

    switch (action) {
      // ====================================================
      // CATEGORÍAS
      // ====================================================

      case "categoria":
        categoriaActiva = button.dataset.categoria || "todas";

        renderPromociones();

        break;

      // ====================================================
      // PRIORIDAD
      // ====================================================

      case "prioridad":
        irAExpedientePrioritario(button.dataset.expediente);

        break;

      // ====================================================
      // ACORDAR
      // ====================================================
      //
      // Por ahora solo detectamos correctamente la acción.
      // En el siguiente cambio reemplazaremos este punto
      // por el nuevo modal de atención de Promociones.
      //
      // NO cambiamos ningún estado automáticamente aquí.
      // ====================================================

      case "acordar":
        openAcordarPromocion(
          promocionId,

          () => {
            renderPromociones();
          },
        );

        break;

      // ====================================================
      // ENVIAR A FIRMA
      // ====================================================

      case "enviar-firma":
        ejecutarAccionPromocion(promocionId, "enviar-firma");

        break;

      // ====================================================
      // AUDIENCIA
      // ====================================================

      case "agendar-audiencia":
        openAgendarAudienciaPromocion(
          promocionId,

          () => {
            renderPromociones();
          },
        );

        break;
    }
  };
}

// ============================================================
// PREPARAR ATENCIÓN DE PROMOCIÓN
// ============================================================
//
// Este punto queda separado intencionalmente.
//
// El siguiente cambio será únicamente este flujo:
// - Sentido del acuerdo
// - Título
// - Subir documento
// - Observaciones
// - Guardar proyecto
//
// Por ahora NO modificamos la promoción ni su estado.
// ============================================================

function prepararAtencionPromocion(id) {
  const promociones = getData(KEY_PROMOCIONES, []);

  const promocion = Array.isArray(promociones)
    ? promociones.find((item) => String(item.id) === String(id))
    : null;

  if (!promocion) {
    return;
  }

  // Dejamos este aviso únicamente mientras terminamos
  // el nuevo modal en el siguiente paso.
  //
  // No cambia estados ni guarda información.

  window.alert(
    "La promoción está lista para acordarse. En el siguiente cambio configuraremos el modal de atención.",
  );
}

// ============================================================
// FLUJO AUTOMÁTICO DEL ACUERDO
// ============================================================

function ejecutarAccionPromocion(id, accion) {
  if (!accion) {
    return;
  }

  const promociones = getData(KEY_PROMOCIONES, []);

  const promocion = Array.isArray(promociones)
    ? promociones.find((item) => String(item.id) === String(id))
    : null;

  if (!promocion) {
    return;
  }

  // ==========================================================
  // ENVIAR A FIRMA
  // ==========================================================
  //
  // No permitimos enviar directamente una promoción
  // que todavía no tenga proyecto/acuerdo.
  // ==========================================================

  if (accion === "enviar-firma") {
    if (!tieneProyectoAcuerdo(promocion)) {
      window.alert(
        "Primero debes acordar la promoción y guardar el proyecto de acuerdo.",
      );

      return;
    }

    abrirEnvioFirma({
      referencia: `Promoción · Expediente ${
        promocion.expediente || promocion.numero || ""
      }`,

      acuerdo: promocion.acuerdo,

      aplicar: (acuerdo) => {
        const enviado = aplicarAccion(promocion, "enviar-firma", {
          extra: {
            acuerdo,
          },

          campo: "estadoAcuerdo",

          campoHistorial: "historialAcuerdo",

          usuario: getSession()?.nombre || getSession()?.email || "",
        });

        if (enviado.ok) {
          saveData(KEY_PROMOCIONES, promociones);
        }

        return enviado;
      },

      alTerminar: renderPromociones,
    });

    return;
  }

  // ==========================================================
  // RESTO DEL FLUJO
  // ==========================================================

  const resultado = aplicarAccion(promocion, accion, {
    // Cuando se firma se considera acordada.
    extra:
      accion === "firmar"
        ? {
            estadoPromocion: "acordado",

            acordadoEn: todayISO(),
          }
        : {},

    campo: "estadoAcuerdo",

    campoHistorial: "historialAcuerdo",

    usuario: getSession()?.nombre || getSession()?.email || "",
  });

  if (!resultado.ok) {
    window.alert(resultado.error);

    return;
  }

  saveData(KEY_PROMOCIONES, promociones);

  renderPromociones();
}
// ============================================================
// IR AL EXPEDIENTE PRIORITARIO
// ============================================================

function irAExpedientePrioritario(numero) {
  if (!numero) {
    return;
  }

  setFiltro("expediente", numero);

  sincronizarBarraFiltros();

  categoriaActiva = "todas";

  renderPromociones();
}

// ============================================================
// FORMATO DE FECHA
// ============================================================

function formatFecha(value) {
  if (!value) {
    return "—";
  }

  const parts = String(value).slice(0, 10).split("-");

  if (parts.length === 3) {
    return `${parts[2]}/` + `${parts[1]}/` + `${parts[0]}`;
  }

  return String(value);
}
