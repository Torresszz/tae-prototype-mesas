// ============================================================
// CUADERNILLO DE AMPARO DIRECTO (apartado propio)
// assets/js/modules/amparosDirectos/cuadernillo.js
//
// Cada amparo directo tiene un cuadernillo con 9 secciones fijas.
// Una sección se considera "checked" (cumplida) solo cuando el
// usuario sube un documento en ella; ya no basta con marcar una
// casilla. El cuadernillo completo es requisito para enviar el
// amparo a Archivo (lo valida mesasAmparos.js).
//
// Además hay un campo de OBSERVACIONES: es solo para el usuario y
// no forma parte del cuadernillo.
//
// Se guarda en el seguimiento del amparo:
//   seg.cuadernillo = {
//     docs: { [idSeccion]: { documentoId, archivo, subidoEn, subidoPor } },
//     observaciones: "texto",
//     oficiosTC: [...]   // dato anterior; ya no se muestra
//   }
// Los archivos viven en el almacén de documentos de Mesas
// ("mesasDocumentosFirma"), igual que los documentos para firma.
// ============================================================

import { escapeHTML } from "../../utils.js";

import { showModal, closeForm } from "../../forms/formHelper.js";

import {
  obtenerDocumento,
  guardarDocumento,
  borrarDocumento,
  validarArchivoDocumento,
  leerComoDataUrl,
  htmlVistaPreviaDocumento,
  activarVistasPreviasDocumento,
  sembrarDocumentoDemo,
  DOCUMENTO_MAX_MB,
} from "../mesas/documentosFirma.js";

import {
  amparosDirectos,
  obtenerAmparo,
  actualizarSeg,
  logSeg,
  nombreUsuario,
  quejosoDe,
  formatFecha,
} from "./datos.js";

// Secciones del cuadernillo (siempre las mismas, en este orden).
export const DOCS_CUADERNILLO = [
  {
    id: "copia-acto-reclamado",
    texto: "Copia del laudo o del acuerdo (copia del acto reclamado)",
  },
  { id: "notificaciones", texto: "Notificaciones" },
  { id: "acuerdo-radicacion", texto: "Acuerdo de radicación" },
  {
    id: "notificaciones-radicacion",
    texto: "Notificaciones del acuerdo de radicación",
  },
  { id: "informe-justificado", texto: "Informe Justificado" },
  { id: "certificacion", texto: "Certificación" },
  { id: "acuerdo-admision-tcc", texto: "Acuerdo de admisión del TCC" },
  { id: "copia-demanda", texto: "Copia de la demanda de amparo directo" },
  { id: "copia-radicacion", texto: "Copia de la radicación" },
];

// ------------------------------------------------------------
// DATOS
// ------------------------------------------------------------
export function cuadernilloDe(seg) {
  if (!seg.cuadernillo || typeof seg.cuadernillo !== "object") {
    seg.cuadernillo = {};
  }

  const cuad = seg.cuadernillo;

  if (!Array.isArray(cuad.oficiosTC)) cuad.oficiosTC = [];
  if (!cuad.docs || typeof cuad.docs !== "object") cuad.docs = {};
  if (typeof cuad.observaciones !== "string") cuad.observaciones = "";

  return cuad;
}

// Una sección está cumplida si tiene un documento que sigue guardado.
export function seccionCumplida(seg, idSeccion) {
  const doc = seg?.cuadernillo?.docs?.[idSeccion];

  return Boolean(doc?.documentoId && obtenerDocumento(doc.documentoId));
}

export function progresoCuadernillo(seg) {
  const cargados = DOCS_CUADERNILLO.filter((doc) =>
    seccionCumplida(seg, doc.id),
  ).length;

  return {
    cargados,
    total: DOCS_CUADERNILLO.length,
    completo: cargados === DOCS_CUADERNILLO.length,
  };
}

export function cuadernilloCompleto(seg) {
  return progresoCuadernillo(seg).completo;
}

// Demostración: llena las primeras `cantidad` secciones con archivos de muestra.
export function sembrarCuadernilloDemo(seg, amparoId, cantidad) {
  const cuad = cuadernilloDe(seg);

  DOCS_CUADERNILLO.slice(0, cantidad).forEach((doc) => {
    const archivo = sembrarDocumentoDemo(
      "demanda",
      `demo-doc-cuad-${amparoId}-${doc.id}`,
      { nombreBase: `${doc.id}_${amparoId}`, concepto: doc.texto },
    );

    if (!archivo) return;

    cuad.docs[doc.id] = {
      documentoId: archivo.documentoId,
      archivo: archivo.archivo,
      subidoEn: new Date().toISOString(),
      subidoPor: "Demostración",
    };
  });
}

// Resumen de solo lectura (amparo concluido) / avance dentro del modal.
export function htmlResumenCuadernillo(seg, { conBoton = true } = {}) {
  const { cargados, total, completo } = progresoCuadernillo(seg);

  return `
    <section class="mampd-cuad-resumen">
      <div>
        <strong><i class="fa-solid fa-folder-open"></i> Cuadernillo</strong>
        <span>${cargados} de ${total} documentos cargados${completo ? " · completo" : ""}</span>
      </div>
      ${
        conBoton
          ? `<button type="button" class="mesas-secondary-btn" data-mamp-act="cuad-abrir">
               <i class="fa-solid fa-folder-open"></i> Abrir cuadernillo
             </button>`
          : ""
      }
    </section>`;
}

// ------------------------------------------------------------
// MODAL DEL CUADERNILLO
// opciones: { alCambiar } se llama tras cada cambio para repintar
// la página de fondo.
//           { soloSeccion } (opcional) id de una sección: el modal muestra
// solo esa (p. ej. "informe-justificado" desde "Pendiente de enviar al
// TCC"). Es el mismo dato del cuadernillo: lo subido aquí cuenta allá.
// ------------------------------------------------------------
export function abrirCuadernillo(id, opciones = {}) {
  const datos = obtenerAmparo(id);

  if (!datos) return;

  const { amparo, seg } = datos;

  const cuad = cuadernilloDe(seg);

  const progreso = progresoCuadernillo(seg);

  const porcentaje = Math.round((progreso.cargados / progreso.total) * 100);

  const solo = opciones.soloSeccion || "";

  const secciones = solo
    ? DOCS_CUADERNILLO.filter((doc) => doc.id === solo)
    : DOCS_CUADERNILLO;

  const filas = secciones.map((doc) => {
    const indice = DOCS_CUADERNILLO.indexOf(doc);

    const registro = cuad.docs[doc.id];

    const cumplida = seccionCumplida(seg, doc.id);

    return `
      <li class="mampd-cuad-doc ${cumplida ? "ok" : ""}" data-seccion="${doc.id}">
        <div class="mampd-cuad-doc-main">
          <span class="mampd-cuad-check ${cumplida ? "ok" : ""}" aria-hidden="true">
            <i class="fa-solid ${cumplida ? "fa-check" : "fa-minus"}"></i>
          </span>
          <div>
            <strong>${solo ? "" : `${indice + 1}. `}${escapeHTML(doc.texto)}</strong>
            <small>
              ${
                cumplida
                  ? `${escapeHTML(registro.archivo || "Documento")} · ${escapeHTML(registro.subidoPor || "—")} · ${escapeHTML(formatFecha(registro.subidoEn))}`
                  : "Sin documento: sube el archivo para cumplir esta sección."
              }
            </small>
          </div>
        </div>

        <div class="mampd-cuad-doc-actions">
          <label class="mesas-secondary-btn mampd-upload-btn" for="cuadArchivo-${doc.id}">
            <i class="fa-solid fa-paperclip"></i>
            ${cumplida ? "Reemplazar" : "Subir documento"}
            <input type="file" id="cuadArchivo-${doc.id}" data-cuad-archivo="${doc.id}" accept=".pdf,.docx" hidden>
          </label>
          ${
            cumplida
              ? `
          <button type="button" class="mesas-secondary-btn" data-cuad-accion="ver" data-seccion="${doc.id}">
            <i class="fa-regular fa-eye"></i> Ver
          </button>
          <button type="button" class="mesas-secondary-btn" data-doc-descargar="${escapeHTML(registro.documentoId)}">
            <i class="fa-solid fa-download"></i> Descargar
          </button>
          <button type="button" class="mesas-secondary-btn danger" data-cuad-accion="quitar" data-seccion="${doc.id}">
            <i class="fa-regular fa-trash-can"></i> Quitar
          </button>`
              : ""
          }
        </div>
      </li>`;
  }).join("");

  showModal(`
    <div class="mesas-modal-shell mampd-cuad-modal" id="mampdCuadModal">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-folder-open"></i></div>
        <div class="mesas-modal-header-text">
          <h2>${solo ? escapeHTML(secciones[0]?.texto || "Sección") : "Cuadernillo"} · Amparo ${escapeHTML(amparo.id)}</h2>
          <p>Expediente ${escapeHTML(amparo.expediente || "—")} · ${escapeHTML(quejosoDe(amparo, seg))}</p>
        </div>
      </header>

      <div class="mesas-modal-body">
        <p class="mamp-note">
          ${
            solo
              ? `Sube el documento (.pdf o .docx, máx. ${DOCUMENTO_MAX_MB} MB). También se cuenta en el cuadernillo del amparo.`
              : `Sube un documento en cada sección (.pdf o .docx, máx. ${DOCUMENTO_MAX_MB} MB).
          Una sección se marca como cumplida solo cuando tiene su archivo.`
          }
        </p>

        ${
          solo
            ? ""
            : `<div class="mampd-progreso" aria-label="Avance del cuadernillo">
          <div class="mampd-progreso-texto">
            <strong>${progreso.cargados} de ${progreso.total}</strong> documentos cargados
            ${progreso.completo ? " · <b>cuadernillo completo</b>" : ""}
          </div>
          <div class="mampd-progreso-barra"><span style="width:${porcentaje}%"></span></div>
        </div>`
        }

        <ul class="mampd-cuad-docs">${filas}</ul>

        ${
          solo
            ? ""
            : `        <section class="mampd-obs">
          <label for="mampdCuadObs">
            <strong>Observaciones</strong>
            <small>Solo para uso del usuario: no forman parte del cuadernillo.</small>
          </label>
          <textarea id="mampdCuadObs" rows="4" placeholder="Notas internas sobre este cuadernillo...">${escapeHTML(cuad.observaciones || "")}</textarea>
          <div class="mampd-obs-acciones">
            <button type="button" class="mesas-secondary-btn" data-cuad-accion="guardar-obs">
              <i class="fa-solid fa-floppy-disk"></i> Guardar observaciones
            </button>
            <span class="mampd-obs-ok" id="mampdObsOk" hidden>Observaciones guardadas.</span>
          </div>
        </section>`
        }

        <p class="mesas-form-error" id="mampdCuadError" hidden></p>
      </div>

      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="mampdCuadCerrar">Cerrar</button>
      </footer>
    </div>
  `);

  const modal = document.getElementById("mampdCuadModal");

  const mostrarError = (mensaje) => {
    const caja = modal.querySelector("#mampdCuadError");

    caja.textContent = mensaje;

    caja.hidden = !mensaje;
  };

  const reabrir = () => {
    opciones.alCambiar?.();

    abrirCuadernillo(id, opciones);
  };

  modal.querySelector("#mampdCuadCerrar").onclick = () => {
    closeForm();

    opciones.alCambiar?.();
  };

  // Subir / reemplazar documento de una sección
  modal.addEventListener("change", async (evento) => {
    const input = evento.target.closest("[data-cuad-archivo]");

    if (!input) return;

    const archivo = input.files?.[0];

    if (!archivo) return;

    const problema = validarArchivoDocumento(archivo);

    if (problema) {
      input.value = "";

      return mostrarError(problema);
    }

    mostrarError("");

    let dataUrl = "";

    try {
      dataUrl = await leerComoDataUrl(archivo);
    } catch (fallo) {
      console.error(fallo);

      return mostrarError("No se pudo leer el archivo seleccionado.");
    }

    const guardado = guardarDocumento({ archivo, dataUrl });

    if (!guardado.ok) {
      return mostrarError(
        guardado.error === "cuota"
          ? "No hay espacio suficiente en el navegador para guardar el archivo. Prueba con uno más pequeño."
          : "No se pudo guardar el archivo.",
      );
    }

    const seccion = DOCS_CUADERNILLO.find(
      (doc) => doc.id === input.dataset.cuadArchivo,
    );

    let previoId = "";

    actualizarSeg(id, (s) => {
      const c = cuadernilloDe(s);

      previoId = c.docs[seccion.id]?.documentoId || "";

      c.docs[seccion.id] = {
        documentoId: guardado.documento.id,
        archivo: archivo.name,
        subidoEn: new Date().toISOString(),
        subidoPor: nombreUsuario(),
      };

      logSeg(s, `Cuadernillo: documento cargado en «${seccion.texto}» (${archivo.name})`);
    });

    // Reemplazó un archivo anterior: se libera el espacio.
    if (previoId) borrarDocumento(previoId);

    reabrir();
  });

  modal.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-cuad-accion]");

    if (!boton) return;

    const seccion = DOCS_CUADERNILLO.find(
      (doc) => doc.id === boton.dataset.seccion,
    );

    switch (boton.dataset.cuadAccion) {
      case "ver":
        verDocumento(id, seccion, opciones);

        break;

      case "quitar": {
        if (
          !window.confirm(
            `¿Quitar el documento de «${seccion.texto}»? La sección quedará pendiente.`,
          )
        ) {
          return;
        }

        let documentoId = "";

        actualizarSeg(id, (s) => {
          const c = cuadernilloDe(s);

          documentoId = c.docs[seccion.id]?.documentoId || "";

          delete c.docs[seccion.id];

          logSeg(s, `Cuadernillo: documento retirado de «${seccion.texto}»`);
        });

        if (documentoId) borrarDocumento(documentoId);

        reabrir();

        break;
      }

      case "guardar-obs":
        actualizarSeg(id, (s) => {
          cuadernilloDe(s).observaciones = modal
            .querySelector("#mampdCuadObs")
            .value.trim();
        });

        modal.querySelector("#mampdObsOk").hidden = false;

        break;
    }
  });
}

// Vista previa de un documento del cuadernillo (con botón para volver).
function verDocumento(id, seccion, opciones) {
  const datos = obtenerAmparo(id);

  const registro = datos?.seg?.cuadernillo?.docs?.[seccion.id];

  if (!registro) return;

  showModal(`
    <div class="mesas-modal-shell mesas-plantilla-preview-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-regular fa-eye"></i></div>
        <div class="mesas-modal-header-text">
          <h2>${escapeHTML(seccion.texto)}</h2>
          <p>Amparo ${escapeHTML(id)} · ${escapeHTML(registro.archivo || "")} · vista previa</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        ${htmlVistaPreviaDocumento({ documentoId: registro.documentoId })}
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="mampdVolverCuad">
          <i class="fa-solid fa-arrow-left"></i> Volver al cuadernillo
        </button>
      </footer>
    </div>
  `);

  document.getElementById("mampdVolverCuad").onclick = () =>
    abrirCuadernillo(id, opciones);

  activarVistasPreviasDocumento(document.getElementById("modalContent"));
}

// ------------------------------------------------------------
// APARTADO "CUADERNILLOS" (pestaña de la página de Amparos Directos)
// deps: { nombreEtapa(seg), alCambiar() }
// ------------------------------------------------------------
let busqueda = "";

export function renderCuadernillos(host, deps = {}) {
  if (!host) return;

  const registros = amparosDirectos().filter(({ amparo, seg }) =>
    [amparo.id, amparo.expediente, amparo.promovente, seg.quejoso]
      .join(" ")
      .toLowerCase()
      .includes(busqueda),
  );

  const completos = registros.filter(({ seg }) => cuadernilloCompleto(seg)).length;

  host.innerHTML = `
    <section class="mesas-fase4-section">
      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Cuadernillos</span>
          <h2>Cuadernillos de amparos directos</h2>
          <p>
            Cada cuadernillo tiene ${DOCS_CUADERNILLO.length} secciones y se completa subiendo
            un documento en cada una. ${completos} de ${registros.length} completos.
          </p>
        </div>
      </div>

      <div class="mesas-secretaria-toolbar">
        <div class="mesas-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input id="mampdCuadSearch" type="search" value="${escapeHTML(busqueda)}"
            placeholder="Buscar amparo, expediente o quejoso..." autocomplete="off">
        </div>
      </div>

      <section class="mesas-secretaria-table-card">
        ${
          registros.length
            ? `
        <div class="mesas-table-wrapper">
          <table class="mesas-secretaria-table">
            <thead>
              <tr>
                <th>Amparo</th><th>Expediente</th><th>Quejoso</th><th>Etapa</th>
                <th>Documentos</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${registros
                .map(({ amparo, seg }) => {
                  const p = progresoCuadernillo(seg);

                  return `
                <tr>
                  <td><span class="mesas-expediente-number">${escapeHTML(amparo.id)}</span></td>
                  <td>${escapeHTML(amparo.expediente || "—")}</td>
                  <td>${escapeHTML(quejosoDe(amparo, seg))}</td>
                  <td>${escapeHTML(deps.nombreEtapa ? deps.nombreEtapa(seg) : seg.etapa)}</td>
                  <td>
                    <div class="mampd-mini-progreso">
                      <span>${p.cargados}/${p.total}</span>
                      <div class="mampd-progreso-barra"><span style="width:${Math.round((p.cargados / p.total) * 100)}%"></span></div>
                    </div>
                  </td>
                  <td>
                    <span class="mesas-stage-badge ${p.completo ? "mamp-ok" : "acuerdo"}">
                      ${p.completo ? "Completo" : "Incompleto"}
                    </span>
                  </td>
                  <td>
                    <div class="mesas-actions">
                      <button type="button" class="mesas-primary-btn" data-cuad-abrir="${escapeHTML(amparo.id)}">
                        <i class="fa-solid fa-folder-open"></i> Abrir cuadernillo
                      </button>
                    </div>
                  </td>
                </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>`
            : `
        <div class="mesas-empty-state">
          <div class="mesas-empty-icon"><i class="fa-solid fa-folder-open"></i></div>
          <strong>No hay cuadernillos en esta vista</strong>
          <span>Aparecen aquí los amparos directos registrados.</span>
        </div>`
        }
      </section>
    </section>
  `;

  const buscador = host.querySelector("#mampdCuadSearch");

  buscador.oninput = (evento) => {
    busqueda = evento.target.value.trim().toLowerCase();

    renderCuadernillos(host, deps);

    const nuevo = host.querySelector("#mampdCuadSearch");

    nuevo.focus();

    nuevo.setSelectionRange(nuevo.value.length, nuevo.value.length);
  };

  host.onclick = (evento) => {
    const boton = evento.target.closest("[data-cuad-abrir]");

    if (boton) {
      abrirCuadernillo(boton.dataset.cuadAbrir, {
        alCambiar: deps.alCambiar,
      });
    }
  };
}
