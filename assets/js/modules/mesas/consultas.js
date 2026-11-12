// ============================================================
// CONSULTAS
// assets/js/modules/mesas/consultas.js
// FASE 6 - T-17
//
// - Enviar / regresar un expediente a Presidencia, Actuaría, Archivo,
//   Proyectos o Mesas. Guarda en "mesasConsultas" y actualiza la
//   "Ubicación del expediente".
// - Acumulados: expediente nuevo + expediente antiguo. Guarda en
//   "mesasAcumulados".
//
// El buscador por expediente es la barra global del módulo (aplica
// aquí igual que en las demás pestañas). Los formularios son modales,
// así que cambiar un filtro global no borra lo que se está escribiendo.
// ============================================================

import { getData, saveData } from "../../storage.js";
import { createId, escapeHTML, todayISO } from "../../utils.js";
import { getSession } from "../../auth.js";
import { showModal, closeForm } from "../../forms/formHelper.js";

import {
  coincideEstado,
  coincideExpediente,
  coincideFecha,
  aplicarFiltrosGlobales,
} from "./filtros.js";
import { etiquetaEstado } from "./estados.js";
import {
  ACCIONES_CONSULTA,
  DESTINOS_CONSULTA,
  etiquetaAccionConsulta,
} from "./catalogos.js";
import {
  buscarExpedienteExacto,
  getExpedientesMesaActual,
  getNumeroExpediente,
  mesaDeExpediente,
  mesaUsuarioActual,
} from "./mesaUtils.js";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY_CONSULTAS = "mesasConsultas";
const KEY_ACUMULADOS = "mesasAcumulados";
const KEY_SEGUIMIENTO = "mesasSeguimiento";
const KEY_EXPEDIENTES = "expedientes";

// "movimientos" | "acumulados"
let vistaActiva = "movimientos";

// ============================================================
// REGLA DE ACUMULACIÓN
// PENDIENTE (decisión D5)
//
// Este es el ÚNICO lugar donde cambiar qué expedientes pueden
// acumularse. Cuando el equipo defina los estados permitidos, basta
// con editar esta función (p. ej. leer mesasSeguimiento[numero].estado).
// ============================================================

export function puedeAcumular(expediente) {
  // PENDIENTE: definir estados que permiten acumular
  void expediente;

  return true;
}

// ============================================================
// UBICACIÓN RESULTANTE
// ⚠️ Interpretación por confirmar (T-17): al enviar o regresar, la
// "Ubicación del expediente" pasa a ser el destino elegido. Si el
// destino es "Mesas", se muestra la mesa que le corresponde.
// ============================================================

function ubicacionResultante(destino, expediente) {
  if (destino === "Mesas") {
    return `Mesa ${mesaDeExpediente(expediente)}`;
  }

  return destino;
}

// ============================================================
// LECTURA DE DATOS
// ============================================================

function leerLista(clave) {
  const datos = getData(clave, []);

  return Array.isArray(datos) ? datos : [];
}

function getTodosLosExpedientes() {
  const datos = getData(KEY_EXPEDIENTES, []);

  // Los expedientes pendientes de recibir aún no existen para Mesas.
  return Array.isArray(datos)
    ? datos.filter((item) => item?.recibidoMesa !== false)
    : [];
}

function buscarEnTodos(numero) {
  const buscado = String(numero || "")
    .trim()
    .toLowerCase();

  if (!buscado) {
    return null;
  }

  return (
    getTodosLosExpedientes().find(
      (expediente) =>
        getNumeroExpediente(expediente).trim().toLowerCase() === buscado,
    ) || null
  );
}

function numerosDeMesa() {
  return new Set(getExpedientesMesaActual().map(getNumeroExpediente));
}

function estadoDe(numero) {
  const seguimiento = getData(KEY_SEGUIMIENTO, {});

  return seguimiento?.[numero]?.estado || "";
}

function ubicacionActual(numero) {
  const expediente = buscarEnTodos(numero);

  return expediente?.ubicacion || "—";
}

// Movimientos visibles: solo expedientes de la mesa del usuario.
function getMovimientos() {
  const propios = numerosDeMesa();

  return leerLista(KEY_CONSULTAS)
    .filter((movimiento) => propios.has(String(movimiento.expediente)))
    .sort((a, b) =>
      String(b.creadoEn || b.fecha).localeCompare(String(a.creadoEn || a.fecha)),
    );
}

// Un acumulado es visible si alguno de sus dos expedientes es de la mesa.
function getAcumulados() {
  const propios = numerosDeMesa();

  return leerLista(KEY_ACUMULADOS)
    .filter(
      (acumulado) =>
        propios.has(String(acumulado.expedienteNuevo)) ||
        propios.has(String(acumulado.expedienteAntiguo)),
    )
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
}

function getMovimientosVisibles() {
  return aplicarFiltrosGlobales(getMovimientos(), {
    numero: (item) => item.expediente,
    fecha: (item) => item.fecha,
    estado: (item) => estadoDe(item.expediente),
  });
}

function getAcumuladosVisibles() {
  return getAcumulados().filter(
    (acumulado) =>
      coincideExpediente(
        `${acumulado.expedienteNuevo} ${acumulado.expedienteAntiguo}`,
      ) &&
      coincideFecha(acumulado.fecha) &&
      (coincideEstado(estadoDe(acumulado.expedienteNuevo)) ||
        coincideEstado(estadoDe(acumulado.expedienteAntiguo))),
  );
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderConsultas() {
  const vista = document.querySelector('[data-mesas-vista="consultas"]');

  if (!vista) {
    return;
  }

  const totalMovimientos = getMovimientos().length;
  const totalAcumulados = getAcumulados().length;

  vista.innerHTML = `
    <section class="mesas-fase6-section">

      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Fase 6 · T-17</span>
          <h2>Consultas</h2>
          <p>
            Envío y regreso de expedientes, y registro de acumulados.
            Busca por número de expediente con la barra superior.
          </p>
        </div>

        <div class="mesas-fase6-actions">
          <button
            type="button"
            class="mesas-primary-btn"
            data-consultas-action="nuevo-movimiento"
          >
            <i class="fa-solid fa-right-left"></i>
            Enviar / regresar expediente
          </button>

          <button
            type="button"
            class="mesas-secondary-btn"
            data-consultas-action="nuevo-acumulado"
          >
            <i class="fa-solid fa-object-group"></i>
            Registrar acumulado
          </button>
        </div>
      </div>

      <div class="mesas-fase4-counters">
        <button
          type="button"
          class="mesas-fase4-counter ${vistaActiva === "movimientos" ? "active" : ""}"
          data-consultas-action="vista"
          data-vista="movimientos"
        >
          <span>Movimientos</span>
          <strong>${totalMovimientos}</strong>
        </button>

        <button
          type="button"
          class="mesas-fase4-counter ${vistaActiva === "acumulados" ? "active" : ""}"
          data-consultas-action="vista"
          data-vista="acumulados"
        >
          <span>Acumulados</span>
          <strong>${totalAcumulados}</strong>
        </button>
      </div>

      <section class="mesas-secretaria-table-card">
        ${vistaActiva === "movimientos" ? renderMovimientos() : renderAcumulados()}
      </section>

      <div data-plantillas-slot></div>

    </section>
  `;

  configurarEventos(vista);
}

// ============================================================
// TABLAS
// ============================================================

function renderMovimientos() {
  const lista = getMovimientosVisibles();

  if (!lista.length) {
    return renderVacio(
      "fa-right-left",
      "No hay movimientos en esta vista",
      "Registra el envío o regreso de un expediente, o cambia los filtros.",
    );
  }

  return `
    <div class="mesas-table-wrapper">
      <table class="mesas-fase6-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Expediente</th>
            <th>Acción</th>
            <th>Destino</th>
            <th>Ubicación actual</th>
            <th>Estado del expediente</th>
            <th>Usuario</th>
          </tr>
        </thead>

        <tbody>
          ${lista
            .map(
              (item) => `
                <tr>
                  <td>${escapeHTML(formatFecha(item.fecha))}</td>
                  <td>
                    <span class="mesas-expediente-number">
                      ${escapeHTML(item.expediente)}
                    </span>
                  </td>
                  <td>
                    <span class="mesas-fase6-badge ${escapeHTML(item.accion)}">
                      ${escapeHTML(etiquetaAccionConsulta(item.accion))}
                    </span>
                  </td>
                  <td>${escapeHTML(item.destino)}</td>
                  <td>${escapeHTML(ubicacionActual(item.expediente))}</td>
                  <td>
                    ${
                      estadoDe(item.expediente)
                        ? `<span class="mesas-fase6-estado">${escapeHTML(
                            etiquetaEstado(estadoDe(item.expediente)),
                          )}</span>`
                        : "—"
                    }
                  </td>
                  <td>${escapeHTML(item.usuario || "—")}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAcumulados() {
  const lista = getAcumuladosVisibles();

  if (!lista.length) {
    return renderVacio(
      "fa-object-group",
      "No hay acumulados en esta vista",
      "Registra un acumulado o cambia los filtros.",
    );
  }

  return `
    <div class="mesas-table-wrapper">
      <table class="mesas-fase6-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Expediente nuevo</th>
            <th>Expediente antiguo</th>
            <th>Usuario</th>
          </tr>
        </thead>

        <tbody>
          ${lista
            .map(
              (item) => `
                <tr>
                  <td>${escapeHTML(formatFecha(item.fecha))}</td>
                  <td>
                    <span class="mesas-expediente-number">
                      ${escapeHTML(item.expedienteNuevo)}
                    </span>
                  </td>
                  <td>
                    <span class="mesas-expediente-number">
                      ${escapeHTML(item.expedienteAntiguo)}
                    </span>
                  </td>
                  <td>${escapeHTML(item.usuario || "—")}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderVacio(icono, titulo, texto) {
  return `
    <div class="mesas-empty-state">
      <div class="mesas-empty-icon">
        <i class="fa-solid ${icono}"></i>
      </div>
      <strong>${escapeHTML(titulo)}</strong>
      <span>${escapeHTML(texto)}</span>
    </div>
  `;
}

// ============================================================
// EVENTOS
// ============================================================

function configurarEventos(vista) {
  vista.onclick = (event) => {
    const boton = event.target.closest("[data-consultas-action]");

    if (!boton) {
      return;
    }

    switch (boton.dataset.consultasAction) {
      case "vista":
        vistaActiva = boton.dataset.vista || "movimientos";
        renderConsultas();
        break;

      case "nuevo-movimiento":
        abrirFormularioMovimiento();
        break;

      case "nuevo-acumulado":
        abrirFormularioAcumulado();
        break;
    }
  };
}

// ============================================================
// FORMULARIO: ENVIAR / REGRESAR
// ============================================================

function opcionesExpedientes(expedientes) {
  return expedientes
    .map(
      (expediente) =>
        `<option value="${escapeHTML(getNumeroExpediente(expediente))}"></option>`,
    )
    .join("");
}

function abrirFormularioMovimiento() {
  showModal(`
    <div class="mesas-modal-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step">1</div>
        <div class="mesas-modal-header-text">
          <h2>Enviar / regresar expediente</h2>
          <p>Actualiza la ubicación del expediente.</p>
        </div>
      </header>

      <div class="mesas-modal-body">
        <div class="mesas-fase6-form">

          <label class="mesas-fase6-field">
            <span>Número de expediente</span>
            <input
              id="consultaExpediente"
              type="text"
              list="consultaExpedientesLista"
              placeholder="Ej. 124/2026"
              autocomplete="off"
            >
            <datalist id="consultaExpedientesLista">
              ${opcionesExpedientes(getExpedientesMesaActual())}
            </datalist>
          </label>

          <label class="mesas-fase6-field">
            <span>Acción</span>
            <select id="consultaAccion">
              ${ACCIONES_CONSULTA.map(
                (accion) =>
                  `<option value="${accion.clave}">${escapeHTML(accion.etiqueta)}</option>`,
              ).join("")}
            </select>
          </label>

          <label class="mesas-fase6-field">
            <span>Destino</span>
            <select id="consultaDestino">
              ${DESTINOS_CONSULTA.map(
                (destino) =>
                  `<option value="${escapeHTML(destino)}">${escapeHTML(destino)}</option>`,
              ).join("")}
            </select>
          </label>

          <p class="mesas-fase6-help">
            Al guardar, la "Ubicación del expediente" cambia al destino elegido.
          </p>

          <p class="mesas-fase6-error" id="consultaError" hidden></p>
        </div>
      </div>

      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="consultaCancelar">
          Cancelar
        </button>
        <button type="button" class="mesas-modal-confirm" id="consultaGuardar">
          <i class="fa-solid fa-floppy-disk"></i>
          Guardar movimiento
        </button>
      </footer>
    </div>
  `);

  document
    .getElementById("consultaCancelar")
    ?.addEventListener("click", closeForm);

  document
    .getElementById("consultaGuardar")
    ?.addEventListener("click", guardarMovimiento);
}

function mostrarError(texto) {
  const caja = document.getElementById("consultaError");

  if (!caja) {
    return;
  }

  caja.textContent = texto;
  caja.hidden = !texto;
}

function guardarMovimiento() {
  const numero = document.getElementById("consultaExpediente")?.value.trim() || "";
  const accion = document.getElementById("consultaAccion")?.value || "";
  const destino = document.getElementById("consultaDestino")?.value || "";

  if (!numero) {
    mostrarError("Escribe el número de expediente.");
    return;
  }

  // Solo expedientes de la mesa del usuario (la Magistrada ve todos).
  const expediente = buscarExpedienteExacto(numero);

  if (!expediente) {
    mostrarError(
      "El expediente no existe en tu mesa. Revisa el número e inténtalo de nuevo.",
    );
    return;
  }

  if (!ACCIONES_CONSULTA.some((item) => item.clave === accion)) {
    mostrarError("Selecciona una acción.");
    return;
  }

  if (!DESTINOS_CONSULTA.includes(destino)) {
    mostrarError("Selecciona un destino.");
    return;
  }

  const numeroExacto = getNumeroExpediente(expediente);
  const ahora = new Date().toISOString();
  const usuario = getSession()?.nombre || getSession()?.email || "—";

  // 1. Movimiento
  saveData(KEY_CONSULTAS, [
    ...leerLista(KEY_CONSULTAS),
    {
      id: createId(),
      expediente: numeroExacto,
      accion,
      destino,
      fecha: todayISO(),
      usuario,
      creadoEn: ahora,
    },
  ]);

  // 2. Ubicación del expediente
  const expedientes = getTodosLosExpedientes();

  expedientes.forEach((registro) => {
    if (getNumeroExpediente(registro) === numeroExacto) {
      registro.ubicacion = ubicacionResultante(destino, registro);
    }
  });

  saveData(KEY_EXPEDIENTES, expedientes);

  // 3. Historial del expediente
  const seguimiento = getData(KEY_SEGUIMIENTO, {});

  if (seguimiento && typeof seguimiento === "object") {
    const estado = seguimiento[numeroExacto] || {};

    estado.historial = Array.isArray(estado.historial) ? estado.historial : [];

    const verbo = ACCIONES_CONSULTA.find((item) => item.clave === accion);

    estado.historial.push({
      fecha: ahora,
      movimiento: `${verbo?.pasado || accion} · ${destino} (Consultas)`,
    });

    seguimiento[numeroExacto] = estado;

    saveData(KEY_SEGUIMIENTO, seguimiento);
  }

  closeForm();
  renderConsultas();
}

// ============================================================
// FORMULARIO: ACUMULADOS
// ============================================================

function abrirFormularioAcumulado() {
  showModal(`
    <div class="mesas-modal-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step">2</div>
        <div class="mesas-modal-header-text">
          <h2>Registrar acumulado</h2>
          <p>Relaciona un expediente nuevo con uno antiguo.</p>
        </div>
      </header>

      <div class="mesas-modal-body">
        <div class="mesas-fase6-form">

          <p class="mesas-fase6-notice">
            <i class="fa-solid fa-triangle-exclamation"></i>
            Regla de acumulación pendiente de definir
          </p>

          <label class="mesas-fase6-field">
            <span>Expediente nuevo</span>
            <input
              id="acumuladoNuevo"
              type="text"
              list="acumuladoExpedientesLista"
              placeholder="Ej. 133/2026"
              autocomplete="off"
            >
          </label>

          <label class="mesas-fase6-field">
            <span>Expediente antiguo</span>
            <input
              id="acumuladoAntiguo"
              type="text"
              list="acumuladoExpedientesLista"
              placeholder="Ej. 045/2021"
              autocomplete="off"
            >
          </label>

          <datalist id="acumuladoExpedientesLista">
            ${opcionesExpedientes(getTodosLosExpedientes())}
          </datalist>

          <p class="mesas-fase6-help">
            Ambos expedientes deben existir y ser distintos. Puede ser de otra
            mesa (por ejemplo, uno antiguo de la Mesa 3), pero al menos uno
            debe ser de tu mesa.
          </p>

          <p class="mesas-fase6-error" id="consultaError" hidden></p>
        </div>
      </div>

      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="acumuladoCancelar">
          Cancelar
        </button>
        <button type="button" class="mesas-modal-confirm" id="acumuladoGuardar">
          <i class="fa-solid fa-floppy-disk"></i>
          Guardar acumulado
        </button>
      </footer>
    </div>
  `);

  document
    .getElementById("acumuladoCancelar")
    ?.addEventListener("click", closeForm);

  document
    .getElementById("acumuladoGuardar")
    ?.addEventListener("click", guardarAcumulado);
}

function guardarAcumulado() {
  const textoNuevo = document.getElementById("acumuladoNuevo")?.value.trim() || "";
  const textoAntiguo = document.getElementById("acumuladoAntiguo")?.value.trim() || "";

  if (!textoNuevo || !textoAntiguo) {
    mostrarError("Escribe los dos números de expediente.");
    return;
  }

  const nuevo = buscarEnTodos(textoNuevo);
  const antiguo = buscarEnTodos(textoAntiguo);

  if (!nuevo) {
    mostrarError(`El expediente nuevo "${textoNuevo}" no existe.`);
    return;
  }

  if (!antiguo) {
    mostrarError(`El expediente antiguo "${textoAntiguo}" no existe.`);
    return;
  }

  const numeroNuevo = getNumeroExpediente(nuevo);
  const numeroAntiguo = getNumeroExpediente(antiguo);

  if (numeroNuevo.toLowerCase() === numeroAntiguo.toLowerCase()) {
    mostrarError("El expediente nuevo y el antiguo deben ser distintos.");
    return;
  }

  // Regla de acumulación (PENDIENTE: hoy siempre permite)
  if (!puedeAcumular(nuevo) || !puedeAcumular(antiguo)) {
    mostrarError("La regla de acumulación no permite acumular estos expedientes.");
    return;
  }

  // Al menos uno debe ser de la mesa del usuario
  if (mesaUsuarioActual()) {
    const propios = numerosDeMesa();

    if (!propios.has(numeroNuevo) && !propios.has(numeroAntiguo)) {
      mostrarError("Al menos uno de los expedientes debe ser de tu mesa.");
      return;
    }
  }

  // Sin duplicados (en cualquier orden)
  const repetido = leerLista(KEY_ACUMULADOS).some(
    (item) =>
      (item.expedienteNuevo === numeroNuevo &&
        item.expedienteAntiguo === numeroAntiguo) ||
      (item.expedienteNuevo === numeroAntiguo &&
        item.expedienteAntiguo === numeroNuevo),
  );

  if (repetido) {
    mostrarError("Este acumulado ya está registrado.");
    return;
  }

  saveData(KEY_ACUMULADOS, [
    ...leerLista(KEY_ACUMULADOS),
    {
      id: createId(),
      expedienteNuevo: numeroNuevo,
      expedienteAntiguo: numeroAntiguo,
      fecha: todayISO(),
      usuario: getSession()?.nombre || getSession()?.email || "—",
    },
  ]);

  vistaActiva = "acumulados";

  closeForm();
  renderConsultas();
}

// ============================================================
// HELPERS
// ============================================================

function formatFecha(valor) {
  const texto = String(valor || "").slice(0, 10);
  const partes = texto.split("-");

  if (partes.length === 3 && partes[0].length === 4) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  return valor || "—";
}
