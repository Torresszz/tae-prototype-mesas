import { getData, saveData } from "../storage.js";
import { escapeHTML, escapeJS, createId } from "../utils.js";

let entes = [];
let actosDemandados = [];

// =====================================================
// INICIALIZACIÓN Y SINCRONIZACIÓN DE JSON
// =====================================================

export async function initCatalogos() {
  window.renderEntesTable = renderEntesTable;
  window.openEnteForm = openEnteForm;
  window.toggleEnteStatus = toggleEnteStatus;
  window.deleteEnte = deleteEnte;
  window.openActoDemandadoForm = openActoDemandadoForm;
  window.toggleActoDemandadoStatus = toggleActoDemandadoStatus;
  window.deleteActoDemandado = deleteActoDemandado;

  await Promise.all([syncEntesData(), syncActosDemandadosData()]);
  renderEntesTable();
  renderActosDemandadosTable();
}

// Carga inicial desde JSON si localStorage está vacío
async function syncEntesData() {
  const localEntes = getData("entes", null);

  if (!localEntes) {
    try {
      const response = await fetch("assets/data/entes.json");
      const json = await response.json();
      entes = json.entes || [];
      saveData("entes", entes);
    } catch (error) {
      console.error("Error al cargar entes.json:", error);
      entes = [];
    }
  } else {
    entes = localEntes;
  }
}

// =====================================================
// RENDER TABLA ENTES
// =====================================================

export function renderEntesTable() {
  entes = getData("entes", []);
  const table = document.getElementById("entesTable");

  if (!table) return;

  if (entes.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #64748b; padding: 24px;">
          No existen entes registrados.
        </td>
      </tr>
    `;
    return;
  }

  table.innerHTML = entes
    .map(
      (item) => `
      <tr>
        <td><code class="id-code">${escapeHTML(item.id)}</code></td>
        <td><strong>${escapeHTML(item.nombre)}</strong></td>
        <td><span class="grupo-tag">${escapeHTML(item.grupo)}</span></td>
        <td>
          <span class="status-badge ${item.activo ? "status-recibido" : "status-pendiente"}">
            ${item.activo ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td class="actions-cell">
          <div class="action-buttons-group">
            <button class="table-action" onclick="openEnteForm('${escapeJS(item.id)}')">
              Editar
            </button>
            <button class="table-action" onclick="toggleEnteStatus('${escapeJS(item.id)}')">
              ${item.activo ? "Desactivar" : "Activar"}
            </button>
            <button class="table-action text-danger" onclick="deleteEnte('${escapeJS(item.id)}')">
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    `,
    )
    .join("");
}

// =====================================================
// FORMULARIO CREAR / EDITAR ENTE
// =====================================================

export function openEnteForm(id = null) {
  entes = getData("entes", []);
  const ente = id ? entes.find((item) => item.id === id) : null;

  const modal = document.getElementById("modalContent");
  if (!modal) return;

  modal.innerHTML = `
    <div class="form-header">
      <span>Catálogos</span>
      <h2>${ente ? "Editar Ente Público" : "Agregar Nuevo Ente"}</h2>
    </div>

    <div class="form-body">
      <form id="enteForm">
        <input type="hidden" id="enteOriginalId" value="${ente ? escapeHTML(ente.id) : ""}">

        <div class="form-grid columns-2">
          <div class="field full">
            <label>Nombre del Ente *</label>
            <input id="nombreEnte" required value="${ente ? escapeHTML(ente.nombre) : ""}" placeholder="Ej. Secretaría de Educación">
          </div>

          <div class="field">
            <label>Grupo / Clasificación *</label>
            <select id="grupoEnte" required>
              <option value="Poder Ejecutivo" ${ente && ente.grupo === "Poder Ejecutivo" ? "selected" : ""}>Poder Ejecutivo</option>
              <option value="Poder Legislativo" ${ente && ente.grupo === "Poder Legislativo" ? "selected" : ""}>Poder Legislativo</option>
              <option value="Poder Judicial" ${ente && ente.grupo === "Poder Judicial" ? "selected" : ""}>Poder Judicial</option>
              <option value="Organismos Públicos Descentralizados" ${ente && ente.grupo === "Organismos Públicos Descentralizados" ? "selected" : ""}>Organismos Públicos Descentralizados</option>
              <option value="Organismos Autónomos" ${ente && ente.grupo === "Organismos Autónomos" ? "selected" : ""}>Organismos Autónomos</option>
              <option value="Ayuntamientos" ${ente && ente.grupo === "Ayuntamientos" ? "selected" : ""}>Ayuntamientos</option>
              <option value="Sindicatos" ${ente && ente.grupo === "Sindicatos" ? "selected" : ""}>Sindicatos</option>
            </select>
          </div>

          <div class="field">
            <label>Estado</label>
            <select id="activoEnte">
              <option value="true" ${!ente || ente.activo ? "selected" : ""}>Activo</option>
              <option value="false" ${ente && !ente.activo ? "selected" : ""}>Inactivo</option>
            </select>
          </div>
        </div>

        <div class="form-actions" style="margin-top: 20px;">
          <button type="button" class="secondary-btn" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="primary-btn">Guardar Ente</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById("modal").classList.add("show");
  document.getElementById("enteForm").addEventListener("submit", saveEnte);
}

// =====================================================
// GUARDAR, CAMBIAR ESTADO Y ELIMINAR
// =====================================================

function saveEnte(event) {
  event.preventDefault();

  const originalId = document.getElementById("enteOriginalId").value;
  const nombre = document.getElementById("nombreEnte").value.trim();
  const grupo = document.getElementById("grupoEnte").value;
  const activo = document.getElementById("activoEnte").value === "true";

  let listaEntes = getData("entes", []);

  if (originalId) {
    // Editar
    listaEntes = listaEntes.map((item) =>
      item.id === originalId ? { ...item, nombre, grupo, activo } : item,
    );
  } else {
    // Agregar nuevo
    const idGenerado =
      nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || createId();

    listaEntes.push({
      id: idGenerado,
      nombre,
      grupo,
      activo,
    });
  }

  saveData("entes", listaEntes);
  renderEntesTable();
  closeModal();
}

export function toggleEnteStatus(id) {
  let listaEntes = getData("entes", []);
  listaEntes = listaEntes.map((item) =>
    item.id === id ? { ...item, activo: !item.activo } : item,
  );
  saveData("entes", listaEntes);
  renderEntesTable();
}

export function deleteEnte(id) {
  if (!confirm("¿Deseas eliminar este ente del catálogo?")) return;

  let listaEntes = getData("entes", []);
  listaEntes = listaEntes.filter((item) => item.id !== id);
  saveData("entes", listaEntes);
  renderEntesTable();
}

// Exportar alias para compatibilidad con el router
export function renderCatalogos() {
  initCatalogos();
}

// =====================================================
// CATÁLOGO DE ACTOS DEMANDADOS
// =====================================================
async function syncActosDemandadosData() {
  const locales = getData("actosDemandados", null);
  if (Array.isArray(locales) && locales.length) {
    actosDemandados = locales;
    return;
  }
  try {
    const response = await fetch("assets/data/acciones-reclamadas.json");
    const json = response.ok ? await response.json() : { acciones: [] };
    actosDemandados = Array.isArray(json) ? json : json.acciones || [];
  } catch {
    actosDemandados = [];
  }
  saveData("actosDemandados", actosDemandados);
}

function renderActosDemandadosTable() {
  actosDemandados = getData("actosDemandados", []);
  const table = document.getElementById("actosDemandadosTable");
  if (!table) return;
  if (!actosDemandados.length) {
    table.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#64748b;padding:24px">No hay actos demandados cargados. Agrega únicamente los valores oficiales proporcionados por el Tribunal.</td></tr>`;
    return;
  }
  table.innerHTML = actosDemandados
    .map(
      (item) => `
    <tr><td><code class="id-code">${escapeHTML(item.id)}</code></td><td><strong>${escapeHTML(item.nombre)}</strong></td>
    <td><span class="status-badge ${item.activo !== false ? "status-recibido" : "status-pendiente"}">${item.activo !== false ? "Activo" : "Inactivo"}</span></td>
    <td class="actions-cell"><div class="action-buttons-group">
      <button class="table-action" onclick="openActoDemandadoForm('${escapeJS(item.id)}')">Editar</button>
      <button class="table-action" onclick="toggleActoDemandadoStatus('${escapeJS(item.id)}')">${item.activo !== false ? "Desactivar" : "Activar"}</button>
      <button class="table-action text-danger" onclick="deleteActoDemandado('${escapeJS(item.id)}')">Eliminar</button>
    </div></td></tr>`,
    )
    .join("");
}

function openActoDemandadoForm(id = null) {
  actosDemandados = getData("actosDemandados", []);
  const item = id ? actosDemandados.find((x) => x.id === id) : null;
  const modal = document.getElementById("modalContent");
  if (!modal) return;
  modal.innerHTML = `<div class="form-header"><span>Catálogos</span><h2>${item ? "Editar" : "Agregar"} Acto Demandado</h2></div>
    <div class="form-body"><form id="actoDemandadoForm"><input type="hidden" id="actoOriginalId" value="${item ? escapeHTML(item.id) : ""}">
    <div class="form-grid"><div class="field full"><label>Nombre del acto *</label><input id="actoNombre" required value="${item ? escapeHTML(item.nombre) : ""}" placeholder="Valor oficial del Tribunal"></div>
    <div class="field"><label>Estado</label><select id="actoActivo"><option value="true" ${!item || item.activo !== false ? "selected" : ""}>Activo</option><option value="false" ${item && item.activo === false ? "selected" : ""}>Inactivo</option></select></div></div>
    <div class="form-actions" style="margin-top:20px"><button type="button" class="secondary-btn" onclick="closeModal()">Cancelar</button><button type="submit" class="primary-btn">Guardar Acto</button></div></form></div>`;
  document.getElementById("modal")?.classList.add("show");
  document
    .getElementById("actoDemandadoForm")
    ?.addEventListener("submit", saveActoDemandado);
}

function saveActoDemandado(event) {
  event.preventDefault();
  const originalId = document.getElementById("actoOriginalId").value;
  const nombre = document.getElementById("actoNombre").value.trim();
  const activo = document.getElementById("actoActivo").value === "true";
  let lista = getData("actosDemandados", []);
  if (originalId)
    lista = lista.map((item) =>
      item.id === originalId ? { ...item, nombre, activo } : item,
    );
  else {
    let id =
      nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || createId();
    if (lista.some((item) => item.id === id))
      id = `${id}-${String(createId()).slice(-4)}`;
    lista.push({ id, nombre, activo });
  }
  saveData("actosDemandados", lista);
  renderActosDemandadosTable();
  closeModal();
}

function toggleActoDemandadoStatus(id) {
  let lista = getData("actosDemandados", []).map((item) =>
    item.id === id ? { ...item, activo: item.activo === false } : item,
  );
  saveData("actosDemandados", lista);
  renderActosDemandadosTable();
}
function deleteActoDemandado(id) {
  if (!confirm("¿Deseas eliminar este acto demandado del catálogo?")) return;
  saveData(
    "actosDemandados",
    getData("actosDemandados", []).filter((item) => item.id !== id),
  );
  renderActosDemandadosTable();
}
