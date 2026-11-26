// ============================================================
// DEMANDA
// assets/js/modules/mesas/demanda.js
// ============================================================

import { getData, saveData } from "../../storage.js";

import { escapeHTML, todayISO } from "../../utils.js";

import { showModal, closeForm } from "../../forms/formHelper.js";

import { aplicarFiltrosGlobales } from "./filtros.js";

import { etiquetaEstado } from "./estados.js";

import { montarPlantillasEn } from "./plantillas.js";

import {
  aplicarAccion,
  accionDeBoton,
  renderBotonesFlujo,
  renderEstadoBadge,
} from "./flujoEstados.js";

import { getSession } from "../../auth.js";
import {
  guardarDocumento,
  obtenerDocumento,
  borrarDocumento,
  validarArchivoDocumento,
} from "./documentosFirma.js";
import { etiquetaCategoriaDemanda } from "./catalogos.js";

import {
  getExpedientesMesaActual,
  getNumeroExpediente,
  buscarExpedienteExacto,
} from "./mesaUtils.js";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY_DEMANDAS = "mesasDemandas";

const MAX_ACUERDO_MB = 2;

const MAX_ACUERDO_BYTES = MAX_ACUERDO_MB * 1024 * 1024;

let busquedaGeneral = "";

let categoriaActiva = "todas";

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderDemanda() {
  const vista = document.querySelector('[data-mesas-vista="demanda"]');

  if (!vista) {
    return;
  }

  prepararDemandas();

  const registros = getRegistrosDemanda();

  const porRadicar = registros.filter(
    (item) => item.demanda.categoria === "por-radicar",
  );

  const radicados = registros.filter(
    (item) => item.demanda.categoria === "radicado",
  );

  vista.innerHTML = `
    <section class="mesas-fase4-section">

      <div class="mesas-fase4-header">

        <div>

          <span class="mesas-mini-eyebrow">
            Secretaría de Acuerdos
          </span>

          <h2>
            Demanda
          </h2>

          <p>
            Calificación, radicación y preparación
            del acuerdo para firma.
          </p>

        </div>

      </div>


      <div class="mesas-fase4-counters">

        <button
          type="button"
          class="mesas-fase4-counter ${
            categoriaActiva === "todas" ? "active" : ""
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
            categoriaActiva === "por-radicar" ? "active" : ""
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
            categoriaActiva === "radicado" ? "active" : ""
          }"
          data-demanda-action="categoria"
          data-categoria="radicado"
        >
          <span>Radicados</span>
          <strong>${radicados.length}</strong>
        </button>

      </div>


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


      <div data-plantillas-slot></div>

    </section>
  `;

    renderListadoDemanda();

  configurarEventosDemanda(
    vista,
  );

  // Cargar las plantillas de Demanda.
  const slotPlantillas =
    vista.querySelector("[data-plantillas-slot]");

  if (slotPlantillas) {
    montarPlantillasEn(slotPlantillas, {
      categoria: "demanda",
    });
  }
}


// ============================================================
// PREPARAR DATOS
// ============================================================

function prepararDemandas() {
  const expedientes = getExpedientesMesaActual();

  const demandas = getData(KEY_DEMANDAS, {});

  let changed = false;

  expedientes.forEach((expediente) => {
    const numero = getNumeroExpediente(expediente);

    if (!numero) {
      return;
    }

    if (demandas[numero]) {
      return;
    }

    demandas[numero] = {
      radicacion: "en-proceso",

      categoria: "por-radicar",

      calificacion: null,

      acuerdo: null,

      historialRadicacion: [],
    };

    changed = true;
  });

  if (changed) {
    saveData(KEY_DEMANDAS, demandas);
  }
}

// ============================================================
// REGISTROS
// ============================================================

function getRegistrosDemanda() {
  const expedientes = getExpedientesMesaActual();

  const demandas = getData(KEY_DEMANDAS, {});

  return expedientes.map((expediente) => {
    const numero = getNumeroExpediente(expediente);

    return {
      expediente,

      numero,

      fecha:
        expediente.fechaRecepcion ||
        expediente.fecha ||
        expediente.creadoEn ||
        "",

      actor: expediente.actor || expediente.promovente || "—",

      demandado: expediente.demandado || "—",

      asunto:
        expediente.actoDemandado ||
        expediente.asunto ||
        expediente.accion ||
        "—",

      demanda: demandas[numero] || {
        radicacion: "en-proceso",

        categoria: "por-radicar",

        calificacion: null,

        acuerdo: null,
      },
    };
  });
}

// ============================================================
// FILTRADO
// ============================================================

function getRegistrosVisibles() {
  let registros = getRegistrosDemanda();

  registros = aplicarFiltrosGlobales(registros, {
    numero: (item) => item.numero,

    fecha: (item) => item.fecha,

    estado: (item) => item.demanda.radicacion,
  });

  const texto = busquedaGeneral.trim().toLowerCase();

  if (texto) {
    registros = registros.filter((item) => {
      const contenido = `
            ${item.numero}
            ${item.actor}
            ${item.demandado}
            ${item.asunto}
          `.toLowerCase();

      return contenido.includes(texto);
    });
  }

  if (categoriaActiva !== "todas") {
    registros = registros.filter(
      (item) => item.demanda.categoria === categoriaActiva,
    );
  }

  return registros;
}
// ============================================================
// LISTADO
// ============================================================

function renderListadoDemanda() {
  const vista = document.querySelector('[data-mesas-vista="demanda"]');

  if (!vista) {
    return;
  }

  const tbody = vista.querySelector(".mesas-demanda-table tbody");

  const empty = vista.querySelector("#demandaEmpty");

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

  tbody.innerHTML = renderFilasDemanda(registros);
}

// ============================================================
// FILAS
// ============================================================

function renderFilasDemanda(registros) {
  return registros
    .map((item) => {
      const radicado = item.demanda.categoria === "radicado";

      return `
          <tr>

            <td>
              <strong class="mesas-expediente-number">
                ${escapeHTML(item.numero)}
              </strong>
            </td>


            <td>
              ${escapeHTML(formatFecha(item.fecha))}
            </td>


            <td>
              ${escapeHTML(item.actor)}
            </td>


            <td>
              ${escapeHTML(item.demandado)}
            </td>


            <td>
              ${renderEstadoBadge(item.demanda.radicacion)}
            </td>


            <td>

              <span
                class="mesas-fase4-category-badge ${
                  radicado ? "done" : "pending"
                }"
              >

                ${escapeHTML(etiquetaCategoriaDemanda(item.demanda.categoria))}

              </span>

            </td>


            <td>
              ${renderAccionesDemanda(item)}
            </td>

          </tr>
        `;
    })
    .join("");
}

// ============================================================
// ACCIONES
// ============================================================

function renderAccionesDemanda(item) {
  const numero = escapeHTML(item.numero);

  const registro = item.demanda;

  const acuerdoListo = tieneAcuerdoGuardado(registro);

  const estado = registro.radicacion || "en-proceso";

  if (estado === "en-proceso") {
    return `
      <div class="mesas-actions">

        <button
          type="button"
          class="mesas-secondary-btn"
          data-demanda-action="ver"
          data-expediente="${numero}"
        >
          <i class="fa-regular fa-eye"></i>
          Ver
        </button>


        <button
          type="button"
          class="mesas-primary-btn"
          data-demanda-action="atender"
          data-expediente="${numero}"
        >
          <i class="fa-solid fa-file-circle-check"></i>

          ${acuerdoListo ? "Editar atención" : "Atender / Calificar"}

        </button>


        <button
          type="button"
          class="mesas-primary-btn"
          data-demanda-action="enviar-firma"
          data-expediente="${numero}"
          ${
            acuerdoListo
              ? ""
              : `
                disabled
                title="Primero califica y sube el acuerdo"
              `
          }
        >
          <i class="fa-solid fa-paper-plane"></i>
          Enviar a firma
        </button>

      </div>
    `;
  }

  return `
    <div class="mesas-actions">

      <button
        type="button"
        class="mesas-secondary-btn"
        data-demanda-action="ver"
        data-expediente="${numero}"
      >
        <i class="fa-regular fa-eye"></i>
        Ver
      </button>


      ${renderBotonesFlujo(estado, {
        actionAttr: "data-demanda-action",

        attrs: `data-expediente="${numero}"`,

        acuerdo: registro.acuerdo,
      })}

    </div>
  `;
}

// ============================================================
// ACUERDO LISTO
// ============================================================

function obtenerArchivoAcuerdo(acuerdo) {
  if (!acuerdo || typeof acuerdo !== "object") {
    return null;
  }

  // Archivo guardado directamente en el borrador.
  if (
    acuerdo.archivo &&
    typeof acuerdo.archivo === "object" &&
    acuerdo.archivo.dataUrl
  ) {
    return acuerdo.archivo;
  }

  // Archivo registrado en el almacén de documentos.
  const documento = obtenerDocumento(acuerdo.documentoId);

  if (!documento?.dataUrl) {
    return null;
  }

  return {
    nombre: documento.nombre,
    tipo: documento.tipoArchivo,
    tamano: documento.tamano,
    dataUrl: documento.dataUrl,
  };
}

function tieneAcuerdoGuardado(registro) {
  const acuerdo = registro?.acuerdo;

  const archivo = obtenerArchivoAcuerdo(acuerdo);

  return Boolean(acuerdo?.titulo && archivo?.nombre && archivo?.dataUrl);
}

// ============================================================
// EVENTOS
// ============================================================

function configurarEventosDemanda(vista) {
  const general = vista.querySelector("#demandaBusquedaGeneral");

  if (general) {
    general.oninput = (event) => {
      busquedaGeneral = event.target.value;

      renderListadoDemanda();
    };
  }

  vista.onclick = (event) => {
    const button = event.target.closest("[data-demanda-action]");

    if (!button) {
      return;
    }

    if (button.disabled) {
      return;
    }

    const action = button.dataset.demandaAction;

    const numero = button.dataset.expediente;

    switch (action) {
      case "categoria":
        categoriaActiva = button.dataset.categoria || "todas";

        renderDemanda();

        break;

      case "buscar-exacto":
        buscarExacto();

        break;

      case "ver":
        openDetalleDemanda(numero);

        break;

      case "atender":
        openAtenderCalificar(numero);

        break;

      case "enviar-firma":
        openConfirmarEnvioFirma(numero);

        break;

      case "flujo":
        ejecutarAccionDemanda(numero, accionDeBoton(button));

        break;
    }
  };
}
// ============================================================
// ATENDER / CALIFICAR
// ============================================================

function openAtenderCalificar(numero) {
  const item = getRegistrosDemanda().find(
    (registro) => registro.numero === numero,
  );

  if (!item) {
    return;
  }

  const demanda = item.demanda;

  const acuerdo =
    typeof demanda.acuerdo === "object" && demanda.acuerdo
      ? demanda.acuerdo
      : {};

  const calificacion = demanda.calificacion || {};

  const resultado = calificacion.resultado || "radicar";

  const archivoActual = obtenerArchivoAcuerdo(acuerdo);

  showModal(`
    <div class="mesas-modal-shell">

      <header class="mesas-modal-header">

        <div class="mesas-modal-step">
          <i class="fa-solid fa-file-circle-check"></i>
        </div>

        <div class="mesas-modal-header-text">

          <h2>
            Atender / Calificar
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
              ${escapeHTML(item.actor)}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>
              Demandado
            </span>

            <strong>
              ${escapeHTML(item.demandado)}
            </strong>

          </div>

        </div>


        <div
          class="mesas-form-group"
          style="margin-top:18px;"
        >

          <label>
            Resultado de la calificación
          </label>


          <div
            style="
              display:grid;
              grid-template-columns:repeat(2,minmax(0,1fr));
              gap:10px;
              margin-top:8px;
            "
          >

            ${renderOpcionCalificacion(
              "radicar",
              "Radicar",
              "La demanda continúa con su trámite.",
              resultado,
            )}

            ${renderOpcionCalificacion(
              "prevenir",
              "Prevenir",
              "Se requiere corregir o completar información.",
              resultado,
            )}

            ${renderOpcionCalificacion(
              "rechazar",
              "Rechazar",
              "No procede la radicación de la demanda.",
              resultado,
            )}

            ${renderOpcionCalificacion(
              "otro",
              "Otro",
              "Usar una determinación distinta.",
              resultado,
            )}

          </div>

        </div>


        <div
          class="mesas-form-group"
          style="margin-top:18px;"
        >

          <label for="demandaAcuerdoTitulo">
            Título del acuerdo / auto
          </label>


          <input
            type="text"
            id="demandaAcuerdoTitulo"
            class="mesas-input"
            value="${escapeHTML(acuerdo.titulo || "Auto de radicación")}"
            placeholder="Ej. Auto de radicación"
          >

        </div>


        <div
          class="mesas-form-group"
          style="margin-top:18px;"
        >

          <label for="demandaAcuerdoArchivo">
            Documento del acuerdo / auto
          </label>


          <div
            style="
              margin-top:7px;
              padding:18px;
              border:1px dashed #b9c9da;
              border-radius:10px;
              background:#f8fbff;
            "
          >

            <input
              type="file"
              id="demandaAcuerdoArchivo"
              class="mesas-input"
              accept=".pdf,.doc,.docx"
            >


            <small
              style="
                display:block;
                margin-top:8px;
                color:#74889c;
              "
            >
              PDF, DOC o DOCX.
              Máximo ${MAX_ACUERDO_MB} MB.
            </small>


            ${
              archivoActual
                ? `
                  <div
                    style="
                      display:flex;
                      align-items:center;
                      gap:9px;
                      margin-top:12px;
                      padding:9px 11px;
                      border-radius:7px;
                      background:#eaf3ff;
                      color:#2a5f99;
                    "
                  >

                    <i class="fa-regular fa-file"></i>

                    <div>
                      <strong>
                        Archivo actual:
                      </strong>

                      ${escapeHTML(archivoActual.nombre || "Documento")}
                    </div>

                  </div>
                `
                : ""
            }

          </div>

        </div>


        <div
          class="mesas-form-group"
          style="margin-top:18px;"
        >

          <label for="demandaCalificacionNotas">

            Observaciones

            <span
              id="demandaNotasRequired"
              style="
                color:#c23d35;
                display:none;
              "
            >
              *
            </span>

          </label>


          <textarea
            id="demandaCalificacionNotas"
            class="mesas-textarea"
            rows="4"
            placeholder="Opcional. Obligatorio únicamente para Rechazar u Otro."
          >${escapeHTML(calificacion.notas || "")}</textarea>


          <small
            id="demandaNotasHelp"
            style="
              display:block;
              margin-top:5px;
              color:#74889c;
            "
          >
            Las observaciones son opcionales.
          </small>

        </div>


        <p
          class="mesas-form-error"
          id="demandaCalificacionError"
          hidden
        ></p>

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="cancelarCalificacionDemanda"
        >
          Cancelar
        </button>


        <button
          type="button"
          class="mesas-modal-confirm"
          id="guardarCalificacionDemanda"
        >

          <i class="fa-solid fa-floppy-disk"></i>

          Guardar borrador

        </button>

      </footer>

    </div>
  `);

  configurarValidacionObservaciones();

  document
    .getElementById("cancelarCalificacionDemanda")
    ?.addEventListener("click", closeForm);

  document
    .getElementById("guardarCalificacionDemanda")
    ?.addEventListener("click", () => {
      guardarAtencionDemanda(numero);
    });
}

// ============================================================
// OPCIÓN CALIFICACIÓN
// ============================================================

function renderOpcionCalificacion(value, titulo, descripcion, seleccionado) {
  return `
    <label
      style="
        display:flex;
        align-items:flex-start;
        gap:9px;
        padding:12px;
        border:1px solid #d8e2ec;
        border-radius:9px;
        background:#ffffff;
        cursor:pointer;
      "
    >

      <input
        type="radio"
        name="demandaResultadoCalificacion"
        value="${escapeHTML(value)}"
        ${seleccionado === value ? "checked" : ""}
        style="margin-top:3px;"
      >


      <span>

        <strong
          style="
            display:block;
            color:#254866;
          "
        >
          ${escapeHTML(titulo)}
        </strong>


        <small
          style="
            display:block;
            margin-top:3px;
            color:#75889b;
          "
        >
          ${escapeHTML(descripcion)}
        </small>

      </span>

    </label>
  `;
}

// ============================================================
// VALIDAR OBSERVACIONES
// ============================================================

function configurarValidacionObservaciones() {
  const radios = document.querySelectorAll(
    'input[name="demandaResultadoCalificacion"]',
  );

  const actualizar = () => {
    const resultado = getResultadoCalificacion();

    const obligatorio = resultado === "rechazar" || resultado === "otro";

    const required = document.getElementById("demandaNotasRequired");

    const help = document.getElementById("demandaNotasHelp");

    if (required) {
      required.style.display = obligatorio ? "inline" : "none";
    }

    if (help) {
      help.textContent = obligatorio
        ? "Debes indicar el motivo de esta determinación."
        : "Las observaciones son opcionales.";
    }
  };

  radios.forEach((radio) => {
    radio.addEventListener("change", actualizar);
  });

  actualizar();
}

// ============================================================
// RESULTADO
// ============================================================

function getResultadoCalificacion() {
  return (
    document.querySelector('input[name="demandaResultadoCalificacion"]:checked')
      ?.value || ""
  );
}

// ============================================================
// GUARDAR ATENCIÓN
// ============================================================

async function guardarAtencionDemanda(numero) {
  const demandas = getData(KEY_DEMANDAS, {});

  const registro = demandas[numero];

  if (!registro) {
    return;
  }

  const resultado = getResultadoCalificacion();

  const titulo =
    document.getElementById("demandaAcuerdoTitulo")?.value.trim() || "";

  const notas =
    document.getElementById("demandaCalificacionNotas")?.value.trim() || "";

  const inputArchivo = document.getElementById("demandaAcuerdoArchivo");

  const nuevoArchivo = inputArchivo?.files?.[0] || null;

  if (!resultado) {
    mostrarErrorCalificacion("Selecciona el resultado de la calificación.");

    return;
  }

  if (!titulo) {
    mostrarErrorCalificacion("Escribe el título del acuerdo o auto.");

    return;
  }

  if ((resultado === "rechazar" || resultado === "otro") && !notas) {
    mostrarErrorCalificacion(
      "Las observaciones son obligatorias cuando seleccionas Rechazar u Otro.",
    );

    return;
  }

  let archivo = obtenerArchivoAcuerdo(registro.acuerdo);

  if (nuevoArchivo) {
    const validacion = validarArchivoAcuerdo(nuevoArchivo);

    if (!validacion.ok) {
      mostrarErrorCalificacion(validacion.error);

      return;
    }

    archivo = {
      nombre: nuevoArchivo.name,

      tipo: nuevoArchivo.type,

      tamano: nuevoArchivo.size,

      dataUrl: await fileToDataUrl(nuevoArchivo),
    };
  }

  if (!archivo) {
    mostrarErrorCalificacion("Debes subir el documento del acuerdo o auto.");

    return;
  }

  const ahora = new Date().toISOString();

  const usuario =
    getSession()?.nombre || getSession()?.email || "Secretaría de Acuerdos";

  registro.calificacion = {
    resultado,

    notas,

    fecha: ahora,

    usuario,
  };

  registro.acuerdo = {
    ...(registro.acuerdo || {}),

    concepto: "Acuerdo",

    titulo,

    archivo,

    documentoId: nuevoArchivo ? null : registro.acuerdo?.documentoId || null,

    estado: "borrador",

    guardadoEn: ahora,

    guardadoPor: usuario,
  };

  registro.historialRadicacion = Array.isArray(registro.historialRadicacion)
    ? registro.historialRadicacion
    : [];

  registro.historialRadicacion.push({
    fecha: ahora,

    movimiento: "Demanda calificada y acuerdo cargado en borrador",

    usuario,
  });

  saveData(KEY_DEMANDAS, demandas);

  closeForm();

  renderDemanda();
}

// ============================================================
// ARCHIVOS
// ============================================================

function validarArchivoAcuerdo(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!["pdf", "doc", "docx"].includes(extension)) {
    return {
      ok: false,

      error: "El acuerdo debe ser PDF, DOC o DOCX.",
    };
  }

  if (file.size > MAX_ACUERDO_BYTES) {
    return {
      ok: false,

      error: `El archivo no puede superar ${MAX_ACUERDO_MB} MB.`,
    };
  }

  return {
    ok: true,
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = () => reject(reader.error);

    reader.readAsDataURL(file);
  });
}

function mostrarErrorCalificacion(mensaje) {
  const error = document.getElementById("demandaCalificacionError");

  if (!error) {
    return;
  }

  error.textContent = mensaje;

  error.hidden = false;
}
// ============================================================
// MODAL ENVIAR A FIRMA
// ============================================================

function openConfirmarEnvioFirma(numero) {
  const demandas = getData(KEY_DEMANDAS, {});

  const registro = demandas[numero];

  if (!registro || !tieneAcuerdoGuardado(registro)) {
    window.alert("Primero debes atender la demanda y subir el acuerdo.");

    return;
  }

  const acuerdo = {
  ...registro.acuerdo,
  archivo: obtenerArchivoAcuerdo(
    registro.acuerdo,
  ),
};

  const comentarios = registro.calificacion?.notas || "";

  const resultado = registro.calificacion?.resultado || "";

  showModal(`
    <div class="mesas-modal-shell">

      <header class="mesas-modal-header">

        <div class="mesas-modal-step">

          <i class="fa-solid fa-signature"></i>

        </div>


        <div class="mesas-modal-header-text">

          <h2>
            Enviar a firma
          </h2>

          <p>
            Expediente
            ${escapeHTML(numero)}
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">


        <!-- =========================================
        INFORMACIÓN
        ========================================== -->

        <div class="mesas-modal-info">

          <div class="mesas-modal-info-item">

            <span>
              Acuerdo
            </span>

            <strong>
              ${escapeHTML(acuerdo.titulo || "Acuerdo")}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>
              Documento
            </span>

            <strong>
              ${escapeHTML(acuerdo.archivo.nombre || "Documento")}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>
              Calificación
            </span>

            <strong>
              ${escapeHTML(etiquetaCalificacion(resultado))}
            </strong>

          </div>

        </div>


        <!-- =========================================
        VISTA PREVIA
        ========================================== -->

        <div
          style="
            margin-top:18px;
          "
        >

          <span
            style="
              display:block;
              margin-bottom:8px;
              color:#71869a;
              font-size:11px;
              font-weight:700;
              text-transform:uppercase;
            "
          >
            Vista previa del acuerdo
          </span>


          ${renderVistaPreviaArchivo(acuerdo.archivo)}

        </div>


        <!-- =========================================
        COMENTARIOS
        ========================================== -->

        ${
          comentarios
            ? `
              <div
                style="
                  margin-top:18px;
                  padding:14px;
                  border:1px solid #dce5ee;
                  border-radius:9px;
                  background:#f8fbff;
                "
              >

                <span
                  style="
                    display:block;
                    margin-bottom:6px;
                    color:#71869a;
                    font-size:11px;
                    font-weight:700;
                    text-transform:uppercase;
                  "
                >
                  Comentarios / observaciones
                </span>


                <p
                  style="
                    margin:0;
                    color:#405b73;
                    line-height:1.6;
                    white-space:pre-wrap;
                  "
                >
                  ${escapeHTML(comentarios)}
                </p>

              </div>
            `
            : ""
        }


        <!-- =========================================
        EXTRACTO
        ========================================== -->

        <div
          class="mesas-form-group"
          style="
            margin-top:18px;
          "
        >

          <label for="demandaFirmaExtracto">

            Extracto
            <span style="color:#c33;">
              *
            </span>

          </label>


          <textarea
            id="demandaFirmaExtracto"
            class="mesas-textarea"
            rows="5"
            placeholder="Escribe el extracto que acompañará el acuerdo para firma..."
          >${escapeHTML(acuerdo.extracto || "")}</textarea>


          <small
            style="
              display:block;
              margin-top:5px;
              color:#74889c;
            "
          >
            Este extracto quedará guardado junto con el acuerdo.
          </small>

        </div>


        <p
          class="mesas-form-error"
          id="demandaFirmaError"
          hidden
        ></p>


        <div
          style="
            margin-top:15px;
            padding:13px;
            border-radius:8px;
            background:#f5f9ff;
            color:#49657e;
          "
        >

          <i class="fa-solid fa-circle-info"></i>

          El acuerdo será enviado a Presidencia
          para firma de la Magistrada.

        </div>

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="cancelarEnvioFirmaDemanda"
        >
          Cancelar
        </button>


        <button
          type="button"
          class="mesas-modal-confirm"
          id="confirmarEnvioFirmaDemanda"
        >

          <i class="fa-solid fa-paper-plane"></i>

          Enviar a firma

        </button>

      </footer>

    </div>
  `);

  document
    .getElementById("cancelarEnvioFirmaDemanda")
    ?.addEventListener("click", closeForm);

  document
    .getElementById("confirmarEnvioFirmaDemanda")
    ?.addEventListener("click", () => {
      enviarDemandaAFirma(numero);
    });
}

// ============================================================
// VISTA PREVIA
// ============================================================

function renderVistaPreviaArchivo(archivo) {
  if (!archivo || !archivo.dataUrl) {
    return `
      <div
        style="
          padding:20px;
          border:1px solid #dce5ee;
          border-radius:9px;
          background:#f8fafc;
          color:#74889c;
          text-align:center;
        "
      >
        No hay archivo disponible.
      </div>
    `;
  }

  const nombre = archivo.nombre || "Documento";

  const extension = nombre.split(".").pop()?.toLowerCase();

  // ==========================================================
  // PDF
  // ==========================================================

  if (extension === "pdf") {
    return `
      <div
        style="
          overflow:hidden;
          border:1px solid #d7e1eb;
          border-radius:10px;
          background:#f4f6f8;
        "
      >

        <iframe
          src="${archivo.dataUrl}"
          title="Vista previa del acuerdo"
          style="
            display:block;
            width:100%;
            height:390px;
            border:0;
            background:white;
          "
        ></iframe>

      </div>
    `;
  }

  // ==========================================================
  // WORD
  // ==========================================================

  return `
    <div
      style="
        display:flex;
        align-items:center;
        gap:14px;
        padding:18px;
        border:1px solid #d7e1eb;
        border-radius:10px;
        background:#f8fbff;
      "
    >

      <div
        style="
          width:52px;
          height:52px;
          display:flex;
          align-items:center;
          justify-content:center;
          flex-shrink:0;
          border-radius:10px;
          background:#e7f1ff;
          color:#1769d2;
          font-size:22px;
        "
      >
        <i class="fa-regular fa-file-word"></i>
      </div>


      <div style="flex:1;">

        <strong
          style="
            display:block;
            color:#173d60;
          "
        >
          ${escapeHTML(nombre)}
        </strong>


        <span
          style="
            display:block;
            margin-top:4px;
            color:#72869a;
            font-size:11px;
          "
        >
          Documento de Word
          ${
            archivo.tamano
              ? ` · ${escapeHTML(formatFileSize(archivo.tamano))}`
              : ""
          }
        </span>


        <span
          style="
            display:block;
            margin-top:5px;
            color:#8796a5;
            font-size:10px;
          "
        >
          El navegador no muestra el contenido de DOC/DOCX
          dentro del modal.
        </span>

      </div>


      <a
        href="${archivo.dataUrl}"
        download="${escapeHTML(nombre)}"
        class="mesas-secondary-btn"
        style="
          text-decoration:none;
          flex-shrink:0;
        "
      >

        <i class="fa-solid fa-download"></i>

        Abrir archivo

      </a>

    </div>
  `;
}

// ============================================================
// TAMAÑO DE ARCHIVO
// ============================================================

function formatFileSize(bytes) {
  if (!bytes) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ============================================================
// ERROR ENVÍO
// ============================================================

function mostrarErrorFirma(mensaje) {
  const error = document.getElementById("demandaFirmaError");

  if (!error) {
    return;
  }

  error.textContent = mensaje;

  error.hidden = false;
}

// ============================================================
// ENVIAR A FIRMA
// ============================================================

// ============================================================
// ENVIAR A FIRMA
// ============================================================

function enviarDemandaAFirma(numero) {

  const demandas = getData(
    KEY_DEMANDAS,
    {},
  );

  const registro = demandas[numero];

  if (
    !registro ||
    !tieneAcuerdoGuardado(registro)
  ) {
    return;
  }


  const extracto =
    document
      .getElementById("demandaFirmaExtracto")
      ?.value.trim() || "";


  if (!extracto) {

    mostrarErrorFirma(
      "Escribe el extracto antes de enviar el acuerdo a firma.",
    );

    return;

  }


  // Recuperar el documento previamente guardado.

  const archivo = obtenerArchivoAcuerdo(
    registro.acuerdo,
  );


  if (!archivo?.nombre || !archivo?.dataUrl) {

    mostrarErrorFirma(
      "No se encontró el documento guardado en el borrador.",
    );

    return;

  }


  // Validar con los requisitos existentes del módulo de firma.

  const problema = validarArchivoDocumento({
    name: archivo.nombre,
    size: archivo.tamano || 0,
  });


  if (problema) {

    mostrarErrorFirma(problema);

    return;

  }


  // Comprobar si el archivo ya está registrado.

  let documento = obtenerDocumento(
    registro.acuerdo.documentoId,
  );

  let documentoNuevo = false;


  // Registrar el archivo existente sin pedir
  // que el usuario vuelva a seleccionarlo.

  if (
    !documento ||
    documento.dataUrl !== archivo.dataUrl ||
    documento.nombre !== archivo.nombre
  ) {

    const guardado = guardarDocumento({

      archivo: {
        name: archivo.nombre,
        size: archivo.tamano || 0,
      },

      dataUrl: archivo.dataUrl,

    });


    if (!guardado.ok) {

      mostrarErrorFirma(

        guardado.error === "cuota"

          ? "No hay espacio suficiente en el navegador para registrar el documento."

          : "No fue posible registrar el documento para firma.",

      );

      return;

    }


    documento = guardado.documento;

    documentoNuevo = true;

  }


  const ahora = new Date().toISOString();


  const acuerdo = {

    ...registro.acuerdo,

    archivo: documento.nombre,

    documentoId: documento.id,

    concepto: registro.acuerdo.concepto || "Acuerdo",

    extracto,

    estado: "en-firma",

    enviadoFirmaEn: ahora,

    enviadoFirmaPor:
      getSession()?.nombre ||
      getSession()?.email ||
      "Secretaría de Acuerdos",

  };


  try {

    // Utilizar el formato que requiere el flujo de firma.

    registro.acuerdo = acuerdo;


    const resultado = aplicarAccion(

      registro,

      "enviar-firma",

      {

        campo: "radicacion",

        campoHistorial: "historialRadicacion",

        extra: {
          acuerdo,
        },

        usuario:
          getSession()?.nombre || "",

      },

    );


    if (!resultado.ok) {

      if (documentoNuevo) {
        borrarDocumento(documento.id);
      }

      mostrarErrorFirma(
        resultado.error ||
        "No fue posible enviar el acuerdo a firma.",
      );

      return;

    }


    saveData(
      KEY_DEMANDAS,
      demandas,
    );

  } catch (error) {

    console.error(
      "Error al enviar la demanda a firma:",
      error,
    );

    if (documentoNuevo) {

      try {
        borrarDocumento(documento.id);
      } catch (errorLimpieza) {
        console.error(errorLimpieza);
      }

    }

    mostrarErrorFirma(
      "No fue posible guardar el envío a firma.",
    );

    return;

  }


  closeForm();

  renderDemanda();

}

// ============================================================
// FLUJO POSTERIOR
// ============================================================

function ejecutarAccionDemanda(numero, accion) {
  if (!accion) {
    return;
  }

  const demandas = getData(KEY_DEMANDAS, {});

  const registro = demandas[numero];

  if (!registro) {
    return;
  }

  if (accion === "enviar-firma") {
    openConfirmarEnvioFirma(numero);

    return;
  }

  const resultado = aplicarAccion(registro, accion, {
    campo: "radicacion",

    campoHistorial: "historialRadicacion",

    extra:
      accion === "firmar"
        ? {
            categoria: "radicado",

            radicadoEn: todayISO(),
          }
        : {},

    usuario: getSession()?.nombre || "",
  });

  if (!resultado.ok) {
    window.alert(resultado.error);

    return;
  }

  saveData(KEY_DEMANDAS, demandas);

  renderDemanda();
}

// ============================================================
// BÚSQUEDA EXACTA
// ============================================================

function buscarExacto() {
  const input = document.getElementById("demandaBusquedaExacta");

  const error = document.getElementById("demandaSearchError");

  const numero = input?.value.trim() || "";

  if (error) {
    error.hidden = true;

    error.textContent = "";
  }

  if (!numero) {
    mostrarErrorBusqueda("Escribe el número exacto del expediente.");

    return;
  }

  const expediente = buscarExpedienteExacto(numero);

  if (!expediente) {
    mostrarErrorBusqueda("No se encontró ese expediente en la mesa actual.");

    return;
  }

  openDetalleDemanda(getNumeroExpediente(expediente));
}

// ============================================================
// ERROR BÚSQUEDA
// ============================================================

function mostrarErrorBusqueda(mensaje) {
  const error = document.getElementById("demandaSearchError");

  if (!error) {
    return;
  }

  error.textContent = mensaje;

  error.hidden = false;
}

// ============================================================
// DETALLE
// ============================================================
function openDetalleDemanda(numero) {
  const item = getRegistrosDemanda().find(
    (registro) => registro.numero === numero,
  );

  if (!item) {
    return;
  }

  const acuerdo =
    typeof item.demanda.acuerdo === "object"
      ? item.demanda.acuerdo
      : null;

  const calificacion = item.demanda.calificacion || null;

  // Recuperar el archivo desde el borrador
  // o desde el almacén de documentos para firma.
  const archivo = obtenerArchivoAcuerdo(acuerdo);

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

            <span>
              Actor
            </span>

            <strong>
              ${escapeHTML(item.actor)}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>
              Demandado
            </span>

            <strong>
              ${escapeHTML(item.demandado)}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>
              Radicación
            </span>

            <strong>
              ${escapeHTML(etiquetaEstado(item.demanda.radicacion))}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>
              Categoría
            </span>

            <strong>
              ${escapeHTML(etiquetaCategoriaDemanda(item.demanda.categoria))}
            </strong>

          </div>

        </div>


        <div class="mesas-modal-info-item">

          <span>
            Acto demandado
          </span>

          <strong>
            ${escapeHTML(item.asunto)}
          </strong>

        </div>


        ${
          calificacion
            ? `
              <div
                style="
                  margin-top:16px;
                  padding:14px;
                  border:1px solid #dce5ee;
                  border-radius:9px;
                  background:#f8fbff;
                "
              >

                <span>
                  Calificación
                </span>

                <strong
                  style="
                    display:block;
                    margin-top:5px;
                  "
                >
                  ${escapeHTML(etiquetaCalificacion(calificacion.resultado))}
                </strong>


                ${
                  calificacion.notas
                    ? `
                      <p>
                        ${escapeHTML(calificacion.notas)}
                      </p>
                    `
                    : ""
                }

              </div>
            `
            : ""
        }


        ${
          acuerdo
            ? `
              <div
                style="
                  margin-top:14px;
                  padding:14px;
                  border:1px solid #dce5ee;
                  border-radius:9px;
                "
              >

                <span>
                  Acuerdo / Auto
                </span>


                <strong
                  style="
                    display:block;
                    margin-top:5px;
                  "
                >
                  ${escapeHTML(acuerdo.titulo || "Acuerdo")}
                </strong>


                ${
                  archivo
                    ? `
                      <div
                        style="
                          margin-top:10px;
                          padding:9px;
                          background:#f5f8fb;
                          border-radius:7px;
                        "
                      >

                        <i class="fa-regular fa-file"></i>

                        ${escapeHTML(archivo.nombre || "Documento")}

                      </div>
                    `
                    : ""
                }


                ${
                  acuerdo.extracto
                    ? `
                      <div
                        style="
                          margin-top:12px;
                        "
                      >

                        <span>
                          Extracto
                        </span>

                        <p
                          style="
                            white-space:pre-wrap;
                          "
                        >
                          ${escapeHTML(acuerdo.extracto)}
                        </p>

                      </div>
                    `
                    : ""
                }

              </div>
            `
            : ""
        }

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
    .getElementById("closeDetalleDemanda")
    ?.addEventListener("click", closeForm);
}

// ============================================================
// CALIFICACIÓN
// ============================================================

function etiquetaCalificacion(value) {
  const etiquetas = {
    radicar: "Radicar",

    prevenir: "Prevenir",

    rechazar: "Rechazar",

    otro: "Otro",
  };

  return etiquetas[value] || value || "—";
}

// ============================================================
// FECHA
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
