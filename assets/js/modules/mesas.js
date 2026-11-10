// ============================================================
// SECRETARÍA DE ACUERDOS
// assets/js/modules/mesas.js
// ============================================================

import { getData, saveData } from "../storage.js";

import { createId, escapeHTML } from "../utils.js";

import { showModal, closeForm } from "../forms/formHelper.js";

import { getSession, canSign } from "../auth.js";

import { MESAS_CONFIG, esCritico, nivelPromociones } from "./mesas/config.js";

import {
  ESTADOS,
  ESTADO_INICIAL,
  MAPA_ESTADOS_ANTIGUOS,
  etiquetaEstado,
} from "./mesas/estados.js";

import {
  getFiltros,
  setFiltro,
  coincideExpediente,
  coincideFecha,
  coincideEstado,
  initBarraFiltros,
  sincronizarBarraFiltros,
} from "./mesas/filtros.js";

import {
  initNavegacionMesas,
  registrarSeccion,
  renderSeccionActiva,
} from "./mesas/navegacion.js";

import { renderPlantillas } from "./mesas/plantillas.js";
import { renderAudiencia } from "./mesas/audiencia.js";
import { renderDemanda } from "./mesas/demanda.js";
import { renderPromociones } from "./mesas/promociones.js";
import { renderCalificacion } from "./mesas/calificacion.js";
import { renderConsultas } from "./mesas/consultas.js";
import { renderIntersindicales } from "./mesas/intersindicales.js";
import { renderOficiosMesas } from "./mesas/oficios.js";
import { renderEstadistica } from "./mesas/estadistica.js";
import { sembrarDemoFases } from "./mesas/demo.js";

import {
  getAvisosAgendaPendientes,
  marcarNotificacionLeida,
} from "./mesas/notificaciones.js";

import {
  etiquetaTipoEventoAgenda,
  etiquetaDestinatarioAgenda,
} from "./mesas/catalogos.js";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY = "mesasSeguimiento";

// Pestañas internas que ya tienen su propio render (una línea por fase)
registrarSeccion("plantillas", renderPlantillas);
registrarSeccion("audiencia", renderAudiencia);
registrarSeccion("demanda", renderDemanda);
registrarSeccion("promociones", renderPromociones);
registrarSeccion("calificacion", renderCalificacion);
registrarSeccion("consultas", renderConsultas);
registrarSeccion("intersindicales", renderIntersindicales);
registrarSeccion("oficios", renderOficiosMesas);
registrarSeccion("estadistica", renderEstadistica);
// Búsqueda propia de la vista Mesas (actor, demandado, acto).
// El resto de filtros (expediente, fechas, estado) son globales: mesas/filtros.js
let currentTexto = "";
let currentOrdenPromociones = "desc";

let vistaInicialAplicada = false;

// ============================================================
// INICIALIZACIÓN
// ============================================================

export function initMesas() {
  window.renderMesas = renderMesas;

  window.openCrearAcuerdos = openCrearAcuerdos;
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderMesas() {
  const page = document.getElementById("mesasPage");

  if (!page) {
    return;
  }

  prepararSeguimiento();

  // La Magistrada entra directo a lo que tiene por firmar
  if (!vistaInicialAplicada) {
    vistaInicialAplicada = true;

    if (canSign()) {
      setFiltro("estado", "en-firma");
    }
  }

  renderTituloMesa();

  setupEvents();

  const registros = getRegistros();

  renderTabsEstado(registros);

  renderTable(registros);

  renderAlerts(registros);

  // Pestañas que no son "Mesas" (las fases siguientes registran su render)
  renderSeccionActiva();
}

// ============================================================
// PREPARAR SEGUIMIENTO
// ============================================================

function prepararSeguimiento() {
  const expedientes = getData("expedientes", []);

  const seguimiento = getData(KEY, {});

  let changed = false;

  // Limpieza de datos guardados con el catálogo anterior (etapa -> estado)
  Object.values(seguimiento).forEach((registro) => {
    if (registro && registro.etapa !== undefined) {
      if (!registro.estado) {
        registro.estado =
          MAPA_ESTADOS_ANTIGUOS[registro.etapa] || ESTADO_INICIAL;
      }

      delete registro.etapa;

      changed = true;
    }
  });

  expedientes.forEach((expediente) => {
    const numero = getNumero(expediente);

    if (!numero) {
      return;
    }

    if (seguimiento[numero]) {
      return;
    }

    seguimiento[numero] = {
      estado: ESTADO_INICIAL,

      recibidoEn: null,

      ultimoMovimiento: "Recibido en Oficialía de Partes",

      acuerdo: null,

      archivoAcuerdo: null,

      enviadoFirmaEn: null,

      archivadoEn: null,

      historial: [
        {
          fecha: new Date().toISOString(),

          movimiento: "Recibido en Oficialía de Partes",
        },
      ],
    };

    changed = true;
  });

  if (changed) {
    saveData(KEY, seguimiento);
  }
}

// ============================================================
// OBTENER REGISTROS
// ============================================================

function getRegistros() {
  const expedientes = getData("expedientes", []);

  const promociones = getData("promociones", []);

  const seguimiento = getData(KEY, {});

  const mesa = mesaUsuario();

  return expedientes
    .filter(
      (expediente) =>
        !mesa ||
        mesaDeExpediente(expediente) === mesa,
    )
    .map((expediente) => {
      const numero = getNumero(expediente);

      const estado = seguimiento[numero] || {
        estado: ESTADO_INICIAL,
      };

      const promocionesExp = promociones.filter(
        (promo) =>
          String(
            promo.expediente ||
              promo.numero ||
              "",
          ) === String(numero),
      );

      return {
        expediente,

        mesa: mesaDeExpediente(expediente),

        numero,

        promovente:
          expediente.actor ||
          expediente.promovente ||
          "—",

        demandado:
          expediente.demandado ||
          "—",

        ubicacion:
          expediente.ubicacion ||
          "—",

        asunto:
          expediente.actoDemandado ||
          expediente.asunto ||
          expediente.accion ||
          expediente.clasificacion ||
          "Asunto pendiente",

        fecha:
          expediente.fechaRecepcion ||
          expediente.fecha ||
          expediente.creadoEn ||
          "",

        promociones: promocionesExp,

        seguimiento: estado,
      };
    });
}

// ============================================================
// EVENTOS
// ============================================================

function setupEvents() {
  const page = document.getElementById("mesasPage");

  // Pestañas internas y barra global de búsqueda
  initNavegacionMesas(renderMesas);

  initBarraFiltros(renderMesas);

  // Búsqueda propia de la vista Mesas
  const search = document.getElementById("mesasSearch");

  if (search) {
    search.value = currentTexto;

    search.oninput = (event) => {
      currentTexto =
        event.target.value
          .trim()
          .toLowerCase();

      renderMesas();
    };
  }

  const orden =
    document.getElementById(
      "mesasOrdenPromociones",
    );

  if (orden) {
    orden.value =
      currentOrdenPromociones;

    orden.onchange = (event) => {
      currentOrdenPromociones =
        event.target.value;

      renderMesas();
    };
  }

  // Pestañas de estado: comparten el filtro global de Estado
  const tabs =
    document.getElementById(
      "mesasStatusTabs",
    );

  if (tabs) {
    tabs.onclick = (event) => {
      const button =
        event.target.closest(
          ".mesas-status-tab",
        );

      if (!button) {
        return;
      }

      setFiltro(
        "estado",
        button.dataset.status,
      );

      sincronizarBarraFiltros();

      renderMesas();
    };
  }

  const demoButton =
    document.getElementById(
      "mesasLoadDemoBtn",
    );

  if (demoButton) {
    demoButton.onclick =
      seedSecretariaDemo;
  }

  if (page) {
    page.onclick = (event) => {
      // ========================================================
      // ALERTAS DE AGENDA
      // ========================================================

      const agendaButton =
        event.target.closest(
          "[data-agenda-alert-action]",
        );

      if (agendaButton) {
        const action =
          agendaButton.dataset
            .agendaAlertAction;

        const notificacionId =
          agendaButton.dataset
            .notificacionId;

        if (
          action === "marcar-leida" &&
          notificacionId
        ) {
          marcarNotificacionLeida(
            notificacionId,
          );

          renderMesas();
        }

        return;
      }

      // ========================================================
      // ACCIONES EXISTENTES DE MESAS
      // ========================================================

      const button =
        event.target.closest(
          "[data-mesas-action]",
        );

      if (!button) {
        return;
      }

      const action =
        button.dataset.mesasAction;

      const numero =
        button.dataset.expediente;

      switch (action) {
        case "crear-acuerdo":
          openCrearAcuerdos(
            numero,
          );
          break;

        case "enviar-firma":
          avanzarEstado(
            numero,
            "en-firma",
            "Proyecto de acuerdo enviado a firma de la Magistrada",
            {
              enviadoFirmaEn:
                new Date().toISOString(),
            },
          );
          break;

        case "firmar":
          openFirmarAcuerdo(
            numero,
          );
          break;

        case "a-actuaria":
          avanzarEstado(
            numero,
            "en-actuaria",
            "Turnado a Actuaría",
          );
          break;

        case "a-archivo":
          avanzarEstado(
            numero,
            "en-archivo",
            "Turnado a Archivo",
            {
              archivadoEn:
                new Date().toISOString(),
            },
          );
          break;

        case "ver":
          openDetalleExpediente(
            numero,
          );
          break;
      }
    };
  }
}

// ============================================================
// CONTADORES
// ============================================================

function renderTabsEstado(registros) {
  const contenedor =
    document.getElementById(
      "mesasStatusTabs",
    );

  if (!contenedor) {
    return;
  }

  const activo =
    getFiltros().estado;

  const tabs = [
    {
      clave: "",
      etiqueta: "Todos",
      total: registros.length,
    },

    ...ESTADOS.map((estado) => ({
      clave: estado.clave,

      etiqueta: estado.etiqueta,

      total: registros.filter(
        (registro) =>
          registro.seguimiento
            .estado === estado.clave,
      ).length,
    })),
  ];

  contenedor.innerHTML =
    tabs
      .map(
        (tab) => `
          <button
            type="button"
            class="mesas-status-tab ${
              tab.clave === activo
                ? "active"
                : ""
            }"
            data-status="${tab.clave}"
          >
            <span>
              ${tab.etiqueta}
            </span>

            <strong>
              ${tab.total}
            </strong>
          </button>
        `,
      )
      .join("");
}

// ============================================================
// TABLA
// ============================================================

function renderTable(registros) {
  const tbody =
    document.getElementById(
      "mesasTable",
    );

  const empty =
    document.getElementById(
      "mesasEmpty",
    );

  if (!tbody) {
    return;
  }

  // Filtros globales:
  // No. de expediente, fecha de recepción y estado.
  let visibles =
    registros.filter(
      (item) =>
        coincideEstado(
          item.seguimiento.estado,
        ) &&
        coincideExpediente(
          item.numero,
        ) &&
        coincideFecha(
          item.fecha,
        ),
    );

  // Búsqueda propia de esta vista.
  if (currentTexto) {
    visibles =
      visibles.filter(
        (item) => {
          const texto = `
            ${item.promovente}
            ${item.demandado}
            ${item.asunto}
            ${item.ubicacion}
          `.toLowerCase();

          return texto.includes(
            currentTexto,
          );
        },
      );
  }

  // Orden estable.
  if (
    currentOrdenPromociones !==
    "sin-orden"
  ) {
    visibles.sort(
      (a, b) =>
        currentOrdenPromociones ===
        "asc"
          ? a.promociones.length -
            b.promociones.length
          : b.promociones.length -
            a.promociones.length,
    );
  }

  if (!visibles.length) {
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
    visibles
      .map(
        (item) =>
          renderRow(item),
      )
      .join("");
}

// ============================================================
// FILA
// ============================================================

function renderRow(item) {
  const estado =
    item.seguimiento.estado;

  const promoCount =
    item.promociones.length;

  return `
    <tr>

      <td>
        <span class="mesas-expediente-number">
          ${escapeHTML(item.numero)}
        </span>

        <span class="mesas-mesa-tag">
          Mesa ${item.mesa}
        </span>
      </td>


      <td>
        <span class="mesas-promos-count ${nivelPromociones(
          promoCount,
        )}">
          ${promoCount}
        </span>
      </td>


      <td>
        ${escapeHTML(
          formatFecha(item.fecha),
        )}
      </td>


      <td>
        ${escapeHTML(
          item.promovente,
        )}
      </td>


      <td>
        ${escapeHTML(
          item.demandado,
        )}
      </td>


      <td>
        ${escapeHTML(
          item.asunto,
        )}
      </td>


      <td>
        ${renderEstadoBadge(
          estado,
        )}
      </td>


      <td>
        ${escapeHTML(
          item.ubicacion,
        )}
      </td>


      <td>
        ${renderActions(
          item,
        )}
      </td>

    </tr>
  `;
}

// ============================================================
// BADGE ESTADO
// ============================================================

function renderEstadoBadge(
  estado,
) {
  return `
    <span class="mesas-estado-badge ${escapeHTML(
      estado,
    )}">
      ${escapeHTML(
        etiquetaEstado(estado),
      )}
    </span>
  `;
}

// ============================================================
// ACCIONES
// ============================================================

function renderActions(item) {
  const numero =
    escapeHTML(
      item.numero,
    );

  const estado =
    item.seguimiento.estado;

  const esMagistrada =
    canSign();

  const boton = (
    accion,
    texto,
    icono,
    clase = "mesas-secondary-btn",
  ) => `
    <button
      type="button"
      class="${clase}"
      data-mesas-action="${accion}"
      data-expediente="${numero}"
    >
      <i class="${icono}"></i>
      ${texto}
    </button>
  `;

  const verDocumentos =
    boton(
      "ver",
      "Ver documentos",
      "fa-regular fa-folder-open",
    );

  let principal = "";

  switch (estado) {
    case "en-proceso":
      if (!esMagistrada) {
        principal =
          boton(
            "crear-acuerdo",
            "Crear acuerdos",
            "fa-regular fa-file-lines",
          );
      }

      break;


    case "en-revision-interna":
      if (!esMagistrada) {
        principal =
          boton(
            "enviar-firma",
            "Enviar a firma",
            "fa-solid fa-paper-plane",
            "mesas-primary-btn",
          );
      }

      break;


    case "en-firma":
      principal =
        esMagistrada
          ? boton(
              "firmar",
              "Firmar acuerdo",
              "fa-solid fa-signature",
              "mesas-primary-btn",
            )
          : `
            <button
              type="button"
              class="mesas-secondary-btn"
              disabled
              title="Solo la Magistrada de Presidencia puede firmar"
            >
              <i class="fa-solid fa-hourglass-half"></i>
              Pendiente de firma
            </button>
          `;

      return `
        <div class="mesas-actions">
          ${principal}

          ${boton(
            "ver",
            "Ver acuerdo",
            "fa-regular fa-eye",
          )}
        </div>
      `;


    case "en-lista":
      if (!esMagistrada) {
        principal =
          boton(
            "a-actuaria",
            "Pasar a Actuaría",
            "fa-solid fa-building-columns",
            "mesas-primary-btn",
          );
      }

      break;


    case "en-actuaria":
      if (!esMagistrada) {
        principal =
          boton(
            "a-archivo",
            "Pasar a Archivo",
            "fa-solid fa-box-archive",
            "mesas-primary-btn",
          );
      }

      break;
  }

  return `
    <div class="mesas-actions">
      ${principal}
      ${verDocumentos}
    </div>
  `;
}

// ============================================================
// ALERTAS
// ============================================================

function renderAlertItem(
  alerta,
) {
  return `
    <div class="mesas-alert-item ${alerta.clase}">

      <div class="mesas-alert-icon">
        <i class="fa-solid ${alerta.icono}"></i>
      </div>

      <div class="mesas-alert-body">

        <strong>
          ${escapeHTML(
            alerta.numero,
          )}
        </strong>

        <span>
          ${escapeHTML(
            alerta.texto,
          )}
        </span>

      </div>

    </div>
  `;
}


function renderAlertGroup(
  titulo,
  alertas,
) {
  if (!alertas.length) {
    return "";
  }

  return `
    <div class="mesas-alert-group-title">

      ${escapeHTML(titulo)}

      <span>
        ${alertas.length}
      </span>

    </div>

    ${alertas
      .map(renderAlertItem)
      .join("")}
  `;
}


// ============================================================
// ALERTAS DE AGENDA
// FASE 3 - T-12
// ============================================================

function renderAgendaAlertItem(
  alerta,
) {
  const tipo =
    etiquetaTipoEventoAgenda(
      alerta.tipo,
    );

  const destinatario =
    etiquetaDestinatarioAgenda(
      alerta.destinatario,
    );

  const hora =
    alerta.hora
      ? ` · ${alerta.hora}`
      : "";

  return `
    <div class="mesas-alert-item agenda">

      <div class="mesas-alert-icon">
        <i class="fa-regular fa-calendar"></i>
      </div>


      <div class="mesas-alert-body">

        <strong>
          ${escapeHTML(
            alerta.expediente,
          )}
        </strong>


        <span>
          ${escapeHTML(tipo)}
          ·
          ${escapeHTML(
            formatFecha(
              alerta.fechaEvento,
            ),
          )}
          ${escapeHTML(hora)}
        </span>


        <span class="mesas-alert-destinatario">
          ${escapeHTML(
            destinatario,
          )}
        </span>


        <button
          type="button"
          class="mesas-alert-read-btn"
          data-agenda-alert-action="marcar-leida"
          data-notificacion-id="${escapeHTML(
            alerta.id,
          )}"
        >
          <i class="fa-solid fa-check"></i>
          Marcar como leída
        </button>

      </div>

    </div>
  `;
}


function renderAgendaAlertGroup(
  alertas,
) {
  if (!alertas.length) {
    return "";
  }

  return `
    <div class="mesas-alert-group-title">

      Agenda

      <span>
        ${alertas.length}
      </span>

    </div>

    ${alertas
      .map(
        renderAgendaAlertItem,
      )
      .join("")}
  `;
}


// ============================================================
// RENDER ALERTAS
// ============================================================

function renderAlerts(
  registros,
) {
  const container =
    document.getElementById(
      "mesasAlerts",
    );

  if (!container) {
    return;
  }


  // Críticos:
  // más de 10 promociones.
  const criticos =
    registros
      .filter(
        (item) =>
          esCritico(
            item.promociones.length,
          ),
      )
      .sort(
        (a, b) =>
          b.promociones.length -
          a.promociones.length,
      )
      .map(
        (item) => ({
          clase: "danger",

          icono:
            "fa-triangle-exclamation",

          numero:
            item.numero,

          texto:
            `${item.promociones.length} promociones · ${etiquetaEstado(
              item.seguimiento.estado,
            )}`,
        }),
      );


  // Pendientes de firma.
  const porFirmar =
    registros
      .filter(
        (item) =>
          item.seguimiento
            .estado ===
          "en-firma",
      )
      .map(
        (item) => ({
          clase: "blue",

          icono:
            "fa-flag",

          numero:
            item.numero,

          texto:
            "Proyecto de acuerdo pendiente de firma",
        }),
      );


  // ==========================================================
  // AGENDA
  // ==========================================================

  const mesa =
    mesaUsuario();

  const agenda =
    getAvisosAgendaPendientes()
      .filter(
        (aviso) =>
          !mesa ||
          Number(
            aviso.mesa,
          ) ===
            Number(
              mesa,
            ),
      );


  // ==========================================================
  // TOTAL
  // ==========================================================

  const total =
    criticos.length +
    porFirmar.length +
    agenda.length;

  setText(
    "mesasAlertCount",
    total,
  );


  // ==========================================================
  // SIN ALERTAS
  // ==========================================================

  if (!total) {
    container.innerHTML = `
      <div class="mesas-no-alerts">

        <i class="fa-regular fa-bell"></i>

        <span>
          Sin alertas pendientes.
        </span>

      </div>
    `;

    return;
  }


  // ==========================================================
  // MOSTRAR GRUPOS
  // ==========================================================

  container.innerHTML =
    renderAlertGroup(
      `Críticos (más de ${MESAS_CONFIG.PROMOS_CRITICO_MAYOR_A} promociones)`,
      criticos,
    ) +

    renderAlertGroup(
      "Pendientes de firma",
      porFirmar,
    ) +

    renderAgendaAlertGroup(
      agenda,
    );
}


// ============================================================
// MODAL 2 - CREAR ACUERDOS
// ============================================================

function openCrearAcuerdos(
  numero,
) {
  const item =
    getRegistros()
      .find(
        (registro) =>
          registro.numero ===
          numero,
      );

  if (!item) {
    return;
  }

  showModal(`
    <div class="mesas-modal-shell">

      <header class="mesas-modal-header">

        <div class="mesas-modal-step">
          2
        </div>

        <div class="mesas-modal-header-text">

          <h2>
            Crear acuerdos
          </h2>

          <p>
            Expediente
            ${escapeHTML(numero)}
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        <div class="mesas-agreement-tabs">

          <button
            type="button"
            class="mesas-agreement-tab active"
            data-acuerdo-tab="archivo"
          >
            Subir archivo
          </button>

          <button
            type="button"
            class="mesas-agreement-tab"
            data-acuerdo-tab="texto"
          >
            Redactar en línea
          </button>

        </div>


        <div id="acuerdoPaneArchivo">

          <label
            class="mesas-upload-area"
            for="acuerdoArchivo"
          >

            <i class="fa-solid fa-cloud-arrow-up"></i>

            <strong>
              Selecciona un archivo
            </strong>

            <span>
              PDF, DOC o DOCX
            </span>

            <input
              type="file"
              id="acuerdoArchivo"
              accept=".pdf,.doc,.docx"
              hidden
            >

          </label>


          <div
            class="mesas-upload-help"
            id="acuerdoArchivoNombre"
          >
            Ningún archivo seleccionado.
          </div>

        </div>


        <div
          id="acuerdoPaneTexto"
          hidden
        >

          <textarea
            id="acuerdoTexto"
            class="mesas-textarea"
            rows="8"
            placeholder="Redacta aquí el proyecto de acuerdo..."
          ></textarea>

        </div>


        <p
          class="mesas-form-error"
          id="acuerdoError"
          hidden
        ></p>

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="closeCrearAcuerdo"
        >
          Cancelar
        </button>


        <button
          type="button"
          class="mesas-modal-confirm"
          id="enviarARevision"
        >
          <i class="fa-solid fa-paper-plane"></i>
          Enviar a revisión interna
        </button>

      </footer>

    </div>
  `);


  document
    .getElementById(
      "closeCrearAcuerdo",
    )
    ?.addEventListener(
      "click",
      closeForm,
    );


  const paneArchivo =
    document.getElementById(
      "acuerdoPaneArchivo",
    );

  const paneTexto =
    document.getElementById(
      "acuerdoPaneTexto",
    );


  document
    .querySelectorAll(
      "[data-acuerdo-tab]",
    )
    .forEach(
      (tab) => {
        tab.addEventListener(
          "click",
          () => {
            const esArchivo =
              tab.dataset.acuerdoTab ===
              "archivo";

            document
              .querySelectorAll(
                "[data-acuerdo-tab]",
              )
              .forEach(
                (otro) =>
                  otro.classList.toggle(
                    "active",
                    otro === tab,
                  ),
              );

            paneArchivo.hidden =
              !esArchivo;

            paneTexto.hidden =
              esArchivo;
          },
        );
      },
    );


  document
    .getElementById(
      "acuerdoArchivo",
    )
    ?.addEventListener(
      "change",
      (event) => {
        const nombre =
          event.target.files?.[0]
            ?.name;

        document
          .getElementById(
            "acuerdoArchivoNombre",
          )
          .textContent =
          nombre
            ? `Archivo: ${nombre}`
            : "Ningún archivo seleccionado.";
      },
    );


  document
    .getElementById(
      "enviarARevision",
    )
    ?.addEventListener(
      "click",
      () => {
        const archivo =
          document
            .getElementById(
              "acuerdoArchivo",
            )
            ?.files?.[0]
            ?.name ||
          null;

        const texto =
          document
            .getElementById(
              "acuerdoTexto",
            )
            ?.value.trim() ||
          "";

        if (
          !archivo &&
          !texto
        ) {
          const error =
            document.getElementById(
              "acuerdoError",
            );

          error.textContent =
            "Sube un archivo o redacta el acuerdo antes de enviarlo a revisión interna.";

          error.hidden =
            false;

          return;
        }

        enviarARevisionInterna(
          numero,
          {
            archivo,
            texto,
          },
        );
      },
    );
}


// ============================================================
// ENVIAR ACUERDO A REVISIÓN INTERNA
// ============================================================

function enviarARevisionInterna(
  numero,
  {
    archivo,
    texto,
  },
) {
  const seguimiento =
    getData(
      KEY,
      {},
    );

  const estado =
    seguimiento[numero];

  if (
    !estado ||
    estado.estado !==
      "en-proceso"
  ) {
    return;
  }

  const ahora =
    new Date().toISOString();


  estado.acuerdo = {
    texto,

    archivo,

    creadoPor:
      getSession()?.nombre ||
      "Secretaría de Acuerdos",

    creadoEn:
      ahora,
  };


  estado.estado =
    "en-revision-interna";

  estado.ultimoMovimiento =
    "Proyecto de acuerdo en revisión interna";

  estado.historial =
    Array.isArray(
      estado.historial,
    )
      ? estado.historial
      : [];

  estado.historial.push({
    fecha: ahora,

    movimiento:
      "Proyecto de acuerdo enviado a revisión interna",
  });

  saveData(
    KEY,
    seguimiento,
  );

  closeForm();

  renderMesas();
}


// ============================================================
// AVANZAR ESTADO
// ============================================================

function avanzarEstado(
  numero,
  nuevoEstado,
  movimiento,
  extra = {},
) {
  const seguimiento =
    getData(
      KEY,
      {},
    );

  const registro =
    seguimiento[numero];

  if (!registro) {
    return;
  }

  registro.estado =
    nuevoEstado;

  registro.ultimoMovimiento =
    movimiento;

  Object.assign(
    registro,
    extra,
  );

  registro.historial =
    Array.isArray(
      registro.historial,
    )
      ? registro.historial
      : [];

  registro.historial.push({
    fecha:
      new Date().toISOString(),

    movimiento,
  });

  saveData(
    KEY,
    seguimiento,
  );

  renderMesas();
}


// ============================================================
// MODAL FIRMAR ACUERDO
// ============================================================

function openFirmarAcuerdo(
  numero,
) {
  if (!canSign()) {
    return;
  }

  const item =
    getRegistros()
      .find(
        (registro) =>
          registro.numero ===
          numero,
      );

  if (
    !item ||
    item.seguimiento.estado !==
      "en-firma"
  ) {
    return;
  }

  const acuerdo =
    normalizarAcuerdo(
      item.seguimiento.acuerdo,
    );

  showModal(`
    <div class="mesas-modal-shell">

      <header class="mesas-modal-header">

        <div class="mesas-modal-step">
          3
        </div>

        <div class="mesas-modal-header-text">

          <h2>
            Firmar acuerdo
          </h2>

          <p>
            Expediente
            ${escapeHTML(numero)}
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        <div class="mesas-modal-info">

          <div class="mesas-modal-info-item">

            <span>
              Actor
            </span>

            <strong>
              ${escapeHTML(
                item.promovente,
              )}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>
              Asunto
            </span>

            <strong>
              ${escapeHTML(
                item.asunto,
              )}
            </strong>

          </div>

        </div>


        <div class="mesas-modal-info-item">

          <span>
            Proyecto de acuerdo
          </span>

          <strong>
            ${escapeHTML(
              describirAcuerdo(
                acuerdo,
              ),
            )}
          </strong>

        </div>


        <p class="mesas-upload-help">
          Al firmar, el expediente regresa a la Secretaría de Acuerdos
          en el estado "En lista".
        </p>

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="cancelFirmarAcuerdo"
        >
          Cancelar
        </button>


        <button
          type="button"
          class="mesas-modal-confirm"
          id="confirmFirmarAcuerdo"
        >
          <i class="fa-solid fa-signature"></i>
          Firmar acuerdo
        </button>

      </footer>

    </div>
  `);


  document
    .getElementById(
      "cancelFirmarAcuerdo",
    )
    ?.addEventListener(
      "click",
      closeForm,
    );


  document
    .getElementById(
      "confirmFirmarAcuerdo",
    )
    ?.addEventListener(
      "click",
      () =>
        firmarAcuerdo(
          numero,
        ),
    );
}


// ============================================================
// FIRMAR
// ============================================================

function firmarAcuerdo(
  numero,
) {
  if (!canSign()) {
    return;
  }

  const seguimiento =
    getData(
      KEY,
      {},
    );

  const estado =
    seguimiento[numero];

  if (
    !estado ||
    estado.estado !==
      "en-firma"
  ) {
    return;
  }

  const ahora =
    new Date().toISOString();

  estado.estado =
    "en-lista";

  estado.firmadoEn =
    ahora;

  estado.firmadoPor =
    getSession()?.nombre ||
    "Magistrada";

  estado.ultimoMovimiento =
    "Acuerdo firmado por la Magistrada · pasa a lista";

  estado.historial =
    Array.isArray(
      estado.historial,
    )
      ? estado.historial
      : [];

  estado.historial.push({
    fecha: ahora,

    movimiento:
      "Acuerdo firmado por la Magistrada de Presidencia; el expediente pasa a En lista",
  });

  saveData(
    KEY,
    seguimiento,
  );

  closeForm();

  renderMesas();
}


// ============================================================
// ACUERDO
// ============================================================

function normalizarAcuerdo(
  acuerdo,
) {
  if (!acuerdo) {
    return null;
  }

  if (
    typeof acuerdo ===
    "string"
  ) {
    return {
      texto: acuerdo,
      archivo: null,
    };
  }

  return acuerdo;
}


function describirAcuerdo(
  acuerdo,
) {
  if (!acuerdo) {
    return "Sin acuerdo registrado.";
  }

  const partes = [];

  if (acuerdo.archivo) {
    partes.push(
      `Archivo: ${acuerdo.archivo}`,
    );
  }

  if (acuerdo.texto) {
    partes.push(
      acuerdo.texto,
    );
  }

  return (
    partes.join(" · ") ||
    "Sin acuerdo registrado."
  );
}


// ============================================================
// VER EXPEDIENTE
// ============================================================

function openDetalleExpediente(
  numero,
) {
  const item =
    getRegistros()
      .find(
        (registro) =>
          registro.numero ===
          numero,
      );

  if (!item) {
    return;
  }

  const seg =
    item.seguimiento;

  const acuerdo =
    normalizarAcuerdo(
      seg.acuerdo,
    );


  const historial =
    (
      Array.isArray(
        seg.historial,
      )
        ? seg.historial
        : []
    )
      .slice()
      .reverse()
      .map(
        (evento) => `
          <li>

            <strong>
              ${escapeHTML(
                formatFecha(
                  evento.fecha,
                ),
              )}
            </strong>

            <span>
              ${escapeHTML(
                evento.movimiento ||
                "",
              )}
            </span>

          </li>
        `,
      )
      .join("");


  const firma =
    seg.firmadoEn
      ? `
        <div class="mesas-modal-info-item">

          <span>
            Firma
          </span>

          <strong>
            ${escapeHTML(
              seg.firmadoPor ||
              "Magistrada",
            )}
            ·
            ${escapeHTML(
              formatFecha(
                seg.firmadoEn,
              ),
            )}
          </strong>

        </div>
      `
      : "";


  showModal(`
    <div class="mesas-modal-shell">

      <header class="mesas-modal-header">

        <div class="mesas-modal-header-text">

          <h2>
            Expediente
            ${escapeHTML(numero)}
          </h2>

          <p>
            Seguimiento del expediente.
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        <div class="mesas-modal-info">

          <div class="mesas-modal-info-item">

            <span>
              Actor
            </span>

            <strong>
              ${escapeHTML(
                item.promovente,
              )}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>
              Estado
            </span>

            <strong>
              ${escapeHTML(
                etiquetaEstado(
                  seg.estado,
                ),
              )}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>
              Acuerdo
            </span>

            <strong>
              ${escapeHTML(
                describirAcuerdo(
                  acuerdo,
                ),
              )}
            </strong>

          </div>


          ${firma}

        </div>


        ${
          historial
            ? `
              <ul class="mesas-history">
                ${historial}
              </ul>
            `
            : ""
        }

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="closeDetalleMesa"
        >
          Cerrar
        </button>

      </footer>

    </div>
  `);


  document
    .getElementById(
      "closeDetalleMesa",
    )
    ?.addEventListener(
      "click",
      closeForm,
    );
}


// ============================================================
// DEMO
// ============================================================

function seedSecretariaDemo() {
  const expedientes =
    getData(
      "expedientes",
      [],
    );

  const promociones =
    getData(
      "promociones",
      [],
    );

  const seguimiento =
    getData(
      KEY,
      {},
    );

  const existentes =
    new Set(
      expedientes.map(
        (item) =>
          getNumero(item),
      ),
    );


  const ubicaciones = {
    "en-firma":
      "Presidencia",

    "en-actuaria":
      "Actuaría",

    "en-archivo":
      "Archivo",
  };


  const demo = [
    {
      numero: "123/2026",
      actor: "JUAN PÉREZ LÓPEZ",
      demandado: "Secretaría de Finanzas",
      actoDemandado: "Demanda de nulidad",
      estado: "en-proceso",
      promos: 3,
    },

    {
      numero: "124/2026",
      actor: "MARÍA GÓMEZ RUIZ",
      demandado: "Ayuntamiento de Colima",
      actoDemandado: "Recurso de revisión",
      estado: "en-proceso",
      promos: 12,
    },

    {
      numero: "125/2026",
      actor: "CARLOS MARTÍNEZ",
      demandado: "Secretaría de Educación",
      actoDemandado: "Incidente de suspensión",
      estado: "en-firma",
      promos: 2,
    },

    {
      numero: "126/2026",
      actor: "ANA TORRES",
      demandado: "Dirección de Recursos Humanos",
      actoDemandado: "Cumplimiento de sentencia",
      estado: "en-revision-interna",
      promos: 11,
    },

    {
      numero: "127/2026",
      actor: "LUIS HERNÁNDEZ",
      demandado: "Secretaría de Salud",
      actoDemandado: "Ampliación de demanda",
      estado: "en-archivo",
      promos: 1,
    },

    {
      numero: "128/2026",
      actor: "SOFÍA RAMÍREZ",
      demandado: "Ayuntamiento de Villa de Álvarez",
      actoDemandado: "Queja",
      estado: "en-firma",
      promos: 2,
    },

    {
      numero: "129/2026",
      actor: "MIGUEL CASTILLO",
      demandado: "Secretaría de Finanzas",
      actoDemandado: "Incidente de acumulación",
      estado: "en-proceso",
      promos: 7,
    },

    {
      numero: "130/2026",
      actor: "LAURA DÍAZ",
      demandado: "Secretaría de Educación",
      actoDemandado: "Recurso de reclamación",
      estado: "en-lista",
      promos: 1,
    },

    {
      numero: "131/2026",
      actor: "ROBERTO SÁNCHEZ",
      demandado: "Dirección de Recursos Humanos",
      actoDemandado: "Solicitud de copias certificadas",
      estado: "en-actuaria",
      promos: 2,
    },

    {
      numero: "045/2021",
      actor: "ELENA VARGAS",
      demandado: "Secretaría de Salud",
      actoDemandado: "Cumplimiento de laudo",
      estado: "en-proceso",
      promos: 4,
    },

    {
      numero: "OJC-012/2026",
      actor: "JORGE NAVARRO",
      demandado: "Oficina de Juicios (OJC)",
      actoDemandado: "Oficina de Juicios (OJC)",
      estado: "en-proceso",
      promos: 2,
    },

    {
      numero: "087/2020",
      actor: "TERESA LUNA",
      demandado: "Ayuntamiento de Colima",
      actoDemandado: "Ejecución de sentencia",
      estado: "en-firma",
      promos: 1,
    },

    {
      numero: "133/2026",
      actor: "DANIELA ORTEGA",
      demandado: "Secretaría de Finanzas",
      actoDemandado: "Solicitud de ejecución de laudo",
      estado: "en-lista",
      promos: 1,
    },

    {
      numero: "132/2026",
      actor: "PATRICIA MORALES",
      demandado: "Secretaría de Educación",
      actoDemandado: "Cumplimiento de ejecutoria",
      estado: "en-firma",
      promos: 3,
    },
  ];


  demo.forEach(
    (item, index) => {
      const ubicacion =
        ubicaciones[
          item.estado
        ] ||
        `Mesa ${mesaDeExpediente({
          numero:
            item.numero,
        })}`;

      const fecha =
        fechaOffset(
          -(index + 1),
        );


      if (
        !existentes.has(
          item.numero,
        )
      ) {
        expedientes.push({
          id: createId(),

          numero:
            item.numero,

          expediente:
            item.numero,

          actor:
            item.actor,

          demandado:
            item.demandado,

          actoDemandado:
            item.actoDemandado,

          ubicacion,

          fecha,

          fechaRecepcion:
            fecha,

          estado:
            "Recibido",

          demoSecretaria:
            true,
        });
      } else {
        expedientes.forEach(
          (expediente) => {
            if (
              getNumero(
                expediente,
              ) ===
                item.numero &&
              expediente.demoSecretaria
            ) {
              expediente.demandado =
                expediente.demandado ||
                item.demandado;

              expediente.ubicacion =
                expediente.ubicacion ||
                ubicacion;

              expediente.fechaRecepcion =
                expediente.fechaRecepcion ||
                expediente.fecha ||
                fecha;
            }
          },
        );
      }


      const conAcuerdo =
        item.estado !==
        "en-proceso";


      const firmado =
        [
          "en-lista",
          "en-actuaria",
          "en-archivo",
        ].includes(
          item.estado,
        );


      seguimiento[
        item.numero
      ] = {
        estado:
          item.estado,

        recibidoEn:
          new Date()
            .toISOString(),

        ultimoMovimiento:
          getMovimientoDemo(
            item.estado,
          ),

        acuerdo:
          conAcuerdo
            ? {
                texto:
                  "Proyecto de acuerdo de demostración",

                archivo:
                  null,

                creadoPor:
                  "Secretaría de Acuerdos",

                creadoEn:
                  new Date()
                    .toISOString(),
              }
            : null,

        firmadoEn:
          firmado
            ? new Date()
                .toISOString()
            : null,

        firmadoPor:
          firmado
            ? "Magistrada"
            : null,

        historial: [],
      };


      const existentesPromo =
        promociones.filter(
          (promo) =>
            promo.expediente ===
            item.numero,
        ).length;


      for (
        let i =
          existentesPromo;

        i <
        item.promos;

        i += 1
      ) {
        promociones.push({
          id:
            createId(),

          numero:
            item.numero,

          expediente:
            item.numero,

          fecha:
            fechaOffset(
              -i,
            ),

          tipo:
            "Promoción",

          descripcion:
            "Promoción de demostración",

          estado:
            "Pendiente",

          creadoEn:
            new Date()
              .toISOString(),
        });
      }
    },
  );


  saveData(
    "expedientes",
    expedientes,
  );

  saveData(
    "promociones",
    promociones,
  );

  saveData(
    KEY,
    seguimiento,
  );

  // Datos de demostración de las demás secciones (Fase 8 · T-21)
  sembrarDemoFases(
    demo.map((item) => item.numero),
  );

  renderMesas();
}


// ============================================================
// MOVIMIENTO DEMO
// ============================================================

function getMovimientoDemo(
  estado,
) {
  const movimientos = {
    "en-proceso":
      "Turnado a Secretaría de Acuerdos",

    "en-revision-interna":
      "Proyecto de acuerdo en revisión interna",

    "en-firma":
      "Proyecto de acuerdo enviado a firma",

    "en-lista":
      "Acuerdo firmado · publicado en lista",

    "en-actuaria":
      "Turnado a Actuaría",

    "en-archivo":
      "Turnado a Archivo",
  };

  return (
    movimientos[estado] ||
    "Sin movimiento"
  );
}


// ============================================================
// ASIGNACIÓN DE MESA
//
// Mesa 1 = pares.
// Mesa 2 = impares.
// Mesa 3 = OJC y expedientes de 2021 o anteriores.
// ============================================================

function parseNumero(
  numero,
) {
  const texto =
    String(
      numero ||
      "",
    );

  let match =
    texto.match(
      /(\d+)\s*\/\s*(\d{4})/,
    );

  if (match) {
    return {
      consecutivo:
        Number(
          match[1],
        ),

      anio:
        Number(
          match[2],
        ),
    };
  }


  match =
    texto.match(
      /(\d{4})\D+(\d+)/,
    );

  if (match) {
    return {
      consecutivo:
        Number(
          match[2],
        ),

      anio:
        Number(
          match[1],
        ),
    };
  }


  return {
    consecutivo: null,
    anio: null,
  };
}


function mesaDeExpediente(
  expediente,
) {
  const numero =
    getNumero(
      expediente,
    );

  const {
    consecutivo,
    anio,
  } =
    parseNumero(
      numero,
    );


  const anioFecha =
    Number(
      String(
        expediente.fechaRecepcion ||
        expediente.fecha ||
        expediente.creadoEn ||
        "",
      ).slice(
        0,
        4,
      ),
    );


  const anioEfectivo =
    anio ||
    anioFecha ||
    null;


  const texto = [
    numero,
    expediente.tipo,
    expediente.clasificacion,
    expediente.asunto,
  ]
    .filter(Boolean)
    .join(" ");


  if (
    /\bOJC\b/i.test(
      texto,
    ) ||
    (
      anioEfectivo &&
      anioEfectivo <=
        2021
    )
  ) {
    return 3;
  }


  if (
    consecutivo ===
    null
  ) {
    return 1;
  }


  return (
    consecutivo % 2 ===
    0
      ? 1
      : 2
  );
}


// ============================================================
// MESA DEL USUARIO
// ============================================================

function mesaUsuario() {
  return (
    getSession()?.mesa ||
    null
  );
}


// ============================================================
// TÍTULOS
// ============================================================

const MESA_TITULOS = {
  1: [
    "Mesa 1",
    "Expedientes pares.",
  ],

  2: [
    "Mesa 2",
    "Expedientes impares.",
  ],

  3: [
    "Mesa 3",
    "Acuerdos con OJC y expedientes de 2021 y anteriores.",
  ],
};


function renderTituloMesa() {
  const mesa =
    mesaUsuario();

  if (!mesa) {
    return;
  }

  const h1 =
    document.querySelector(
      "#mesasPage .mesas-page-header h1",
    );

  const p =
    document.querySelector(
      "#mesasPage .mesas-page-header p",
    );


  if (h1) {
    h1.textContent =
      `Secretaría de Acuerdos · ${MESA_TITULOS[mesa][0]}`;
  }


  if (p) {
    p.textContent =
      MESA_TITULOS[
        mesa
      ][1];
  }
}


// ============================================================
// HELPERS
// ============================================================

function getNumero(
  expediente,
) {
  return String(
    expediente.numero ||
    expediente.expediente ||
    "",
  );
}


function formatFecha(
  value,
) {
  if (!value) {
    return "—";
  }

  const texto =
    String(value);

  const clean =
    texto.slice(
      0,
      10,
    );

  const parts =
    clean.split("-");

  if (
    parts.length ===
    3
  ) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return clean;
}


function fechaOffset(
  offset,
) {
  const date =
    new Date();

  date.setDate(
    date.getDate() +
    offset,
  );

  const y =
    date.getFullYear();

  const m =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const d =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${y}-${m}-${d}`;
}


function setText(
  id,
  value,
) {
  const element =
    document.getElementById(
      id,
    );

  if (element) {
    element.textContent =
      value;
  }
}