// ============================================================
// PLANTILLAS (pestaña + apartado reutilizable por sección)
// assets/js/modules/mesas/plantillas.js
//
// Un solo componente, dos usos:
//   1. Pestaña "Plantillas": todas las plantillas, filtro por categoría
//      y búsqueda por nombre con la barra global.
//   2. Apartado dentro de Demanda, Promociones, Calificación,
//      Consultas y Oficios: solo su categoría (categoría fija).
//
// Permisos (D4): solo el rol "mesa" sube y borra; los demás descargan.
// ============================================================

import { escapeHTML, formatDate } from "../../utils.js";

import { showModal, closeForm } from "../../forms/formHelper.js";

import { getSession, canManageTemplates } from "../../auth.js";

import { MESAS_CONFIG } from "./config.js";

import { renderVistaPrevia } from "./vistaPrevia.js";

import { coincideExpediente, coincideFecha } from "./filtros.js";

import {
  PLANTILLA_CATEGORIAS,
  etiquetaCategoriaPlantilla,
} from "./catalogos.js";

import {
  listar,
  obtener,
    guardar,
  actualizar,
  borrar,
  validarArchivo,
  leerComoDataUrl,
  extensionDe,
  espacioUsadoBytes,
} from "./plantillasStore.js";

// Categoría elegida en el selector de la pestaña (se conserva en la sesión de la página)
let categoriaFiltro = "";

// ============================================================
// RENDER
// ============================================================

// Pestaña "Plantillas" (se registra en navegacion.js)
export function renderPlantillas() {
  const panel = document.querySelector('[data-mesas-vista="plantillas"]');

  if (panel) {
    montarPlantillasEn(panel, { categoria: "" });
  }
}

// Apartado reutilizable. `categoria` vacía = pestaña completa;
// con valor = categoría fija (apartado dentro de una sección).
export function montarPlantillasEn(contenedor, { categoria = "" } = {}) {
  if (!contenedor) return;

  const fija = Boolean(categoria);

  const pestana = !fija;

  const activa = fija ? categoria : categoriaFiltro;

  // En la pestaña, el texto de la barra global busca por nombre y las
  // fechas filtran por fecha de subida. En los apartados no se aplican.
  const lista = listar({ categoria: activa }).filter(
    (item) =>
      !pestana || (coincideExpediente(item.nombre) && coincideFecha(item.fecha)),
  );

  const puedeGestionar = canManageTemplates();

  contenedor.innerHTML = `
    <section class="mesas-plantillas ${fija ? "mesas-plantillas--seccion" : ""}">

      <header class="mesas-plantillas-header">
        <div>
          <h2>
            <i class="fa-solid fa-folder-open"></i>
            ${fija ? `Plantillas de ${escapeHTML(etiquetaCategoriaPlantilla(categoria))}` : "Plantillas"}
          </h2>
          <p>
            Archivos .docx y .pdf de uso compartido por todas las mesas.
            ${puedeGestionar ? "" : "Solo los secretarios de acuerdos pueden subir o borrar plantillas."}
          </p>
        </div>

        <div class="mesas-plantillas-header-actions">
          ${
            pestana
              ? `
            <label class="mesas-plantillas-filter">
              <span>Categoría</span>
              <select data-plantilla-categoria aria-label="Filtrar por categoría">
                <option value="">Todas las categorías</option>
                ${PLANTILLA_CATEGORIAS.map(
                  (c) =>
                    `<option value="${c.clave}" ${c.clave === categoriaFiltro ? "selected" : ""}>${escapeHTML(c.etiqueta)}</option>`,
                ).join("")}
              </select>
            </label>`
              : ""
          }

          ${
            puedeGestionar
              ? `
            <button type="button" class="mesas-primary-btn" data-plantilla-action="subir">
              <i class="fa-solid fa-cloud-arrow-up"></i>
              Subir plantilla
            </button>`
              : ""
          }
        </div>
      </header>

      ${lista.length ? renderTabla(lista, { mostrarCategoria: pestana, puedeGestionar }) : renderVacio(pestana)}

      ${pestana ? `<p class="mesas-plantillas-uso">Espacio usado por plantillas en este navegador: ${formatoTamano(espacioUsadoBytes())} (prototipo con localStorage).</p>` : ""}

    </section>
  `;

  const refrescar = () => montarPlantillasEn(contenedor, { categoria });

  const selector = contenedor.querySelector("[data-plantilla-categoria]");

  if (selector) {
    selector.onchange = (event) => {
      categoriaFiltro = event.target.value;

      refrescar();
    };
  }

  contenedor.onclick = (event) => {
    const boton = event.target.closest("[data-plantilla-action]");

    if (!boton) return;

    const id = boton.dataset.id;

    switch (boton.dataset.plantillaAction) {
            case "descargar":
        descargarPlantilla(id);

        break;

      case "vista-previa":
        abrirVistaPrevia(id);

        break;

      case "editar":
        abrirEditarPlantilla(id, refrescar);

        break;

      case "subir":
        abrirSubirPlantilla({ categoria, onGuardado: refrescar });

        break;

      case "borrar":
        abrirBorrarPlantilla(id, refrescar);

        break;
    }
  };
}

function renderTabla(lista, { mostrarCategoria, puedeGestionar }) {
  const filas = lista
    .map(
      (item) => `
        <tr>
          <td>
            <div class="mesas-plantilla-nombre">
              <i class="fa-regular ${item.tipoArchivo === "pdf" ? "fa-file-pdf pdf" : "fa-file-word docx"}"></i>
              <div>
                <strong>${escapeHTML(item.nombre)}</strong>
                <span>${escapeHTML(item.nombreArchivo)}</span>
              </div>
            </div>
          </td>
          ${
            mostrarCategoria
              ? `<td><span class="mesas-plantilla-categoria">${escapeHTML(etiquetaCategoriaPlantilla(item.categoria))}</span></td>`
              : ""
          }
          <td>${escapeHTML(String(item.tipoArchivo || "").toUpperCase())}</td>
          <td>${escapeHTML(formatoTamano(item.tamano))}</td>
          <td>${escapeHTML(item.subidoPor)}</td>
          <td>${escapeHTML(formatDate(item.fecha))}</td>
          <td>
            <div class="mesas-actions">
                            <button type="button" class="mesas-secondary-btn"
                data-plantilla-action="vista-previa" data-id="${escapeHTML(item.id)}">
                <i class="fa-regular fa-eye"></i>
                Vista previa
              </button>
              ${
                puedeGestionar
                  ? `
                <button type="button" class="mesas-secondary-btn"
                  data-plantilla-action="editar" data-id="${escapeHTML(item.id)}">
                  <i class="fa-solid fa-pen"></i>
                  Editar
                </button>`
                  : ""
              }
              <button type="button" class="mesas-secondary-btn"
                data-plantilla-action="descargar" data-id="${escapeHTML(item.id)}">
                <i class="fa-solid fa-download"></i>
                Descargar
              </button>
              ${
                puedeGestionar
                  ? `
                <button type="button" class="mesas-secondary-btn danger"
                  data-plantilla-action="borrar" data-id="${escapeHTML(item.id)}">
                  <i class="fa-regular fa-trash-can"></i>
                  Borrar
                </button>`
                  : ""
              }
            </div>
          </td>
        </tr>
      `,
    )
    .join("");

  return `
    <div class="mesas-table-wrapper">
      <table class="mesas-secretaria-table mesas-plantillas-table">
        <thead>
          <tr>
            <th>Nombre</th>
            ${mostrarCategoria ? "<th>Categoría</th>" : ""}
            <th>Tipo</th>
            <th>Tamaño</th>
            <th>Subida por</th>
            <th>Fecha</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;
}

function renderVacio(pestana) {
  return `
    <div class="mesas-empty-state">
      <div class="mesas-empty-icon"><i class="fa-regular fa-folder-open"></i></div>
      <strong>No hay plantillas${pestana ? " con estos filtros" : " en esta categoría"}</strong>
      <span>${canManageTemplates() ? "Usa \"Subir plantilla\" para agregar la primera." : "Un secretario de acuerdos puede subir plantillas."}</span>
    </div>
  `;
}

// ============================================================
// DESCARGAR
// ============================================================

function descargarPlantilla(id) {
  const plantilla = obtener(id);

  if (!plantilla) return;

  const blob = dataUrlABlob(plantilla.dataUrl);

  if (!blob) {
    window.alert("No se pudo leer el archivo de la plantilla.");

    return;
  }

  const url = URL.createObjectURL(blob);

  const enlace = document.createElement("a");

  enlace.href = url;

  enlace.download = plantilla.nombreArchivo || `${plantilla.nombre}.${plantilla.tipoArchivo}`;

  document.body.appendChild(enlace);

  enlace.click();

  enlace.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Reconstruye el archivo original (mismos bytes) desde el dataUrl.
function dataUrlABlob(dataUrl) {
  try {
    const [cabecera, base64] = String(dataUrl).split(",");

    const tipo = cabecera.match(/data:([^;]+)/)?.[1] || "application/octet-stream";

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

// ============================================================
// SUBIR (modal)
// ============================================================

function abrirSubirPlantilla({ categoria = "", onGuardado }) {
  // Defensa: aunque alguien llame esta función, solo el rol "mesa" sube
  if (!canManageTemplates()) return;

  const fija = Boolean(categoria);

  showModal(`
    <div class="mesas-modal-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-cloud-arrow-up"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Subir plantilla</h2>
          <p>Archivos .docx o .pdf de hasta ${MESAS_CONFIG.PLANTILLA_MAX_MB} MB.</p>
        </div>
      </header>

      <div class="mesas-modal-body">
        <label class="mesas-plantillas-field">
          <span>Nombre de la plantilla</span>
          <input type="text" id="plantillaNombre" maxlength="120" autocomplete="off"
            placeholder="Ej. Acuerdo de admisión de demanda">
        </label>

        <label class="mesas-plantillas-field">
          <span>Categoría</span>
          <select id="plantillaCategoria" ${fija ? "disabled" : ""}>
            ${
              fija
                ? ""
                : `<option value="">Selecciona una categoría...</option>`
            }
            ${PLANTILLA_CATEGORIAS.map(
              (c) =>
                `<option value="${c.clave}" ${c.clave === categoria ? "selected" : ""}>${escapeHTML(c.etiqueta)}</option>`,
            ).join("")}
          </select>
        </label>

        <label class="mesas-upload-area" for="plantillaArchivo">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <strong>Selecciona un archivo</strong>
          <span>DOCX o PDF</span>
          <input type="file" id="plantillaArchivo" accept=".docx,.pdf" hidden>
        </label>

        <div class="mesas-upload-help" id="plantillaArchivoNombre">
          Ningún archivo seleccionado.
        </div>

        <p class="mesas-form-error" id="plantillaError" hidden></p>
      </div>

      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="plantillaCancelar">Cancelar</button>
        <button type="button" class="mesas-modal-confirm" id="plantillaGuardar">
          <i class="fa-solid fa-floppy-disk"></i>
          Guardar plantilla
        </button>
      </footer>
    </div>
  `);

  const $ = (id) => document.getElementById(id);

  const mostrarError = (mensaje) => {
    const error = $("plantillaError");

    error.textContent = mensaje;

    error.hidden = !mensaje;
  };

  $("plantillaCancelar").onclick = closeForm;

  $("plantillaArchivo").onchange = (event) => {
    const archivo = event.target.files?.[0];

    $("plantillaArchivoNombre").textContent = archivo
      ? `Archivo: ${archivo.name} (${formatoTamano(archivo.size)})`
      : "Ningún archivo seleccionado.";

    // Sugiere el nombre a partir del archivo si el campo está vacío
    if (archivo && !$("plantillaNombre").value.trim()) {
      $("plantillaNombre").value = archivo.name.replace(/\.[^.]+$/, "");
    }

    mostrarError(archivo ? validarArchivo(archivo) : "");
  };

  $("plantillaGuardar").onclick = async () => {
    const nombre = $("plantillaNombre").value.trim();

    const categoriaElegida = fija ? categoria : $("plantillaCategoria").value;

    const archivo = $("plantillaArchivo").files?.[0];

    if (!nombre) return mostrarError("Escribe el nombre de la plantilla.");

    if (!categoriaElegida) return mostrarError("Selecciona una categoría.");

    const errorArchivo = validarArchivo(archivo);

    if (errorArchivo) return mostrarError(errorArchivo);

    mostrarError("");

    const boton = $("plantillaGuardar");

    boton.disabled = true;

    try {
      const dataUrl = await leerComoDataUrl(archivo);

      const resultado = guardar({
        nombre,
        categoria: categoriaElegida,
        archivo,
        dataUrl,
        subidoPor: getSession()?.nombre,
      });

      if (!resultado.ok) {
        boton.disabled = false;

        return mostrarError(
          resultado.error === "cuota"
            ? "El almacenamiento del navegador está lleno. Borra plantillas que ya no uses o sube un archivo más pequeño."
            : "No se pudo guardar la plantilla. Inténtalo de nuevo.",
        );
      }

      closeForm();

      onGuardado?.();
    } catch (error) {
      console.error(error);

      boton.disabled = false;

      mostrarError("No se pudo leer el archivo seleccionado.");
    }
  };
}

// ============================================================
// EDITAR (nombre, categoría y/o reemplazar el archivo)
// Solo el rol "mesa". No edita el contenido del documento.
// ============================================================

function abrirEditarPlantilla(id, onGuardado) {
  if (!canManageTemplates()) return;

  const plantilla = obtener(id);

  if (!plantilla) return;

  showModal(`
    <div class="mesas-modal-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-pen"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Editar plantilla</h2>
          <p>Archivo actual: ${escapeHTML(plantilla.nombreArchivo)}</p>
        </div>
      </header>

      <div class="mesas-modal-body">
        <label class="mesas-plantillas-field">
          <span>Nombre de la plantilla</span>
          <input type="text" id="plantillaEditNombre" maxlength="120"
            autocomplete="off" value="${escapeHTML(plantilla.nombre)}">
        </label>

        <label class="mesas-plantillas-field">
          <span>Categoría</span>
          <select id="plantillaEditCategoria">
            ${PLANTILLA_CATEGORIAS.map(
              (c) =>
                `<option value="${c.clave}" ${c.clave === plantilla.categoria ? "selected" : ""}>${escapeHTML(c.etiqueta)}</option>`,
            ).join("")}
          </select>
        </label>

        <label class="mesas-upload-area" for="plantillaEditArchivo">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <strong>Reemplazar archivo (opcional)</strong>
          <span>DOCX o PDF</span>
          <input type="file" id="plantillaEditArchivo" accept=".docx,.pdf" hidden>
        </label>

        <div class="mesas-upload-help" id="plantillaEditArchivoNombre">
          Se conserva el archivo actual.
        </div>

        <p class="mesas-form-error" id="plantillaEditError" hidden></p>
      </div>

      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="plantillaEditCancelar">Cancelar</button>
        <button type="button" class="mesas-modal-confirm" id="plantillaEditGuardar">
          <i class="fa-solid fa-floppy-disk"></i>
          Guardar cambios
        </button>
      </footer>
    </div>
  `);

  const $ = (idEl) => document.getElementById(idEl);

  const mostrarError = (mensaje) => {
    $("plantillaEditError").textContent = mensaje;

    $("plantillaEditError").hidden = !mensaje;
  };

  $("plantillaEditCancelar").onclick = closeForm;

  $("plantillaEditArchivo").onchange = (event) => {
    const archivo = event.target.files?.[0];

    $("plantillaEditArchivoNombre").textContent = archivo
      ? `Nuevo archivo: ${archivo.name} (${formatoTamano(archivo.size)})`
      : "Se conserva el archivo actual.";

    mostrarError(archivo ? validarArchivo(archivo) : "");
  };

  $("plantillaEditGuardar").onclick = async () => {
    const nombre = $("plantillaEditNombre").value.trim();

    const archivo = $("plantillaEditArchivo").files?.[0];

    if (!nombre) return mostrarError("Escribe el nombre de la plantilla.");

    if (archivo) {
      const errorArchivo = validarArchivo(archivo);

      if (errorArchivo) return mostrarError(errorArchivo);
    }

    const boton = $("plantillaEditGuardar");

    boton.disabled = true;

    try {
      const dataUrl = archivo ? await leerComoDataUrl(archivo) : "";

      const resultado = actualizar(id, {
        nombre,
        categoria: $("plantillaEditCategoria").value,
        archivo,
        dataUrl,
      });

      if (!resultado.ok) {
        boton.disabled = false;

        return mostrarError(
          "No se pudo guardar. El almacenamiento del navegador puede estar lleno.",
        );
      }

      closeForm();

      onGuardado?.();
    } catch (error) {
      console.error(error);

      boton.disabled = false;

      mostrarError("No se pudo leer el archivo seleccionado.");
    }
  };
}

// ============================================================
// VISTA PREVIA (primera página del documento, estilo Google Docs)
// El dibujo vive en vistaPrevia.js (PDF con pdf.js, Word con lector propio).
// ============================================================

async function abrirVistaPrevia(id) {
  const plantilla = obtener(id);

  if (!plantilla) return;

  const blob = dataUrlABlob(plantilla.dataUrl);

  showModal(`
    <div class="mesas-modal-shell mesas-plantilla-preview-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-regular fa-eye"></i></div>
        <div class="mesas-modal-header-text">
          <h2>${escapeHTML(plantilla.nombre)}</h2>
          <p>${escapeHTML(plantilla.nombreArchivo)} · vista previa</p>
        </div>
      </header>

      <div class="mesas-modal-body">
        <div id="plantillaPreviewCuerpo" class="mesas-plantilla-preview">
          <p class="mesas-preview-loading">Cargando vista previa...</p>
        </div>
      </div>

      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="plantillaPreviewCerrar">Cerrar</button>
      </footer>
    </div>
  `);

  document.getElementById("plantillaPreviewCerrar").onclick = closeForm;

  const cuerpo = document.getElementById("plantillaPreviewCuerpo");

  if (!blob) {
    cuerpo.textContent = "No se pudo leer el archivo de la plantilla.";

    return;
  }

  await renderVistaPrevia(cuerpo, plantilla, blob);
}

// ============================================================
// BORRAR (con confirmación)
// ============================================================

function abrirBorrarPlantilla(id, onBorrado) {
  if (!canManageTemplates()) return;

  const plantilla = obtener(id);

  if (!plantilla) return;

  showModal(`
    <div class="mesas-modal-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step danger"><i class="fa-regular fa-trash-can"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Borrar plantilla</h2>
          <p>Esta acción no se puede deshacer.</p>
        </div>
      </header>

      <div class="mesas-modal-body">
        <div class="mesas-modal-message">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>
            ¿Seguro que quieres borrar la plantilla
            <strong>${escapeHTML(plantilla.nombre)}</strong>
            (${escapeHTML(extensionDe(plantilla.nombreArchivo).toUpperCase())})?
            Dejará de estar disponible para todas las mesas.
          </span>
        </div>
      </div>

      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="plantillaBorrarCancelar">Cancelar</button>
        <button type="button" class="mesas-modal-confirm danger" id="plantillaBorrarConfirmar">
          <i class="fa-regular fa-trash-can"></i>
          Borrar plantilla
        </button>
      </footer>
    </div>
  `);

  document.getElementById("plantillaBorrarCancelar").onclick = closeForm;

  document.getElementById("plantillaBorrarConfirmar").onclick = () => {
    borrar(id);

    closeForm();

    onBorrado?.();
  };
}

// ============================================================
// HELPERS
// ============================================================

function formatoTamano(bytes) {
  const n = Number(bytes) || 0;

  if (n < 1024) return `${n} B`;

  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;

  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
