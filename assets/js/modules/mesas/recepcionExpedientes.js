// ============================================================
// RECEPCIÓN DE EXPEDIENTES EN MESAS
// assets/js/modules/mesas/recepcionExpedientes.js
//
// Oficialía registra la demanda y crea su expediente con
// recibidoMesa:false ("Pendiente de recibir"). Mesa no lo ve en sus
// tablas hasta pulsar "Recibir" (mismo patrón que Promociones y
// Exhortos). Al recibirlo:
//   - recibidoMesa = true, recibidoMesaEn / recibidoMesaPor
//   - ubicación = "Mesa N" (según la asignación de mesa)
//   - se crea su seguimiento con estado "En proceso"
// La demanda entra a "Demanda" con radicación "En proceso".
//
// ⚠️ El pendiente nace al registrarse en Oficialía (igual que
// promociones y exhortos): no depende del botón "Mandar a mesas"
// del Histórico, que solo deja constancia del envío.
// ============================================================

import { getData, saveData } from "../../storage.js";
import { escapeHTML } from "../../utils.js";
import { getSession, canSign } from "../../auth.js";
import { showModal, closeForm } from "../../forms/formHelper.js";
import {
  getNumeroExpediente,
  mesaDeExpediente,
  mesaUsuarioActual,
} from "./mesaUtils.js";
import { ESTADO_INICIAL } from "./estados.js";

const KEY_EXPEDIENTES = "expedientes";
const KEY_SEGUIMIENTO = "mesasSeguimiento";

// ------------------------------------------------------------
// PENDIENTES
// ------------------------------------------------------------
export function getExpedientesPendientesMesa() {
  const datos = getData(KEY_EXPEDIENTES, []);

  const mesaActual = mesaUsuarioActual();

  return (Array.isArray(datos) ? datos : [])
    .filter((expediente) => expediente?.recibidoMesa === false)
    .map((expediente) => ({
      expediente,
      numero: getNumeroExpediente(expediente),
      mesaDestino: mesaDeExpediente(expediente),
    }))
    .filter(
      (item) =>
        item.numero &&
        (!mesaActual || Number(item.mesaDestino) === Number(mesaActual)),
    )
    .sort((a, b) =>
      String(b.expediente.fecha || b.expediente.creadoEn || "").localeCompare(
        String(a.expediente.fecha || a.expediente.creadoEn || ""),
      ),
    );
}

// ------------------------------------------------------------
// TARJETA
// ------------------------------------------------------------
export function renderRecepcionExpedientes() {
  const host = document.getElementById("mesasRecepcionExpedientes");

  if (!host) return;

  const pendientes = getExpedientesPendientesMesa();

  host.innerHTML = `
    <section class="mesas-recepcion-card">
      <div class="mesas-recepcion-card-header">
        <div>
          <span class="mesas-mini-eyebrow">Oficialía de Partes</span>
          <h2>Expedientes por recibir</h2>
        </div>
        <span class="mesas-recepcion-counter">${pendientes.length}</span>
      </div>

      <div class="mesas-recepcion-card-body">
        <p>
          ${
            pendientes.length
              ? `${pendientes.length} ${
                  pendientes.length === 1
                    ? "expediente pendiente"
                    : "expedientes pendientes"
                } (demandas nuevas) para esta mesa.`
              : "No hay expedientes pendientes de recibir."
          }
        </p>

        <button
          type="button"
          class="mesas-secondary-btn mesas-recepcion-open-btn"
          id="mesasVerExpedientesPendientes"
          ${pendientes.length ? "" : "disabled"}
        >
          <i class="fa-solid fa-inbox"></i>
          Ver expedientes
        </button>
      </div>
    </section>
  `;

  const boton = document.getElementById("mesasVerExpedientesPendientes");

  if (boton && pendientes.length) {
    boton.onclick = abrirModalPendientes;
  }
}

// ------------------------------------------------------------
// MODAL
// ------------------------------------------------------------
function fechaCorta(valor) {
  const [a, m, d] = String(valor || "").slice(0, 10).split("-");

  return a && m && d ? `${d}/${m}/${a}` : "—";
}

export function abrirModalPendientes() {
  const pendientes = getExpedientesPendientesMesa();

  // La Magistrada ve la lista, pero solo Mesa recibe.
  const puedeRecibir = !canSign();

  showModal(`
    <div class="mesas-modal-shell mesas-recepcion-modal">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-inbox"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Expedientes por recibir</h2>
          <p>Demandas nuevas registradas en Oficialía de Partes.</p>
        </div>
      </header>

      <div class="mesas-modal-body">
        ${
          pendientes.length
            ? `<div class="mesas-recepcion-list">${pendientes
                .map(
                  (item) => `
            <article class="mesas-recepcion-item">
              <div class="mesas-recepcion-item-main">
                <div class="mesas-recepcion-item-top">
                  <strong>Expediente ${escapeHTML(item.numero)}</strong>
                  <span class="mesas-recepcion-mesa-badge">Mesa ${escapeHTML(item.mesaDestino)}</span>
                </div>
                <div class="mesas-recepcion-item-grid">
                  <div><span>Fecha de recepción</span><strong>${escapeHTML(fechaCorta(item.expediente.fechaRecepcion || item.expediente.fecha))}</strong></div>
                  <div><span>Actor</span><strong>${escapeHTML(item.expediente.actor || "—")}</strong></div>
                  <div><span>Demandado</span><strong>${escapeHTML(item.expediente.demandado || "—")}</strong></div>
                  <div><span>Acto demandado</span><strong>${escapeHTML(item.expediente.actoDemandado || "—")}</strong></div>
                </div>
              </div>
              ${
                puedeRecibir
                  ? `<button type="button" class="mesas-primary-btn" data-recibir-expediente="${escapeHTML(item.numero)}"><i class="fa-solid fa-inbox"></i> Recibir</button>`
                  : ""
              }
            </article>`,
                )
                .join("")}</div>`
            : `<p>No hay expedientes pendientes de recibir.</p>`
        }
      </div>

      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="mesasCerrarRecepcionExpedientes">Cerrar</button>
      </footer>
    </div>
  `);

  document
    .getElementById("mesasCerrarRecepcionExpedientes")
    ?.addEventListener("click", closeForm);

  document.querySelectorAll("[data-recibir-expediente]").forEach((boton) => {
    boton.addEventListener("click", () =>
      recibirExpediente(boton.dataset.recibirExpediente),
    );
  });
}

// ------------------------------------------------------------
// RECIBIR
// ------------------------------------------------------------
export function recibirExpediente(numero) {
  const registro = getExpedientesPendientesMesa().find(
    (item) => item.numero === String(numero),
  );

  if (!registro) return;

  const datos = getData(KEY_EXPEDIENTES, []);

  const lista = Array.isArray(datos) ? datos : [];

  const expediente = lista.find(
    (item) => getNumeroExpediente(item) === registro.numero,
  );

  if (!expediente) return;

  const ahora = new Date().toISOString();

  const sesion = getSession();

  expediente.recibidoMesa = true;
  expediente.recibidoMesaEn = ahora;
  expediente.recibidoMesaPor = sesion?.nombre || sesion?.email || "Mesa";
  expediente.mesaRecepcion = registro.mesaDestino;
  expediente.ubicacion = `Mesa ${registro.mesaDestino}`;

  saveData(KEY_EXPEDIENTES, lista);

  // Seguimiento: nace "En proceso" al llegar a Mesa.
  const seguimiento = getData(KEY_SEGUIMIENTO, {});

  const mapa =
    seguimiento && typeof seguimiento === "object" && !Array.isArray(seguimiento)
      ? seguimiento
      : {};

  const movimiento = "Recibido en Mesa; pasa a En proceso";

  mapa[registro.numero] = {
    ...(mapa[registro.numero] || {}),
    estado: ESTADO_INICIAL,
    recibidoEn: ahora,
    ultimoMovimiento: movimiento,
    acuerdo: mapa[registro.numero]?.acuerdo ?? null,
    archivoAcuerdo: mapa[registro.numero]?.archivoAcuerdo ?? null,
    enviadoFirmaEn: mapa[registro.numero]?.enviadoFirmaEn ?? null,
    archivadoEn: mapa[registro.numero]?.archivadoEn ?? null,
    historial: [
      ...(Array.isArray(mapa[registro.numero]?.historial)
        ? mapa[registro.numero].historial
        : []),
      { fecha: ahora, movimiento },
    ],
  };

  saveData(KEY_SEGUIMIENTO, mapa);

  if (typeof window.renderMesas === "function") {
    window.renderMesas();
  } else {
    renderRecepcionExpedientes();
  }

  // Deja abierto el modal para recibir los restantes.
  if (getExpedientesPendientesMesa().length) {
    abrirModalPendientes();
  } else {
    closeForm();
  }
}
