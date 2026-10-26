// =====================================================
// MODULO DEMANDAS
// Tribunal
// =====================================================

import { getData } from "../storage.js";

import { escapeHTML, escapeJS, formatDate } from "../utils.js";

// =====================================================
// VARIABLES
// =====================================================

let demandas = [];

// =====================================================
// INICIALIZAR
// =====================================================

export function initDemandas() {
  cargarDemandas();

  window.renderDemandas = renderDemandas;

  window.viewDemanda = viewDemanda;

  window.searchDemandas = searchDemandas;

  document.addEventListener("input", manejarBusquedaDemandas);
}

// =====================================================
// CARGAR DATOS
// =====================================================

function cargarDemandas() {
  demandas = getData("demandas", []);
}

// =====================================================
// RENDER PRINCIPAL
// =====================================================

export function renderDemandas() {
  cargarDemandas();

  const table = document.getElementById("demandasTable");

  if (!table) {
    return;
  }

  actualizarResumen();

  const search = document.getElementById("demandasSearch");

  const texto = search ? search.value.trim() : "";

  const registros = filtrarDemandas(texto);

  renderTabla(registros);
}

// =====================================================
// RENDER TABLA
// =====================================================

function renderTabla(registros) {
  const table = document.getElementById("demandasTable");

  const empty = document.getElementById("demandasEmpty");

  if (!table) {
    return;
  }

  if (registros.length === 0) {
    table.innerHTML = "";

    if (empty) {
      empty.hidden = demandas.length !== 0;
    }

    return;
  }

  if (empty) {
    empty.hidden = true;
  }

  table.innerHTML = registros
    .map((demanda) => crearFilaDemanda(demanda))
    .join("");
}

// =====================================================
// CREAR FILA
// =====================================================

function crearFilaDemanda(demanda) {
  const expediente = demanda.expediente || "—";

  const fecha = demanda.fecha || demanda.fechaLlegada || "";

  const demandante = demanda.demandante || demanda.actor || "—";

  const demandado = demanda.demandado || "—";

  const actos = demanda.actos || demanda.actosDemanda || "—";

  return `

        <tr>

            <td>

                <strong class="table-main-value">

                    ${escapeHTML(expediente)}

                </strong>

            </td>


            <td>

                ${fecha ? formatDate(fecha) : "—"}

            </td>


            <td>

                ${escapeHTML(demandante)}

            </td>


            <td>

                ${escapeHTML(demandado)}

            </td>


            <td>

                <div class="table-description">

                    ${escapeHTML(actos)}

                </div>

            </td>


            <td>

                <button
                    type="button"
                    class="table-action"
                    onclick="viewDemanda('${escapeJS(demanda.id)}')"
                >

                    Ver detalle

                </button>

            </td>

        </tr>

    `;
}

// =====================================================
// BUSQUEDA
// =====================================================

function manejarBusquedaDemandas(event) {
  const input = event.target.closest("#demandasSearch");

  if (!input) {
    return;
  }

  searchDemandas(input.value);
}

export function searchDemandas(texto = "") {
  const registros = filtrarDemandas(texto);

  renderTabla(registros);
}

function filtrarDemandas(texto) {
  const termino = texto.toLowerCase().trim();

  if (!termino) {
    return demandas;
  }

  return demandas.filter((demanda) => {
    const expediente = String(demanda.expediente || "").toLowerCase();

    const demandante = String(
      demanda.demandante || demanda.actor || "",
    ).toLowerCase();

    const demandado = String(demanda.demandado || "").toLowerCase();

    const actos = String(
      demanda.actos || demanda.actosDemanda || "",
    ).toLowerCase();

    return (
      expediente.includes(termino) ||
      demandante.includes(termino) ||
      demandado.includes(termino) ||
      actos.includes(termino)
    );
  });
}

// =====================================================
// RESUMEN
// =====================================================

function actualizarResumen() {
  const total = document.getElementById("demandasTotal");

  const hoy = document.getElementById("demandasHoy");

  const ultima = document.getElementById("demandasUltima");

  if (total) {
    total.textContent = demandas.length;
  }

  const fechaHoy = new Date().toISOString().slice(0, 10);

  const capturasHoy = demandas.filter((demanda) => {
    if (!demanda.creadoEn) {
      return false;
    }

    return demanda.creadoEn.startsWith(fechaHoy);
  });

  if (hoy) {
    hoy.textContent = capturasHoy.length;
  }

  if (ultima) {
    if (demandas.length === 0) {
      ultima.textContent = "—";
    } else {
      const ultimaDemanda = [...demandas].sort(
        (a, b) => new Date(b.creadoEn || 0) - new Date(a.creadoEn || 0),
      )[0];

      if (ultimaDemanda.creadoEn) {
        ultima.textContent = new Date(
          ultimaDemanda.creadoEn,
        ).toLocaleTimeString("es-MX", {
          hour: "2-digit",

          minute: "2-digit",
        });
      } else {
        ultima.textContent = "—";
      }
    }
  }
}

// =====================================================
// VER DETALLE
// =====================================================

export function viewDemanda(id) {
  const demanda = demandas.find((item) => item.id === id);

  if (!demanda) {
    return;
  }

  const modal = document.getElementById("modal");

  const content = document.getElementById("modalContent");

  if (!modal || !content) {
    console.error("No se encontró el modal.");

    return;
  }

  const expediente = demanda.expediente || "—";

  const fecha = demanda.fecha || demanda.fechaLlegada || "";

  const demandante = demanda.demandante || demanda.actor || "—";

  const demandado = demanda.demandado || "—";

  const actos = demanda.actos || demanda.actosDemanda || "—";

  content.innerHTML = `

        <div class="form-header">

            <span>
                Detalle de demanda
            </span>

            <h2>
                Expediente ${escapeHTML(expediente)}
            </h2>

        </div>



        <div class="form-body">

            <div class="detail-grid">


                <div class="detail-item">

                    <span>
                        Número de expediente
                    </span>

                    <strong>
                        ${escapeHTML(expediente)}
                    </strong>

                </div>



                <div class="detail-item">

                    <span>
                        Fecha de llegada
                    </span>

                    <strong>
                        ${fecha ? formatDate(fecha) : "—"}
                    </strong>

                </div>



                <div class="detail-item">

                    <span>
                        Demandante
                    </span>

                    <strong>
                        ${escapeHTML(demandante)}
                    </strong>

                </div>



                <div class="detail-item">

                    <span>
                        Demandado
                    </span>

                    <strong>
                        ${escapeHTML(demandado)}
                    </strong>

                </div>



                <div class="detail-item detail-item-full">

                    <span>
                        Actos de la demanda
                    </span>

                    <strong>
                        ${escapeHTML(actos)}
                    </strong>

                </div>


            </div>



            <div class="form-actions">

                <button
                    type="button"
                    class="secondary-btn"
                    onclick="closeForm()"
                >
                    Cerrar
                </button>

            </div>


        </div>

    `;

  modal.classList.add("show");
}
