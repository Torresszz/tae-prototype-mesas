// =====================================================
// HISTORICO
// Dashboard Tribunal
// =====================================================

import { getData } from "../storage.js";

import { escapeHTML, formatDate } from "../utils.js";

// =====================================================
// INICIALIZAR MODULO
// =====================================================

export function initHistorico() {
  window.initHistoricoPage = initHistoricoPage;
}

// =====================================================
// INICIALIZAR PAGINA
// =====================================================

export function initHistoricoPage() {
  renderHistorico();
}

// =====================================================
// OBTENER TODOS LOS REGISTROS
// =====================================================

function getAllRecords() {
  const demandas = getData("demandas", []).map((item) => ({
    tipo: "Demanda",

    fecha: item.creadoEn,

    referencia: item.expediente,

    detalle: `${item.demandante} vs ${item.demandado}`,
  }));

  const amparos = getData("amparos", []).map((item) => ({
    tipo: "Amparo",

    fecha: item.creadoEn,

    referencia: item.expediente,

    detalle: item.promueve,
  }));

  const exhortos = getData("exhortos", []).map((item) => ({
    tipo: "Exhorto",

    fecha: item.creadoEn,

    referencia: item.numero,

    detalle: item.autoridad,
  }));

  const promociones = getData("promociones", []).map((item) => ({
    tipo: "Promoción",

    fecha: item.creadoEn,

    referencia: item.numero,

    detalle: item.expediente,
  }));

  const oficios = getData("oficios", []).map((item) => ({
    tipo: "Oficio",

    fecha: item.creadoEn,

    referencia: item.numero,

    detalle: item.asunto,
  }));

  return [...demandas, ...amparos, ...exhortos, ...promociones, ...oficios];
}

// =====================================================
// RENDER HISTORICO
// =====================================================

export function renderHistorico() {
  const table = document.getElementById("historyTable");

  if (!table) {
    return;
  }

  let registros = getAllRecords();

  if (registros.length === 0) {
    table.innerHTML = `


        <tr>

            <td colspan="5">

            No existen registros históricos.

            </td>

        </tr>


        `;

    return;
  }

  registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  table.innerHTML = registros
    .map(
      (item) => `



<tr>



<td>

${formatDate(item.fecha)}

</td>





<td>

<span class="badge">

${escapeHTML(item.tipo)}

</span>

</td>





<td>

${escapeHTML(item.referencia)}

</td>





<td>

${escapeHTML(item.tipo)}

</td>





<td>

${escapeHTML(item.detalle)}

</td>



</tr>



`,
    )

    .join("");
}
