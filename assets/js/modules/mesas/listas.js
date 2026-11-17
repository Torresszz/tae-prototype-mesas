// ============================================================
// LISTAS DE ACUERDOS
// assets/js/modules/mesas/listas.js
//
// Cada mesa (1 a 3) genera, una vez por día, su "lista": un PDF en
// forma de tabla con los acuerdos firmados que aún no se han listado.
//
//   - Consecutivo GLOBAL (#1, #2, #3...) compartido por las tres mesas.
//   - "Crear lista": una sola vez por día y por mesa.
//   - Si no se creó a mano, se genera sola a las 15:00 de lunes a
//     viernes (MESAS_CONFIG.LISTA_HORA_AUTOMATICA).
//   - Cada usuario ve solo las listas generadas con su usuario.
//
// Qué entra a la lista ⚠️ (interpretación; fácil de cambiar en
// `estaPendienteDeLista`): todo asunto de la mesa que la Magistrada ya
// firmó ("En lista") y que no se ha publicado en una lista anterior.
// Los datos salen de lo que ya se captura: expediente, actor,
// demandado y el concepto "Acuerdo" escrito al enviar a firma.
//
// PENDIENTE: confirmar si el consecutivo se reinicia cada año (por
// ahora es continuo) y si un día sin acuerdos debe generar lista
// (por ahora no se genera ni consume número).
//
// La generación automática corre en el navegador (no hay servidor):
// se revisa al abrir Mesas y cada minuto mientras esté abierto. Al
// migrar, esa tarea pasa a un proceso programado del servidor.
// ============================================================

import { getData, saveData } from "../../storage.js";
import { createId, escapeHTML, formatDate } from "../../utils.js";
import { showModal, closeForm } from "../../forms/formHelper.js";
import { getSession, canManageTemplates } from "../../auth.js";

import { MESAS_CONFIG } from "./config.js";
import { aplicarFiltrosGlobales, coincideExpediente } from "./filtros.js";
import {
  getNumeroExpediente,
  mesaDeExpediente,
  mesaUsuarioActual,
  parseNumeroExpediente,
  expedienteRecibidoEnMesa,
} from "./mesaUtils.js";
import {
  generarPdfLista,
  nombreArchivoLista,
  tituloLista,
  mesaRomano,
} from "./pdfLista.js";
import { renderVistaPrevia } from "./vistaPrevia.js";

const KEY_LISTAS = "mesasListas";
// Fecha de la última revisión automática por mesa: { [mesa]: "AAAA-MM-DD" }
const KEY_REVISION_AUTO = "mesasListasRevisionAuto";

// ------------------------------------------------------------
// UTILIDADES
// ------------------------------------------------------------
function fechaLocal(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function arreglo(clave) {
  const datos = getData(clave, []);

  return Array.isArray(datos) ? datos : [];
}

export function leerListas() {
  return arreglo(KEY_LISTAS);
}

// Solo los usuarios de Mesa 1, 2 o 3 generan listas.
export function puedeCrearListas() {
  return canManageTemplates() && Boolean(mesaUsuarioActual());
}

// Listas que ve el usuario: las generadas con su usuario. Los usuarios
// sin mesa propia (Magistrada y "todas las mesas") no generan listas y
// las consultan todas. ⚠️
export function listasDelUsuario() {
  const sesion = getSession();
  const todas = leerListas();

  if (!mesaUsuarioActual()) return todas;

  return todas.filter((lista) => lista.usuario === sesion?.email);
}

export function listaDeHoy(mesa, hoy = fechaLocal()) {
  return (
    leerListas().find(
      (lista) => Number(lista.mesa) === Number(mesa) && lista.fecha === hoy,
    ) || null
  );
}

function siguienteNumero() {
  return leerListas().reduce((max, l) => Math.max(max, Number(l.numero) || 0), 0) + 1;
}

// ------------------------------------------------------------
// ACUERDOS PENDIENTES DE LISTAR
// ------------------------------------------------------------
function estaPendienteDeLista(registro, campo) {
  if (!registro || registro.listaId) return false;

  return Boolean(registro.firmadoEn) || registro[campo] === "en-lista";
}

const concepto = (registro, respaldo) =>
  String(registro?.acuerdo?.concepto || "").trim() || respaldo;

// Devuelve los acuerdos de la mesa aún no listados:
// [{ fuente, clave, expediente, actor, demandado, acuerdo }]
export function acuerdosPendientes(mesa) {
  const expedientes = arreglo("expedientes").filter(expedienteRecibidoEnMesa);
  const porNumero = new Map(
    expedientes.map((expediente) => [getNumeroExpediente(expediente), expediente]),
  );
  const deLaMesa = (numero) => {
    const expediente = porNumero.get(String(numero));

    return expediente && mesaDeExpediente(expediente) === Number(mesa)
      ? expediente
      : null;
  };
  const item = (fuente, clave, expediente, registro, respaldo) => ({
    fuente,
    clave,
    expediente: getNumeroExpediente(expediente),
    actor: expediente.actor || expediente.promovente || "—",
    demandado: expediente.demandado || "—",
    acuerdo: concepto(registro, respaldo),
  });
  const pendientes = [];

  // 1. Acuerdo del expediente (tabla Mesas / audiencias)
  const seguimiento = getData("mesasSeguimiento", {}) || {};

  Object.entries(seguimiento).forEach(([numero, registro]) => {
    const expediente = deLaMesa(numero);

    if (expediente && estaPendienteDeLista(registro, "estado")) {
      pendientes.push(item("seguimiento", numero, expediente, registro, "Acuerdo."));
    }
  });

  // 2. Demanda (radicación)
  const demandas = getData("mesasDemandas", {}) || {};

  Object.entries(demandas).forEach(([numero, registro]) => {
    const expediente = deLaMesa(numero);

    if (expediente && estaPendienteDeLista(registro, "radicacion")) {
      pendientes.push(item("demanda", numero, expediente, registro, "Radicación."));
    }
  });

  // 3. Promociones
  arreglo("promociones").forEach((promocion) => {
    const expediente = deLaMesa(promocion.expediente);

    if (expediente && estaPendienteDeLista(promocion, "estadoAcuerdo")) {
      pendientes.push(
        item("promocion", promocion.id, expediente, promocion, "Se acuerda promoción."),
      );
    }
  });

  // 4. Calificaciones
  arreglo("mesasCalificaciones").forEach((calificacion) => {
    const expediente = deLaMesa(calificacion.expediente);

    if (expediente && estaPendienteDeLista(calificacion, "estado")) {
      pendientes.push(
        item("calificacion", calificacion.id, expediente, calificacion, "Calificación de pruebas."),
      );
    }
  });

  // 5. Exhortos (llevan su propio número EXH-000/AAAA)
  arreglo("exhortos").forEach((exhorto) => {
    if (!exhorto.recibidoMesa) return;

    const mesaExhorto = Number(exhorto.mesa) || mesaDeExpediente({ numero: exhorto.numero });

    if (mesaExhorto !== Number(mesa)) return;
    if (!estaPendienteDeLista(exhorto, "estadoMesa")) return;

    pendientes.push({
      fuente: "exhorto",
      clave: exhorto.id,
      expediente: exhorto.numero,
      actor: exhorto.actor || "—",
      demandado: exhorto.demandado || "—",
      acuerdo: concepto(exhorto, "Exhorto."),
    });
  });

  return pendientes;
}

// Agrupa por expediente y ordena por año y número (como la lista en papel).
function construirFilas(pendientes) {
  const mapa = new Map();

  pendientes.forEach((pendiente) => {
    if (!mapa.has(pendiente.expediente)) {
      const datos = parseNumeroExpediente(pendiente.expediente) || {};
      const anio =
        Number(datos.anio) ||
        Number(String(pendiente.expediente).match(/(\d{4})\s*$/)?.[1]) ||
        0;
      const consecutivo =
        Number(datos.consecutivo) ||
        Number(String(pendiente.expediente).match(/(\d+)\s*\/\s*\d{4}\s*$/)?.[1]) ||
        0;

      mapa.set(pendiente.expediente, {
        expediente: pendiente.expediente,
        anio,
        consecutivo,
        conPrefijo: /^[a-z]/i.test(String(pendiente.expediente).trim()),
        actor: pendiente.actor,
        demandado: pendiente.demandado,
        acuerdos: [],
      });
    }

    mapa.get(pendiente.expediente).acuerdos.push(pendiente.acuerdo);
  });

  return [...mapa.values()]
    .sort(
      (a, b) =>
        a.anio - b.anio ||
        Number(b.conPrefijo) - Number(a.conPrefijo) ||
        a.consecutivo - b.consecutivo ||
        String(a.expediente).localeCompare(String(b.expediente)),
    )
    .map(({ consecutivo, conPrefijo, ...fila }) => fila);
}

// Marca los registros de origen con la lista en la que se publicaron.
function marcarListados(pendientes, lista) {
  const sello = (registro) => {
    if (!registro) return;
    registro.listaId = lista.id;
    registro.listaNumero = lista.numero;
  };
  const de = (fuente) => pendientes.filter((p) => p.fuente === fuente);

  [
    ["seguimiento", "mesasSeguimiento"],
    ["demanda", "mesasDemandas"],
  ].forEach(([fuente, clave]) => {
    const propios = de(fuente);

    if (!propios.length) return;

    const datos = getData(clave, {}) || {};

    propios.forEach((p) => sello(datos[p.clave]));
    saveData(clave, datos);
  });

  [
    ["promocion", "promociones"],
    ["calificacion", "mesasCalificaciones"],
    ["exhorto", "exhortos"],
  ].forEach(([fuente, clave]) => {
    const propios = de(fuente);

    if (!propios.length) return;

    const datos = arreglo(clave);
    const idsPropios = new Set(propios.map((p) => p.clave));

    datos.filter((registro) => idsPropios.has(registro.id)).forEach(sello);
    saveData(clave, datos);
  });
}

// ------------------------------------------------------------
// CREAR LISTA
// Devuelve { ok, lista } | { ok:false, error }.
// ------------------------------------------------------------
export function crearLista({ origen = "manual", ahora = new Date() } = {}) {
  const sesion = getSession();
  const mesa = mesaUsuarioActual();

  if (!puedeCrearListas()) {
    return { ok: false, error: "Solo los usuarios de Mesa 1, 2 o 3 generan listas." };
  }

  const hoy = fechaLocal(ahora);
  const existente = listaDeHoy(mesa, hoy);

  if (existente) {
    return {
      ok: false,
      error: `La lista de hoy ya fue generada (lista #${existente.numero}).`,
    };
  }

  const pendientes = acuerdosPendientes(mesa);

  if (!pendientes.length) {
    return { ok: false, error: "No hay acuerdos firmados pendientes de listar." };
  }

  const lista = {
    id: createId(),
    numero: siguienteNumero(),
    fecha: hoy,
    mesa: Number(mesa),
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
// Se revisa una sola vez por día y por mesa: si a esa hora no hay
// lista de hoy y existen acuerdos pendientes, se genera.
// Devuelve la lista creada o null.
// ------------------------------------------------------------
export function revisarListaAutomatica(ahora = new Date()) {
  if (!puedeCrearListas()) return null;

  const mesa = mesaUsuarioActual();
  const hoy = fechaLocal(ahora);

  if (!MESAS_CONFIG.LISTA_DIAS_AUTOMATICA.includes(ahora.getDay())) return null;
  if (ahora.getHours() < MESAS_CONFIG.LISTA_HORA_AUTOMATICA) return null;

  const revisiones = getData(KEY_REVISION_AUTO, {}) || {};

  if (revisiones[mesa] === hoy) return null;

  revisiones[mesa] = hoy;
  saveData(KEY_REVISION_AUTO, revisiones);

  if (listaDeHoy(mesa, hoy)) return null;

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

  const url = URL.createObjectURL(generarPdfLista(lista));
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = nombreArchivoLista(lista);
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function verLista(id) {
  const lista = leerListas().find((item) => item.id === id);

  if (!lista) return;

  const archivo = nombreArchivoLista(lista);

  showModal(`
    <div class="mesas-modal-shell mesas-plantilla-preview-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-regular fa-eye"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Lista #${escapeHTML(lista.numero)} · Mesa ${escapeHTML(mesaRomano(lista.mesa))}</h2>
          <p>${escapeHTML(archivo)} · vista previa</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        <div id="listaPreviewCuerpo" class="mesas-plantilla-preview">
          <p class="mesas-preview-loading">Cargando vista previa...</p>
        </div>
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="listaPreviewCerrar">Cerrar</button>
        <button type="button" class="mesas-modal-confirm" id="listaPreviewDescargar">
          <i class="fa-solid fa-download"></i> Descargar PDF
        </button>
      </footer>
    </div>
  `);

  document.getElementById("listaPreviewCerrar").onclick = closeForm;
  document.getElementById("listaPreviewDescargar").onclick = () => descargarLista(id);

  await renderVistaPrevia(
    document.getElementById("listaPreviewCuerpo"),
    { nombre: tituloLista(lista), nombreArchivo: archivo, tipoArchivo: "pdf" },
    generarPdfLista(lista),
  );
}

// ------------------------------------------------------------
// RENDER
// ------------------------------------------------------------
let aviso = null; // { tipo: "ok" | "error", texto }

export function renderListas() {
  const vista = document.querySelector('[data-mesas-vista="listas"]');

  if (!vista) return;

  const mesa = mesaUsuarioActual();
  const puedeCrear = puedeCrearListas();
  const hoy = fechaLocal();
  const deHoy = puedeCrear ? listaDeHoy(mesa, hoy) : null;
  const pendientes = puedeCrear ? acuerdosPendientes(mesa) : [];
  const filasPendientes = construirFilas(pendientes);
  const hora = String(MESAS_CONFIG.LISTA_HORA_AUTOMATICA).padStart(2, "0");

  const listas = aplicarFiltrosGlobales(listasDelUsuario(), {
    fecha: (lista) => lista.fecha,
  })
    .filter(
      (lista) =>
        coincideExpediente(`#${lista.numero}`) ||
        (lista.filas || []).some((fila) => coincideExpediente(fila.expediente)),
    )
    .sort((a, b) => Number(b.numero) - Number(a.numero));

  const estadoHoy = deHoy
    ? `La lista de hoy ya fue generada: <strong>lista #${escapeHTML(deHoy.numero)}</strong>
       (${deHoy.origen === "automatica" ? "automática" : "manual"}). Los acuerdos que se firmen después entran en la lista del siguiente día.`
    : pendientes.length
      ? `Hay <strong>${pendientes.length}</strong> acuerdo(s) firmado(s) en ${filasPendientes.length} expediente(s) pendientes de listar.`
      : "No hay acuerdos firmados pendientes de listar.";

  vista.innerHTML = `
    <section class="mesas-fase4-section">
      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Listas</span>
          <h2>Listas de acuerdos</h2>
          <p>
            Una lista por día y por mesa, con numeración consecutiva global.
            Si no se crea a mano, se genera sola a las ${hora}:00 de lunes a viernes.
          </p>
        </div>
        ${
          puedeCrear
            ? `<button type="button" class="mesas-primary-btn" data-listas-action="crear"
                 ${deHoy || !pendientes.length ? "disabled" : ""}>
                 <i class="fa-solid fa-list-check"></i> Crear lista
               </button>`
            : ""
        }
      </div>

      ${
        aviso
          ? `<p class="${aviso.tipo === "ok" ? "mesas-fase6-notice" : "mesas-fase6-error"}" data-listas-aviso>${escapeHTML(aviso.texto)}</p>`
          : ""
      }

      ${
        puedeCrear
          ? `
        <section class="mesas-secretaria-table-card mesas-listas-hoy">
          <div class="mesas-listas-hoy-head">
            <div>
              <strong>Lista de hoy · ${escapeHTML(formatDate(hoy))} · Mesa ${escapeHTML(mesaRomano(mesa))}</strong>
              <span data-listas-estado-hoy>${estadoHoy}</span>
            </div>
          </div>
          ${
            !deHoy && filasPendientes.length
              ? `
            <div class="mesas-table-wrapper">
              <table class="mesas-fase6-table mesas-listas-table" data-listas-pendientes>
                <thead><tr><th>Exp.</th><th>Actor</th><th>Demandado</th><th>Acuerdo</th></tr></thead>
                <tbody>
                  ${filasPendientes
                    .map(
                      (fila) => `
                    <tr>
                      <td><strong class="mesas-expediente-number">${escapeHTML(fila.expediente)}</strong></td>
                      <td>${escapeHTML(fila.actor)}</td>
                      <td>${escapeHTML(fila.demandado)}</td>
                      <td>${fila.acuerdos.map((a) => `<p>${escapeHTML(a)}</p>`).join("")}</td>
                    </tr>`,
                    )
                    .join("")}
                </tbody>
              </table>
            </div>`
              : ""
          }
        </section>`
          : `<p class="mesas-fase6-notice">Las listas las generan los usuarios de Mesa 1, 2 y 3. Aquí puedes consultarlas y descargarlas.</p>`
      }

      <section class="mesas-secretaria-table-card">
        ${
          listas.length
            ? `
          <div class="mesas-table-wrapper">
            <table class="mesas-fase6-table mesas-listas-table" data-listas-generadas>
              <thead>
                <tr>
                  <th>Lista</th><th>Fecha</th><th>Mesa</th><th>Expedientes</th>
                  <th>Generación</th><th>Generada por</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${listas
                  .map(
                    (lista) => `
                  <tr>
                    <td><strong class="mesas-expediente-number">#${escapeHTML(lista.numero)}</strong></td>
                    <td>${escapeHTML(formatDate(lista.fecha))}</td>
                    <td>Mesa ${escapeHTML(mesaRomano(lista.mesa))}</td>
                    <td>${(lista.filas || []).length}</td>
                    <td>
                      ${lista.origen === "automatica" ? "Automática" : "Manual"}
                    </td>
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
            <strong>No hay listas en esta vista</strong>
            <span>Las listas generadas con tu usuario aparecerán aquí.</span>
          </div>`
        }
      </section>
    </section>
  `;

  vista.onclick = (event) => {
    const boton = event.target.closest("[data-listas-action]");

    if (!boton) return;

    switch (boton.dataset.listasAction) {
      case "crear": {
        const resultado = crearLista();

        aviso = resultado.ok
          ? { tipo: "ok", texto: `Se generó la lista #${resultado.lista.numero}.` }
          : { tipo: "error", texto: resultado.error };
        renderListas();
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
