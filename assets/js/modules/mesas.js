// ============================================================
// SECRETARÍA DE ACUERDOS
// assets/js/modules/mesas.js
// ============================================================

import { getData, saveData } from "../storage.js";

import { createId, escapeHTML } from "../utils.js";

import { showModal, closeForm } from "../forms/formHelper.js";

import { getSession, canSign } from "../auth.js";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY = "mesasSeguimiento";

let currentStatus = "todos";
let currentSearch = "";
let currentEtapa = "";

let vistaInicialAplicada = false;

const ETAPA_LABELS = {
  pendiente: "Pendiente de recibir",
  acuerdo: "En acuerdo",
  firma: "En firma",
  firmado: "Firmado",
  archivo: "En archivo",
};

// ============================================================
// INICIALIZACIÓN
// ============================================================

export function initMesas() {
  window.renderMesas = renderMesas;

  window.openRecibirExpediente = openRecibirExpediente;

  window.openCrearAcuerdos = openCrearAcuerdos;
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderMesas() {
  const page = document.getElementById("mesasPage");

  if (!page) {
    return;
  }

    prepararSeguimiento();

  // La Magistrada entra directo a lo que tiene por firmar
  if (!vistaInicialAplicada) {
    vistaInicialAplicada = true;

    if (canSign()) {
      currentStatus = "firma";
    }
  }

    renderTituloMesa();

  setupEvents();

  const registros = getRegistros();

  renderCounts(registros);

  renderTable(registros);

  renderAlerts(registros);
}

// ============================================================
// PREPARAR SEGUIMIENTO
// ============================================================

function prepararSeguimiento() {
  const expedientes = getData("expedientes", []);

  const seguimiento = getData(KEY, {});

  let changed = false;

  expedientes.forEach((expediente) => {
    const numero = getNumero(expediente);

    if (!numero) {
      return;
    }

    if (seguimiento[numero]) {
      return;
    }

    seguimiento[numero] = {
      etapa: "pendiente",

      recibidoEn: null,

      ultimoMovimiento: "Recibido en Oficialía de Partes",

      acuerdo: null,

      archivoAcuerdo: null,

      enviadoFirmaEn: null,

      archivadoEn: null,

      historial: [
        {
          fecha: new Date().toISOString(),

          movimiento: "Recibido en Oficialía de Partes",
        },
      ],
    };

    changed = true;
  });

  if (changed) {
    saveData(KEY, seguimiento);
  }
}

// ============================================================
// OBTENER REGISTROS
// ============================================================

function getRegistros() {
  const expedientes = getData("expedientes", []);

  const promociones = getData("promociones", []);

  const seguimiento = getData(KEY, {});

    const mesa = mesaUsuario();

  return expedientes
    .filter((expediente) => !mesa || mesaDeExpediente(expediente) === mesa)
    .map((expediente) => {
    const numero = getNumero(expediente);

    const estado = seguimiento[numero] || {
      etapa: "pendiente",
    };

    const promocionesExp = promociones.filter(
      (promo) =>
        String(promo.expediente || promo.numero || "") === String(numero),
    );

        return {
      expediente,

      mesa: mesaDeExpediente(expediente),

      numero,


      promovente: expediente.actor || expediente.promovente || "—",

      asunto:
        expediente.actoDemandado ||
        expediente.asunto ||
        expediente.accion ||
        expediente.clasificacion ||
        "Asunto pendiente",

      fecha:
        expediente.fechaRecepcion ||
        expediente.fecha ||
        expediente.creadoEn ||
        "",

      promociones: promocionesExp,

      seguimiento: estado,
    };
  });
}

// ============================================================
// EVENTOS
// ============================================================

function setupEvents() {
  const page = document.getElementById("mesasPage");

  const search = document.getElementById("mesasSearch");

  const etapa = document.getElementById("mesasEtapaFilter");

  if (search) {
    search.value = currentSearch;

    search.oninput = (event) => {
      currentSearch = event.target.value.trim().toLowerCase();

      renderMesas();
    };
  }

  if (etapa) {
    etapa.value = currentEtapa;

    etapa.onchange = (event) => {
      currentEtapa = event.target.value;

      renderMesas();
    };
  }

  document.querySelectorAll(".mesas-status-tab").forEach((button) => {
    button.onclick = () => {
      currentStatus = button.dataset.status;

      renderMesas();
    };
  });

  const demoButton = document.getElementById("mesasLoadDemoBtn");

  if (demoButton) {
    demoButton.onclick = seedSecretariaDemo;
  }

  if (page) {
    page.onclick = (event) => {
      const button = event.target.closest("[data-mesas-action]");

      if (!button) {
        return;
      }

      const action = button.dataset.mesasAction;

      const numero = button.dataset.expediente;

      switch (action) {
        case "recibir":
          openRecibirExpediente(numero);

          break;

        case "crear-acuerdo":
          openCrearAcuerdos(numero);

          break;

                case "firmar":
          openFirmarAcuerdo(numero);

          break;

        case "ver":
          openDetalleExpediente(numero);

          break;
      }
    };
  }
}

// ============================================================
// CONTADORES
// ============================================================

function renderCounts(registros) {
  setText("mesasCountTodos", registros.length);

  setText(
    "mesasCountPendientes",
    registros.filter((r) => r.seguimiento.etapa === "pendiente").length,
  );

  setText(
    "mesasCountAcuerdo",
    registros.filter((r) => r.seguimiento.etapa === "acuerdo").length,
  );

  setText(
    "mesasCountFirma",
    registros.filter((r) => r.seguimiento.etapa === "firma").length,
  );

    setText(
    "mesasCountFirmado",
    registros.filter((r) => r.seguimiento.etapa === "firmado").length,
  );

  setText(
    "mesasCountArchivo",
    registros.filter((r) => r.seguimiento.etapa === "archivo").length,
  );

  document.querySelectorAll(".mesas-status-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.status === currentStatus);
  });
}

// ============================================================
// TABLA
// ============================================================

function renderTable(registros) {
  const tbody = document.getElementById("mesasTable");

  const empty = document.getElementById("mesasEmpty");

  if (!tbody) {
    return;
  }

  let visibles = [...registros];

  // ========================================================
  // FILTRO DE STATUS
  // ========================================================

  if (currentStatus !== "todos") {
    visibles = visibles.filter(
      (item) => item.seguimiento.etapa === currentStatus,
    );
  }

  // ========================================================
  // SELECT DE ETAPA
  // ========================================================

  if (currentEtapa) {
    visibles = visibles.filter(
      (item) => item.seguimiento.etapa === currentEtapa,
    );
  }

  // ========================================================
  // BUSCADOR
  // ========================================================

  if (currentSearch) {
    visibles = visibles.filter((item) => {
      const texto = `

                        ${item.numero}
                        ${item.promovente}
                        ${item.asunto}
                        ${item.seguimiento.ultimoMovimiento || ""}

                    `.toLowerCase();

      return texto.includes(currentSearch);
    });
  }

  if (!visibles.length) {
    tbody.innerHTML = "";

    if (empty) {
      empty.hidden = false;
    }

    return;
  }

  if (empty) {
    empty.hidden = true;
  }

  tbody.innerHTML = visibles.map((item) => renderRow(item)).join("");
}

// ============================================================
// FILA
// ============================================================

function renderRow(item) {
  const etapa = item.seguimiento.etapa;

  const promoCount = item.promociones.length;

  return `

        <tr>


            <td>

                <span class="mesas-expediente-number">
                    ${escapeHTML(item.numero)}
                </span>
                <span class="mesas-mesa-tag">Mesa ${item.mesa}</span>

            </td>


            <td>

                ${escapeHTML(item.promovente)}

            </td>


            <td>

                ${escapeHTML(item.asunto)}

            </td>


            <td>

                <span
                    class="
                        mesas-promos-count
                        ${
                          promoCount >= 10
                            ? "danger"
                            : promoCount >= 5
                              ? "warning"
                              : ""
                        }
                    "
                >

                    ${promoCount}

                </span>

            </td>


            <td>

                ${renderEtapaBadge(etapa)}

            </td>


            <td>

                ${escapeHTML(item.seguimiento.ultimoMovimiento || "—")}

            </td>


            <td>

                ${escapeHTML(formatFecha(item.fecha))}

            </td>


            <td>

                ${renderEstadoBadge(etapa)}

            </td>


            <td>

                ${renderActions(item)}

            </td>


        </tr>

    `;
}

// ============================================================
// BADGE ETAPA
// ============================================================

function renderEtapaBadge(etapa) {
  const labels = {
    pendiente: "Pendiente de recibir",

    acuerdo: "En acuerdo",

    firma: "En firma", firmado: "Firmado", archivo: "En archivo",
  };

  return `

        <span
            class="
                mesas-stage-badge
                ${etapa}
            "
        >

            ${labels[etapa] || etapa}

        </span>

    `;
}

// ============================================================
// BADGE ESTADO
// ============================================================

function renderEstadoBadge(etapa) {
  const estados = {
    pendiente: {
      clase: "mesa",
      texto: "En mesa",
    },

    acuerdo: {
      clase: "tramite",
      texto: "En trámite",
    },

    firma: {
      clase: "firmar",
      texto: "Por firmar",
    },

    firmado: { clase: "firmado", texto: "Firmado", }, archivo: { clase: "concluido", texto: "Concluido", },
  };

  const estado = estados[etapa] || estados.pendiente;

  return `

        <span
            class="
                mesas-status-badge
                ${estado.clase}
            "
        >

            ${estado.texto}

        </span>

    `;
}

// ============================================================
// ACCIONES
// ============================================================

function renderActions(item) {
  const numero = escapeHTML(item.numero);

  const etapa = item.seguimiento.etapa;

  if (etapa === "pendiente") {
    return `

            <div class="mesas-actions">

                <button
                    type="button"
                    class="mesas-primary-btn"
                    data-mesas-action="recibir"
                    data-expediente="${numero}"
                >

                    <i class="fa-solid fa-inbox"></i>

                    Recibir expediente

                </button>

            </div>

        `;
  }

  if (etapa === "acuerdo") {
    return `

            <div class="mesas-actions">

                <button
                    type="button"
                    class="mesas-secondary-btn"
                    data-mesas-action="crear-acuerdo"
                    data-expediente="${numero}"
                >

                    <i class="fa-regular fa-file-lines"></i>

                    Crear acuerdos

                </button>

            </div>

        `;
  }

  if (etapa === "firma") {
    // Solo la Magistrada de Presidencia puede firmar
    const botonFirma = canSign()
      ? `
                <button
                    type="button"
                    class="mesas-primary-btn"
                    data-mesas-action="firmar"
                    data-expediente="${numero}"
                >
                    <i class="fa-solid fa-signature"></i>
                    Firmar acuerdo
                </button>
            `
      : `
                <button
                    type="button"
                    class="mesas-secondary-btn"
                    disabled
                    title="Solo la Magistrada de Presidencia puede firmar"
                >
                    <i class="fa-solid fa-hourglass-half"></i>
                    Pendiente de firma
                </button>
            `;

    return `
            <div class="mesas-actions">
                ${botonFirma}
                <button
                    type="button"
                    class="mesas-secondary-btn"
                    data-mesas-action="ver"
                    data-expediente="${numero}"
                >
                    <i class="fa-regular fa-eye"></i>
                    Ver acuerdo
                </button>
            </div>
        `;
  }

  if (etapa === "firmado") {
    return `
            <div class="mesas-actions">
                <button
                    type="button"
                    class="mesas-secondary-btn"
                    data-mesas-action="ver"
                    data-expediente="${numero}"
                >
                    <i class="fa-solid fa-file-signature"></i>
                    Ver acuerdo firmado
                </button>
            </div>
        `;
  }

  return `

        <div class="mesas-actions">

            <button
                type="button"
                class="mesas-secondary-btn"
                data-mesas-action="ver"
                data-expediente="${numero}"
            >

                <i class="fa-regular fa-folder-open"></i>

                Ver documentos

            </button>

        </div>

    `;
}

// ============================================================
// ALERTAS
// ============================================================

function renderAlerts(registros) {
  const container = document.getElementById("mesasAlerts");

  if (!container) {
    return;
  }

  const alertas = [];

  registros.forEach((item) => {
    const count = item.promociones.length;

    if (item.seguimiento.etapa === "pendiente" && count > 0) {
      alertas.push({
        clase: count >= 5 ? "danger" : "",

        icono: "fa-triangle-exclamation",

        numero: item.numero,

        texto: `Pendiente de recibir · ${count} ${
          count === 1 ? "promoción" : "promociones"
        }`,
      });
    }

    if (item.seguimiento.etapa === "firma") {
      alertas.push({
        clase: "blue",

        icono: "fa-flag",

        numero: item.numero,

        texto: "Proyecto de acuerdo pendiente de firma",
      });
    }
  });

  setText("mesasAlertCount", alertas.length);

  if (!alertas.length) {
    container.innerHTML = `

            <div class="mesas-no-alerts">

                <i class="fa-regular fa-bell"></i>

                <span>
                    Sin alertas pendientes.
                </span>

            </div>

        `;

    return;
  }

  container.innerHTML = alertas
    .slice(0, 8)
    .map(
      (alerta) => `

                    <div
                        class="
                            mesas-alert-item
                            ${alerta.clase}
                        "
                    >

                        <div class="mesas-alert-icon">

                            <i
                                class="
                                    fa-solid
                                    ${alerta.icono}
                                "
                            ></i>

                        </div>


                        <div class="mesas-alert-body">

                            <strong>

                                ${escapeHTML(alerta.numero)}

                            </strong>


                            <span>

                                ${escapeHTML(alerta.texto)}

                            </span>

                        </div>

                    </div>

                `,
    )
    .join("");
}

// ============================================================
// MODAL 1 - RECIBIR EXPEDIENTE
// ============================================================

function openRecibirExpediente(numero) {
  const item = getRegistros().find(
    (registro) => String(registro.numero) === String(numero),
  );

  if (!item) {
    console.warn("Expediente no encontrado:", numero);

    return;
  }

  showModal(`

        <div class="mesas-modal-shell">


            <header class="mesas-modal-header">

                <div class="mesas-modal-step">

                    1

                </div>


                <div class="mesas-modal-header-text">

                    <h2>
                        Recibir expediente
                    </h2>

                    <p>
                        Confirma la recepción del expediente en Secretaría de Acuerdos.
                    </p>

                </div>

            </header>


            <div class="mesas-modal-body">


                <div class="mesas-modal-info">


                    <div class="mesas-modal-info-item">

                        <span>
                            Expediente
                        </span>

                        <strong>

                            ${escapeHTML(item.numero)}

                        </strong>

                    </div>


                    <div class="mesas-modal-info-item">

                        <span>
                            Promovente
                        </span>

                        <strong>

                            ${escapeHTML(item.promovente)}

                        </strong>

                    </div>


                    <div class="mesas-modal-info-item">

                        <span>
                            Promociones
                        </span>

                        <strong>

                            ${item.promociones.length}

                        </strong>

                    </div>


                    <div class="mesas-modal-info-item">

                        <span>
                            Asunto
                        </span>

                        <strong>

                            ${escapeHTML(item.asunto)}

                        </strong>

                    </div>


                </div>


                <div class="mesas-modal-message">

                    <i class="fa-solid fa-circle-info"></i>

                    <span>
                        Al recibir el expediente se asignará a Secretaría
                        y quedará disponible para comenzar a trabajar
                        en sus acuerdos.
                    </span>

                </div>


            </div>


            <footer class="mesas-modal-footer">


                <button
                    type="button"
                    class="mesas-modal-cancel"
                    id="cancelRecibirExpediente"
                >

                    Cancelar

                </button>


                <button
                    type="button"
                    class="mesas-modal-confirm"
                    id="confirmRecibirExpediente"
                >

                    <i class="fa-solid fa-inbox"></i>

                    Recibir expediente

                </button>


            </footer>


        </div>

    `);

  document
    .getElementById("cancelRecibirExpediente")
    ?.addEventListener("click", closeForm);

  document
    .getElementById("confirmRecibirExpediente")
    ?.addEventListener("click", () => {
      recibirExpediente(numero);
    });
}

// ============================================================
// CONFIRMAR RECEPCIÓN
// ============================================================

function recibirExpediente(numero) {
  const seguimiento = getData(KEY, {});

  const estado = seguimiento[numero];

  if (!estado) {
    return;
  }

  estado.etapa = "acuerdo";

  estado.recibidoEn = new Date().toISOString();

  estado.ultimoMovimiento = "Turnado a Secretaría de Acuerdos";

  estado.historial = Array.isArray(estado.historial) ? estado.historial : [];

  estado.historial.push({
    fecha: new Date().toISOString(),

    movimiento: "Expediente recibido en Secretaría de Acuerdos",
  });

  saveData(KEY, seguimiento);

  closeForm();

  renderMesas();
}

// ============================================================
// MODAL 2 - CREAR ACUERDOS
// Por ahora dejamos preparada la elección.
// El editor y subida real se conectan en el siguiente paso.
// ============================================================

function openCrearAcuerdos(numero) {
  const item = getRegistros().find((registro) => registro.numero === numero);

  if (!item) {
    return;
  }

  showModal(`
        <div class="mesas-modal-shell">
            <header class="mesas-modal-header">
                <div class="mesas-modal-step">2</div>
                <div class="mesas-modal-header-text">
                    <h2>Crear acuerdos</h2>
                    <p>Expediente ${escapeHTML(numero)}</p>
                </div>
            </header>

            <div class="mesas-modal-body">
                <div class="mesas-agreement-tabs">
                    <button type="button" class="mesas-agreement-tab active" data-acuerdo-tab="archivo">
                        Subir archivo
                    </button>
                    <button type="button" class="mesas-agreement-tab" data-acuerdo-tab="texto">
                        Redactar en línea
                    </button>
                </div>

                <div id="acuerdoPaneArchivo">
                    <label class="mesas-upload-area" for="acuerdoArchivo">
                        <i class="fa-solid fa-cloud-arrow-up"></i>
                        <strong>Selecciona un archivo</strong>
                        <span>PDF, DOC o DOCX</span>
                        <input
                            type="file"
                            id="acuerdoArchivo"
                            accept=".pdf,.doc,.docx"
                            hidden
                        >
                    </label>
                    <div class="mesas-upload-help" id="acuerdoArchivoNombre">
                        Ningún archivo seleccionado.
                    </div>
                </div>

                <div id="acuerdoPaneTexto" hidden>
                    <textarea
                        id="acuerdoTexto"
                        class="mesas-textarea"
                        rows="8"
                        placeholder="Redacta aquí el proyecto de acuerdo..."
                    ></textarea>
                </div>

                <p class="mesas-form-error" id="acuerdoError" hidden></p>
            </div>

            <footer class="mesas-modal-footer">
                <button type="button" class="mesas-modal-cancel" id="closeCrearAcuerdo">
                    Cancelar
                </button>
                <button type="button" class="mesas-modal-confirm" id="enviarAFirma">
                    <i class="fa-solid fa-paper-plane"></i>
                    Enviar a firma
                </button>
            </footer>
        </div>
    `);

  document
    .getElementById("closeCrearAcuerdo")
    ?.addEventListener("click", closeForm);

  const paneArchivo = document.getElementById("acuerdoPaneArchivo");
  const paneTexto = document.getElementById("acuerdoPaneTexto");

  document.querySelectorAll("[data-acuerdo-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const esArchivo = tab.dataset.acuerdoTab === "archivo";

      document
        .querySelectorAll("[data-acuerdo-tab]")
        .forEach((otro) => otro.classList.toggle("active", otro === tab));

      paneArchivo.hidden = !esArchivo;
      paneTexto.hidden = esArchivo;
    });
  });

  document
    .getElementById("acuerdoArchivo")
    ?.addEventListener("change", (event) => {
      const nombre = event.target.files?.[0]?.name;

      document.getElementById("acuerdoArchivoNombre").textContent = nombre
        ? `Archivo: ${nombre}`
        : "Ningún archivo seleccionado.";
    });

  document.getElementById("enviarAFirma")?.addEventListener("click", () => {
    const archivo =
      document.getElementById("acuerdoArchivo")?.files?.[0]?.name || null;

    const texto = document.getElementById("acuerdoTexto")?.value.trim() || "";

    if (!archivo && !texto) {
      const error = document.getElementById("acuerdoError");

      error.textContent =
        "Sube un archivo o redacta el acuerdo antes de enviarlo a firma.";

      error.hidden = false;

      return;
    }

    enviarAFirma(numero, { archivo, texto });
  });
}

// ============================================================
// ENVIAR ACUERDO A FIRMA (Secretaría → Presidencia)
// ============================================================

function enviarAFirma(numero, { archivo, texto }) {
  const seguimiento = getData(KEY, {});

  const estado = seguimiento[numero];

  if (!estado || estado.etapa !== "acuerdo") {
    return;
  }

  const ahora = new Date().toISOString();

  estado.acuerdo = {
    texto,
    archivo,
    creadoPor: getSession()?.nombre || "Secretaría de Acuerdos",
    creadoEn: ahora,
  };

  estado.etapa = "firma";
  estado.enviadoFirmaEn = ahora;
  estado.ultimoMovimiento = "Proyecto de acuerdo enviado a firma";

  estado.historial = Array.isArray(estado.historial) ? estado.historial : [];

  estado.historial.push({
    fecha: ahora,
    movimiento: "Proyecto de acuerdo enviado a firma de la Magistrada",
  });

  saveData(KEY, seguimiento);

  closeForm();

  renderMesas();
}

// ============================================================
// MODAL 3 - FIRMAR ACUERDO (solo la Magistrada de Presidencia)
// ============================================================

function openFirmarAcuerdo(numero) {
  if (!canSign()) {
    return;
  }

  const item = getRegistros().find((registro) => registro.numero === numero);

  if (!item || item.seguimiento.etapa !== "firma") {
    return;
  }

  const acuerdo = normalizarAcuerdo(item.seguimiento.acuerdo);

  showModal(`
        <div class="mesas-modal-shell">
            <header class="mesas-modal-header">
                <div class="mesas-modal-step">3</div>
                <div class="mesas-modal-header-text">
                    <h2>Firmar acuerdo</h2>
                    <p>Expediente ${escapeHTML(numero)}</p>
                </div>
            </header>

            <div class="mesas-modal-body">
                <div class="mesas-modal-info">
                    <div class="mesas-modal-info-item">
                        <span>Promovente</span>
                        <strong>${escapeHTML(item.promovente)}</strong>
                    </div>
                    <div class="mesas-modal-info-item">
                        <span>Asunto</span>
                        <strong>${escapeHTML(item.asunto)}</strong>
                    </div>
                </div>

                <div class="mesas-modal-info-item">
                    <span>Proyecto de acuerdo</span>
                    <strong>${escapeHTML(describirAcuerdo(acuerdo))}</strong>
                </div>

                <p class="mesas-upload-help">
                    Al firmar, el expediente regresa a la Secretaría de Acuerdos
                    con el estado "Firmado".
                </p>
            </div>

            <footer class="mesas-modal-footer">
                <button type="button" class="mesas-modal-cancel" id="cancelFirmarAcuerdo">
                    Cancelar
                </button>
                <button type="button" class="mesas-modal-confirm" id="confirmFirmarAcuerdo">
                    <i class="fa-solid fa-signature"></i>
                    Firmar acuerdo
                </button>
            </footer>
        </div>
    `);

  document
    .getElementById("cancelFirmarAcuerdo")
    ?.addEventListener("click", closeForm);

  document
    .getElementById("confirmFirmarAcuerdo")
    ?.addEventListener("click", () => firmarAcuerdo(numero));
}

function firmarAcuerdo(numero) {
  // Defensa: aunque alguien llame esta función, solo firma la Magistrada
  if (!canSign()) {
    return;
  }

  const seguimiento = getData(KEY, {});

  const estado = seguimiento[numero];

  if (!estado || estado.etapa !== "firma") {
    return;
  }

  const ahora = new Date().toISOString();

  estado.etapa = "firmado";
  estado.firmadoEn = ahora;
  estado.firmadoPor = getSession()?.nombre || "Magistrada";
  estado.ultimoMovimiento =
    "Acuerdo firmado por la Magistrada · devuelto a Secretaría de Acuerdos";

  estado.historial = Array.isArray(estado.historial) ? estado.historial : [];

  estado.historial.push({
    fecha: ahora,
    movimiento:
      "Acuerdo firmado por la Magistrada de Presidencia; regresa a mesa como Firmado",
  });

  saveData(KEY, seguimiento);

  closeForm();

  renderMesas();
}

function normalizarAcuerdo(acuerdo) {
  if (!acuerdo) {
    return null;
  }

  // Los datos demo antiguos guardaban el acuerdo como texto simple
  if (typeof acuerdo === "string") {
    return { texto: acuerdo, archivo: null };
  }

  return acuerdo;
}

function describirAcuerdo(acuerdo) {
  if (!acuerdo) {
    return "Sin acuerdo registrado.";
  }

  const partes = [];

  if (acuerdo.archivo) {
    partes.push(`Archivo: ${acuerdo.archivo}`);
  }

  if (acuerdo.texto) {
    partes.push(acuerdo.texto);
  }

  return partes.join(" · ") || "Sin acuerdo registrado.";
}

// ============================================================
// VER EXPEDIENTE
// ============================================================

function openDetalleExpediente(numero) {
  const item = getRegistros().find((registro) => registro.numero === numero);

  if (!item) {
    return;
  }

  const seg = item.seguimiento;

  const acuerdo = normalizarAcuerdo(seg.acuerdo);

  const historial = (Array.isArray(seg.historial) ? seg.historial : [])
    .slice()
    .reverse()
    .map(
      (evento) => `
            <li>
                <strong>${escapeHTML(formatFecha(evento.fecha))}</strong>
                <span>${escapeHTML(evento.movimiento || "")}</span>
            </li>
        `,
    )
    .join("");

  const firma =
    seg.etapa === "firmado" || seg.firmadoEn
      ? `
            <div class="mesas-modal-info-item">
                <span>Firma</span>
                <strong>${escapeHTML(seg.firmadoPor || "Magistrada")} · ${escapeHTML(formatFecha(seg.firmadoEn))}</strong>
            </div>
        `
      : "";

  showModal(`
        <div class="mesas-modal-shell">
            <header class="mesas-modal-header">
                <div class="mesas-modal-header-text">
                    <h2>Expediente ${escapeHTML(numero)}</h2>
                    <p>Seguimiento del expediente.</p>
                </div>
            </header>

            <div class="mesas-modal-body">
                <div class="mesas-modal-info">
                    <div class="mesas-modal-info-item">
                        <span>Promovente</span>
                        <strong>${escapeHTML(item.promovente)}</strong>
                    </div>
                    <div class="mesas-modal-info-item">
                        <span>Etapa</span>
                        <strong>${escapeHTML(ETAPA_LABELS[seg.etapa] || seg.etapa)}</strong>
                    </div>
                    <div class="mesas-modal-info-item">
                        <span>Acuerdo</span>
                        <strong>${escapeHTML(describirAcuerdo(acuerdo))}</strong>
                    </div>
                    ${firma}
                </div>

                ${
                  historial
                    ? `<ul class="mesas-history">${historial}</ul>`
                    : ""
                }
            </div>

            <footer class="mesas-modal-footer">
                <button type="button" class="mesas-modal-cancel" id="closeDetalleMesa">
                    Cerrar
                </button>
            </footer>
        </div>
    `);

  document
    .getElementById("closeDetalleMesa")
    ?.addEventListener("click", closeForm);
}

// ============================================================
// DEMO
// ============================================================

function seedSecretariaDemo() {
  const expedientes = getData("expedientes", []);

  const promociones = getData("promociones", []);

  const seguimiento = getData(KEY, {});

  const existentes = new Set(expedientes.map((item) => getNumero(item)));

  const demo = [
    {
      numero: "123/2026",
      actor: "JUAN PÉREZ LÓPEZ",
      actoDemandado: "Demanda de nulidad",
      etapa: "pendiente",
      promos: 3,
    },

    {
      numero: "124/2026",
      actor: "MARÍA GÓMEZ RUIZ",
      actoDemandado: "Recurso de revisión",
      etapa: "acuerdo",
      promos: 5,
    },

    {
      numero: "125/2026",
      actor: "CARLOS MARTÍNEZ",
      actoDemandado: "Incidente de suspensión",
      etapa: "firma",
      promos: 2,
    },

    {
      numero: "126/2026",
      actor: "ANA TORRES",
      actoDemandado: "Cumplimiento de sentencia",
      etapa: "acuerdo",
      promos: 4,
    },

    {
      numero: "127/2026",
      actor: "LUIS HERNÁNDEZ",
      actoDemandado: "Ampliación de demanda",
      etapa: "archivo",
      promos: 1,
    },

    {
      numero: "128/2026",
      actor: "SOFÍA RAMÍREZ",
      actoDemandado: "Queja",
      etapa: "firma",
      promos: 2,
    },

    {
      numero: "129/2026",
      actor: "MIGUEL CASTILLO",
      actoDemandado: "Incidente de acumulación",
      etapa: "acuerdo",
      promos: 3,
    },

    {
      numero: "130/2026",
      actor: "LAURA DÍAZ",
      actoDemandado: "Recurso de reclamación",
      etapa: "acuerdo",
      promos: 1,
    },

    {
      numero: "131/2026",
      actor: "ROBERTO SÁNCHEZ",
      actoDemandado: "Solicitud de copias certificadas",
      etapa: "pendiente",
      promos: 2,
    },

            {
      numero: "045/2021",
      actor: "ELENA VARGAS",
      actoDemandado: "Cumplimiento de laudo",
      etapa: "acuerdo",
      promos: 4,
    },
    {
      numero: "OJC-012/2026",
      actor: "JORGE NAVARRO",
      actoDemandado: "Oficina de Juicios (OJC)",
      etapa: "pendiente",
      promos: 2,
    },
    {
      numero: "087/2020",
      actor: "TERESA LUNA",
      actoDemandado: "Ejecución de sentencia",
      etapa: "firma",
      promos: 1,
    },
    {
      numero: "133/2026",
      actor: "DANIELA ORTEGA",
      actoDemandado: "Solicitud de ejecución de laudo",
      etapa: "firmado",
      promos: 1,
    },
    {
      numero: "132/2026",
      actor: "PATRICIA MORALES",
      actoDemandado: "Cumplimiento de ejecutoria",
      etapa: "firma",
      promos: 3,
    },
  ];

  demo.forEach((item, index) => {
    if (!existentes.has(item.numero)) {
      expedientes.push({
        id: createId(),

        numero: item.numero,

        expediente: item.numero,

        actor: item.actor,

        actoDemandado: item.actoDemandado,

        fecha: fechaOffset(-(index + 1)),

        estado: "Recibido",

        demoSecretaria: true,
      });
    }

    seguimiento[item.numero] = {
      etapa: item.etapa,

      recibidoEn: item.etapa !== "pendiente" ? new Date().toISOString() : null,

      ultimoMovimiento: getMovimientoDemo(item.etapa),

      acuerdo:
        item.etapa === "firma" || item.etapa === "firmado"
          ? {
              texto: "Proyecto de acuerdo de demostración",
              archivo: null,
              creadoPor: "Secretaría de Acuerdos",
              creadoEn: new Date().toISOString(),
            }
          : null,

      historial: [],
    };

    const existentesPromo = promociones.filter(
      (promo) => promo.expediente === item.numero,
    ).length;

    for (let i = existentesPromo; i < item.promos; i++) {
      promociones.push({
        id: createId(),

        numero: item.numero,

        expediente: item.numero,

        fecha: fechaOffset(-i),

        tipo: "Promoción",

        descripcion: "Promoción de demostración",

        estado: "Pendiente",

        creadoEn: new Date().toISOString(),
      });
    }
  });

  saveData("expedientes", expedientes);

  saveData("promociones", promociones);

  saveData(KEY, seguimiento);

  renderMesas();
}

// ============================================================
// MOVIMIENTO DEMO
// ============================================================

function getMovimientoDemo(etapa) {
  const movimientos = {
    pendiente: "Se recibió en Oficialía de Partes",

    acuerdo: "Turnado a Secretaría",

    firma: "Proyecto de acuerdo", firmado: "Acuerdo firmado por la Magistrada", archivo: "Acuerdo de archivo",
  };

  return movimientos[etapa] || "Sin movimiento";
}

// ============================================================
// HELPERS
// ============================================================

// ============================================================
// ASIGNACIÓN DE MESA
// Mesa 1 = pares · Mesa 2 = impares
// Mesa 3 = OJC y expedientes de 2021 y anteriores
// Acepta "124/2026" (consecutivo/año) y "EXP-2026-001" (año-consecutivo).
// ============================================================

function parseNumero(numero) {
  const texto = String(numero || "");

  let m = texto.match(/(\d+)\s*\/\s*(\d{4})/);

  if (m) {
    return { consecutivo: Number(m[1]), anio: Number(m[2]) };
  }

  m = texto.match(/(\d{4})\D+(\d+)/);

  if (m) {
    return { consecutivo: Number(m[2]), anio: Number(m[1]) };
  }

  return { consecutivo: null, anio: null };
}

function mesaDeExpediente(expediente) {
  const numero = getNumero(expediente);

  const { consecutivo, anio } = parseNumero(numero);

  const anioFecha = Number(
    String(expediente.fechaRecepcion || expediente.fecha || expediente.creadoEn || "").slice(0, 4),
  );

  const anioEfectivo = anio || anioFecha || null;

  const texto = [numero, expediente.tipo, expediente.clasificacion, expediente.asunto]
    .filter(Boolean)
    .join(" ");

  if (/\bOJC\b/i.test(texto) || (anioEfectivo && anioEfectivo <= 2021)) {
    return 3;
  }

  if (consecutivo === null) {
    return 1;
  }

  return consecutivo % 2 === 0 ? 1 : 2;
}

// Mesa del usuario actual (null = ve todas las mesas)
function mesaUsuario() {
  return getSession()?.mesa || null;
}

const MESA_TITULOS = {
  1: ["Mesa 1", "Expedientes pares."],
  2: ["Mesa 2", "Expedientes impares."],
  3: ["Mesa 3", "Acuerdos con OJC y expedientes de 2021 y anteriores."],
};

function renderTituloMesa() {
  const mesa = mesaUsuario();

  if (!mesa) {
    return;
  }

  const h1 = document.querySelector("#mesasPage .mesas-page-header h1");

  const p = document.querySelector("#mesasPage .mesas-page-header p");

  if (h1) {
    h1.textContent = `Secretaría de Acuerdos · ${MESA_TITULOS[mesa][0]}`;
  }

  if (p) {
    p.textContent = MESA_TITULOS[mesa][1];
  }
}

function getNumero(expediente) {
  return String(expediente.numero || expediente.expediente || "");
}

function formatFecha(value) {
  if (!value) {
    return "—";
  }

  const texto = String(value);

  const clean = texto.slice(0, 10);

  const parts = clean.split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return clean;
}

function fechaOffset(offset) {
  const date = new Date();

  date.setDate(date.getDate() + offset);

  const y = date.getFullYear();

  const m = String(date.getMonth() + 1).padStart(2, "0");

  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}
