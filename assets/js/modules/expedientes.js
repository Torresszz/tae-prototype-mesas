// =====================================================
// MODULO EXPEDIENTES
// =====================================================

import { getData, saveData } from "../storage.js";

import {
  createId,
  normalizeText,
  escapeHTML,
  escapeJS,
  formatDate,
} from "../utils.js";

let expedientes = [];

// =====================================================
// INICIALIZAR MODULO
// =====================================================

export function initExpedientes() {
  expedientes = getData("expedientes", []);

  window.viewExpediente = viewExpediente;

  window.renderExpedientes = renderExpedientes;
}

// =====================================================
// RENDER TABLA
// =====================================================

export function renderExpedientes() {
  expedientes = getData("expedientes", []);
  const table = document.getElementById("expedientesTable");

  if (!table) {
    return;
  }

  if (expedientes.length === 0) {
    table.innerHTML = `

        <tr>

        <td colspan="8">

        No existen expedientes registrados.

        </td>

        </tr>

        `;

    return;
  }

  table.innerHTML = expedientes
    .map(
      (exp) => `


<tr>


<td>

<strong>

${escapeHTML(exp.numero)}

</strong>

</td>




<td>

${escapeHTML(formatDate(exp.fecha))}

</td>





<td>

${escapeHTML(exp.actor)}

</td>





<td>

${escapeHTML(exp.demandado)}

</td>











<td>

<span class="badge badge-blue">

${escapeHTML(exp.estado)}

</span>

</td>









<td>

<button

class="table-action"

onclick="
viewExpediente('${escapeJS(exp.numero)}')
"

>

Ver

</button>


</td>



</tr>


`,
    )

    .join("");
}

// =====================================================
// VER DETALLE
// =====================================================

export function viewExpediente(numero) {
  expedientes = getData("expedientes", []);

  const expediente = expedientes.find((item) => item.numero === numero);

  if (!expediente) {
    return;
  }

  const documentos = getExpedienteDocuments(numero);
  const movimientos = getExpedienteHistory(numero);

  const documentosHTML = documentos
    .map(
      (doc) => `
        <div class="expediente-doc-item">
          <div class="expediente-history-icon">
            <i class="fa-solid ${doc.icono}"></i>
          </div>
          <div class="expediente-doc-content">
            <div class="expediente-history-heading">
              <strong>${escapeHTML(doc.titulo)}</strong>
              <span class="expediente-doc-type">${escapeHTML(doc.tipo)}</span>
            </div>
            <p>${escapeHTML(doc.detalle || "—")}</p>
            <small>
              ${escapeHTML(formatExpedienteDateTime(doc.fecha))}${doc.estado ? ` · ${escapeHTML(doc.estado)}` : ""}
            </small>
          </div>
        </div>
      `,
    )
    .join("");

  const historicoHTML = movimientos
    .map(
      (movimiento) => `
        <div class="expediente-history-item">
          <div class="expediente-history-icon">
            <i class="fa-solid ${movimiento.icono}"></i>
          </div>
          <div class="expediente-history-content">
            <div class="expediente-history-heading">
              <strong>${escapeHTML(movimiento.titulo)}</strong>
              <span>${escapeHTML(formatExpedienteDateTime(movimiento.fecha))}</span>
            </div>
            <p>${escapeHTML(movimiento.detalle || "—")}</p>
          </div>
        </div>
      `,
    )
    .join("");

  const modal = document.getElementById("modalContent");

  if (!modal) {
    return;
  }

  modal.innerHTML = `
    <div class="expediente-detail-shell">
      <header class="expediente-detail-header">
        <span class="expediente-detail-eyebrow">EXPEDIENTES</span>
        <h2>Expediente ${escapeHTML(numero)}</h2>
        <p>Información general, documentos e histórico de movimientos vinculados.</p>
      </header>

      <div class="expediente-detail-content">
        <section class="expediente-detail-section">
          <div class="expediente-detail-section-title">
            <div>
              <h3>Información del expediente</h3>
              <p>Este expediente se originó desde una demanda.</p>
            </div>
            <div class="expediente-detail-actions">
              <span class="badge badge-blue">${escapeHTML(expediente.estado || "Registrado")}</span>
            </div>
          </div>

          <div class="expediente-detail-grid">
            ${expedienteDetailField("Actor", expediente.actor)}
            ${expedienteDetailField("Demandado", expediente.demandado)}
            ${expedienteDetailField("Acto demandado", expediente.actoDemandado || expediente.acciones || expediente.accionReclamada)}
            ${expedienteDetailField("Fecha", formatDate(expediente.fecha))}
            ${expedienteDetailField("Clasificación", expediente.clasificacion)}
            ${expedienteDetailField("Ubicación", expediente.ubicacion)}
            ${expedienteDetailField("Origen", expediente.origen === "demanda" ? "Generado por demanda" : expediente.origen)}
          </div>
        </section>

        <section class="expediente-detail-section">
          <div class="expediente-detail-section-title">
            <div>
              <h3>Documentos</h3>
              <p>${documentos.length} documento(s) registrados con el folio de este expediente.</p>
            </div>
          </div>

          <div class="expediente-doc-list">
            ${documentosHTML || '<p class="expediente-history-empty">No hay documentos vinculados a este expediente.</p>'}
          </div>
        </section>

        <section class="expediente-detail-section">
          <div class="expediente-detail-section-title">
            <div>
              <h3>Histórico de actualizaciones</h3>
              <p>Movimientos registrados con el número de este expediente.</p>
            </div>
          </div>

          <div class="expediente-history-list">
            ${historicoHTML || '<p class="expediente-history-empty">No hay movimientos vinculados a este expediente.</p>'}
          </div>
        </section>
      </div>
    </div>
  `;

  document.getElementById("modal")?.classList.add("show");
}

// Todos los documentos vinculados al folio del expediente
function getExpedienteDocuments(numero) {
  const normalizado = normalizeText(numero);
  const coincide = (valor) => normalizeText(valor || "") === normalizado;
  const documentos = [];

  getData("demandas", [])
    .filter((item) => coincide(item.expediente))
    .forEach((item) => {
      documentos.push({
        tipo: "Demanda",
        icono: "fa-scale-balanced",
        titulo: `Demanda ${item.expediente}`,
        detalle: [
          item.actor && `Actor: ${item.actor}`,
          item.demandado && `Demandado: ${item.demandado}`,
          item.actos && `Actos: ${item.actos}`,
        ]
          .filter(Boolean)
          .join(" · "),
        fecha: item.creadoEn || item.fecha || "",
        estado: item.estado,
      });
    });

  const amparos = getData("amparos", []).filter((item) =>
    coincide(item.expediente),
  );
  const amparoIds = new Set(amparos.map((item) => String(item.id)));

  amparos.forEach((item) => {
    documentos.push({
      tipo: "Amparo",
      icono: "fa-shield-halved",
      titulo: `Amparo${item.juzgado ? ` · Juzgado ${item.juzgado}` : ""}`,
      detalle: [
        item.promovente && `Promovente: ${item.promovente}`,
        item.oficio && `Oficio: ${item.oficio}`,
        item.actoReclamado && `Acto reclamado: ${item.actoReclamado}`,
      ]
        .filter(Boolean)
        .join(" · "),
      fecha: item.creadoEn || buildExpedienteDateTime(item.dia, item.hora),
      estado: item.estado,
    });
  });

  getData("oficios", [])
    .filter(
      (item) =>
        coincide(item.expediente) || amparoIds.has(String(item.amparoId || "")),
    )
    .forEach((item) => {
      documentos.push({
        tipo: "Oficio",
        icono: "fa-file-lines",
        titulo: `Oficio ${item.numero || item.numeroOficio || "sin número"}`,
        detalle: [
          item.procedencia && `Procedencia: ${item.procedencia}`,
          item.asunto,
        ]
          .filter(Boolean)
          .join(" · "),
        fecha: item.creadoEn || item.fechaRecepcion || item.fecha || "",
        estado: item.estado,
      });
    });

  getData("promociones", [])
    .filter((item) => coincide(item.expediente))
    .forEach((item) => {
      documentos.push({
        tipo: "Promoción",
        icono: "fa-file-signature",
        titulo: `Promoción${item.tipo ? ` · ${item.tipo}` : ""}`,
        detalle: [item.oficio && `Oficio: ${item.oficio}`, item.descripcion]
          .filter(Boolean)
          .join(" · "),
        fecha: item.creadoEn || item.fecha || "",
        estado: item.estado,
      });
    });

  getData("exhortos", [])
    .filter((item) => coincide(item.expedienteVinculado))
    .forEach((item) => {
      documentos.push({
        tipo: "Exhorto",
        icono: "fa-file-import",
        titulo: `Exhorto ${item.numero || "sin número"}`,
        detalle: [
          item.autoridad && `Autoridad: ${item.autoridad}`,
          item.requerimiento,
        ]
          .filter(Boolean)
          .join(" · "),
        fecha: item.creadoEn || item.fecha || "",
        estado: item.estado,
      });
    });

  return documentos.sort(
    (a, b) => getExpedienteTime(b.fecha) - getExpedienteTime(a.fecha),
  );
}

function getExpedienteHistory(numero) {
  const normalizado = normalizeText(numero);
  const coincide = (valor) => normalizeText(valor || "") === normalizado;
  const movimientos = [];

  getData("demandas", [])
    .filter((item) => coincide(item.expediente))
    .forEach((item) => {
      movimientos.push({
        fecha: item.creadoEn || item.fecha || "",
        titulo: "Demanda registrada",
        detalle: "La demanda generó este expediente.",
        icono: "fa-scale-balanced",
      });
    });

  getData("amparos", [])
    .filter((item) => coincide(item.expediente))
    .forEach((item) => {
      movimientos.push({
        fecha: item.creadoEn || buildExpedienteDateTime(item.dia, item.hora),
        titulo: "Amparo registrado",
        detalle: item.promovente
          ? `Promovente: ${item.promovente}`
          : `Estado: ${item.estado || "Recibido"}`,
        icono: "fa-shield-halved",
      });
    });

  getData("promociones", [])
    .filter((item) => coincide(item.expediente))
    .forEach((item) => {
      movimientos.push({
        fecha: item.creadoEn || item.fecha || "",
        titulo: "Promoción registrada",
        detalle:
          item.descripcion ||
          item.observaciones ||
          item.numero ||
          "Promoción vinculada al expediente.",
        icono: "fa-file-signature",
      });
    });

  getData("oficios", [])
    .filter((item) => coincide(item.expediente))
    .forEach((item) => {
      movimientos.push({
        fecha: item.creadoEn || item.fechaRecepcion || item.fecha || "",
        titulo: `Oficio ${item.numero || "registrado"}`,
        detalle:
          item.asunto ||
          `Oficio vinculado al expediente · ${item.estado || "Registrado"}`,
        icono: "fa-file-lines",
      });
    });

  getData("amparoHistorial", [])
    .filter((item) => coincide(item.expediente))
    .forEach((item) => {
      movimientos.push({
        fecha: item.fecha || "",
        titulo: "Amparo actualizado",
        detalle:
          item.detalle || "Se actualizaron datos de un amparo vinculado.",
        icono: "fa-pen-to-square",
      });
    });

  getData("expedienteHistorial", [])
    .filter((item) => coincide(item.expediente))
    .forEach((item) => {
      movimientos.push({
        fecha: item.fecha || "",
        titulo: "Expediente actualizado",
        detalle: item.detalle || "Se actualizaron datos del expediente.",
        icono: "fa-pen-to-square",
      });
    });

  getData("exhortos", [])
    .filter((item) => coincide(item.expedienteVinculado))
    .forEach((item) => {
      movimientos.push({
        fecha: item.creadoEn || item.fecha || "",
        titulo: `Exhorto ${item.numero || "registrado"}`,
        detalle:
          item.requerimiento || "Exhorto interno vinculado al expediente.",
        icono: "fa-file-import",
      });
    });

  return movimientos.sort(
    (a, b) => getExpedienteTime(b.fecha) - getExpedienteTime(a.fecha),
  );
}

function expedienteDetailField(label, value) {
  return `
    <div class="expediente-detail-field">
      <span>${escapeHTML(label)}</span>
      <strong>${escapeHTML(value || "—")}</strong>
    </div>
  `;
}

function buildExpedienteDateTime(date, time) {
  if (!date) return "";
  return time ? `${date}T${time}:00` : date;
}

function getExpedienteTime(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatExpedienteDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =====================================================
// BUSCAR EXPEDIENTE
// =====================================================

export function searchExpediente(numero) {
  return expedientes.find(
    (item) => normalizeText(item.numero) === normalizeText(numero),
  );
}

// ============================================================
// EDITAR EXPEDIENTE EXISTENTE
// ============================================================
function openEditExpediente(numero) {
  expedientes = getData("expedientes", []);
  const expediente = expedientes.find(
    (item) => String(item.numero) === String(numero),
  );
  if (!expediente) return;

  const modal = document.getElementById("modalContent");
  if (!modal) return;

  modal.innerHTML = `
    <div class="form-header">
      <span>Expedientes</span>
      <h2>Editar expediente ${escapeHTML(numero)}</h2>
      <p>Los cambios se guardarán en el histórico del mismo expediente.</p>
    </div>
    <div class="form-body">
      <form id="editExpedienteForm">
        <div class="form-grid columns-2">
          <div class="field"><label>Actor</label><input id="editExpActor" value="${escapeHTML(expediente.actor || "")}"></div>
          <div class="field"><label>Demandado</label><input id="editExpDemandado" value="${escapeHTML(expediente.demandado || "")}"></div>
          <div class="field full"><label>Acto demandado</label><input id="editExpActo" value="${escapeHTML(expediente.actoDemandado || expediente.acciones || expediente.accionReclamada || "")}" placeholder="Seleccionado desde la demanda"></div>
          <div class="field"><label>Clasificación</label><input id="editExpClasificacion" value="${escapeHTML(expediente.clasificacion || "")}"></div>
          <div class="field"><label>Estado</label><input id="editExpEstado" value="${escapeHTML(expediente.estado || "")}"></div>
          <div class="field full"><label>Ubicación</label><input id="editExpUbicacion" value="${escapeHTML(expediente.ubicacion || "")}"></div>
        </div>
        <div class="form-actions" style="margin-top:20px">
          <button type="button" class="secondary-btn" id="cancelEditExpediente">Cancelar</button>
          <button type="submit" class="primary-btn">Guardar cambios</button>
        </div>
      </form>
    </div>`;

  document
    .getElementById("cancelEditExpediente")
    ?.addEventListener("click", () => viewExpediente(numero));
  document
    .getElementById("editExpedienteForm")
    ?.addEventListener("submit", (event) => saveEditExpediente(event, numero));
}

function saveEditExpediente(event, numero) {
  event.preventDefault();
  let lista = getData("expedientes", []);
  const index = lista.findIndex(
    (item) => String(item.numero) === String(numero),
  );
  if (index < 0) return;

  const anterior = { ...lista[index] };
  const actualizado = {
    ...anterior,
    actor: document.getElementById("editExpActor").value.trim(),
    demandado: document.getElementById("editExpDemandado").value.trim(),
    actoDemandado: document.getElementById("editExpActo").value.trim(),
    clasificacion: document.getElementById("editExpClasificacion").value.trim(),
    estado: document.getElementById("editExpEstado").value.trim(),
    ubicacion: document.getElementById("editExpUbicacion").value.trim(),
    actualizadoEn: new Date().toISOString(),
  };

  const campos = [
    ["Actor", "actor"],
    ["Demandado", "demandado"],
    ["Acto demandado", "actoDemandado"],
    ["Clasificación", "clasificacion"],
    ["Estado", "estado"],
    ["Ubicación", "ubicacion"],
  ];
  const cambios = campos
    .filter(
      ([, key]) =>
        String(anterior[key] || "") !== String(actualizado[key] || ""),
    )
    .map(([label]) => label);
  if (!cambios.length) {
    viewExpediente(numero);
    return;
  }

  lista[index] = actualizado;
  saveData("expedientes", lista);
  const historial = getData("expedienteHistorial", []);
  historial.unshift({
    id: createId(),
    expediente: numero,
    fecha: actualizado.actualizadoEn,
    detalle: `Campos actualizados: ${cambios.join(", ")}.`,
  });
  saveData("expedienteHistorial", historial);
  renderExpedientes();
  viewExpediente(numero);
}
