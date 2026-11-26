// ============================================================
// LISTAS DE AMPAROS DIRECTOS
// assets/js/modules/amparosDirectos/listas.js
//
// La Mesa de Amparos Directos genera sus listas igual que las mesas de
// Secretaría de Acuerdos (mesas/listas.js): un PDF en forma de tabla
// con lo que la Magistrada ya firmó y aún no se ha listado.
//
//   Formato (ver pdfLista.js -> generarPdfListaAmparos):
//     LISTA NO. 102.
//     ÁREA DE AMPARO DIRECTO A ACTUARÍA.
//     --- 29 DE OCTUBRE DEL 2026 ---
//     No. DE EXPEDIENTE | ACTOR | DEMANDADO | ESTADO PROCESAL | FOJAS
//
//   Qué entra ⚠️ (interpretación; fácil de cambiar en `pendientes`):
//     solo amparos directos en la etapa de Radicación
//     (categoría "Radicación", CATEGORIA_LISTA) con un documento
//     firmado por la Magistrada que no se haya publicado antes.
//     ESTADO PROCESAL y FOJAS salen de lo capturado al enviar a firma.
//     Si un expediente trae varios documentos firmados, aparecen sus
//     estados procesales uno debajo de otro y las fojas del último.
//
//   Generación:
//     - Manual con "Crear lista".
//     - Automática a las 15:00 de lunes a viernes (misma configuración
//       que Mesas) si ese día no se creó ninguna a mano y hay pendientes.
//     - ⚠️ Se permiten varias listas el mismo día (el ejemplo trae dos
//       con la misma fecha). A diferencia de Mesas, que permite una.
//
//   PENDIENTE: confirmar el primer número del consecutivo
//   (CONSECUTIVO_INICIAL; el ejemplo llega a la lista 102), si
//   reinicia cada año y si un día sin pendientes debe generar lista.
//
// La automática corre en el navegador (no hay servidor): se revisa al
// abrir la página y cada minuto. Al migrar pasa a un proceso del servidor.
// ============================================================

import { getData, saveData } from "../../storage.js";

import { createId, escapeHTML, formatDate } from "../../utils.js";

import { showModal, closeForm } from "../../forms/formHelper.js";

import { getSession, getRole } from "../../auth.js";

import { MESAS_CONFIG } from "../mesas/config.js";

import { parseNumeroExpediente } from "../mesas/mesaUtils.js";

import { renderVistaPrevia } from "../mesas/vistaPrevia.js";

import {
  generarPdfListaAmparos,
  nombreArchivoListaAmparos,
  tituloListaAmparos,
} from "../mesas/pdfLista.js";

import { amparosDirectos, actorDemandadoDe } from "./datos.js";

import { firmasDe, ESTADO_FIRMADO } from "./firma.js";

const KEY_LISTAS = "mesasAmparosListas";

// Fecha de la última revisión automática: "AAAA-MM-DD"
const KEY_REVISION_AUTO = "mesasAmparosListasRevisionAuto";

// ⚠️ Solo los amparos de esta categoría entran a la lista.
export const CATEGORIA_LISTA = "Radicación";

// ⚠️ PENDIENTE: el ejemplo recibido llega a la lista 102.
export const CONSECUTIVO_INICIAL = 103;

// ------------------------------------------------------------
// UTILIDADES
// ------------------------------------------------------------
function fechaLocal(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

export function leerListas() {
  const datos = getData(KEY_LISTAS, []);

  return Array.isArray(datos) ? datos : [];
}

export function puedeCrearListas() {
  return getRole() === "amparos-directos";
}

function siguienteNumero() {
  const maximo = leerListas().reduce(
    (max, lista) => Math.max(max, Number(lista.numero) || 0),
    0,
  );

  return Math.max(maximo + 1, CONSECUTIVO_INICIAL);
}

// ------------------------------------------------------------
// PENDIENTES DE LISTAR
// Devuelve [{ amparoId, firmaId, expediente, actor, demandado,
//             estado, fojas, firmadoEn }]
// ------------------------------------------------------------
export function pendientesDeLista() {
  return amparosDirectos()
    .filter(({ seg }) => seg.categoria === CATEGORIA_LISTA)
    .flatMap(({ amparo, seg }) => {
      const { actor, demandado } = actorDemandadoDe(amparo);

      return firmasDe(seg)
        .filter((firma) => firma.estado === ESTADO_FIRMADO && !firma.listaId)
        .map((firma) => ({
          amparoId: String(amparo.id),
          firmaId: firma.id,
          expediente: String(amparo.expediente || "—"),
          actor,
          demandado,
          estado: firma.estadoProcesal || "",
          fojas: firma.fojas,
          firmadoEn: firma.firmadoEn || "",
        }));
    })
    .sort((a, b) => String(a.firmadoEn).localeCompare(String(b.firmadoEn)));
}

// Agrupa por expediente conservando el orden en que se firmó.
function construirFilas(pendientes) {
  const mapa = new Map();

  pendientes.forEach((p) => {
    if (!mapa.has(p.expediente)) {
      const datos = parseNumeroExpediente(p.expediente) || {};

      mapa.set(p.expediente, {
        expediente: p.expediente,
        anio: Number(datos.anio) || 0,
        actor: p.actor,
        demandado: p.demandado,
        estados: [],
        fojas: p.fojas,
      });
    }

    const fila = mapa.get(p.expediente);

    fila.estados.push(p.estado);

    // Las fojas son una sola por expediente: se queda la del último firmado.
    fila.fojas = p.fojas;
  });

  return [...mapa.values()];
}

// Marca los envíos publicados con la lista en la que salieron.
function marcarListados(pendientes, lista) {
  const seguimiento = getData("mesasAmparosSeguimiento", {}) || {};

  pendientes.forEach((p) => {
    const firma = firmasDe(seguimiento[p.amparoId]).find(
      (f) => f.id === p.firmaId,
    );

    if (firma) {
      firma.listaId = lista.id;
      firma.listaNumero = lista.numero;
    }
  });

  saveData("mesasAmparosSeguimiento", seguimiento);
}

// ------------------------------------------------------------
// CREAR LISTA  ->  { ok, lista } | { ok: false, error }
// ------------------------------------------------------------
export function crearLista({ origen = "manual", ahora = new Date() } = {}) {
  if (!puedeCrearListas()) {
    return { ok: false, error: "Solo el usuario de Amparos Directos genera listas." };
  }

  const pendientes = pendientesDeLista();

  if (!pendientes.length) {
    return {
      ok: false,
      error: `No hay amparos en ${CATEGORIA_LISTA} con documento firmado pendientes de listar.`,
    };
  }

  const sesion = getSession();

  const lista = {
    id: createId(),
    numero: siguienteNumero(),
    fecha: fechaLocal(ahora),
    usuario: sesion?.email || "",
    usuarioNombre: sesion?.nombre || "",
    origen: origen === "automatica" ? "automatica" : "manual",
    generadaEn: ahora.toISOString(),
    filas: construirFilas(pendientes),
  };

  saveData(KEY_LISTAS, [...leerListas(), lista]);

  marcarListados(pendientes, lista);

  return { ok: true, lista };
}

// ------------------------------------------------------------
// GENERACIÓN AUTOMÁTICA (15:00, lunes a viernes)
// Una sola revisión por día; no genera si ya hay una lista de hoy.
// ------------------------------------------------------------
export function revisarListaAutomatica(ahora = new Date()) {
  if (!puedeCrearListas()) return null;

  if (!MESAS_CONFIG.LISTA_DIAS_AUTOMATICA.includes(ahora.getDay())) return null;

  if (ahora.getHours() < MESAS_CONFIG.LISTA_HORA_AUTOMATICA) return null;

  const hoy = fechaLocal(ahora);

  if (getData(KEY_REVISION_AUTO, "") === hoy) return null;

  saveData(KEY_REVISION_AUTO, hoy);

  if (leerListas().some((lista) => lista.fecha === hoy)) return null;

  const resultado = crearLista({ origen: "automatica", ahora });

  return resultado.ok ? resultado.lista : null;
}

let temporizador = null;

// Arranca la revisión periódica (idempotente).
export function iniciarListasAutomaticas(alGenerar = () => {}) {
  const revisar = () => {
    if (revisarListaAutomatica()) alGenerar();
  };

  revisar();

  if (temporizador || !puedeCrearListas()) return;

  temporizador = window.setInterval(revisar, 60 * 1000);
}

// ------------------------------------------------------------
// PDF: DESCARGA Y VISTA PREVIA
// ------------------------------------------------------------
function descargarLista(id) {
  const lista = leerListas().find((item) => item.id === id);

  if (!lista) return;

  const url = URL.createObjectURL(generarPdfListaAmparos(lista));

  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = nombreArchivoListaAmparos(lista);
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function verLista(id) {
  const lista = leerListas().find((item) => item.id === id);

  if (!lista) return;

  const archivo = nombreArchivoListaAmparos(lista);

  showModal(`
    <div class="mesas-modal-shell mesas-plantilla-preview-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-regular fa-eye"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Lista #${escapeHTML(lista.numero)} · Amparos Directos</h2>
          <p>${escapeHTML(archivo)} · vista previa</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        <div id="mampdListaPreview" class="mesas-plantilla-preview">
          <p class="mesas-preview-loading">Cargando vista previa...</p>
        </div>
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="mampdListaCerrar">Cerrar</button>
        <button type="button" class="mesas-modal-confirm" id="mampdListaDescargar">
          <i class="fa-solid fa-download"></i> Descargar PDF
        </button>
      </footer>
    </div>
  `);

  document.getElementById("mampdListaCerrar").onclick = closeForm;
  document.getElementById("mampdListaDescargar").onclick = () => descargarLista(id);

  await renderVistaPrevia(
    document.getElementById("mampdListaPreview"),
    { nombre: tituloListaAmparos(lista), nombreArchivo: archivo, tipoArchivo: "pdf" },
    generarPdfListaAmparos(lista),
  );
}

// ------------------------------------------------------------
// RENDER (pestaña "Listas")
// ------------------------------------------------------------
let aviso = null; // { tipo: "ok" | "error", texto }

export function renderListasDirectos(host, deps = {}) {
  if (!host) return;

  const puedeCrear = puedeCrearListas();

  const pendientes = pendientesDeLista();

  const filasPendientes = construirFilas(pendientes);

  const hoy = fechaLocal();

  const deHoy = leerListas().filter((lista) => lista.fecha === hoy);

  const hora = String(MESAS_CONFIG.LISTA_HORA_AUTOMATICA).padStart(2, "0");

  const listas = leerListas().sort((a, b) => Number(b.numero) - Number(a.numero));

  host.innerHTML = `
    <section class="mesas-fase4-section">
      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Listas</span>
          <h2>Listas de amparos directos</h2>
          <p>
            Incluye solo los amparos en la etapa de ${escapeHTML(CATEGORIA_LISTA)} cuyo documento ya firmó la Magistrada.
            Se crean desde «Amparos pendientes de realizar»; si no se crea a mano, se genera sola a las ${hora}:00 de lunes a viernes.
          </p>
        </div>
      </div>

      ${
        aviso
          ? `<p class="${aviso.tipo === "ok" ? "mesas-fase6-notice" : "mesas-fase6-error"}">${escapeHTML(aviso.texto)}</p>`
          : ""
      }

      <section class="mesas-secretaria-table-card mesas-listas-hoy">
        <div class="mesas-listas-hoy-head">
          <div>
            <strong>Pendientes de listar · ${escapeHTML(formatDate(hoy))}</strong>
            <span>
              ${
                pendientes.length
                  ? `Hay <strong>${pendientes.length}</strong> documento(s) firmado(s) en ${filasPendientes.length} expediente(s) pendientes de listar.`
                  : "No hay documentos firmados pendientes de listar."
              }
              ${deHoy.length ? ` Hoy ya se generó${deHoy.length > 1 ? "ron" : ""} la${deHoy.length > 1 ? "s" : ""} lista${deHoy.length > 1 ? "s" : ""} #${deHoy.map((l) => l.numero).join(", #")}.` : ""}
            </span>
          </div>
        </div>
        ${
          filasPendientes.length
            ? `
        <div class="mesas-table-wrapper">
          <table class="mesas-fase6-table mesas-listas-table">
            <thead><tr><th>No. de expediente</th><th>Actor</th><th>Demandado</th><th>Estado procesal</th><th>Fojas</th></tr></thead>
            <tbody>
              ${filasPendientes
                .map(
                  (fila) => `
              <tr>
                <td><strong class="mesas-expediente-number">${escapeHTML(fila.expediente)}</strong></td>
                <td>${escapeHTML(fila.actor)}</td>
                <td>${escapeHTML(fila.demandado)}</td>
                <td>${fila.estados.map((e) => `<p>${escapeHTML(e)}</p>`).join("")}</td>
                <td>${escapeHTML(String(fila.fojas ?? ""))}</td>
              </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>`
            : ""
        }
      </section>

      <section class="mesas-secretaria-table-card">
        ${
          listas.length
            ? `
        <div class="mesas-table-wrapper">
          <table class="mesas-fase6-table mesas-listas-table">
            <thead>
              <tr><th>Lista</th><th>Fecha</th><th>Expedientes</th><th>Generación</th><th>Generada por</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              ${listas
                .map(
                  (lista) => `
              <tr>
                <td><strong class="mesas-expediente-number">#${escapeHTML(lista.numero)}</strong></td>
                <td>${escapeHTML(formatDate(lista.fecha))}</td>
                <td>${(lista.filas || []).length}</td>
                <td>${lista.origen === "automatica" ? "Automática" : "Manual"}</td>
                <td>${escapeHTML(lista.usuarioNombre || lista.usuario || "—")}</td>
                <td>
                  <div class="mesas-actions">
                    <button type="button" class="mesas-secondary-btn" data-listas-action="ver" data-lista-id="${escapeHTML(lista.id)}">
                      <i class="fa-regular fa-eye"></i> Vista previa
                    </button>
                    <button type="button" class="mesas-primary-btn" data-listas-action="descargar" data-lista-id="${escapeHTML(lista.id)}">
                      <i class="fa-solid fa-download"></i> PDF
                    </button>
                  </div>
                </td>
              </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>`
            : `
        <div class="mesas-empty-state">
          <div class="mesas-empty-icon"><i class="fa-solid fa-list-check"></i></div>
          <strong>Aún no hay listas generadas</strong>
          <span>Las listas que generes aparecerán aquí.</span>
        </div>`
        }
      </section>
    </section>
  `;

  host.onclick = (evento) => {
    const boton = evento.target.closest("[data-listas-action]");

    if (!boton) return;

    switch (boton.dataset.listasAction) {
      case "crear": {
        const resultado = crearLista();

        aviso = resultado.ok
          ? { tipo: "ok", texto: `Se generó la lista #${resultado.lista.numero}.` }
          : { tipo: "error", texto: resultado.error };

        renderListasDirectos(host, deps);

        aviso = null;

        break;
      }

      case "ver":
        verLista(boton.dataset.listaId);

        break;

      case "descargar":
        descargarLista(boton.dataset.listaId);

        break;
    }
  };
}
