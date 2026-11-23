// ============================================================
// DOCUMENTOS PARA FIRMA
// assets/js/modules/mesas/documentosFirma.js
//
// Todo lo que se envía a firma de la Magistrada lleva:
//   1. Un documento adjunto (.pdf o .docx), guardado en el navegador.
//   2. El concepto "Acuerdo" (texto libre).
//
// Este módulo concentra lo que comparten expedientes, promociones,
// demanda, calificación y exhortos:
//   - almacén de archivos (localStorage, llave "mesasDocumentosFirma")
//   - validación de los dos requisitos
//   - modal "Enviar a firma"
//   - vista previa y descarga (la Magistrada revisa antes de firmar)
//
// El registro solo guarda una REFERENCIA:
//   registro.acuerdo = { archivo, documentoId, concepto, ... }
// El archivo vive en el almacén, igual que las plantillas. Cuando
// exista un servidor, solo hay que reescribir las funciones del
// almacén (guardar / obtener / borrar).
// ============================================================

import { getData, saveData } from "../../storage.js";

import { createId, escapeHTML, todayISO } from "../../utils.js";

import { showModal, closeForm } from "../../forms/formHelper.js";

import { getSession } from "../../auth.js";

import { renderVistaPrevia } from "./vistaPrevia.js";

import { ARCHIVOS_DEMO } from "./demoArchivos.js";

const KEY_DOCUMENTOS = "mesasDocumentosFirma";

export const EXTENSIONES_DOCUMENTO_FIRMA = ["pdf", "docx"];

// Límite por archivo en el prototipo (localStorage tiene ~5 MB en total).
export const DOCUMENTO_MAX_MB = 2;

// ============================================================
// VALIDACIÓN
// ============================================================

export function extensionDe(nombreArchivo) {
  const nombre = String(nombreArchivo || "")
    .trim()
    .toLowerCase();

  const punto = nombre.lastIndexOf(".");

  return punto < 0 ? "" : nombre.slice(punto + 1);
}

export function extensionDocumentoValida(nombreArchivo) {
  return EXTENSIONES_DOCUMENTO_FIRMA.includes(extensionDe(nombreArchivo));
}

// Mensaje de error para un File recién elegido, o "" si es válido.
export function validarArchivoDocumento(archivo) {
  if (!archivo) {
    return "Selecciona un archivo.";
  }

  if (!extensionDocumentoValida(archivo.name)) {
    return "El archivo debe ser .pdf o .docx.";
  }

  if (archivo.size > DOCUMENTO_MAX_MB * 1024 * 1024) {
    return `El archivo supera el límite de ${DOCUMENTO_MAX_MB} MB.`;
  }

  return "";
}

// Lista de problemas para poder enviar a firma; vacía = cumple.
export function validarRequisitosFirma(acuerdo) {
  const datos = acuerdo && typeof acuerdo === "object" ? acuerdo : {};

  const archivo = String(datos.archivo || "").trim();

  const documentoId = String(datos.documentoId || "").trim();

  const concepto = String(datos.concepto || "").trim();

  const errores = [];

  if (!archivo || !documentoId) {
    errores.push("Adjunta el archivo del documento (.pdf o .docx).");
  } else if (!extensionDocumentoValida(archivo)) {
    errores.push("El archivo adjunto debe ser .pdf o .docx.");
  }

  if (!concepto) {
    errores.push('Escribe el concepto "Acuerdo".');
  }

  return errores;
}

// Requisitos para enviar a firma un AMPARO DIRECTO: documento adjunto,
// estado procesal (texto manual) y cantidad de fojas (entero >= 0).
export function validarRequisitosFirmaAmparo(datos) {
  const d = datos && typeof datos === "object" ? datos : {};

  const errores = [];

  if (!String(d.archivo || "").trim() || !String(d.documentoId || "").trim()) {
    errores.push("Adjunta el archivo del documento (.pdf o .docx).");
  } else if (!extensionDocumentoValida(d.archivo)) {
    errores.push("El archivo adjunto debe ser .pdf o .docx.");
  }

  if (!String(d.estadoProcesal || "").trim()) {
    errores.push("Escribe el estado procesal.");
  }

  const fojas = String(d.fojas ?? "").trim();

  if (!/^\d+$/.test(fojas)) {
    errores.push("Indica la cantidad de fojas del documento (número entero).");
  }

  return errores;
}

// ============================================================
// ALMACÉN DE ARCHIVOS
// Registro: { id, nombre, tipoArchivo, tamano, dataUrl, subidoPor, fecha }
// ============================================================

function leerDocumentos() {
  const lista = getData(KEY_DOCUMENTOS, []);

  return Array.isArray(lista) ? lista : [];
}

export function obtenerDocumento(id) {
  if (!id) return null;

  return leerDocumentos().find((doc) => doc.id === id) || null;
}

// Devuelve { ok: true, documento } o { ok: false, error: "cuota" | "otro" }.
export function guardarDocumento({ archivo, dataUrl }) {
  const documento = {
    id: createId(),
    nombre: archivo.name,
    tipoArchivo: extensionDe(archivo.name),
    tamano: archivo.size,
    dataUrl,
    subidoPor: getSession()?.nombre || "—",
    fecha: todayISO(),
  };

  try {
    saveData(KEY_DOCUMENTOS, [...leerDocumentos(), documento]);

    return { ok: true, documento };
  } catch (error) {
    console.error("No se pudo guardar el documento:", error);

    const cuota =
      error?.name === "QuotaExceededError" ||
      error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error?.code === 22 ||
      error?.code === 1014;

    return { ok: false, error: cuota ? "cuota" : "otro" };
  }
}

export function borrarDocumento(id) {
  if (!id) return;

  saveData(
    KEY_DOCUMENTOS,
    leerDocumentos().filter((doc) => doc.id !== id),
  );
}

// Reconstruye el archivo original (mismos bytes) desde el dataUrl.
function dataUrlABlob(dataUrl) {
  try {
    const [cabecera, base64] = String(dataUrl).split(",");

    const tipo =
      cabecera.match(/data:([^;]+)/)?.[1] || "application/octet-stream";

    const binario = atob(base64);

    const bytes = new Uint8Array(binario.length);

    for (let i = 0; i < binario.length; i++) {
      bytes[i] = binario.charCodeAt(i);
    }

    return new Blob([bytes], { type: tipo });
  } catch (error) {
    console.error("dataUrl inválido:", error);

    return null;
  }
}

export function leerComoDataUrl(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();

    lector.onload = () => resolve(String(lector.result));

    lector.onerror = () => reject(lector.error || new Error("Lectura fallida"));

    lector.readAsDataURL(archivo);
  });
}

export function descargarDocumento(id) {
  const documento = obtenerDocumento(id);

  const blob = documento ? dataUrlABlob(documento.dataUrl) : null;

  if (!blob) {
    window.alert("No se pudo leer el archivo del documento.");

    return;
  }

  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");

  enlace.href = url;

  enlace.download = documento.nombre;

  document.body.appendChild(enlace);

  enlace.click();

  enlace.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Demostración: guarda un archivo de ejemplo con id fijo y devuelve
// el `acuerdo` listo para colgarse del registro.
export function sembrarDocumentoDemo(clave, id, { nombreBase, concepto }) {
  const ejemplo = ARCHIVOS_DEMO[clave];

  if (!ejemplo) return null;

  const nombre = `${nombreBase}.${ejemplo.tipoArchivo}`;

  const documento = {
    id,
    nombre,
    tipoArchivo: ejemplo.tipoArchivo,
    tamano: ejemplo.tamano,
    dataUrl: ejemplo.dataUrl,
    subidoPor: "Demostración",
    fecha: todayISO(),
  };

  saveData(KEY_DOCUMENTOS, [
    ...leerDocumentos().filter((doc) => doc.id !== id),
    documento,
  ]);

  return { archivo: nombre, documentoId: id, concepto };
}

// ============================================================
// VISTA PREVIA
// ============================================================

// HTML de un contenedor que activarVistasPreviasDocumento() rellena.
export function htmlVistaPreviaDocumento(acuerdo) {
  const documento = obtenerDocumento(acuerdo?.documentoId);

  if (!documento) {
    return `
      <p class="mesas-preview-error">
        Este registro no tiene un documento disponible para mostrar.
      </p>
    `;
  }

  return `
    <div
      class="mesas-plantilla-preview"
      data-doc-preview="${escapeHTML(documento.id)}"
    >
      <p class="mesas-preview-loading">Cargando vista previa...</p>
    </div>

    <p class="mesas-preview-caption">
      ${escapeHTML(documento.nombre)}
      ·
      <button
        type="button"
        class="mesas-alert-read-btn"
        data-doc-descargar="${escapeHTML(documento.id)}"
      >
        <i class="fa-solid fa-download"></i>
        Descargar
      </button>
    </p>
  `;
}

// Dibuja la primera página de cada [data-doc-preview] dentro de `raiz`.
export async function activarVistasPreviasDocumento(raiz = document) {
  const contenedores = [...raiz.querySelectorAll("[data-doc-preview]")];

  for (const contenedor of contenedores) {
    const documento = obtenerDocumento(contenedor.dataset.docPreview);

    const blob = documento ? dataUrlABlob(documento.dataUrl) : null;

    if (!blob) {
      contenedor.innerHTML =
        '<p class="mesas-preview-error">No se pudo leer el archivo.</p>';

      continue;
    }

    await renderVistaPrevia(
      contenedor,
      { tipoArchivo: documento.tipoArchivo },
      blob,
    );
  }
}

// Modal independiente con la vista previa (botón "Ver documento").
export function abrirVistaPreviaDocumento({ documentoId, concepto = "" }) {
  const acuerdo = { documentoId, concepto };

  const documento = obtenerDocumento(documentoId);

  showModal(`
    <div class="mesas-modal-shell mesas-plantilla-preview-shell">

      <header class="mesas-modal-header">

        <div class="mesas-modal-step">
          <i class="fa-regular fa-eye"></i>
        </div>

        <div class="mesas-modal-header-text">

          <h2>Documento para firma</h2>

          <p>${escapeHTML(documento?.nombre || "Sin documento")} · vista previa</p>

        </div>

      </header>


      <div class="mesas-modal-body">

        ${
          concepto
            ? `
              <div class="mesas-modal-message">
                <i class="fa-regular fa-file-lines"></i>
                <span>
                  <strong>Acuerdo:</strong>
                  ${escapeHTML(concepto)}
                </span>
              </div>
            `
            : ""
        }

        ${htmlVistaPreviaDocumento(acuerdo)}

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="cerrarVistaDocumento"
        >
          Cerrar
        </button>

      </footer>

    </div>
  `);

  document.getElementById("cerrarVistaDocumento").onclick = closeForm;

  activarVistasPreviasDocumento(document.getElementById("modalContent"));
}

// Botón "Ver documento" (lo pinta renderBotonesFlujo en etapa de firma).
export function htmlBotonVerDocumento(acuerdo) {
  if (!acuerdo?.documentoId) return "";

  return `
    <button
      type="button"
      class="mesas-secondary-btn"
      data-doc-firma="${escapeHTML(acuerdo.documentoId)}"
      data-doc-concepto="${escapeHTML(acuerdo.concepto || "")}"
    >
      <i class="fa-regular fa-eye"></i>
      Ver documento
    </button>
  `;
}

// Un solo oyente global: funciona en cualquier tabla sin tocar sus handlers.
if (!window.__mesasDocumentosFirmaListo) {
  window.__mesasDocumentosFirmaListo = true;

  document.addEventListener("click", (evento) => {
    const ver = evento.target.closest("[data-doc-firma]");

    if (ver) {
      abrirVistaPreviaDocumento({
        documentoId: ver.dataset.docFirma,
        concepto: ver.dataset.docConcepto || "",
      });

      return;
    }

    const descargar = evento.target.closest("[data-doc-descargar]");

    if (descargar) {
      descargarDocumento(descargar.dataset.docDescargar);
    }
  });
}

// ============================================================
// MODAL "ENVIAR A FIRMA"
//
//   referencia  texto del encabezado (ej. "Expediente 126/2026")
//   acuerdo     acuerdo actual del registro (puede venir vacío)
//   aplicar     (acuerdo) => { ok, error }  ejecuta la acción del flujo
//   alTerminar  se llama tras enviar con éxito (para volver a pintar)
//   modo        "acuerdo" (por defecto): documento + concepto "Acuerdo".
//               "amparo": documento + estado procesal + fojas
//               (Amparos Directos; el resultado trae estadoProcesal y fojas).
//
// El botón de envío permanece bloqueado hasta que haya documento
// (.pdf/.docx) y concepto "Acuerdo". El archivo se guarda al enviar.
// ============================================================

export function abrirEnvioFirma({
  referencia,
  acuerdo = null,
  aplicar,
  alTerminar,
  modo = "acuerdo",
}) {
  const esAmparo = modo === "amparo";

  const acuerdoActual =
    acuerdo && typeof acuerdo === "object" ? acuerdo : {};

  // Un archivo que solo tiene nombre (sin copia guardada) no cuenta.
  const documentoPrevio = obtenerDocumento(acuerdoActual.documentoId);

  let pendiente = null; // { archivo: File, dataUrl } elegido en este modal

  let leyendo = false;

  showModal(`
    <div class="mesas-modal-shell mesas-agenda-modal">

      <header class="mesas-modal-header">

        <div class="mesas-modal-step">
          <i class="fa-solid fa-paper-plane"></i>
        </div>

        <div class="mesas-modal-header-text">

          <h2>Enviar a firma</h2>

          <p>${escapeHTML(referencia)}</p>

        </div>

      </header>


      <div class="mesas-modal-body">

        <div class="mesas-agenda-form-grid">

          <div class="mesas-agenda-field full">

            <span>
              Documento
              <small>(.pdf o .docx · máx. ${DOCUMENTO_MAX_MB} MB · obligatorio)</small>
            </span>

            <div class="mesas-selected-file">

              <div class="mesas-selected-file-info">

                <i class="fa-regular fa-file-lines"></i>

                <div>
                  <strong id="firmaArchivoNombre"></strong>
                  <span id="firmaArchivoEstado"></span>
                </div>

              </div>

              <label class="mesas-modal-cancel" for="firmaArchivo">
                <i class="fa-solid fa-paperclip"></i>

                <b id="firmaArchivoBoton"></b>

                <input
                  type="file"
                  id="firmaArchivo"
                  accept=".pdf,.docx"
                  hidden
                >
              </label>

            </div>

          </div>


          ${
            esAmparo
              ? `
          <label class="mesas-agenda-field full">

            <span>
              Estado procesal
              <small>(obligatorio · se escribe a mano)</small>
            </span>

            <textarea
              id="firmaEstadoProcesal"
              rows="3"
              placeholder="Ej. RADICACIÓN A.D. 02OCT2026 PARTE ACTORA"
            >${escapeHTML(acuerdoActual.estadoProcesal || "")}</textarea>

            <small>
              Aparece tal cual en la columna "Estado procesal" de la lista.
            </small>

          </label>

          <label class="mesas-agenda-field">

            <span>
              Fojas del documento
              <small>(obligatorio)</small>
            </span>

            <input
              type="number"
              id="firmaFojas"
              min="0"
              step="1"
              inputmode="numeric"
              placeholder="Ej. 245"
              value="${escapeHTML(String(acuerdoActual.fojas ?? ""))}"
            >

          </label>
          `
              : `
          <label class="mesas-agenda-field full">

            <span>
              Estracto
              <small>(obligatorio)</small>
            </span>

            <textarea
              id="firmaConcepto"
              rows="5"
              placeholder="Escribe lo acordado en el proceso..."
            >${escapeHTML(acuerdoActual.concepto || "")}</textarea>

            <small>
              Texto libre. Con este dato se generará el documento posteriormente.
            </small>

          </label>
          `
          }

        </div>

        <p class="mesas-form-error" id="firmaError" hidden></p>

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="cancelarEnvioFirma"
        >
          Cancelar
        </button>

        <button
          type="button"
          class="mesas-modal-confirm"
          id="confirmarEnvioFirma"
          disabled
        >
          <i class="fa-solid fa-paper-plane"></i>
          Enviar a firma
        </button>

      </footer>

    </div>
  `);

  const inputArchivo = document.getElementById("firmaArchivo");

  // Campo de texto principal: "Estracto" (acuerdo) o "Estado procesal" (amparo).
  const concepto = document.getElementById(
    esAmparo ? "firmaEstadoProcesal" : "firmaConcepto",
  );

  const campoFojas = document.getElementById("firmaFojas");

  const nombreArchivo = document.getElementById("firmaArchivoNombre");

  const estadoArchivo = document.getElementById("firmaArchivoEstado");

  const botonArchivo = document.getElementById("firmaArchivoBoton");

  const error = document.getElementById("firmaError");

  const confirmar = document.getElementById("confirmarEnvioFirma");

  const mostrarError = (mensaje) => {
    error.textContent = mensaje;

    error.hidden = !mensaje;
  };

  // Nombre del archivo que se enviaría (el nuevo, o el ya guardado).
  const nombreActual = () =>
    pendiente ? pendiente.archivo.name : documentoPrevio?.nombre || "";

  const armarAcuerdo = () => ({
    ...acuerdoActual,

    archivo: nombreActual() || null,

    documentoId: pendiente ? "nuevo" : documentoPrevio?.id || "",

    ...(esAmparo
      ? {
          estadoProcesal: concepto.value.trim(),
          fojas: String(campoFojas?.value ?? "").trim(),
        }
      : { concepto: concepto.value.trim() }),
  });

  const errores = (datos) =>
    esAmparo ? validarRequisitosFirmaAmparo(datos) : validarRequisitosFirma(datos);

  const refrescar = () => {
    const nombre = nombreActual();

    nombreArchivo.textContent = nombre || "Ningún archivo adjunto";

    estadoArchivo.textContent = leyendo
      ? "Leyendo archivo..."
      : !nombre
        ? "Pendiente"
        : "Listo para enviar";

    botonArchivo.textContent = nombre ? "Cambiar archivo" : "Adjuntar archivo";

    confirmar.disabled = leyendo || errores(armarAcuerdo()).length > 0;
  };

  inputArchivo.addEventListener("change", async (evento) => {
    const archivo = evento.target.files?.[0];

    // Si cancela el selector se conserva el archivo anterior.
    if (!archivo) return;

    const problema = validarArchivoDocumento(archivo);

    if (problema) {
      evento.target.value = "";

      mostrarError(problema);

      return;
    }

    mostrarError("");

    leyendo = true;

    refrescar();

    try {
      pendiente = { archivo, dataUrl: await leerComoDataUrl(archivo) };
    } catch (fallo) {
      console.error(fallo);

      mostrarError("No se pudo leer el archivo seleccionado.");
    }

    leyendo = false;

    refrescar();
  });

  concepto.addEventListener("input", () => {
    mostrarError("");

    refrescar();
  });

  campoFojas?.addEventListener("input", () => {
    mostrarError("");

    refrescar();
  });

  document.getElementById("cancelarEnvioFirma")?.addEventListener(
    "click",
    closeForm,
  );

  confirmar.addEventListener("click", () => {
    const datos = armarAcuerdo();

    const faltantes = errores(datos);

    if (faltantes.length) {
      mostrarError(faltantes.join(" "));

      return;
    }

    let documentoId = documentoPrevio?.id || "";

    // El archivo nuevo se guarda hasta confirmar (no quedan huérfanos).
    if (pendiente) {
      const guardado = guardarDocumento(pendiente);

      if (!guardado.ok) {
        mostrarError(
          guardado.error === "cuota"
            ? "No hay espacio suficiente en el navegador para guardar el archivo. Prueba con uno más pequeño."
            : "No se pudo guardar el archivo.",
        );

        return;
      }

      documentoId = guardado.documento.id;
    }

    const resultado = aplicar({ ...datos, documentoId });

    if (!resultado?.ok) {
      if (pendiente) borrarDocumento(documentoId);

      mostrarError(resultado?.error || "No se pudo enviar a firma.");

      return;
    }

    // Reemplazó el archivo anterior: se libera el espacio.
    if (pendiente && documentoPrevio && documentoPrevio.id !== documentoId) {
      borrarDocumento(documentoPrevio.id);
    }

    closeForm();

    alTerminar?.();
  });

  refrescar();
}
