// ============================================================
// CONSULTA DE DEMANDA INICIAL
// assets/js/modules/mesas/expedienteDemanda.js
// ============================================================

import { escapeHTML } from "../../utils.js";

import { showModal, closeForm } from "../../forms/formHelper.js";

import { renderEstadoBadge } from "./flujoEstados.js";

import {
  htmlVistaPreviaDocumento,
  activarVistasPreviasDocumento,
} from "./documentosFirma.js";

import { etiquetaEstado } from "./estados.js";

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderExpedienteDemanda(expediente) {
  const demanda = expediente.demanda;

  if (!demanda) {
    return `
      <div class="expediente-detalle-empty">
        <i class="fa-regular fa-folder-open"></i>
        <strong>No hay una demanda registrada.</strong>
      </div>
    `;
  }

  const calificacion = demanda.calificacion || {};

  const calificacionTramite = demanda.calificacionTramite || {};

  const acuerdo = demanda.acuerdo;

  const resultado = obtenerCalificacion(calificacion.resultado || calificacion);

  // ============================================================
  // ESTADO DE LA CALIFICACIÓN
  // ============================================================

  const estadoCalificacion = calificacionTramite.estado
    ? etiquetaEstado(calificacionTramite.estado)
    : "";

  // ============================================================
  // FECHAS DE CALIFICACIÓN
  // ============================================================

  const fechas = [];

  if (calificacion.fecha) {
    fechas.push(`Registrada: ${formatFecha(calificacion.fecha)}`);
  }

  if (
    Array.isArray(demanda.fechasCalificacion) &&
    demanda.fechasCalificacion.length
  ) {
    fechas.push(
      `Agendada: ${demanda.fechasCalificacion.map(formatFecha).join(", ")}`,
    );
  }

  if (calificacionTramite.concluidaEn) {
    fechas.push(`Concluida: ${formatFecha(calificacionTramite.concluidaEn)}`);
  }

  const fechaCalificacion = fechas.length
    ? fechas.join(" · ")
    : "Sin registrar";

  return `

    <div class="expediente-tab-panel">


      <!-- ENCABEZADO -->

      <header class="expediente-panel-header">

        <div>

          <h3>Demanda inicial</h3>

          <p>
            Consulta del escrito inicial, calificación y radicación.
          </p>

        </div>

        ${renderEstadoBadge(demanda.radicacion)}

      </header>


      <!-- INFORMACIÓN GENERAL -->

      <div class="expediente-demanda-info">

        ${renderCampo("Fecha de presentación", formatFecha(demanda.fecha))}

        ${renderCampo(
          "Calificación registrada",

          estadoCalificacion
            ? `${resultado} · Trámite: ${estadoCalificacion}`
            : resultado,
        )}

        ${renderCampo("Fecha de calificación", fechaCalificacion)}

        ${renderCampo(
          "Categoría",
          demanda.categoria === "radicado" ? "Radicada" : "Por radicar",
        )}

      </div>


      <!-- RESUMEN -->

      <section class="expediente-resumen-card">

        <span>Resumen de la demanda</span>

        <p>
          ${escapeHTML(demanda.resumen || "Sin resumen registrado.")}
        </p>

      </section>


      <!-- OBSERVACIONES -->

      ${
        calificacion.notas
          ? `
            <section class="expediente-resumen-card">

              <span>
                Observaciones de la Secretaría de Acuerdos
              </span>

              <p>
                ${escapeHTML(calificacion.notas)}
              </p>

            </section>
          `
          : ""
      }

      ${
  calificacionTramite.notas &&
  calificacionTramite.notas !== calificacion.notas

    ? `
      <section class="expediente-resumen-card">

        <span>
          Notas de calificación
        </span>

        <p>
          ${escapeHTML(calificacionTramite.notas)}
        </p>

      </section>
    `

    : ""
}
      <!-- DOCUMENTOS -->

      <section class="expediente-documentos-section">

        <div class="expediente-section-heading">

          <i class="fa-solid fa-folder-open"></i>

          <h4>Documentos del expediente</h4>

        </div>


        <div class="expediente-documentos-list">

          ${renderDocumentoCard({
            tipo: "demanda",
            titulo: "Escrito de demanda inicial",
            descripcion: "Documento presentado por la parte actora.",
            documento: demanda.documento,
          })}


          ${renderDocumentoCard({
            tipo: "acuerdo",
            titulo: "Acuerdo inicial / Radicación",
            descripcion:
              acuerdo?.titulo ||
              "Acuerdo relacionado con la calificación de la demanda.",
            documento: acuerdo,
          })}

        </div>

      </section>


      <!-- EXTRACTO DEL ACUERDO -->

      ${
        acuerdo?.extracto
          ? `
            <section class="expediente-resumen-card">

              <span>Extracto del acuerdo</span>

              <p>
                ${escapeHTML(acuerdo.extracto)}
              </p>

            </section>
          `
          : ""
      }


    </div>

  `;
}

// ============================================================
// CAMPO DE INFORMACIÓN
// ============================================================

function renderCampo(titulo, valor) {
  return `

    <div class="expediente-demanda-field">

      <span>
        ${escapeHTML(titulo)}
      </span>

      <strong>
        ${escapeHTML(valor || "—")}
      </strong>

    </div>

  `;
}

// ============================================================
// CALIFICACIÓN DE LA DEMANDA
// ============================================================

function obtenerCalificacion(resultado) {
  const etiquetas = {
    radicar: "Radicar",
    admitida: "Admitida",
    admitir: "Admitida",
    admitido: "Admitida",

    prevenir: "Prevenida",
    prevenida: "Prevenida",
    prevenido: "Prevenida",

    rechazar: "Rechazada",
    rechazada: "Rechazada",

    desechar: "Desechada",
    desechada: "Desechada",

    incompetencia: "Incompetencia",

    otro: "Otra determinación",
  };

  if (typeof resultado !== "string" || !resultado.trim()) {
    return "Pendiente de calificar";
  }

  return etiquetas[resultado.toLowerCase()] || resultado;
}

// ============================================================
// TARJETA DE DOCUMENTO
// ============================================================

function renderDocumentoCard({ tipo, titulo, descripcion, documento }) {
  const disponible = tieneContenido(documento);

  return `

    <article class="expediente-documento-card">


      <div class="expediente-documento-icon">

        <i class="fa-regular fa-file-lines"></i>

      </div>


      <div class="expediente-documento-info">

        <strong>
          ${escapeHTML(titulo)}
        </strong>

        <span>
          ${escapeHTML(descripcion)}
        </span>

        <small class="${disponible ? "disponible" : "pendiente"}">

          ${disponible ? "Contenido disponible" : "Sin documento adjunto"}

        </small>

      </div>


      <button
        type="button"
        class="mesas-secondary-btn"
        data-consulta-demanda="${tipo}"
        ${disponible ? "" : "disabled"}
      >

        <i class="fa-regular fa-eye"></i>

        Consultar

      </button>


    </article>

  `;
}

// ============================================================
// EVENTOS DE CONSULTA
// ============================================================

export function activarConsultaDemanda(contenedor, expediente) {
  if (!contenedor || !expediente.demanda) {
    return;
  }

  contenedor.querySelectorAll("[data-consulta-demanda]").forEach((button) => {
    button.onclick = () => {
      const tipo = button.dataset.consultaDemanda;

      const esAcuerdo = tipo === "acuerdo";

      abrirDocumentoExpediente({
        titulo: esAcuerdo
          ? "Acuerdo inicial / Radicación"
          : "Escrito de demanda inicial",

        numero: expediente.numero,

        documento: esAcuerdo
          ? expediente.demanda.acuerdo
          : expediente.demanda.documento,
      });
    };
  });
}

// ============================================================
// MODAL DE CONSULTA DE DOCUMENTOS
// Reutilizable desde la pestaña Promociones.
// ============================================================

export function abrirDocumentoExpediente({ titulo, numero, documento }) {
  if (!tieneContenido(documento)) {
    return;
  }

  const texto = obtenerTexto(documento);

  showModal(`

    <div class="mesas-modal-shell expediente-documento-modal">


      <header class="mesas-modal-header">

        <div class="mesas-modal-step">

          <i class="fa-regular fa-file-lines"></i>

        </div>


        <div class="mesas-modal-header-text">

          <h2>
            ${escapeHTML(titulo)}
          </h2>

          <p>
            Expediente ${escapeHTML(numero)}
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        ${
          texto
            ? `
              <div class="expediente-documento-texto">

                ${escapeHTML(texto)}

              </div>
            `
            : ""
        }


        ${renderVistaDocumento(documento)}

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="cerrarConsultaDocumento"
        >

          Cerrar

        </button>

      </footer>


    </div>

  `);

  // Compatibilidad con los documentos guardados
  // mediante documentosFirma.js.

  if (documento?.documentoId) {
    activarVistasPreviasDocumento(document.getElementById("modalContent"));
  }

  document
    .getElementById("cerrarConsultaDocumento")
    ?.addEventListener("click", closeForm);
}

// ============================================================
// VISTA PREVIA DEL DOCUMENTO
// ============================================================

function renderVistaDocumento(documento) {
  // Documento registrado mediante el módulo de firma.

  if (documento?.documentoId) {
    return htmlVistaPreviaDocumento(documento);
  }

  // Documento guardado directamente en localStorage.

  const archivo = normalizarArchivo(documento);

  if (!archivo) {
    return obtenerTexto(documento)
      ? ""
      : `
        <div class="expediente-detalle-empty">
          No hay un archivo digital disponible.
        </div>
      `;
  }

  const url = escapeHTML(archivo.dataUrl);

  const nombre = escapeHTML(archivo.nombre);

  const esPDF = archivo.dataUrl.startsWith("data:application/pdf;");

  return `

    <div class="expediente-documento-preview">


      <div class="expediente-preview-toolbar">

        <strong>

          <i class="fa-regular fa-file"></i>

          ${nombre}

        </strong>


        <a
          href="${url}"
          download="${nombre}"
          class="mesas-secondary-btn"
        >

          <i class="fa-solid fa-download"></i>

          Descargar

        </a>

      </div>


      ${
        esPDF
          ? `
            <iframe
              src="${url}"
              title="Vista previa del documento"
              class="expediente-preview-frame"
            ></iframe>
          `
          : `
            <div class="expediente-detalle-empty">

              <i class="fa-regular fa-file-word"></i>

              <strong>${nombre}</strong>

              <span>
                Descarga el documento para consultarlo.
              </span>

            </div>
          `
      }


    </div>

  `;
}

// ============================================================
// NORMALIZAR ARCHIVO
// ============================================================

function normalizarArchivo(documento) {
  if (!documento) {
    return null;
  }

  const archivo = documento.archivo || documento.documento || documento;

  const dataUrl =
    typeof archivo === "string" ? archivo : archivo?.dataUrl || "";

  // Solo aceptar archivos PDF, DOC y DOCX
  // almacenados como datos base64.

  const formatoValido =
    /^data:(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document);base64,[A-Za-z0-9+/=\s]+$/i;

  if (!formatoValido.test(dataUrl)) {
    return null;
  }

  const extension = dataUrl.startsWith("data:application/pdf;")
    ? "pdf"
    : dataUrl.startsWith("data:application/msword;")
      ? "doc"
      : "docx";

  return {
    nombre: archivo.nombre || archivo.nombreArchivo || `Documento.${extension}`,

    dataUrl,
  };
}

// ============================================================
// OBTENER TEXTO DEL ACUERDO
// ============================================================

function obtenerTexto(documento) {
  if (typeof documento === "string") {
    return documento.startsWith("data:") ? "" : documento.trim();
  }

  const texto =
    documento?.texto || documento?.contenido || documento?.extracto || "";

  return typeof texto === "string" ? texto.trim() : "";
}

// ============================================================
// VALIDAR DISPONIBILIDAD
// ============================================================

export function tieneContenido(documento) {
  return Boolean(
    documento?.documentoId ||
    normalizarArchivo(documento) ||
    obtenerTexto(documento),
  );
}

// ============================================================
// FORMATO DE FECHA
// ============================================================

function formatFecha(value) {
  if (!value) {
    return "Sin registrar";
  }

  const parts = String(value).slice(0, 10).split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return String(value);
}
