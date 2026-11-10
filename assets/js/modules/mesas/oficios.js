// ============================================================
// OFICIOS (REGISTRO DE NÚMEROS DE OFICIO)
// assets/js/modules/mesas/oficios.js
// FASE 6 - T-19
//
// Llave: "registroOficios"  (NO es la llave "oficios": esa es de
// Oficialía y guarda los oficios recibidos).
//
// Registro: { id, anio, consecutivo, fecha, dirigidoA, asunto,
//             expediente, elaboradoPor }
//
// - El consecutivo lo asigna el sistema: siguiente número del año de
//   la fecha del oficio, calculado al GUARDAR para que no se repita.
// - El repositorio es compartido por todas las mesas: no se filtra por
//   mesa (sí por la barra global: expediente y fechas).
// ============================================================

import { getData, saveData } from "../../storage.js";
import { createId, escapeHTML, todayISO } from "../../utils.js";
import { getSession } from "../../auth.js";
import { showModal, closeForm } from "../../forms/formHelper.js";

import { aplicarFiltrosGlobales, normalizarDia } from "./filtros.js";
import {
  buscarExpedienteExacto,
  getExpedientesMesaActual,
  getNumeroExpediente,
} from "./mesaUtils.js";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY_OFICIOS = "registroOficios";

// ⚠️ Formato de presentación por confirmar. Es el mismo que ya usan los
// oficios de ejemplo del proyecto (p. ej. TAE-SA-0142/2026). Es el único
// lugar donde cambiarlo.
const PREFIJO_OFICIO = "TAE-SA-";

export function formatoNumeroOficio(oficio) {
  const consecutivo = String(oficio.consecutivo).padStart(4, "0");

  return `${PREFIJO_OFICIO}${consecutivo}/${oficio.anio}`;
}

let anioSeleccionado = Number(todayISO().slice(0, 4));

// ============================================================
// DATOS
// ============================================================

function getOficios() {
  const datos = getData(KEY_OFICIOS, []);

  return Array.isArray(datos) ? datos : [];
}

function anioDe(fecha) {
  const dia = normalizarDia(fecha);

  return dia ? Number(dia.slice(0, 4)) : null;
}

// Siguiente consecutivo del año (se vuelve a calcular al guardar).
function siguienteConsecutivo(anio) {
  const usados = getOficios()
    .filter((oficio) => Number(oficio.anio) === Number(anio))
    .map((oficio) => Number(oficio.consecutivo) || 0);

  return Math.max(0, ...usados) + 1;
}

function aniosDisponibles() {
  const anios = new Set(
    getOficios()
      .map((oficio) => Number(oficio.anio))
      .filter(Boolean),
  );

  anios.add(Number(todayISO().slice(0, 4)));

  return [...anios].sort((a, b) => b - a);
}

function getOficiosVisibles() {
  const delAnio = getOficios()
    .filter((oficio) => Number(oficio.anio) === Number(anioSeleccionado))
    .sort((a, b) => Number(b.consecutivo) - Number(a.consecutivo));

  return aplicarFiltrosGlobales(delAnio, {
    numero: (oficio) => oficio.expediente,
    fecha: (oficio) => oficio.fecha,
  });
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderOficiosMesas() {
  const vista = document.querySelector('[data-mesas-vista="oficios"]');

  if (!vista) {
    return;
  }

  const anios = aniosDisponibles();

  if (!anios.includes(anioSeleccionado)) {
    anioSeleccionado = anios[0];
  }

  const visibles = getOficiosVisibles();
  const totalAnio = getOficios().filter(
    (oficio) => Number(oficio.anio) === Number(anioSeleccionado),
  ).length;

  vista.innerHTML = `
    <section class="mesas-fase6-section">

      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Fase 6 · T-19</span>
          <h2>Oficios</h2>
          <p>
            Registro de números de oficio. El consecutivo lo asigna el
            sistema y el repositorio es compartido por todas las mesas.
          </p>
        </div>

        <div class="mesas-fase6-actions">
          <button
            type="button"
            class="mesas-primary-btn"
            data-oficios-action="nuevo"
          >
            <i class="fa-solid fa-hashtag"></i>
            Asignar número de oficio
          </button>
        </div>
      </div>

      <div class="mesas-fase6-toolbar">
        <label class="mesas-fase6-field">
          <span>Año del repositorio</span>
          <select id="oficiosAnio">
            ${anios
              .map(
                (anio) =>
                  `<option value="${anio}" ${anio === anioSeleccionado ? "selected" : ""}>${anio}</option>`,
              )
              .join("")}
          </select>
        </label>

        <div class="mesas-fase6-chip">
          <span>Oficios de ${anioSeleccionado}</span>
          <strong>${totalAnio}</strong>
        </div>

        <div class="mesas-fase6-chip">
          <span>Siguiente consecutivo</span>
          <strong>${String(siguienteConsecutivo(anioSeleccionado)).padStart(4, "0")}</strong>
        </div>
      </div>

      <section class="mesas-secretaria-table-card">
        ${
          visibles.length
            ? `
              <div class="mesas-table-wrapper">
                <table class="mesas-fase6-table">
                  <thead>
                    <tr>
                      <th>Consecutivo</th>
                      <th>Fecha</th>
                      <th>Dirigido a</th>
                      <th>Asunto</th>
                      <th>Expediente</th>
                      <th>Elaborado por</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${visibles
                      .map(
                        (oficio) => `
                          <tr>
                            <td>
                              <span class="mesas-expediente-number">
                                ${escapeHTML(formatoNumeroOficio(oficio))}
                              </span>
                            </td>
                            <td>${escapeHTML(formatFecha(oficio.fecha))}</td>
                            <td>${escapeHTML(oficio.dirigidoA)}</td>
                            <td>${escapeHTML(oficio.asunto)}</td>
                            <td>${escapeHTML(oficio.expediente || "—")}</td>
                            <td>${escapeHTML(oficio.elaboradoPor || "—")}</td>
                          </tr>
                        `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
            : `
              <div class="mesas-empty-state">
                <div class="mesas-empty-icon">
                  <i class="fa-solid fa-envelope-open-text"></i>
                </div>
                <strong>No hay oficios en esta vista</strong>
                <span>Asigna un número de oficio o cambia el año y los filtros.</span>
              </div>
            `
        }
      </section>

      <div data-plantillas-slot></div>

    </section>
  `;

  configurarEventos(vista);
}

// ============================================================
// EVENTOS
// ============================================================

function configurarEventos(vista) {
  vista.onclick = (event) => {
    const boton = event.target.closest("[data-oficios-action]");

    if (boton?.dataset.oficiosAction === "nuevo") {
      abrirFormularioOficio();
    }
  };

  const selector = document.getElementById("oficiosAnio");

  if (selector) {
    selector.onchange = (event) => {
      anioSeleccionado = Number(event.target.value);
      renderOficiosMesas();
    };
  }
}

// ============================================================
// FORMULARIO: ASIGNAR NÚMERO DE OFICIO
// ============================================================

function abrirFormularioOficio() {
  const sesion = getSession();
  const elaboradoPor = sesion?.nombre || sesion?.email || "—";

  showModal(`
    <div class="mesas-modal-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step">#</div>
        <div class="mesas-modal-header-text">
          <h2>Asignar número de oficio</h2>
          <p>El consecutivo lo asigna el sistema.</p>
        </div>
      </header>

      <div class="mesas-modal-body">
        <div class="mesas-fase6-form">

          <label class="mesas-fase6-field">
            <span>Fecha</span>
            <input id="oficioFecha" type="date" value="${todayISO()}">
          </label>

          <label class="mesas-fase6-field">
            <span>Dirigido a</span>
            <input id="oficioDirigidoA" type="text" autocomplete="off">
          </label>

          <label class="mesas-fase6-field">
            <span>Asunto</span>
            <textarea id="oficioAsunto" rows="3"></textarea>
          </label>

          <label class="mesas-fase6-field">
            <span>Expediente</span>
            <input
              id="oficioExpediente"
              type="text"
              list="oficioExpedientesLista"
              placeholder="Ej. 124/2026"
              autocomplete="off"
            >
            <datalist id="oficioExpedientesLista">
              ${getExpedientesMesaActual()
                .map(
                  (expediente) =>
                    `<option value="${escapeHTML(getNumeroExpediente(expediente))}"></option>`,
                )
                .join("")}
            </datalist>
          </label>

          <label class="mesas-fase6-field">
            <span>Elaborado por</span>
            <input id="oficioElaboradoPor" type="text" value="${escapeHTML(elaboradoPor)}" readonly>
          </label>

          <p class="mesas-fase6-help" id="oficioPreview"></p>
          <p class="mesas-fase6-error" id="oficioError" hidden></p>
        </div>
      </div>

      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="oficioCancelar">
          Cancelar
        </button>
        <button type="button" class="mesas-modal-confirm" id="oficioGuardar">
          <i class="fa-solid fa-floppy-disk"></i>
          Asignar número
        </button>
      </footer>
    </div>
  `);

  const actualizarVista = () => {
    const anio = anioDe(document.getElementById("oficioFecha")?.value);
    const preview = document.getElementById("oficioPreview");

    if (!preview) {
      return;
    }

    preview.textContent = anio
      ? `Se asignará el consecutivo ${String(siguienteConsecutivo(anio)).padStart(4, "0")} del año ${anio}.`
      : "Indica una fecha válida para calcular el consecutivo.";
  };

  actualizarVista();

  document
    .getElementById("oficioFecha")
    ?.addEventListener("input", actualizarVista);

  document
    .getElementById("oficioCancelar")
    ?.addEventListener("click", closeForm);

  document
    .getElementById("oficioGuardar")
    ?.addEventListener("click", guardarOficio);
}

function mostrarError(texto) {
  const caja = document.getElementById("oficioError");

  if (!caja) {
    return;
  }

  caja.textContent = texto;
  caja.hidden = !texto;
}

function guardarOficio() {
  const fecha = normalizarDia(document.getElementById("oficioFecha")?.value);
  const dirigidoA = document.getElementById("oficioDirigidoA")?.value.trim() || "";
  const asunto = document.getElementById("oficioAsunto")?.value.trim() || "";
  const textoExpediente = document.getElementById("oficioExpediente")?.value.trim() || "";

  if (!fecha) {
    mostrarError("Indica una fecha válida.");
    return;
  }

  if (!dirigidoA) {
    mostrarError("Indica a quién va dirigido el oficio.");
    return;
  }

  if (!asunto) {
    mostrarError("Escribe el asunto del oficio.");
    return;
  }

  if (!textoExpediente) {
    mostrarError("Indica el número de expediente.");
    return;
  }

  const expediente = buscarExpedienteExacto(textoExpediente);

  if (!expediente) {
    mostrarError(
      "El expediente no existe en tu mesa. Revisa el número e inténtalo de nuevo.",
    );
    return;
  }

  // El consecutivo se calcula AQUÍ, con los datos más recientes,
  // para que dos oficios no compartan número.
  const anio = Number(fecha.slice(0, 4));
  const consecutivo = siguienteConsecutivo(anio);
  const sesion = getSession();

  saveData(KEY_OFICIOS, [
    ...getOficios(),
    {
      id: createId(),
      anio,
      consecutivo,
      fecha,
      dirigidoA,
      asunto,
      expediente: getNumeroExpediente(expediente),
      elaboradoPor: sesion?.nombre || sesion?.email || "—",
    },
  ]);

  // Muestra el repositorio del año del oficio recién creado
  anioSeleccionado = anio;

  closeForm();
  renderOficiosMesas();
}

// ============================================================
// HELPERS
// ============================================================

function formatFecha(valor) {
  const dia = normalizarDia(valor);

  if (!dia) {
    return valor || "—";
  }

  const [anio, mes, diaMes] = dia.split("-");

  return `${diaMes}/${mes}/${anio}`;
}
