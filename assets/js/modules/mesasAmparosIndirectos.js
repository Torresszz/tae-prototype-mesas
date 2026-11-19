// ============================================================
// AMPAROS INDIRECTOS - INFORMES
// I-01 / I-02 / I-03 / parte de I-07
// ============================================================
//
// Esta vista NO genera informes.
// Consulta documentos recibidos y permite:
//
// 1. Cargar documentos
// 2. Enviar a firma
// 3. Mandar fuera únicamente después de firma
//
// ============================================================

import { getData, saveData } from "../storage.js";

import { createId, escapeHTML } from "../utils.js";

import { showModal, closeForm } from "../forms/formHelper.js";

import { getSession } from "../auth.js";

import { cargarDemoAmparosIndirectos } from "./mesasAmparosIndirectosDemo.js";

// ============================================================
// LLAVES
// ============================================================

const KEY_INFORMES = "mesasAmparosIndirectosInformes";

const KEY_SEGUIMIENTO = "mesasAmparosSeguimiento";

const KEY_DOCUMENTOS = "mesasAmparosIndirectosDocumentos";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const MAX_DOCUMENT_SIZE = 2 * 1024 * 1024;

// ============================================================
// ESTADO
// ============================================================

let tabActual = "previos";

let busqueda = "";

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export async function renderMesasAmparosIndirectos() {
  const host = document.getElementById("mampInformesSection");

  if (!host) {
    return;
  }

  await asegurarDatosDemo();

  const previos = getInformesPorTipo("previo");

  const justificados = getInformesPorTipo("justificado");

  const sobreseimientos = getInformesPorTipo("sobreseimiento");

  host.innerHTML = `
    <section class="mamp-informes-panel">

      <!-- ===================================================
           RESUMEN
      ==================================================== -->

      <div class="mamp-informes-summary">

        <div class="mamp-informes-summary-item">

          <div class="mamp-informes-summary-icon">
            <i class="fa-regular fa-file-lines"></i>
          </div>

          <div>
            <span>
              Informes previos
            </span>

            <strong>
              ${previos.length}
            </strong>
          </div>

        </div>


        <div class="mamp-informes-summary-item">

          <div class="mamp-informes-summary-icon">
            <i class="fa-solid fa-file-circle-check"></i>
          </div>

          <div>
            <span>
              Informes justificados
            </span>

            <strong>
              ${justificados.length}
            </strong>
          </div>

        </div>


        <div class="mamp-informes-summary-item">

          <div class="mamp-informes-summary-icon">
            <i class="fa-solid fa-circle-xmark"></i>
          </div>

          <div>
            <span>
              Sobreseimientos
            </span>

            <strong>
              ${sobreseimientos.length}
            </strong>
          </div>

        </div>

      </div>


      <!-- ===================================================
           PESTAÑAS
      ==================================================== -->

      <div class="mamp-informes-tabs">

        <button
          type="button"
          class="mamp-informes-tab ${tabActual === "previos" ? "active" : ""}"
          data-informes-tab="previos"
        >

          <i class="fa-regular fa-file-lines"></i>

          <span>
            Informes previos
          </span>

          <strong>
            ${previos.length}
          </strong>

        </button>


        <button
          type="button"
          class="mamp-informes-tab ${
            tabActual === "justificados" ? "active" : ""
          }"
          data-informes-tab="justificados"
        >

          <i class="fa-solid fa-file-circle-check"></i>

          <span>
            Informes justificados
          </span>

          <strong>
            ${justificados.length}
          </strong>

        </button>


        <button
          type="button"
          class="mamp-informes-tab ${
            tabActual === "sobreseimientos" ? "active" : ""
          }"
          data-informes-tab="sobreseimientos"
        >

          <i class="fa-solid fa-circle-xmark"></i>

          <span>
            Sobreseimientos
          </span>

          <strong>
            ${sobreseimientos.length}
          </strong>

        </button>

      </div>


      <!-- ===================================================
           BUSCADOR
      ==================================================== -->

      <div class="mamp-informes-toolbar">

        <div class="mamp-informes-search">

          <i class="fa-solid fa-magnifying-glass"></i>

          <input
            type="search"
            id="mampInformesSearch"
            placeholder="Buscar por amparo, expediente, promovente, juzgado u oficio..."
            autocomplete="off"
            value="${escapeHTML(busqueda)}"
          >

        </div>

      </div>


      <!-- ===================================================
           CONTENIDO
      ==================================================== -->

      <div
        class="mamp-informes-content"
        id="mampInformesContent"
      >

        ${renderContenido()}

      </div>

    </section>
  `;

  setupEventos();
}

// ============================================================
// DEMO
// ============================================================

async function asegurarDatosDemo() {
  if (getInformes().length > 0) {
    return;
  }

  try {
    await cargarDemoAmparosIndirectos();
  } catch (error) {
    console.error("No se pudieron cargar los datos demo:", error);
  }
}

// ============================================================
// EVENTOS
// ============================================================

function setupEventos() {
  document.querySelectorAll("[data-informes-tab]").forEach((button) => {
    button.onclick = () => {
      tabActual = button.dataset.informesTab || "previos";

      renderMesasAmparosIndirectos();
    };
  });

  const search = document.getElementById("mampInformesSearch");

  if (search) {
    search.oninput = (event) => {
      busqueda = String(event.target.value || "")
        .trim()
        .toLowerCase();

      renderContenidoActual();
    };
  }

  document.querySelectorAll("[data-informe-action]").forEach((button) => {
    button.onclick = () => {
      const action = button.dataset.informeAction;

      const amparoId = button.dataset.amparoId;

      const informeId = button.dataset.informeId;

      if (action === "documentos") {
        abrirDocumentos(amparoId, informeId);
      }

      if (action === "firma") {
        abrirEnviarFirma(amparoId);
      }

      if (action === "fuera") {
        abrirMandarFuera(amparoId);
      }
    };
  });
}

// ============================================================
// CONTENIDO
// ============================================================

function renderContenidoActual() {
  const content = document.getElementById("mampInformesContent");

  if (!content) {
    return;
  }

  content.innerHTML = renderContenido();

  setupEventos();
}

function renderContenido() {
  if (tabActual === "justificados") {
    return renderTabla("justificado");
  }

  if (tabActual === "sobreseimientos") {
    return renderTabla("sobreseimiento");
  }

  return renderTabla("previo");
}

// ============================================================
// TABLA
// ============================================================

function renderTabla(tipo) {
  let registros = getInformesPorTipo(tipo);

  if (busqueda) {
    registros = registros.filter((registro) => {
      const amparo = getAmparo(registro.amparoId);

      const texto = `
            ${amparo?.id || ""}
            ${amparo?.expediente || ""}
            ${amparo?.promovente || ""}
            ${amparo?.juzgado || ""}
            ${registro.oficio || ""}
            ${registro.motivo || ""}
            ${registro.observaciones || ""}
          `.toLowerCase();

      return texto.includes(busqueda);
    });
  }

  if (!registros.length) {
    return renderVacio(tipo);
  }

  return `
    <div class="mamp-informes-table-wrapper">

      <table class="mamp-informes-table">

        <thead>

          <tr>

            <th>
              Amparo
            </th>

            <th>
              Expediente
            </th>

            <th>
              Promovente
            </th>

            <th>
              Juzgado
            </th>

            <th>
              Recepción
            </th>

            <th>
              Oficio
            </th>

            <th>
              Relación
            </th>

            <th>
              Firma
            </th>

            <th>
              Acciones
            </th>

          </tr>

        </thead>


        <tbody>

          ${registros.map(renderFila).join("")}

        </tbody>

      </table>

    </div>
  `;
}

// ============================================================
// FILA
// ============================================================

function renderFila(registro) {
  const amparo = getAmparo(registro.amparoId);

  const estado = getSeguimiento(registro.amparoId);

  return `
    <tr>

      <td>

        <div class="mamp-informe-amparo">

          <i class="fa-solid fa-scale-balanced"></i>

          <strong>
            ${escapeHTML(amparo?.id || registro.amparoId || "—")}
          </strong>

        </div>

      </td>


      <td>

        <strong class="mamp-informe-expediente">

          ${escapeHTML(amparo?.expediente || "—")}

        </strong>

      </td>


      <td>
        ${escapeHTML(amparo?.promovente || "—")}
      </td>


      <td>

        ${escapeHTML(amparo?.juzgado || amparo?.juzgadoOrigen || "—")}

      </td>


      <td>

        ${escapeHTML(formatFecha(registro.fechaRecepcion || registro.fecha))}

      </td>


      <td>

        <span class="mamp-informe-oficio">

          ${escapeHTML(registro.oficio || "—")}

        </span>

      </td>


      <td>

        ${renderRelacion(registro)}

      </td>


      <td>

        ${renderEstadoFirma(estado)}

      </td>


      <td>

        ${renderAcciones(registro, estado)}

      </td>

    </tr>
  `;
}

// ============================================================
// RELACIÓN
// ============================================================

function renderRelacion(registro) {
  if (registro.tipo === "previo") {
    const justificado = getInformePorId(registro.justificadoId);

    return `
      <div class="mamp-informe-status success">

        <i class="fa-solid fa-link"></i>

        <div>

          <strong>
            Justificado vinculado
          </strong>

          ${
            justificado?.oficio
              ? `
                <small>
                  ${escapeHTML(justificado.oficio)}
                </small>
              `
              : ""
          }

        </div>

      </div>
    `;
  }

  if (registro.tipo === "justificado") {
    if (registro.previoId) {
      const previo = getInformePorId(registro.previoId);

      return `
        <div class="mamp-informe-status linked">

          <i class="fa-solid fa-link"></i>

          <div>

            <strong>
              Vinculado a previo
            </strong>

            ${
              previo?.oficio
                ? `
                  <small>
                    ${escapeHTML(previo.oficio)}
                  </small>
                `
                : ""
            }

          </div>

        </div>
      `;
    }

    return `
      <div class="mamp-informe-status independent">

        <i class="fa-solid fa-file-circle-check"></i>

        <div>

          <strong>
            Independiente
          </strong>

          <small>
            Sin informe previo
          </small>

        </div>

      </div>
    `;
  }

  return `
    <div class="mamp-informe-status danger">

      <i class="fa-solid fa-circle-xmark"></i>

      <div>

        <strong>
          En sobreseimiento
        </strong>

        ${
          registro.motivo
            ? `
              <small>
                ${escapeHTML(registro.motivo)}
              </small>
            `
            : ""
        }

      </div>

    </div>
  `;
}

// ============================================================
// FIRMA
// ============================================================

function renderEstadoFirma(estado) {
  if (estado?.devueltoJuzgadoExterno === true) {
    return `
      <span class="mamp-firma-status fuera">

        <i class="fa-solid fa-paper-plane"></i>

        Enviado fuera

      </span>
    `;
  }

  if (estaFirmado(estado)) {
    return `
      <span class="mamp-firma-status firmado">

        <i class="fa-solid fa-circle-check"></i>

        Firmado

      </span>
    `;
  }

  if (estado?.enviadoFirma === true) {
    return `
      <span class="mamp-firma-status pendiente">

        <i class="fa-solid fa-clock"></i>

        En firma

      </span>
    `;
  }

  return `
    <span class="mamp-firma-status normal">

      <i class="fa-regular fa-circle"></i>

      Sin enviar

    </span>
  `;
}

// ============================================================
// ACCIONES
// ============================================================

function renderAcciones(registro, estado) {
  const documentos = getDocumentosRegistro(registro.amparoId, registro.id);

  const firmado = estaFirmado(estado);

  const fuera = estado?.devueltoJuzgadoExterno === true;

  const enviadoFirma = estado?.enviadoFirma === true;

  return `
    <div class="mamp-informe-actions">

      <!-- CARGAR DOCUMENTOS -->

      <button
        type="button"
        class="mamp-action-btn documents"
        data-informe-action="documentos"
        data-amparo-id="${escapeHTML(String(registro.amparoId))}"
        data-informe-id="${escapeHTML(String(registro.id))}"
      >

        <i class="fa-solid fa-paperclip"></i>

        <span>
          Documentos
        </span>

        ${
          documentos.length
            ? `
              <strong>
                ${documentos.length}
              </strong>
            `
            : ""
        }

      </button>


      <!-- ENVIAR A FIRMA -->

      <button
        type="button"
        class="mamp-action-btn sign"
        data-informe-action="firma"
        data-amparo-id="${escapeHTML(String(registro.amparoId))}"
        data-informe-id="${escapeHTML(String(registro.id))}"
        ${enviadoFirma || firmado || fuera ? "disabled" : ""}
      >

        <i class="fa-solid fa-signature"></i>

        ${firmado ? "Firmado" : enviadoFirma ? "En firma" : "Enviar a firma"}

      </button>


      <!-- MANDAR FUERA -->

      <button
        type="button"
        class="mamp-action-btn outside"
        data-informe-action="fuera"
        data-amparo-id="${escapeHTML(String(registro.amparoId))}"
        data-informe-id="${escapeHTML(String(registro.id))}"
        ${!firmado || fuera ? "disabled" : ""}
        title="${!firmado ? "Disponible cuando llegue firmado" : ""}"
      >

        <i class="fa-solid fa-paper-plane"></i>

        ${fuera ? "Enviado fuera" : "Mandar fuera"}

      </button>

    </div>
  `;
}

// ============================================================
// CARGAR DOCUMENTOS
// ============================================================

function abrirDocumentos(amparoId, informeId) {
  const amparo = getAmparo(amparoId);

  const documentos = getDocumentosRegistro(amparoId, informeId);

  showModal(`
    <div class="mesas-modal-shell mamp-documentos-modal">

      <header class="mesas-modal-header">

        <div class="mesas-modal-header-text">

          <span class="mesas-mini-eyebrow">
            Documentos
          </span>

          <h2>
            Cargar documentos
          </h2>

          <p>
            Amparo ${escapeHTML(amparo?.id || amparoId)}
            · Expediente
            ${escapeHTML(amparo?.expediente || "—")}
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        <label class="mamp-upload-zone">

          <i class="fa-solid fa-cloud-arrow-up"></i>

          <strong>
            Selecciona documentos
          </strong>

          <span>
            PDF, DOC o DOCX · máximo 2 MB por archivo
          </span>

          <input
            type="file"
            id="mampDocumentoFiles"
            accept=".pdf,.doc,.docx"
            multiple
          >

        </label>


        <div class="mamp-document-list">

          <h3>
            Documentos cargados
          </h3>


          ${
            documentos.length
              ? documentos
                  .map(
                    (documento) => `
                      <div class="mamp-document-row">

                        <div>

                          <i class="fa-regular fa-file"></i>

                          <span>

                            <strong>
                              ${escapeHTML(documento.nombre)}
                            </strong>

                            <small>
                              ${escapeHTML(formatSize(documento.tamano))}
                            </small>

                          </span>

                        </div>


                        <button
                          type="button"
                          class="mamp-document-download"
                          data-document-download="${escapeHTML(
                            String(documento.id),
                          )}"
                        >

                          <i class="fa-solid fa-download"></i>

                        </button>

                      </div>
                    `,
                  )
                  .join("")
              : `
                <div class="mamp-no-documents">
                  Aún no hay documentos cargados.
                </div>
              `
          }

        </div>


        <p
          class="mesas-form-error"
          id="mampDocumentError"
          hidden
        ></p>

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="mampCancelDocuments"
        >
          Cerrar
        </button>


        <button
          type="button"
          class="mesas-modal-confirm"
          id="mampSaveDocuments"
        >

          <i class="fa-solid fa-cloud-arrow-up"></i>

          Cargar documentos

        </button>

      </footer>

    </div>
  `);

  document
    .getElementById("mampCancelDocuments")
    ?.addEventListener("click", closeForm);

  document
    .getElementById("mampSaveDocuments")
    ?.addEventListener("click", () => {
      guardarDocumentos(amparoId, informeId);
    });

  document.querySelectorAll("[data-document-download]").forEach((button) => {
    button.onclick = () => {
      descargarDocumento(button.dataset.documentDownload);
    };
  });
}

// ============================================================
// GUARDAR DOCUMENTOS
// ============================================================

async function guardarDocumentos(amparoId, informeId) {
  const input = document.getElementById("mampDocumentoFiles");

  const files = Array.from(input?.files || []);

  if (!files.length) {
    mostrarErrorDocumento("Selecciona al menos un documento.");

    return;
  }

  const documentos = getDocumentos();

  for (const file of files) {
    if (file.size > MAX_DOCUMENT_SIZE) {
      mostrarErrorDocumento(`${file.name} supera el límite de 2 MB.`);

      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["pdf", "doc", "docx"].includes(extension)) {
      mostrarErrorDocumento(`${file.name} no es un formato permitido.`);

      return;
    }

    const dataUrl = await fileToDataUrl(file);

    documentos.push({
      id: createId(),

      amparoId,

      informeId,

      nombre: file.name,

      tipo: file.type,

      extension,

      tamano: file.size,

      dataUrl,

      subidoEn: new Date().toISOString(),

      subidoPor: getSession()?.nombre || "Amparos Indirectos",
    });
  }

  saveData(KEY_DOCUMENTOS, documentos);

  agregarHistorial(amparoId, `${files.length} documento(s) cargado(s).`);

  abrirDocumentos(amparoId, informeId);

  renderMesasAmparosIndirectos();
}

// ============================================================
// DESCARGAR
// ============================================================

function descargarDocumento(documentoId) {
  const documento = getDocumentos().find(
    (item) => String(item.id) === String(documentoId),
  );

  if (!documento?.dataUrl) {
    return;
  }

  const enlace = document.createElement("a");

  enlace.href = documento.dataUrl;

  enlace.download = documento.nombre || "documento";

  document.body.appendChild(enlace);

  enlace.click();

  enlace.remove();
}

// ============================================================
// ENVIAR A FIRMA
// ============================================================

function abrirEnviarFirma(amparoId) {
  const amparo = getAmparo(amparoId);

  showModal(`
    <div class="mesas-modal-shell mamp-firma-modal">

      <header class="mesas-modal-header">

        <div class="mesas-modal-header-text">

          <span class="mesas-mini-eyebrow">
            Presidencia
          </span>

          <h2>
            Enviar a firma
          </h2>

          <p>
            El documento será enviado a Presidencia
            para firma de la Magistrada.
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        <div class="mamp-confirm-card">

          <span>
            Amparo
          </span>

          <strong>
            ${escapeHTML(amparo?.id || amparoId)}
          </strong>

        </div>


        <div class="mamp-confirm-card">

          <span>
            Expediente
          </span>

          <strong>
            ${escapeHTML(amparo?.expediente || "—")}
          </strong>

        </div>


        <div class="mamp-confirm-message">

          <i class="fa-solid fa-signature"></i>

          <p>
            Después de enviarlo quedará marcado como
            <strong>En firma</strong>.
            El botón <strong>Mandar fuera</strong>
            permanecerá bloqueado hasta que regrese firmado.
          </p>

        </div>

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="mampCancelSign"
        >
          Cancelar
        </button>


        <button
          type="button"
          class="mesas-modal-confirm"
          id="mampConfirmSign"
        >

          <i class="fa-solid fa-signature"></i>

          Enviar a firma

        </button>

      </footer>

    </div>
  `);

  document
    .getElementById("mampCancelSign")
    ?.addEventListener("click", closeForm);

  document.getElementById("mampConfirmSign")?.addEventListener("click", () => {
    enviarAFirma(amparoId);
  });
}

// ============================================================
// GUARDAR ENVÍO A FIRMA
// ============================================================

function enviarAFirma(amparoId) {
  const seguimiento = getData(KEY_SEGUIMIENTO, {});

  const estado = obtenerOCrearSeguimiento(seguimiento, amparoId);

  estado.enviadoFirma = true;

  estado.enviadoFirmaEn = new Date().toISOString();

  estado.enviadoFirmaPor = getSession()?.nombre || "Amparos Indirectos";

  estado.estadoFirma = "en-firma";

  agregarHistorialEstado(estado, "Documento enviado a Presidencia para firma.");

  saveData(KEY_SEGUIMIENTO, seguimiento);

  closeForm();

  renderMesasAmparosIndirectos();
}

// ============================================================
// MANDAR FUERA
// ============================================================

function abrirMandarFuera(amparoId) {
  const seguimiento = getData(KEY_SEGUIMIENTO, {});

  const estado = seguimiento[String(amparoId)];

  if (!estaFirmado(estado)) {
    return;
  }

  const amparo = getAmparo(amparoId);

  showModal(`
    <div class="mesas-modal-shell mamp-firma-modal">

      <header class="mesas-modal-header">

        <div class="mesas-modal-header-text">

          <span class="mesas-mini-eyebrow">
            Devolución
          </span>

          <h2>
            Mandar fuera
          </h2>

          <p>
            El documento ya cuenta con firma y puede
            devolverse al juzgado externo.
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        <div class="mamp-confirm-card">

          <span>
            Amparo
          </span>

          <strong>
            ${escapeHTML(amparo?.id || amparoId)}
          </strong>

        </div>


        <div class="mamp-confirm-card">

          <span>
            Juzgado
          </span>

          <strong>
            ${escapeHTML(amparo?.juzgado || "—")}
          </strong>

        </div>


        <div class="mamp-confirm-message success">

          <i class="fa-solid fa-circle-check"></i>

          <p>
            La firma de la Magistrada está registrada.
            El documento puede ser enviado fuera del Tribunal.
          </p>

        </div>

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="mampCancelOutside"
        >
          Cancelar
        </button>


        <button
          type="button"
          class="mesas-modal-confirm"
          id="mampConfirmOutside"
        >

          <i class="fa-solid fa-paper-plane"></i>

          Mandar fuera

        </button>

      </footer>

    </div>
  `);

  document
    .getElementById("mampCancelOutside")
    ?.addEventListener("click", closeForm);

  document
    .getElementById("mampConfirmOutside")
    ?.addEventListener("click", () => {
      mandarFuera(amparoId);
    });
}

// ============================================================
// GUARDAR SALIDA
// ============================================================

function mandarFuera(amparoId) {
  const seguimiento = getData(KEY_SEGUIMIENTO, {});

  const estado = seguimiento[String(amparoId)];

  if (!estado || !estaFirmado(estado)) {
    return;
  }

  estado.devueltoJuzgadoExterno = true;

  estado.devueltoJuzgadoExternoEn = new Date().toISOString();

  estado.devueltoJuzgadoExternoPor =
    getSession()?.nombre || "Amparos Indirectos";

  estado.estadoFirma = "devuelto";

  estado.situacion = "esperando-archivo";

  agregarHistorialEstado(
    estado,
    "Documento firmado devuelto al juzgado externo.",
  );

  saveData(KEY_SEGUIMIENTO, seguimiento);

  closeForm();

  renderMesasAmparosIndirectos();

  window.renderMesasAmparos?.();
}

// ============================================================
// ESTADO DE FIRMA
// ============================================================

function estaFirmado(estado) {
  if (!estado) {
    return false;
  }

  return (
    estado.firmaPresidencia === true ||
    estado.firmaMagistrada === true ||
    estado.firmadoMagistrada === true ||
    estado.firmado === true ||
    estado.estadoFirma === "firmado"
  );
}

// ============================================================
// SEGUIMIENTO
// ============================================================

function getSeguimiento(amparoId) {
  const seguimiento = getData(KEY_SEGUIMIENTO, {});

  return seguimiento[String(amparoId)] || null;
}

function obtenerOCrearSeguimiento(seguimiento, amparoId) {
  const key = String(amparoId);

  if (!seguimiento[key]) {
    seguimiento[key] = {
      tipo: "indirecto",

      etapa: "informe",

      situacion: "esperando-cumplimiento",

      historial: [],
    };
  }

  return seguimiento[key];
}

// ============================================================
// HISTORIAL
// ============================================================

function agregarHistorial(amparoId, movimiento) {
  const seguimiento = getData(KEY_SEGUIMIENTO, {});

  const estado = obtenerOCrearSeguimiento(seguimiento, amparoId);

  agregarHistorialEstado(estado, movimiento);

  saveData(KEY_SEGUIMIENTO, seguimiento);
}

function agregarHistorialEstado(estado, movimiento) {
  if (!Array.isArray(estado.historial)) {
    estado.historial = [];
  }

  estado.historial.push({
    fecha: new Date().toISOString(),

    movimiento,

    por: getSession()?.nombre || "Amparos Indirectos",
  });
}

// ============================================================
// DOCUMENTOS
// ============================================================

function getDocumentos() {
  const documentos = getData(KEY_DOCUMENTOS, []);

  return Array.isArray(documentos) ? documentos : [];
}

function getDocumentosRegistro(amparoId, informeId) {
  return getDocumentos().filter(
    (documento) =>
      String(documento.amparoId) === String(amparoId) &&
      String(documento.informeId) === String(informeId),
  );
}

// ============================================================
// INFORMES
// ============================================================

function getInformes() {
  const registros = getData(KEY_INFORMES, []);

  return Array.isArray(registros) ? registros : [];
}

function getInformesPorTipo(tipo) {
  return getInformes()
    .filter((registro) => registro.tipo === tipo)

    .sort((a, b) => obtenerFechaOrden(b) - obtenerFechaOrden(a));
}

function obtenerFechaOrden(registro) {
  const value =
    registro.recibidoEn ||
    registro.creadoEn ||
    registro.fechaRecepcion ||
    registro.fecha;

  const fecha = new Date(value || 0);

  return Number.isNaN(fecha.getTime()) ? new Date(0) : fecha;
}

function getInformePorId(id) {
  if (!id) {
    return null;
  }

  return (
    getInformes().find((registro) => String(registro.id) === String(id)) || null
  );
}

// ============================================================
// AMPAROS
// ============================================================

function getAmparo(id) {
  const amparos = getData("amparos", []);

  return amparos.find((amparo) => String(amparo.id) === String(id)) || null;
}

// ============================================================
// VACÍO
// ============================================================

function renderVacio(tipo) {
  let titulo = "Sin informes previos";

  let texto = "Todavía no se han recibido informes previos.";

  if (tipo === "justificado") {
    titulo = "Sin informes justificados";

    texto = "Todavía no se han recibido informes justificados.";
  }

  if (tipo === "sobreseimiento") {
    titulo = "Sin sobreseimientos";

    texto = "Todavía no se han registrado sobreseimientos.";
  }

  return `
    <div class="mamp-informes-empty">

      <div class="mamp-informes-empty-icon">

        <i class="fa-regular fa-folder-open"></i>

      </div>

      <strong>
        ${escapeHTML(titulo)}
      </strong>

      <span>
        ${escapeHTML(texto)}
      </span>

    </div>
  `;
}

// ============================================================
// ARCHIVOS
// ============================================================

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = () => reject(reader.error);

    reader.readAsDataURL(file);
  });
}

function mostrarErrorDocumento(mensaje) {
  const error = document.getElementById("mampDocumentError");

  if (!error) {
    return;
  }

  error.textContent = mensaje;

  error.hidden = false;
}

function formatSize(bytes) {
  if (!bytes) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.ceil(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ============================================================
// FECHA
// ============================================================

function formatFecha(value) {
  if (!value) {
    return "—";
  }

  const partes = String(value).slice(0, 10).split("-");

  if (partes.length !== 3) {
    return value;
  }

  return `${partes[2]}/` + `${partes[1]}/` + `${partes[0]}`;
}
