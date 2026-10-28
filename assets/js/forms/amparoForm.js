// ============================================================
// FORMULARIO DE AMPARO
// ============================================================

import { showModal, closeForm } from "./formHelper.js";

import {
  createId,
  escapeHTML,
  formatDate,
  getTipoAmparo,
  destinoOficioTexto,
  JUZGADOS_DISTRITO,
  AUTORIDAD_DIRECTO,
} from "../utils.js";

import { getData, saveData } from "../storage.js";

// ============================================================
// DATOS
// ============================================================

let expedientesReferencia = [];

// Oficios capturados en la pestaña "Oficios" que aún no se guardan.
let oficiosPendientes = [];

// Oficios ya guardados y vinculados al amparo que se está editando.
let oficiosGuardados = [];

const DESTINOS_OFICIO = ["Administrativo", "Presidencia", "Otro"];

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

  const tipoInicial = amparoEdicion
    ? getTipoAmparo(amparoEdicion)
    : window.getAmparoTipoActivo?.() || "directo";

  // El tipo solo se puede cambiar mientras la Mesa de Amparos
  // no haya empezado a darle seguimiento.
  const tipoBloqueado = Boolean(
    amparoEdicion &&
      getData("mesasAmparosSeguimiento", {})[String(amparoEdicion.id)],
  );

  oficiosPendientes = [];

  oficiosGuardados = amparoEdicion
    ? getData("oficios", []).filter(
        (item) => String(item.amparoId || "") === String(amparoEdicion.id),
      )
    : [];

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


                <!-- PESTAÑAS DEL MODAL -->

                <div class="amparo-form-tabs" role="tablist">

                    <button type="button" class="amparo-form-tab active" role="tab" data-amparo-form-tab="datos">
                        <i class="fa-solid fa-shield-halved"></i>
                        Datos del amparo
                    </button>

                    <button type="button" class="amparo-form-tab" role="tab" data-amparo-form-tab="oficios">
                        <i class="fa-solid fa-envelope-open-text"></i>
                        Oficios
                        <span class="amparo-form-tab-count" id="ampTabOficiosCount">0</span>
                    </button>

                </div>


                <div class="amparo-form-content">

                    <div class="amparo-tab-pane" id="ampPaneDatos">


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
                                    Expediente laboral
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

                                <label for="ampTipo">
                                    Tipo de amparo
                                    <span>*</span>
                                </label>

                                <select id="ampTipo" ${tipoBloqueado ? "disabled" : ""}>

                                    <option value="directo" ${tipoInicial === "directo" ? "selected" : ""}>
                                        Directo
                                    </option>

                                    <option value="indirecto" ${tipoInicial === "indirecto" ? "selected" : ""}>
                                        Indirecto
                                    </option>

                                </select>

                                ${
                                  tipoBloqueado
                                    ? '<small class="amparo-field-hint">La Mesa de Amparos ya le dio seguimiento; el tipo solo se reclasifica desde allá.</small>'
                                    : ""
                                }

                            </div>


                            <div class="amparo-field" id="ampJuzgadoWrapper">

                                <label for="ampJuzgadoOrigen">
                                    Juzgado de Distrito
                                    <span>*</span>
                                </label>

                                <select id="ampJuzgadoOrigen">

                                    <option value="">
                                        Selecciona un juzgado
                                    </option>

                                    ${JUZGADOS_DISTRITO.map(
                                      (juzgado) =>
                                        `<option value="${escapeHTML(juzgado)}">${escapeHTML(juzgado)}</option>`,
                                    ).join("")}

                                </select>

                            </div>


                            <div class="amparo-field" id="ampAutoridadWrapper">

                                <label for="ampAutoridadDirecto">
                                    Autoridad de origen
                                </label>

                                <input
                                    id="ampAutoridadDirecto"
                                    type="text"
                                    value="${escapeHTML(AUTORIDAD_DIRECTO)}"
                                    readonly
                                >

                            </div>


                            <div class="amparo-field">

                                <label for="ampJuzgado">
                                    Expediente de amparo
                                </label>

                                <input
                                    id="ampJuzgado"
                                    type="text"
                                    placeholder="Ej. 843/2026"
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
                    <!-- /ampPaneDatos -->


                    <!-- =====================================
                         PESTAÑA OFICIOS
                    ====================================== -->

                    <div class="amparo-tab-pane" id="ampPaneOficios" hidden>

                        <section class="amparo-section">

                            <div class="amparo-section-header">

                                <span class="amparo-section-number">
                                    <i class="fa-solid fa-link"></i>
                                </span>

                                <div>

                                    <h3>
                                        Oficios del amparo
                                    </h3>

                                    <p>
                                        Los oficios quedan relacionados con el expediente
                                        laboral y con el expediente de amparo.
                                    </p>

                                </div>

                            </div>


                            <div class="amparo-oficio-rel">

                                <div>
                                    <span>Expediente laboral</span>
                                    <strong id="ampRelLaboral">—</strong>
                                </div>

                                <div>
                                    <span>Expediente de amparo</span>
                                    <strong id="ampRelAmparo">—</strong>
                                </div>

                            </div>


                            <div class="amparo-grid">

                                <div class="amparo-field">

                                    <label for="ampOfNumero">
                                        Número de oficio
                                    </label>

                                    <input
                                        id="ampOfNumero"
                                        type="text"
                                        placeholder="Ej. TAE-SA-0142/2026"
                                        autocomplete="off"
                                    >

                                </div>


                                <div class="amparo-field">

                                    <label for="ampOfFecha">
                                        Fecha del oficio
                                    </label>

                                    <input
                                        id="ampOfFecha"
                                        type="date"
                                    >

                                </div>


                                <div class="amparo-field">

                                    <label for="ampOfDestino">
                                        Destino del oficio
                                    </label>

                                    <select id="ampOfDestino">
                                        ${DESTINOS_OFICIO.map((d) => `<option>${d}</option>`).join("")}
                                    </select>

                                </div>


                                <div class="amparo-field" id="ampOfDestinoOtroWrapper" hidden>

                                    <label for="ampOfDestinoOtro">
                                        Especifica el destino
                                    </label>

                                    <input
                                        id="ampOfDestinoOtro"
                                        type="text"
                                        placeholder="Escribe el destino"
                                        autocomplete="off"
                                    >

                                </div>


                                <div class="amparo-field full">

                                    <label for="ampOfAsunto">
                                        Asunto
                                    </label>

                                    <input
                                        id="ampOfAsunto"
                                        type="text"
                                        placeholder="Descripción breve del oficio"
                                        autocomplete="off"
                                    >

                                </div>

                            </div>


                            <div class="amparo-oficio-add">

                                <button type="button" class="amparo-btn-secondary" id="ampOfAddBtn">
                                    <i class="fa-solid fa-plus"></i>
                                    Agregar oficio
                                </button>

                            </div>


                            <div id="ampOficiosLista" class="amparo-oficios-lista"></div>

                        </section>

                    </div>


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
  setupTipoToggle();
  setupFormTabs();
  setupOficiosTab();
  setupCancel();
  setupSubmit(amparoEdicion);
}

// ============================================================
// TIPO DE AMPARO (directo / indirecto)
// ============================================================

function setupTipoToggle() {
  const select = document.getElementById("ampTipo");

  if (!select) {
    return;
  }

  select.addEventListener("change", applyTipo);

  applyTipo();
}

function applyTipo() {
  const esIndirecto = document.getElementById("ampTipo")?.value === "indirecto";

  const juzgadoWrapper = document.getElementById("ampJuzgadoWrapper");
  const juzgadoSelect = document.getElementById("ampJuzgadoOrigen");
  const autoridadWrapper = document.getElementById("ampAutoridadWrapper");

  // Indirecto: selector de juzgado. Directo: solo se reciben del TCC.
  if (juzgadoWrapper) juzgadoWrapper.hidden = !esIndirecto;
  if (autoridadWrapper) autoridadWrapper.hidden = esIndirecto;

  if (juzgadoSelect) {
    juzgadoSelect.required = esIndirecto;

    if (!esIndirecto) {
      juzgadoSelect.value = "";
    }
  }
}

// ============================================================
// PESTAÑAS DEL MODAL
// ============================================================

function setupFormTabs() {
  document.querySelectorAll("[data-amparo-form-tab]").forEach((tab) => {
    tab.addEventListener("click", () => activarTab(tab.dataset.amparoFormTab));
  });

  // Si falta un campo obligatorio estando en "Oficios", volvemos
  // a "Datos" para que el navegador pueda mostrar el error.
  document
    .getElementById("amparoFormElement")
    ?.addEventListener("invalid", () => activarTab("datos"), true);
}

function activarTab(nombre) {
  document.querySelectorAll("[data-amparo-form-tab]").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.amparoFormTab === nombre);
  });

  const datos = document.getElementById("ampPaneDatos");
  const oficios = document.getElementById("ampPaneOficios");

  if (datos) datos.hidden = nombre !== "datos";
  if (oficios) oficios.hidden = nombre !== "oficios";

  if (nombre === "oficios") {
    actualizarRelacion();
  }
}

// ============================================================
// PESTAÑA OFICIOS
// ============================================================

function setupOficiosTab() {
  const destino = document.getElementById("ampOfDestino");

  destino?.addEventListener("change", () => {
    const esOtro = destino.value === "Otro";
    const wrapper = document.getElementById("ampOfDestinoOtroWrapper");
    const input = document.getElementById("ampOfDestinoOtro");

    if (wrapper) wrapper.hidden = !esOtro;

    if (input) {
      if (esOtro) input.focus();
      else input.value = "";
    }
  });

  document
    .getElementById("ampOfAddBtn")
    ?.addEventListener("click", () => agregarOficioPendiente());

  // Enter dentro de la pestaña agrega el oficio en lugar de guardar el amparo.
  document
    .getElementById("ampPaneOficios")
    ?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.target.tagName === "INPUT") {
        event.preventDefault();
        agregarOficioPendiente();
      }
    });

  document
    .getElementById("ampOficiosLista")
    ?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-of-remove]");

      if (!button) {
        return;
      }

      oficiosPendientes.splice(Number(button.dataset.ofRemove), 1);

      renderOficiosLista();
    });

  renderOficiosLista();
}

function actualizarRelacion() {
  const laboral = document.getElementById("ampExp")?.value.trim();
  const amparo = document.getElementById("ampJuzgado")?.value.trim();

  const setText = (id, value) => {
    const element = document.getElementById(id);

    if (element) element.textContent = value || "Sin capturar";
  };

  setText("ampRelLaboral", laboral);
  setText("ampRelAmparo", amparo);
}

// Agrega a la lista el oficio capturado. Devuelve true si se agregó.
function agregarOficioPendiente() {
  const numero = document.getElementById("ampOfNumero");
  const fecha = document.getElementById("ampOfFecha");
  const destino = document.getElementById("ampOfDestino");
  const destinoOtro = document.getElementById("ampOfDestinoOtro");
  const asunto = document.getElementById("ampOfAsunto");

  if (!numero?.value.trim()) {
    numero?.focus();
    return false;
  }

  if (!fecha?.value) {
    fecha?.focus();
    return false;
  }

  if (destino.value === "Otro" && !destinoOtro.value.trim()) {
    destinoOtro.focus();
    return false;
  }

  oficiosPendientes.push({
    numero: numero.value.trim(),
    fecha: fecha.value,
    destino: destino.value,
    destinoOtro: destino.value === "Otro" ? destinoOtro.value.trim() : "",
    asunto: asunto.value.trim(),
  });

  numero.value = "";
  fecha.value = "";
  asunto.value = "";
  destinoOtro.value = "";
  destino.value = DESTINOS_OFICIO[0];
  destino.dispatchEvent(new Event("change"));

  renderOficiosLista();

  numero.focus();

  return true;
}

function renderOficiosLista() {
  const lista = document.getElementById("ampOficiosLista");
  const contador = document.getElementById("ampTabOficiosCount");

  const total = oficiosGuardados.length + oficiosPendientes.length;

  if (contador) {
    contador.textContent = total;
  }

  if (!lista) {
    return;
  }

  if (total === 0) {
    lista.innerHTML =
      '<p class="amparo-oficios-empty">Aún no hay oficios relacionados con este amparo.</p>';
    return;
  }

  const fila = (oficio, etiqueta, botonQuitar = "") => `
    <div class="amparo-oficio-item">
      <div>
        <strong>${escapeHTML(oficio.numero || "Sin número")}</strong>
        <span>${escapeHTML(formatDate(oficio.fecha))} · Destino: ${escapeHTML(destinoOficioTexto(oficio) || "Sin destino")}</span>
        ${oficio.asunto ? `<p>${escapeHTML(oficio.asunto)}</p>` : ""}
      </div>
      <div class="amparo-oficio-item-side">
        <em>${etiqueta}</em>
        ${botonQuitar}
      </div>
    </div>`;

  lista.innerHTML =
    oficiosGuardados.map((oficio) => fila(oficio, "Registrado")).join("") +
    oficiosPendientes
      .map((oficio, index) =>
        fila(
          oficio,
          "Se guardará con el amparo",
          `<button type="button" class="amparo-oficio-remove" data-of-remove="${index}" title="Quitar" aria-label="Quitar"><i class="fa-solid fa-xmark"></i></button>`,
        ),
      )
      .join("");
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
    ampTipo: getTipoAmparo(amparo),
    ampJuzgadoOrigen: amparo.juzgadoOrigen || "",
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

  if (promovente && !promovente.value.trim()) {
    promovente.value = expediente.promoventeSugerido || "";
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

  // Si dejaron un oficio capturado sin pulsar "Agregar", se agrega ahora.
  if (document.getElementById("ampOfNumero")?.value.trim()) {
    if (!agregarOficioPendiente()) {
      activarTab("oficios");
      return;
    }
  }

  const amparos = getData("amparos", []);

  const tipoAmparo = document.getElementById("ampTipo").value;

  const juzgadoOrigen =
    tipoAmparo === "indirecto"
      ? document.getElementById("ampJuzgadoOrigen").value
      : AUTORIDAD_DIRECTO;

  const expedienteLaboral = document.getElementById("ampExp").value.trim();

  const expedienteAmparo = document.getElementById("ampJuzgado").value.trim();

  const ahora = new Date().toISOString();

  const nuevoAmparo = {
    id: amparoEdicion?.id || createId(),

    tipoAmparo,

    dia: document.getElementById("ampDia").value,

    hora: document.getElementById("ampHora").value,

    expediente: expedienteLaboral,

    promovente: document.getElementById("ampPromueve").value.trim(),

    // Número de expediente de amparo (asignado por el juzgado o el TCC)
    juzgado: expedienteAmparo,

    // Juzgado de Distrito (indirectos) o TCC (directos)
    juzgadoOrigen,

    // Se conserva el último número de oficio ligado al amparo.
    oficio: amparoEdicion?.oficio || oficiosPendientes[0]?.numero || "",

    actoReclamado: document.getElementById("ampActoReclamado").value.trim(),

    acciones: document.getElementById("ampAcciones").value.trim(),

    observaciones: document.getElementById("ampObservaciones").value.trim(),

    estado: document.getElementById("ampEstado").value,

    creadoEn: amparoEdicion?.creadoEn || ahora,

    actualizadoEn: amparoEdicion ? ahora : undefined,
  };

  // ==========================================================
  // OFICIOS: se relacionan con el expediente laboral y el de amparo
  // ==========================================================

  const oficios = getData("oficios", []);

  // Si cambió alguno de los dos números, los oficios ya ligados lo reflejan.
  oficios.forEach((oficio) => {
    if (String(oficio.amparoId || "") === String(nuevoAmparo.id)) {
      oficio.expediente = expedienteLaboral;
      oficio.expedienteAmparo = expedienteAmparo;
    }
  });

  const nuevosOficios = oficiosPendientes.map((oficio) => ({
    id: createId(),
    numero: oficio.numero,
    expediente: expedienteLaboral,
    expedienteAmparo,
    fecha: oficio.fecha,
    procedencia: juzgadoOrigen,
    asunto: oficio.asunto,
    estado: "Pendiente",
    recibidoPor: "",
    fechaRecepcion: null,
    destino: oficio.destino,
    destinoOtro: oficio.destinoOtro,
    origen: "amparo",
    amparoId: nuevoAmparo.id,
    creadoEn: ahora,
  }));

  if (nuevosOficios.length || oficios.length) {
    saveData("oficios", [...nuevosOficios, ...oficios]);
  }

  if (amparoEdicion) {
    const index = amparos.findIndex(
      (item) => String(item.id) === String(amparoEdicion.id),
    );
    if (index >= 0) {
      const campos = [
        ["Fecha", "dia"],
        ["Hora", "hora"],
        ["Tipo de amparo", "tipoAmparo"],
        ["Expediente laboral", "expediente"],
        ["Promovente", "promovente"],
        ["Expediente de amparo", "juzgado"],
        ["Juzgado", "juzgadoOrigen"],
        ["Acto reclamado", "actoReclamado"],
        ["Acciones", "acciones"],
        ["Observaciones", "observaciones"],
        ["Estado", "estado"],
      ];

      // Para amparos viejos sin tipo guardado, comparamos contra el deducido.
      const anterior = {
        ...amparoEdicion,
        tipoAmparo: getTipoAmparo(amparoEdicion),
      };

      const cambios = campos
        .filter(
          ([, key]) => String(anterior[key] || "") !== String(nuevoAmparo[key] || ""),
        )
        .map(([label]) => label);

      if (nuevosOficios.length) {
        cambios.push(`Oficios agregados (${nuevosOficios.length})`);
      }

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

  if (window.renderOficios) {
    window.renderOficios();
  }

  if (window.initDashboardPage) {
    window.initDashboardPage();
  }
}
