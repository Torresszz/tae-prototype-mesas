// ============================================================
// FIRMA DE AMPAROS DIRECTOS (Mesa de Amparos -> Presidencia)
// assets/js/modules/amparosDirectos/firma.js
//
// Flujo (igual que en Secretaría de Acuerdos):
//   1. La Mesa de Amparos Directos pulsa "Enviar a firma" en un amparo
//      y captura: el documento (.pdf/.docx), el ESTADO PROCESAL
//      (texto manual) y la cantidad de FOJAS del documento.
//   2. La Magistrada lo ve en la tarjeta "Amparos directos por
//      firmar" de su página de Mesas, revisa el documento y firma.
//   3. Lo firmado queda pendiente de lista (ver listas.js).
//
// Cada envío es un registro dentro del seguimiento del amparo:
//   seg.firmas = [{
//     id, documentoId, archivo, estadoProcesal, fojas,
//     estado: "en-firma" | "firmado",
//     enviadoEn, enviadoPor, firmadoEn?, firmadoPor?,
//     listaId?, listaNumero?   // al publicarse en una lista
//   }]
// Un amparo puede tener varios envíos (de ahí que una fila de la
// lista pueda traer varios estados procesales).
// ============================================================

import { createId, escapeHTML } from "../../utils.js";

import { showModal, closeForm } from "../../forms/formHelper.js";

import { canSign } from "../../auth.js";

import {
  abrirEnvioFirma,
  abrirVistaPreviaDocumento,
  sembrarDocumentoDemo,
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

export const ESTADO_EN_FIRMA = "en-firma";
export const ESTADO_FIRMADO = "firmado";

export function firmasDe(seg) {
  return Array.isArray(seg?.firmas) ? seg.firmas : [];
}

function etiquetaEstado(firma) {
  if (firma.listaNumero) return `Listado · lista #${firma.listaNumero}`;

  return firma.estado === ESTADO_FIRMADO ? "Firmado" : "En firma";
}

// ------------------------------------------------------------
// CAJA DENTRO DEL MODAL DEL AMPARO (lado de la Mesa de Amparos)
// ------------------------------------------------------------
export function htmlCajaFirma(seg, { final = false } = {}) {
  const firmas = firmasDe(seg);

  const pendiente = firmas.some((f) => f.estado === ESTADO_EN_FIRMA);

  return `
    <section class="mampd-firma-box">
      <header>
        <strong><i class="fa-solid fa-file-signature"></i> Firma de Presidencia</strong>
        ${
          final
            ? ""
            : `<button type="button" class="mesas-secondary-btn" data-mamp-act="firma-enviar"
                 ${pendiente ? "disabled" : ""}
                 title="${pendiente ? "Ya hay un documento esperando la firma de la Magistrada" : "Enviar documento a firma"}">
                 <i class="fa-solid fa-paper-plane"></i> Enviar a firma
               </button>`
        }
      </header>

      ${
        firmas.length
          ? `<ul class="mampd-firma-list">
              ${firmas
                .map(
                  (f) => `
                <li>
                  <span class="mesas-stage-badge ${f.estado === ESTADO_FIRMADO ? "mamp-ok" : "acuerdo"}">${escapeHTML(etiquetaEstado(f))}</span>
                  <div>
                    <strong>${escapeHTML(f.estadoProcesal || "—")}</strong>
                    <small>
                      ${escapeHTML(f.archivo || "Documento")} · ${escapeHTML(String(f.fojas ?? "—"))} fojas ·
                      enviado ${escapeHTML(formatFecha(f.enviadoEn))}
                      ${f.firmadoEn ? ` · firmado ${escapeHTML(formatFecha(f.firmadoEn))}` : ""}
                    </small>
                  </div>
                  <button type="button" class="mesas-secondary-btn" data-mamp-act="firma-ver" data-docid="${escapeHTML(f.documentoId)}">
                    <i class="fa-regular fa-eye"></i> Ver documento
                  </button>
                </li>`,
                )
                .join("")}
            </ul>`
          : `<p class="mamp-note">Aún no se ha enviado ningún documento a firma de la Magistrada.</p>`
      }
    </section>`;
}

// Vista previa del documento enviado (sin la etiqueta "Acuerdo").
export function verDocumentoFirma(documentoId) {
  abrirVistaPreviaDocumento({ documentoId, concepto: "" });
}

// ------------------------------------------------------------
// ENVIAR A FIRMA
// ------------------------------------------------------------
export function enviarAFirma(id, { alTerminar } = {}) {
  const datos = obtenerAmparo(id);

  if (!datos) return;

  abrirEnvioFirma({
    modo: "amparo",
    referencia: `Amparo directo ${datos.amparo.id} · Expediente ${datos.amparo.expediente || "—"}`,
    acuerdo: null,
    aplicar: (envio) => {
      const guardado = actualizarSeg(id, (seg) => {
        seg.firmas = firmasDe(seg);

        seg.firmas.push({
          id: createId(),
          documentoId: envio.documentoId,
          archivo: envio.archivo,
          estadoProcesal: envio.estadoProcesal,
          fojas: Number(envio.fojas),
          estado: ESTADO_EN_FIRMA,
          enviadoEn: new Date().toISOString(),
          enviadoPor: nombreUsuario(),
        });

        logSeg(
          seg,
          `Enviado a firma de la Magistrada: «${envio.estadoProcesal}» (${envio.fojas} fojas, ${envio.archivo})`,
        );
      });

      return guardado
        ? { ok: true }
        : { ok: false, error: "No se encontró el seguimiento del amparo." };
    },
    alTerminar,
  });
}

// ------------------------------------------------------------
// LADO DE LA MAGISTRADA (página de Mesas)
// ------------------------------------------------------------

// [{ amparo, seg, firma }] pendientes de firma, más antiguos primero.
export function amparosPorFirmar() {
  return amparosDirectos()
    .flatMap(({ amparo, seg }) =>
      firmasDe(seg)
        .filter((firma) => firma.estado === ESTADO_EN_FIRMA)
        .map((firma) => ({ amparo, seg, firma })),
    )
    .sort((a, b) =>
      String(a.firma.enviadoEn).localeCompare(String(b.firma.enviadoEn)),
    );
}

// Tarjeta de la barra lateral de Mesas (#mesasAmparosFirma).
// Solo la ve la Magistrada.
export function renderAmparosPorFirmar() {
  const host = document.getElementById("mesasAmparosFirma");

  if (!host) return;

  if (!canSign()) {
    host.innerHTML = "";

    return;
  }

  const pendientes = amparosPorFirmar();

  host.innerHTML = `
    <section class="mesas-recepcion-card">
      <div class="mesas-recepcion-card-header">
        <div>
          <span class="mesas-mini-eyebrow">Amparos Directos</span>
          <h2>Amparos por firmar</h2>
        </div>
        <span class="mesas-recepcion-counter">${pendientes.length}</span>
      </div>

      <div class="mesas-recepcion-card-body">
        <p>
          ${
            pendientes.length
              ? `${pendientes.length} ${pendientes.length === 1 ? "documento espera" : "documentos esperan"} tu firma.`
              : "No hay documentos de amparos pendientes de firma."
          }
        </p>

        <button type="button" class="mesas-secondary-btn mesas-recepcion-open-btn"
          id="mesasVerAmparosPorFirmar" ${pendientes.length ? "" : "disabled"}>
          <i class="fa-solid fa-file-signature"></i>
          Ver amparos
        </button>
      </div>
    </section>
  `;

  const boton = document.getElementById("mesasVerAmparosPorFirmar");

  if (boton && pendientes.length) boton.onclick = abrirModalAmparosPorFirmar;
}

export function abrirModalAmparosPorFirmar() {
  const pendientes = amparosPorFirmar();

  showModal(`
    <div class="mesas-modal-shell mesas-recepcion-modal">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-file-signature"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Amparos directos por firmar</h2>
          <p>Documentos enviados por la Mesa de Amparos Directos.</p>
        </div>
      </header>

      <div class="mesas-modal-body">
        ${
          pendientes.length
            ? `<div class="mesas-recepcion-list">${pendientes
                .map(
                  ({ amparo, seg, firma }) => `
            <article class="mesas-recepcion-item">
              <div class="mesas-recepcion-item-main">
                <div class="mesas-recepcion-item-top">
                  <strong>Amparo ${escapeHTML(amparo.id)} · Expediente ${escapeHTML(amparo.expediente || "—")}</strong>
                </div>
                <div class="mesas-recepcion-item-grid">
                  <div><span>Quejoso</span><strong>${escapeHTML(quejosoDe(amparo, seg))}</strong></div>
                  <div><span>Estado procesal</span><strong>${escapeHTML(firma.estadoProcesal || "—")}</strong></div>
                  <div><span>Fojas</span><strong>${escapeHTML(String(firma.fojas ?? "—"))}</strong></div>
                  <div><span>Enviado</span><strong>${escapeHTML(formatFecha(firma.enviadoEn))} · ${escapeHTML(firma.enviadoPor || "—")}</strong></div>
                </div>
              </div>
              <div class="mesas-actions">
                <button type="button" class="mesas-secondary-btn" data-doc-firma="${escapeHTML(firma.documentoId)}">
                  <i class="fa-regular fa-eye"></i> Ver documento
                </button>
                <button type="button" class="mesas-primary-btn" data-firmar-amparo="${escapeHTML(amparo.id)}" data-firma-id="${escapeHTML(firma.id)}">
                  <i class="fa-solid fa-file-signature"></i> Firmar
                </button>
              </div>
            </article>`,
                )
                .join("")}</div>`
            : `<p>No hay documentos de amparos pendientes de firma.</p>`
        }
      </div>

      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="mesasCerrarAmparosPorFirmar">Cerrar</button>
      </footer>
    </div>
  `);

  document
    .getElementById("mesasCerrarAmparosPorFirmar")
    ?.addEventListener("click", closeForm);

  document.querySelectorAll("[data-firmar-amparo]").forEach((boton) => {
    boton.addEventListener("click", () =>
      firmarAmparo(boton.dataset.firmarAmparo, boton.dataset.firmaId),
    );
  });
}

// Solo la Magistrada firma.
export function firmarAmparo(amparoId, firmaId) {
  if (!canSign()) return;

  actualizarSeg(amparoId, (seg) => {
    const firma = firmasDe(seg).find((f) => f.id === firmaId);

    if (!firma || firma.estado !== ESTADO_EN_FIRMA) return;

    firma.estado = ESTADO_FIRMADO;
    firma.firmadoEn = new Date().toISOString();
    firma.firmadoPor = nombreUsuario();

    logSeg(seg, `Documento firmado por la Magistrada: «${firma.estadoProcesal}»`);
  });

  renderAmparosPorFirmar();

  // Se queda abierto mientras haya más por firmar (como "Recibir").
  if (amparosPorFirmar().length) {
    abrirModalAmparosPorFirmar();
  } else {
    closeForm();
  }
}

// ------------------------------------------------------------
// DEMOSTRACIÓN
// Agrega un envío a firma de ejemplo (con archivo de muestra).
// ------------------------------------------------------------
export function sembrarFirmaDemo(seg, amparoId, { estado, estadoProcesal, fojas }) {
  seg.firmas = firmasDe(seg);

  const idFirma = `demo-firma-${amparoId}-${seg.firmas.length + 1}`;

  if (seg.firmas.some((f) => f.id === idFirma)) return;

  const acuerdo = sembrarDocumentoDemo("demanda", `demo-doc-${idFirma}`, {
    nombreBase: `Documento_${amparoId}`,
    concepto: estadoProcesal,
  });

  const ahora = new Date();

  seg.firmas.push({
    id: idFirma,
    documentoId: acuerdo?.documentoId || "",
    archivo: acuerdo?.archivo || "",
    estadoProcesal,
    fojas,
    estado,
    enviadoEn: new Date(ahora.getTime() - 3600000).toISOString(),
    enviadoPor: "Amparos Directos",
    ...(estado === ESTADO_FIRMADO
      ? { firmadoEn: ahora.toISOString(), firmadoPor: "Magistrada" }
      : {}),
  });
}
