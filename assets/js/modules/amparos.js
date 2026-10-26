// ============================================================
// MÓDULO AMPAROS
// ============================================================

import { getData, saveData } from "../storage.js";

import { escapeHTML } from "../utils.js";
import { showModal } from "../forms/formHelper.js";

// ============================================================
// ESTADO
// ============================================================

let currentFilter = "";

// ============================================================
// INICIALIZAR
// ============================================================

export async function initAmparos() {
  // Permite que amparoForm.js actualice la tabla
  // inmediatamente después de guardar.
  window.renderAmparos = renderAmparos;

  currentFilter = "";

  await seedAmparosEjemplo();

  bindAmparosEvents();

  renderAmparos();
}

// Compatibilidad con el nombre anterior
export const initAmparosPage = initAmparos;

// ============================================================
// DATOS DE EJEMPLO
// ============================================================

async function seedAmparosEjemplo() {
  const actuales = getData("amparos", []);

  // Si ya existen registros no hacemos nada.
  if (actuales.length > 0) {
    return;
  }

  try {
    const url = new URL("../../data/amparos-ejemplo.json", import.meta.url);

    const response = await fetch(url);

    if (!response.ok) {
      console.warn("No se pudo cargar amparos-ejemplo.json");

      return;
    }

    const data = await response.json();

    const ejemplos = Array.isArray(data) ? data : data.amparos || [];

    if (!ejemplos.length) {
      return;
    }

    saveData("amparos", ejemplos);
  } catch (error) {
    console.error("Error cargando amparos de ejemplo:", error);
  }
}

// ============================================================
// EVENTOS
// ============================================================

function bindAmparosEvents() {
  const search = document.getElementById("amparosSearch");

  if (search) {
    search.oninput = (event) => {
      currentFilter = event.target.value.trim().toLowerCase();

      renderAmparos();
    };
  }

  document.querySelectorAll('[data-action="new-amparo"]').forEach((button) => {
    button.onclick = () => {
      if (typeof window.openAmparoForm === "function") {
        window.openAmparoForm();
      }
    };
  });
}

// ============================================================
// RENDER TABLA
// ============================================================

export function renderAmparos() {
  const tbody = document.getElementById("amparosTable");

  const empty = document.getElementById("amparosEmpty");

  if (!tbody) {
    return;
  }

  // SIEMPRE leemos la versión más reciente.
  const amparos = getData("amparos", []);

  const filtered = amparos.filter((amparo) => {
    if (!currentFilter) {
      return true;
    }

    const text = `

                    ${amparo.expediente || ""}
                    ${amparo.promovente || ""}
                    ${amparo.juzgado || ""}
                    ${amparo.oficio || ""}
                    ${amparo.actoReclamado || ""}
                    ${amparo.estado || ""}

                `.toLowerCase();

    return text.includes(currentFilter);
  });

  // ========================================================
  // SIN REGISTROS
  // ========================================================

  if (!filtered.length) {
    tbody.innerHTML = "";

    if (empty) {
      empty.hidden = false;
    }

    return;
  }

  if (empty) {
    empty.hidden = true;
  }

  // ========================================================
  // REGISTROS
  // ========================================================

  tbody.innerHTML = filtered.map((amparo) => createAmparoRow(amparo)).join("");

  bindRowActions();
}

// ============================================================
// CREAR FILA
// ============================================================

function createAmparoRow(amparo) {
  return `

        <tr>


            <!-- RECEPCIÓN -->

            <td>

                <div class="amparo-reception-cell">

                    <strong>

                        ${escapeHTML(formatDate(amparo.dia))}

                    </strong>

                    <span>

                        ${escapeHTML(amparo.hora || "—")}

                    </span>

                </div>

            </td>



            <!-- EXPEDIENTE -->

            <td>

                <span class="amparo-expediente-cell">

                    ${escapeHTML(amparo.expediente || "—")}

                </span>

            </td>



            <!-- PROMOVENTE -->

            <td>

                ${escapeHTML(amparo.promovente || "—")}

            </td>



            <!-- JUZGADO -->

            <td>

                ${escapeHTML(amparo.juzgado || "—")}

            </td>



            <!-- ACTO -->

            <td>

                <div
                    class="amparo-acto-cell"
                    title="${escapeHTML(amparo.actoReclamado || "")}"
                >

                    ${escapeHTML(amparo.actoReclamado || "—")}

                </div>

            </td>



            <!-- ESTADO -->

            <td>

                <span
                    class="
                        amparo-status
                        ${getStatusClass(amparo.estado)}
                    "
                >

                    ${escapeHTML(amparo.estado || "Recibido")}

                </span>

            </td>



            <!-- ACCIONES -->

            <td>
                <div class="amparo-actions-wrap">
                    <div class="amparo-row-actions">
                        <button
                            type="button"
                            class="amparo-detail-button"
                            title="Ver detalle"
                            aria-label="Ver detalle"
                            data-amparo-detail="${escapeHTML(String(amparo.id))}"
                        >
                            <i class="fa-solid fa-eye"></i>
                            <span>Ver detalle</span>
                        </button>

                        <button
                            type="button"
                            class="amparo-detail-button"
                            title="Editar"
                            aria-label="Editar"
                            data-amparo-edit="${escapeHTML(String(amparo.id))}"
                        >
                            <i class="fa-solid fa-pen"></i>
                            <span>Editar</span>
                        </button>

                        <button
                            type="button"
                            class="amparo-attach-button"
                            title="Anexar oficio"
                            aria-label="Anexar oficio"
                            data-amparo-oficio="${escapeHTML(String(amparo.id))}"
                        >
                            <i class="fa-solid fa-paperclip"></i>
                            <span>Anexar oficio</span>
                        </button>
                    </div>
                </div>
            </td>


        </tr>

    `;
}

// ============================================================
// ACCIONES DE FILA
// ============================================================

function bindRowActions() {
  document.querySelectorAll("[data-amparo-detail]").forEach((button) => {
    button.onclick = () => {
      verDetalleAmparo(button.dataset.amparoDetail);
    };
  });

  document.querySelectorAll("[data-amparo-edit]").forEach((button) => {
    button.onclick = () => {
      if (typeof window.openAmparoForm === "function") {
        window.openAmparoForm(button.dataset.amparoEdit);
      }
    };
  });

  document.querySelectorAll("[data-amparo-oficio]").forEach((button) => {
    button.onclick = () => {
      anexarOficio(button.dataset.amparoOficio);
    };
  });
}

// ============================================================
// DETALLE E HISTÓRICO DEL AMPARO
// ============================================================

function verDetalleAmparo(amparoId) {
  const amparos = getData("amparos", []);
  const amparo = amparos.find((item) => String(item.id) === String(amparoId));

  if (!amparo) {
    alert("No se encontró el amparo.");
    return;
  }

  const oficios = getData("oficios", []).filter(
    (item) => String(item.amparoId || "") === String(amparo.id),
  );

  const movimientos = [
    {
      fecha: amparo.creadoEn || `${amparo.dia || ""}T${amparo.hora || "00:00"}`,
      titulo: "Amparo registrado",
      detalle: `Estado inicial: ${amparo.estado || "Recibido"}`,
      icono: "fa-shield-halved",
    },
    ...getData("amparoHistorial", [])
      .filter((item) => String(item.amparoId || "") === String(amparo.id))
      .map((item) => ({
        fecha: item.fecha || "",
        titulo: "Amparo actualizado",
        detalle: item.detalle || "Se actualizaron datos del amparo.",
        icono: "fa-pen-to-square",
      })),
    ...oficios.map((oficio) => ({
      fecha: oficio.creadoEn || oficio.fechaRecepcion || oficio.fecha || "",
      titulo: `Oficio ${oficio.numero || "sin número"}`,
      detalle:
        oficio.asunto ||
        `Oficio vinculado al amparo · ${oficio.estado || "Registrado"}`,
      icono: "fa-file-lines",
    })),
  ].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

  const historicoHTML = movimientos
    .map(
      (movimiento) => `
        <div class="amparo-history-item">
          <div class="amparo-history-icon">
            <i class="fa-solid ${movimiento.icono}"></i>
          </div>
          <div class="amparo-history-content">
            <div class="amparo-history-heading">
              <strong>${escapeHTML(movimiento.titulo)}</strong>
              <span>${escapeHTML(formatDateTimeDetail(movimiento.fecha))}</span>
            </div>
            <p>${escapeHTML(movimiento.detalle || "—")}</p>
          </div>
        </div>
      `,
    )
    .join("");

  showModal(`
    <div class="amparo-detail-shell">
      <header class="amparo-detail-header">
        <span class="amparo-eyebrow">AMPAROS</span>
        <h2>Detalle del amparo</h2>
        <p>Información completa e histórico de movimientos vinculados.</p>
      </header>

      <div class="amparo-detail-content">
        <section class="amparo-detail-section">
          <div class="amparo-detail-section-title">
            <h3>Información del amparo</h3>
            <div class="amparo-row-actions">
              <span class="amparo-status ${getStatusClass(amparo.estado)}">${escapeHTML(amparo.estado || "Recibido")}</span>
              <button type="button" class="amparo-detail-button" id="editAmparoDetailBtn"><i class="fa-solid fa-pen"></i><span>Editar</span></button>
            </div>
          </div>
          <div class="amparo-detail-grid">
            ${detailField("Expediente", amparo.expediente)}
            ${detailField("Recepción", `${formatDate(amparo.dia)} ${amparo.hora || ""}`.trim())}
            ${detailField("Promovente", amparo.promovente)}
            ${detailField("No. juzgado", amparo.juzgado)}
            ${detailField("No. oficio", amparo.oficio)}
            ${detailField("Acto reclamado", amparo.actoReclamado, true)}
            ${detailField("Acciones a realizar", amparo.acciones, true)}
            ${detailField("Observaciones", amparo.observaciones, true)}
          </div>
        </section>

        <section class="amparo-detail-section">
          <div class="amparo-detail-section-title">
            <div>
              <h3>Histórico del amparo</h3>
              <p>Movimientos registrados y vinculados a este amparo.</p>
            </div>
          </div>
          <div class="amparo-history-list">
            ${historicoHTML || '<p class="amparo-history-empty">No hay movimientos registrados.</p>'}
          </div>
        </section>
      </div>
    </div>
  `);

  document
    .getElementById("editAmparoDetailBtn")
    ?.addEventListener("click", () => {
      if (typeof window.openAmparoForm === "function")
        window.openAmparoForm(amparo.id);
    });
}

function detailField(label, value, full = false) {
  return `
    <div class="amparo-detail-field ${full ? "full" : ""}">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value || "—")}</strong>
    </div>
  `;
}

function formatDateTimeDetail(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================
// ANEXAR OFICIO
// ============================================================

function anexarOficio(amparoId) {
  const amparos = getData("amparos", []);

  const amparo = amparos.find((item) => String(item.id) === String(amparoId));

  if (!amparo) {
    alert("No se encontró el amparo.");

    return;
  }

  const context = {
    origen: "amparo",

    amparoId: amparo.id,

    expediente: amparo.expediente,

    promovente: amparo.promovente,

    juzgado: amparo.juzgado,

    actoReclamado: amparo.actoReclamado,
  };

  // sessionStorage.setItem("oficioAmparoContext", JSON.stringify(context));

  if (typeof window.openOficioForm === "function") {
    window.openOficioForm(context);
  } else {
    alert("El formulario de Oficios todavía no está inicializado.");
  }
}

// ============================================================
// ESTADO
// ============================================================

function getStatusClass(estado = "") {
  const value = estado.toLowerCase().trim();

  if (value === "en trámite" || value === "en tramite") {
    return "amparo-status-tramite";
  }

  if (value === "pendiente") {
    return "amparo-status-pendiente";
  }

  if (value === "concluido") {
    return "amparo-status-concluido";
  }

  return "amparo-status-recibido";
}

// ============================================================
// FECHA
// ============================================================

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
