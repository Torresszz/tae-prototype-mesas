// =====================================================
// MODULO REGISTRAL
// =====================================================
//
// Mismo registro de datos que Promociones, pero cada documento
// lleva el número de expediente propio del sindicato de donde
// proviene y se envía a Presidencia (ver Resumen histórico).
// Se guarda en la clave "registrales" de localStorage.
// =====================================================

import { getData } from "../storage.js";

import { escapeHTML, escapeJS, formatDate } from "../utils.js";

import { showModal } from "../forms/formHelper.js";

let filtro = "";

// =====================================================
// INICIALIZAR
// =====================================================

export function initRegistral() {
  window.renderRegistral = renderRegistral;

  window.viewRegistral = viewRegistral;
}

// =====================================================
// RENDER TABLA
// =====================================================

export function renderRegistral() {
  const table = document.getElementById("registralTable");

  if (!table) {
    return;
  }

  bindSearch();

  const registrales = getData("registrales", []).filter((item) => {
    if (!filtro) {
      return true;
    }

    const texto = `
      ${item.expediente || ""}
      ${item.sindicato || ""}
      ${item.oficio || ""}
      ${item.tipo || ""}
      ${item.descripcion || ""}
    `.toLowerCase();

    return texto.includes(filtro);
  });

  if (registrales.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="7">No existen registrales registrados.</td>
      </tr>
    `;

    return;
  }

  table.innerHTML = registrales
    .map(
      (item) => `
      <tr>
        <td>${escapeHTML(item.expediente || "-")}</td>
        <td>${escapeHTML(item.sindicato || "-")}</td>
        <td>${escapeHTML(item.oficio || "-")}</td>
        <td>${formatDate(item.fecha)}</td>
        <td>${escapeHTML(item.tipo || "-")}</td>
        <td>${escapeHTML(item.descripcion || "-")}</td>
        <td>
          <button class="table-action" onclick="viewRegistral('${escapeJS(item.id)}')">
            Ver
          </button>
        </td>
      </tr>
    `,
    )
    .join("");
}

function bindSearch() {
  const input = document.getElementById("registralSearch");

  if (!input) {
    return;
  }

  input.oninput = (event) => {
    filtro = event.target.value.trim().toLowerCase();

    renderRegistral();
  };
}

// =====================================================
// DETALLE
// =====================================================

export function viewRegistral(id) {
  const registral = getData("registrales", []).find(
    (item) => String(item.id) === String(id),
  );

  if (!registral) {
    return;
  }

  const campo = (label, value) => `
    <div class="detail-item">
      <span>${label}</span>
      <strong>${escapeHTML(value || "-")}</strong>
    </div>
  `;

  showModal(`
    <div class="form-header">
      <span>Detalle registral</span>
      <h2>${escapeHTML(registral.expediente || "Sin expediente")}</h2>
    </div>

    <div class="form-body">
      <div class="detail-grid">
        ${campo("Expediente (sindicato)", registral.expediente)}
        ${campo("Sindicato", registral.sindicato)}
        ${campo("Fecha", formatDate(registral.fecha))}
        ${campo("Oficio relacionado", registral.oficio)}
        ${campo("Tipo", registral.tipo)}
        ${campo("Estado", registral.estado)}
        ${campo("Destino", "Presidencia")}
        ${campo("Descripción", registral.descripcion)}
      </div>
    </div>
  `);
}
