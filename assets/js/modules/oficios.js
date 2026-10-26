import { getData, saveData } from "../storage.js";
import { escapeHTML, escapeJS, formatDate, createId } from "../utils.js";

let oficios = [];

// =====================================================
// INICIALIZACIÓN
// =====================================================

export function initOficios() {
  oficios = getData("oficios", []);

  // Registrar en window para eventos inline
  window.renderOficios = renderOficios;
  window.openOficioForm = openOficioForm;
  window.viewOficio = viewOficio;
  window.onEstadoOficioChange = onEstadoOficioChange;
}

// =====================================================
// RENDER TABLA DE OFICIOS
// =====================================================

export function renderOficios() {
  oficios = getData("oficios", []);
  const table = document.getElementById("oficiosTable");

  if (!table) return;

  if (oficios.length === 0) {
    table.innerHTML = `
            <tr>
                <td colspan="8">No existen oficios registrados.</td>
            </tr>
        `;
    return;
  }

  table.innerHTML = oficios
    .map((item) => {
      const esRecibido = item.estado === "Recibido";

      return `
            <tr>
                <td>${escapeHTML(item.numeroOficio || item.numero || "-")}</td>
                <td>${escapeHTML(item.expediente || "-")}</td>
                <td>${formatDate(item.fecha)}</td>
                <td>${escapeHTML(item.procedencia || item.remitente || "-")}</td>
                <td>${escapeHTML(item.asunto || "-")}</td>
                <td>
                    <!-- Badge estático (no editable desde la tabla) -->
                    <span class="status-badge ${esRecibido ? "status-recibido" : "status-pendiente"}">
                        ${escapeHTML(item.estado || "Pendiente")}
                    </span>
                </td>
                <td>
                    <span class="user-badge">
                        ${esRecibido ? escapeHTML(item.recibidoPor || "—") : '<em style="color:#888;">—</em>'}
                    </span>
                </td>
                <td>
                    <button class="table-action" onclick="viewOficio('${escapeJS(item.id)}')">
                        Ver
                    </button>
                </td>
            </tr>
            `;
    })
    .join("");
}

// =====================================================
// MANEJO DE ESTADO EN EL FORMULARIO
// =====================================================

export function onEstadoOficioChange(selectElement) {
  const contenedor = document.getElementById("recibidoInfoContainer");
  if (!contenedor) return;

  if (selectElement.value === "Recibido") {
    const valorActual = document.getElementById("recibidoPorOficio")?.value || "";
    contenedor.innerHTML = `
      <label for="recibidoPorOficio" style="display:block;margin-bottom:6px;font-weight:600;">Recibido por</label>
      <input
        id="recibidoPorOficio"
        type="text"
        required
        value="${escapeHTML(valorActual)}"
        placeholder="Escribe el nombre de quien recibe"
        autocomplete="off"
      >
    `;
    contenedor.style.display = "block";
  } else {
    contenedor.innerHTML = "";
    contenedor.style.display = "none";
  }
}

// =====================================================
// FORMULARIO CREAR OFICIO
// =====================================================

export function openOficioForm() {
  const modal = document.getElementById("modalContent");
  if (!modal) return;

  modal.innerHTML = `
        <div class="form-header">
            <span>Oficios</span>
            <h2>Nuevo Oficio</h2>
        </div>

        <div class="form-body">
            <form id="oficioForm">
                <div class="form-grid">
                    <div class="field">
                        <label>No. Oficio</label>
                        <input id="numeroOficio" required placeholder="Ej. OF-2026/102">
                    </div>

                    <div class="field">
                        <label>Expediente</label>
                        <input id="expedienteOficio" required placeholder="Ej. 124/2026">
                    </div>

                    <div class="field">
                        <label>Fecha</label>
                        <input type="date" id="fechaOficio" required>
                    </div>

                    <div class="field">
                        <label>Procedencia</label>
                        <input id="procedenciaOficio" placeholder="Ej. Juzgado Primero">
                    </div>

                    <div class="field">
                        <label>Asunto</label>
                        <input id="asuntoOficio" placeholder="Descripción breve del asunto">
                    </div>

                    <div class="field">
                        <label>Estado</label>
                        <select id="estadoOficio" onchange="onEstadoOficioChange(this)">
                            <option value="Pendiente">Pendiente</option>
                            <option value="Recibido">Recibido</option>
                        </select>
                    </div>

                    <!-- Cuadro dinámico que muestra quien recibe -->
                    <div id="recibidoInfoContainer" class="field full" style="display: none;"></div>
                </div>

                <div class="form-actions">
                    <button type="button" class="secondary-btn" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="primary-btn">Guardar oficio</button>
                </div>
            </form>
        </div>
    `;

  document.getElementById("modal").classList.add("show");

  document.getElementById("oficioForm").addEventListener("submit", saveOficio);
}

// =====================================================
// GUARDAR OFICIO
// =====================================================

function saveOficio(event) {
  event.preventDefault();

  const estado = document.getElementById("estadoOficio")?.value || "Pendiente";
  const esRecibido = estado === "Recibido";
  const recibidoPor = document.getElementById("recibidoPorOficio")?.value.trim() || "";

  if (esRecibido && !recibidoPor) {
    document.getElementById("recibidoPorOficio")?.focus();
    return;
  }

  const nuevoOficio = {
    id: createId(),
    numeroOficio: document.getElementById("numeroOficio")?.value.trim() || "",
    expediente: document.getElementById("expedienteOficio")?.value.trim() || "",
    fecha: document.getElementById("fechaOficio")?.value || "",
    procedencia: document.getElementById("procedenciaOficio")?.value.trim() || "",
    asunto: document.getElementById("asuntoOficio")?.value.trim() || "",
    estado: estado,
    recibidoPor: esRecibido ? recibidoPor : "",
    fechaRecepcion: esRecibido ? new Date().toISOString() : null,
    creadoEn: new Date().toISOString()
  };

  const listaOficios = getData("oficios", []);
  listaOficios.unshift(nuevoOficio);

  saveData("oficios", listaOficios);

  renderOficios();
  closeModal();
}

// =====================================================
// DETALLE DEL OFICIO (Función Ver)
// =====================================================

export function viewOficio(id) {
  oficios = getData("oficios", []);
  const oficio = oficios.find((item) => item.id === id);

  if (!oficio) return;

  const modal = document.getElementById("modalContent");
  if (!modal) return;

  const esRecibido = oficio.estado === "Recibido";

  modal.innerHTML = `
        <div class="form-header">
            <span>Detalle de Oficio</span>
            <h2>${escapeHTML(oficio.numeroOficio || oficio.numero || "Sin Número")}</h2>
        </div>

        <div class="form-body">
            <div class="detail-grid">
                <div class="detail-item">
                    <span>Expediente</span>
                    <strong>${escapeHTML(oficio.expediente || "-")}</strong>
                </div>

                <div class="detail-item">
                    <span>Fecha</span>
                    <strong>${formatDate(oficio.fecha)}</strong>
                </div>

                <div class="detail-item">
                    <span>Procedencia</span>
                    <strong>${escapeHTML(oficio.procedencia || oficio.remitente || "-")}</strong>
                </div>

                <div class="detail-item">
                    <span>Asunto</span>
                    <strong>${escapeHTML(oficio.asunto || "-")}</strong>
                </div>

                <div class="detail-item">
                    <span>Estado</span>
                    <strong>
                        <span class="status-badge ${esRecibido ? "status-recibido" : "status-pendiente"}">
                            ${escapeHTML(oficio.estado || "Pendiente")}
                        </span>
                    </strong>
                </div>

                ${esRecibido ? `
                <div class="detail-item full">
                    <span>Recibido por</span>
                    <strong>${escapeHTML(oficio.recibidoPor || "—")}</strong>
                </div>
                ` : ""}
            </div>

            <div class="form-actions" style="margin-top: 20px;">
                <button type="button" class="secondary-btn" onclick="closeModal()">Cerrar</button>
            </div>
        </div>
    `;

  document.getElementById("modal").classList.add("show");
}