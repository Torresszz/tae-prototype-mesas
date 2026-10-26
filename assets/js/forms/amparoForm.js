// ============================================================
// FORMULARIO DE AMPARO
// ============================================================

import { showModal, closeForm } from "./formHelper.js";

import { createId, escapeHTML } from "../utils.js";

import { getData, saveData } from "../storage.js";

// ============================================================
// DATOS
// ============================================================

let expedientesReferencia = [];

// ============================================================
// INIT
// ============================================================

export function initAmparoForm() {
  window.openAmparoForm = openAmparoForm;
}

// ============================================================
// CARGAR EXPEDIENTES
// ============================================================

async function loadExpedientesReference() {
  // Los expedientes se originan en Demandas y viven en localStorage.
  const locales = getData("expedientes", []);

  const mapa = new Map();

  locales.forEach((expediente) => {
    const numero = expediente.numero || expediente.expediente;

    if (!numero) {
      return;
    }

    mapa.set(String(numero).toLowerCase(), {
      ...expediente,
      numero,
    });
  });

  expedientesReferencia = Array.from(mapa.values());
}

// ============================================================
// ABRIR FORMULARIO
// ============================================================

export async function openAmparoForm(amparoId = null) {
  await loadExpedientesReference();

  const amparosActuales = getData("amparos", []);
  const amparoEdicion = amparoId
    ? amparosActuales.find((item) => String(item.id) === String(amparoId))
    : null;

  showModal(`

        <div class="amparo-form-shell">


            <!-- =============================================
                 HEADER
            ============================================== -->

            <header class="amparo-form-header">

                <span class="amparo-eyebrow">
                    AMPAROS
                </span>

                <h2>
                    ${amparoEdicion ? "Editar amparo" : "Registrar nuevo amparo"}
                </h2>

                <p>
                    Captura la información del amparo y relaciónala
                    con un expediente existente.
                </p>

            </header>



            <form id="amparoFormElement">


                <div class="amparo-form-content">


                    <!-- =====================================
                         1. RECEPCIÓN
                    ====================================== -->

                    <section class="amparo-section">


                        <div class="amparo-section-header">

                            <span class="amparo-section-number">
                                1
                            </span>

                            <div>

                                <h3>
                                    Recepción
                                </h3>

                                <p>
                                    Fecha, hora y expediente relacionado.
                                </p>

                            </div>

                        </div>


                        <div class="amparo-grid amparo-grid-three">


                            <div class="amparo-field">

                                <label for="ampDia">
                                    Día
                                    <span>*</span>
                                </label>

                                <input
                                    id="ampDia"
                                    type="date"
                                    required
                                >

                            </div>


                            <div class="amparo-field">

                                <label for="ampHora">
                                    Hora
                                    <span>*</span>
                                </label>

                                <input
                                    id="ampHora"
                                    type="time"
                                    required
                                >

                            </div>


                            <div class="amparo-field">

                                <label for="ampExp">
                                    Número de expediente
                                    <span>*</span>
                                </label>

                                <input
                                    id="ampExp"
                                    type="text"
                                    placeholder="Ej. 124/2026"
                                    autocomplete="off"
                                    required
                                >

                            </div>


                        </div>



                        <!-- INFORMACIÓN DEL EXPEDIENTE -->

                        <div
                            id="ampExpedienteInfo"
                            class="amparo-expediente-info"
                            hidden
                        >

                        </div>


                    </section>



                    <!-- =====================================
                         2. INFORMACIÓN DEL AMPARO
                    ====================================== -->

                    <section class="amparo-section">


                        <div class="amparo-section-header">

                            <span class="amparo-section-number">
                                2
                            </span>

                            <div>

                                <h3>
                                    Información del amparo
                                </h3>

                                <p>
                                    Datos proporcionados por el juzgado.
                                </p>

                            </div>

                        </div>


                        <div class="amparo-grid">


                            <div class="amparo-field">

                                <label for="ampPromueve">
                                    Quién promueve el amparo
                                    <span>*</span>
                                </label>

                                <input
                                    id="ampPromueve"
                                    type="text"
                                    placeholder="Nombre del promovente"
                                    required
                                >

                            </div>


                            <div class="amparo-field">

                                <label for="ampJuzgado">
                                    Número asignado por juzgado
                                </label>

                                <input
                                    id="ampJuzgado"
                                    type="text"
                                    placeholder="Ej. 843/2026"
                                >

                            </div>


                            <div class="amparo-field">

                                <label for="ampOficio">
                                    Número de oficio registrado
                                </label>

                                <input
                                    id="ampOficio"
                                    type="text"
                                    placeholder="Ej. TAE-SA-0142/2026"
                                >

                            </div>


                            <div class="amparo-field">

                                <label for="ampEstado">
                                    Estado
                                </label>

                                <select id="ampEstado">

                                    <option value="Recibido">
                                        Recibido
                                    </option>

                                    <option value="En trámite">
                                        En trámite
                                    </option>

                                    <option value="Pendiente">
                                        Pendiente
                                    </option>

                                    <option value="Concluido">
                                        Concluido
                                    </option>

                                </select>

                            </div>


                        </div>


                    </section>



                    <!-- =====================================
                         3. ACTO RECLAMADO
                    ====================================== -->

                    <section class="amparo-section">


                        <div class="amparo-section-header">

                            <span class="amparo-section-number">
                                3
                            </span>

                            <div>

                                <h3>
                                    Acto reclamado
                                </h3>

                                <p>
                                    Registra el acto que da origen al amparo.
                                </p>

                            </div>

                        </div>


                        <div class="amparo-grid">


                            <div class="amparo-field full">

                                <label for="ampActoReclamado">
                                    Acto reclamado
                                    <span>*</span>
                                </label>

                                <textarea
                                    id="ampActoReclamado"
                                    rows="3"
                                    placeholder="Describe el acto reclamado..."
                                    required
                                ></textarea>

                            </div>


                        </div>


                    </section>



                    <!-- =====================================
                         4. ACCIONES
                    ====================================== -->

                    <section class="amparo-section">


                        <div class="amparo-section-header">

                            <span class="amparo-section-number">
                                4
                            </span>

                            <div>

                                <h3>
                                    Acciones a realizar
                                </h3>

                                <p>
                                    Indica qué deberá realizarse para atender el amparo.
                                </p>

                            </div>

                        </div>


                        <div class="amparo-grid">


                            <div class="amparo-field full">

                                <label for="ampAcciones">
                                    Acciones
                                    <span>*</span>
                                </label>

                                <textarea
                                    id="ampAcciones"
                                    rows="3"
                                    placeholder="Describe las acciones a realizar..."
                                    required
                                ></textarea>

                            </div>


                        </div>


                    </section>



                    <!-- =====================================
                         5. OBSERVACIONES
                    ====================================== -->

                    <section class="amparo-section">


                        <div class="amparo-section-header">

                            <span class="amparo-section-number">
                                5
                            </span>

                            <div>

                                <h3>
                                    Observaciones
                                </h3>

                                <p>
                                    Información adicional del registro.
                                </p>

                            </div>

                        </div>


                        <div class="amparo-grid">


                            <div class="amparo-field full">

                                <label for="ampObservaciones">
                                    Observaciones
                                </label>

                                <textarea
                                    id="ampObservaciones"
                                    rows="3"
                                    placeholder="Observaciones adicionales..."
                                ></textarea>

                            </div>


                        </div>


                    </section>


                </div>



                <!-- =========================================
                     FOOTER
                ========================================== -->

                <footer class="amparo-form-footer">


                    <button
                        type="button"
                        class="amparo-btn-secondary"
                        id="cancelAmparoBtn"
                    >
                        Cancelar
                    </button>


                    <button
                        type="submit"
                        class="amparo-btn-primary"
                    >

                        <i class="fa-solid fa-check"></i>

                        ${amparoEdicion ? "Guardar cambios" : "Registrar amparo"}

                    </button>


                </footer>


            </form>


        </div>

    `);

  if (amparoEdicion) {
    fillAmparoForm(amparoEdicion);
  } else {
    setCurrentDateTime();
  }

  setupExpedienteLookup();
  setupCancel();
  setupSubmit(amparoEdicion);
}

// ============================================================
// PRECARGAR AMPARO PARA EDICIÓN
// ============================================================
function fillAmparoForm(amparo) {
  const valores = {
    ampDia: amparo.dia || "",
    ampHora: amparo.hora || "",
    ampExp: amparo.expediente || "",
    ampPromueve: amparo.promovente || "",
    ampJuzgado: amparo.juzgado || "",
    ampOficio: amparo.oficio || "",
    ampEstado: amparo.estado || "Recibido",
    ampActoReclamado: amparo.actoReclamado || "",
    ampAcciones: amparo.acciones || "",
    ampObservaciones: amparo.observaciones || "",
  };
  Object.entries(valores).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value;
  });
  buscarExpediente();
}

// ============================================================
// FECHA Y HORA ACTUAL
// ============================================================

function setCurrentDateTime() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  const hours = String(now.getHours()).padStart(2, "0");

  const minutes = String(now.getMinutes()).padStart(2, "0");

  const dateInput = document.getElementById("ampDia");

  const timeInput = document.getElementById("ampHora");

  if (dateInput) {
    dateInput.value = `${year}-${month}-${day}`;
  }

  if (timeInput) {
    timeInput.value = `${hours}:${minutes}`;
  }
}

// ============================================================
// BUSCAR EXPEDIENTE
// ============================================================

function setupExpedienteLookup() {
  const input = document.getElementById("ampExp");

  if (!input) {
    return;
  }

  input.addEventListener("blur", buscarExpediente);

  input.addEventListener("change", buscarExpediente);
}

function buscarExpediente() {
  const numero = document.getElementById("ampExp")?.value.trim();

  if (!numero) {
    hideExpedienteInfo();

    return;
  }

  const expediente = expedientesReferencia.find(
    (item) => String(item.numero).toLowerCase() === numero.toLowerCase(),
  );

  if (!expediente) {
    renderExpedienteNotFound();

    return;
  }

  completarDatosExpediente(expediente);
}

// ============================================================
// AUTOLLENADO
// ============================================================

function completarDatosExpediente(expediente) {
  const promovente = document.getElementById("ampPromueve");

  const oficio = document.getElementById("ampOficio");

  if (promovente && !promovente.value.trim()) {
    promovente.value = expediente.promoventeSugerido || "";
  }

  if (oficio && !oficio.value.trim()) {
    oficio.value = expediente.ultimoOficio || "";
  }

  const container = document.getElementById("ampExpedienteInfo");

  if (!container) {
    return;
  }

  container.hidden = false;

  container.className = "amparo-expediente-info success";

  container.innerHTML = `

        <div class="amparo-expediente-status">

            <i class="fa-solid fa-circle-check"></i>

            Expediente encontrado

        </div>


        <div class="amparo-expediente-grid">


            <div>

                <span>
                    Actor
                </span>

                <strong>
                    ${escapeHTML(expediente.actor || "—")}
                </strong>

            </div>


            <div>

                <span>
                    Demandado
                </span>

                <strong>
                    ${escapeHTML(expediente.demandado || "—")}
                </strong>

            </div>


            <div>

                <span>
                    Estado
                </span>

                <strong>
                    ${escapeHTML(expediente.estado || "—")}
                </strong>

            </div>


            <div>

                <span>
                    Ubicación
                </span>

                <strong>
                    ${escapeHTML(expediente.ubicacion || "—")}
                </strong>

            </div>


        </div>

    `;
}

function renderExpedienteNotFound() {
  const container = document.getElementById("ampExpedienteInfo");

  if (!container) {
    return;
  }

  container.hidden = false;

  container.className = "amparo-expediente-info warning";

  container.innerHTML = `

        <div class="amparo-expediente-status">

            <i class="fa-solid fa-circle-exclamation"></i>

            No se encontró un expediente con ese número.

        </div>

    `;
}

function hideExpedienteInfo() {
  const container = document.getElementById("ampExpedienteInfo");

  if (container) {
    container.hidden = true;
  }
}

// ============================================================
// CANCELAR
// ============================================================

function setupCancel() {
  document
    .getElementById("cancelAmparoBtn")
    ?.addEventListener("click", closeForm);
}

// ============================================================
// SUBMIT
// ============================================================

function setupSubmit(amparoEdicion = null) {
  document
    .getElementById("amparoFormElement")
    ?.addEventListener("submit", (event) => saveAmparo(event, amparoEdicion));
}

// ============================================================
// GUARDAR AMPARO
// ============================================================

function saveAmparo(event, amparoEdicion = null) {
  event.preventDefault();

  const amparos = getData("amparos", []);

  const nuevoAmparo = {
    id: amparoEdicion?.id || createId(),

    dia: document.getElementById("ampDia").value,

    hora: document.getElementById("ampHora").value,

    expediente: document.getElementById("ampExp").value.trim(),

    promovente: document.getElementById("ampPromueve").value.trim(),

    juzgado: document.getElementById("ampJuzgado").value.trim(),

    oficio: document.getElementById("ampOficio").value.trim(),

    actoReclamado: document.getElementById("ampActoReclamado").value.trim(),

    acciones: document.getElementById("ampAcciones").value.trim(),

    observaciones: document.getElementById("ampObservaciones").value.trim(),

    estado: document.getElementById("ampEstado").value,

    creadoEn: amparoEdicion?.creadoEn || new Date().toISOString(),

    actualizadoEn: amparoEdicion ? new Date().toISOString() : undefined,
  };

  if (amparoEdicion) {
    const index = amparos.findIndex(
      (item) => String(item.id) === String(amparoEdicion.id),
    );
    if (index >= 0) {
      const campos = [
        ["Fecha", "dia"],
        ["Hora", "hora"],
        ["Expediente", "expediente"],
        ["Promovente", "promovente"],
        ["No. juzgado", "juzgado"],
        ["No. oficio", "oficio"],
        ["Acto reclamado", "actoReclamado"],
        ["Acciones", "acciones"],
        ["Observaciones", "observaciones"],
        ["Estado", "estado"],
      ];
      const cambios = campos
        .filter(
          ([, key]) =>
            String(amparoEdicion[key] || "") !== String(nuevoAmparo[key] || ""),
        )
        .map(([label]) => label);

      if (cambios.length) {
        const historial = getData("amparoHistorial", []);
        historial.unshift({
          id: createId(),
          amparoId: nuevoAmparo.id,
          expediente: nuevoAmparo.expediente,
          fecha: nuevoAmparo.actualizadoEn,
          detalle: `Campos actualizados: ${cambios.join(", ")}.`,
        });
        saveData("amparoHistorial", historial);
      }
      amparos[index] = nuevoAmparo;
    }
  } else {
    amparos.unshift(nuevoAmparo);
  }

  saveData("amparos", amparos);

  closeForm();

  if (window.renderAmparos) {
    window.renderAmparos();
  }

  if (window.initDashboardPage) {
    window.initDashboardPage();
  }
}
