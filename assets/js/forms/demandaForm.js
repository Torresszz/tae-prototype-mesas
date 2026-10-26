// ============================================================
// FORMULARIO DE DEMANDA
// ============================================================

import { showModal, closeForm } from "./formHelper.js";

import { createId, escapeHTML } from "../utils.js";

import { getData, saveData } from "../storage.js";

// ============================================================
// CATÁLOGOS
// ============================================================

let catalogoEntes = [];
let catalogoAcciones = [];

let tercerosTemporales = [];

// ============================================================
// INICIALIZACIÓN
// ============================================================

export function initDemandaForm() {
  window.openDemandaForm = openDemandaForm;
}

// Al marcar "Otros" aparece el input de captura manual
function setupAccionOtro() {
  const lista = document.getElementById("accionesReclamadasList");
  const wrapper = document.getElementById("accionOtroWrapper");
  const input = document.getElementById("demAccionOtro");

  if (!lista || !wrapper || !input) {
    return;
  }

  lista.addEventListener("change", (event) => {
    const target = event.target;

    if (target.name !== "accionesReclamadas" || target.value !== "otros") {
      return;
    }

    wrapper.style.display = target.checked ? "block" : "none";
    input.required = target.checked;

    if (target.checked) {
      input.focus({ preventScroll: true });
      wrapper.scrollIntoView({ block: "nearest" });
    } else {
      input.value = "";
    }
  });
}

// ============================================================
// CARGAR CATÁLOGOS (Actualizado para leer localStorage)
// ============================================================

async function loadCatalogs() {
  try {
    // 1. Cargar Entes de localStorage primero
    let localEntes = getData("entes", null);

    if (!localEntes) {
      // Si no existen en localStorage, cargar fallback desde JSON
      const entesURL = new URL("../../data/entes.json", import.meta.url);
      const entesResponse = await fetch(entesURL);

      if (entesResponse.ok) {
        const data = await entesResponse.json();
        catalogoEntes = Array.isArray(data) ? data : data.entes || [];
        // Guardar en localStorage para futuras lecturas
        saveData("entes", catalogoEntes);
      }
    } else {
      catalogoEntes = localEntes;
    }

    // 2. Cargar Actos Demandados: primero catálogo administrable en localStorage.
    const actosLocales = getData("actosDemandados", null);
    if (Array.isArray(actosLocales) && actosLocales.length) {
      catalogoAcciones = actosLocales;
    } else {
      const accionesURL = new URL(
        "../../data/acciones-reclamadas.json",
        import.meta.url,
      );
      const accionesResponse = await fetch(accionesURL);
      if (accionesResponse.ok) {
        const data = await accionesResponse.json();
        catalogoAcciones = Array.isArray(data) ? data : data.acciones || [];
        saveData("actosDemandados", catalogoAcciones);
      }
    }
  } catch (error) {
    console.warn("No fue posible cargar los catálogos:", error);
  }
}

// ============================================================
// ABRIR FORMULARIO
// ============================================================

export async function openDemandaForm() {
  await loadCatalogs();

  tercerosTemporales = [];

  showModal(`

        <div class="demanda-form-shell">


            <!-- ============================================
                 ENCABEZADO
            ============================================= -->

            <header class="demanda-form-header">

                <div>

                    <span class="demanda-form-eyebrow">
                        DEMANDAS
                    </span>

                    <h2>
                        Registrar nueva demanda
                    </h2>

                    <p>
                        Captura la información necesaria para registrar
                        la demanda en el sistema.
                    </p>

                </div>

            </header>


            <!-- ============================================
                 FORMULARIO
            ============================================= -->

            <form id="demandaFormElement">

                <div class="demanda-form-content">


                    <!-- ====================================
                         1. IDENTIFICACIÓN
                    ===================================== -->

                    <section class="demanda-form-section">

                        <div class="demanda-section-header">

                            <span class="demanda-section-number">
                                1
                            </span>

                            <div>

                                <h3>
                                    Identificación
                                </h3>

                                <p>
                                    Datos principales de recepción.
                                </p>

                            </div>

                        </div>


                        <div class="demanda-fields-grid">


                            <div class="demanda-field">

                                <label for="demFecha">

                                    Fecha en la que llega

                                    <span>*</span>

                                </label>

                                <input
                                    id="demFecha"
                                    type="date"
                                    required
                                >

                            </div>


                            <div class="demanda-field full">

                                <label for="demObservacionesFecha">
                                    Observaciones de recepción
                                </label>

                                <textarea
                                    id="demObservacionesFecha"
                                    rows="2"
                                    placeholder="Ej. Documento recibido fuera del horario habitual..."
                                ></textarea>

                                <small>
                                    Utiliza este campo para registrar entregas
                                    fuera de horario u otra observación de recepción.
                                </small>

                            </div>


                        </div>

                    </section>



                    <!-- ====================================
                         2. ACTOR Y DEMANDADO
                    ===================================== -->

                    <section class="demanda-form-section">

                        <div class="demanda-section-header">

                            <span class="demanda-section-number">
                                2
                            </span>

                            <div>

                                <h3>
                                    Actor y demandado
                                </h3>

                                <p>
                                    Identifica las partes involucradas.
                                </p>

                            </div>

                        </div>


                        <div class="demanda-parties-grid">


                            <!-- ACTOR -->

                            <article class="demanda-party-card">

                                <div class="demanda-party-heading">

                                    <div class="demanda-party-icon">

                                        <i class="fa-solid fa-user"></i>

                                    </div>

                                    <div>

                                        <h4>
                                            Actor
                                        </h4>

                                        <span>
                                            Parte que promueve la demanda
                                        </span>

                                    </div>

                                </div>


                                <div class="demanda-field">

                                    <label for="demActorTipo">

                                        Tipo de persona

                                        <span>*</span>

                                    </label>

                                    <select
                                        id="demActorTipo"
                                        required
                                    >

                                        <option value="">
                                            Selecciona una opción
                                        </option>

                                        <option value="fisica">
                                            Persona física
                                        </option>

                                        <option value="moral">
                                            Persona moral
                                        </option>

                                    </select>

                                </div>


                                <div
                                    id="actorFisicaContainer"
                                    class="demanda-field demanda-dynamic-field"
                                    hidden
                                >

                                    <label for="demActorNombre">

                                        Nombre completo

                                        <span>*</span>

                                    </label>

                                    <input
                                        id="demActorNombre"
                                        type="text"
                                        placeholder="Nombre completo del actor"
                                    >

                                </div>


                               ${renderMoralFields("actorMoralContainer", "demActor")}

                            </article>



                            <!-- DEMANDADO -->

                            <article class="demanda-party-card">

                                <div class="demanda-party-heading">

                                    <div class="demanda-party-icon">

                                        <i class="fa-solid fa-building"></i>

                                    </div>

                                    <div>

                                        <h4>
                                            Demandado
                                        </h4>

                                        <span>
                                            Parte contra la que se promueve
                                        </span>

                                    </div>

                                </div>


                                <div class="demanda-field">

                                    <label for="demDemandadoTipo">

                                        Tipo de persona

                                        <span>*</span>

                                    </label>

                                    <select
                                        id="demDemandadoTipo"
                                        required
                                    >

                                        <option value="">
                                            Selecciona una opción
                                        </option>

                                        <option value="fisica">
                                            Persona física
                                        </option>

                                        <option value="moral">
                                            Persona moral
                                        </option>

                                    </select>

                                </div>


                                <div
                                    id="demandadoFisicaContainer"
                                    class="demanda-field demanda-dynamic-field"
                                    hidden
                                >

                                    <label for="demDemandadoNombre">

                                        Nombre completo

                                        <span>*</span>

                                    </label>

                                    <input
                                        id="demDemandadoNombre"
                                        type="text"
                                        placeholder="Nombre completo del demandado"
                                    >

                                </div>


                                ${renderMoralFields("demandadoMoralContainer", "demDemandado")}

                            </article>


                        </div>

                    </section>



                    <!-- ====================================
                         3. TERCEROS
                    ===================================== -->

                    <section class="demanda-form-section">

                        <div class="demanda-section-header">

                            <span class="demanda-section-number">
                                3
                            </span>

                            <div>

                                <h3>
                                    Terceros
                                </h3>

                                <p>
                                    Agrega terceros desde el catálogo o
                                    mediante captura manual.
                                </p>

                            </div>

                        </div>


                        <div class="demanda-terceros-entry">


                            <div class="demanda-field">

                                <label for="demTerceroCatalogo">
                                    Catálogo
                                </label>

                                <select id="demTerceroCatalogo">

                                    ${renderEntesOptions("Seleccionar ente")}

                                </select>

                            </div>


                            <div class="demanda-field">

                                <label for="demTerceroManual">
                                    Captura manual
                                </label>

                                <input
                                    id="demTerceroManual"
                                    type="text"
                                    placeholder="Nombre opcional"
                                >

                            </div>


                            <button
                                id="addTerceroBtn"
                                type="button"
                                class="demanda-add-tercero"
                            >

                                <i class="fa-solid fa-plus"></i>

                                Agregar

                            </button>


                        </div>


                        <div
                            id="tercerosList"
                            class="demanda-terceros-list"
                        >

                            <div class="demanda-empty-inline">

                                <i class="fa-solid fa-users"></i>

                                <span>
                                    No se han agregado terceros.
                                </span>

                            </div>

                        </div>

                    </section>



                    <!-- ====================================
                         4. ACCIÓN RECLAMADA
                    ===================================== -->

                    <section class="demanda-form-section">

                        <div class="demanda-section-header">

                            <span class="demanda-section-number">
                                4
                            </span>

                            <div>

                                <h3>
                                    Acto demandado
                                </h3>

                                <p>
                                    Selecciona una o varias opciones del catálogo.
                                </p>

                            </div>

                        </div>


                        <div
                            id="accionesReclamadasList"
                            class="demanda-actions-grid"
                        >

                            ${renderAccionesCheckboxes()}

                        </div>

                        <div
                            id="accionOtroWrapper"
                            class="demanda-field"
                            style="display:none; padding:0 14px 14px;"
                        >
                            <label for="demAccionOtro">
                                Especifica la acción reclamada
                                <span>*</span>
                            </label>

                            <input
                                id="demAccionOtro"
                                type="text"
                                placeholder="Escribe la acción reclamada"
                                autocomplete="off"
                            >
                        </div>

                    </section>



                    <!-- ====================================
                         5. SEGUIMIENTO
                    ===================================== -->

                    <section class="demanda-form-section">

                        <div class="demanda-section-header">

                            <span class="demanda-section-number">
                                5
                            </span>

                            <div>

                                <h3>
                                    Seguimiento
                                </h3>

                                <p>
                                    Estado inicial del registro.
                                </p>

                            </div>

                        </div>


                        <div class="demanda-followup">

                            <div class="demanda-field">

                                <label for="demEstado">
                                    Estado
                                </label>

                                <select id="demEstado">

                                    <option value="Recibido">
                                        Recibido
                                    </option>

                                    <option value="En revisión">
                                        En revisión
                                    </option>

                                    <option value="En instrucción">
                                        En instrucción
                                    </option>

                                    <option value="Pendiente">
                                        Pendiente
                                    </option>

                                </select>

                            </div>

                        </div>

                    </section>


                </div>



                <!-- ========================================
                     FOOTER
                ========================================= -->

                <footer class="demanda-form-footer">

                    <button
                        id="cancelDemandaBtn"
                        type="button"
                        class="demanda-btn-secondary"
                    >
                        Cancelar
                    </button>


                    <button
                        type="submit"
                        class="demanda-btn-primary"
                    >

                        <i class="fa-solid fa-check"></i>

                        Registrar demanda

                    </button>

                </footer>


            </form>

        </div>

    `);

  setToday();

  setupPartySelectors();

  setupTerceros();

  setupAccionOtro();

  setupCancel();

  setupSubmit();
}

// ============================================================
// ENTES
// ============================================================

function renderEntesOptions(placeholder = "Seleccionar ente del catálogo") {
  const activos = catalogoEntes.filter((ente) => ente.activo !== false);

  if (!activos.length) {
    return `
            <option value="">
                Catálogo pendiente de cargar
            </option>
        `;
  }

  const grupos = {};

  activos.forEach((ente) => {
    const grupo = ente.grupo || "Otros";

    if (!grupos[grupo]) {
      grupos[grupo] = [];
    }

    grupos[grupo].push(ente);
  });

  let html = `

        <option value="">
            ${placeholder}
        </option>

    `;

  Object.entries(grupos).forEach(([grupo, entes]) => {
    html += `

                    <optgroup
                        label="${escapeHTML(grupo)}"
                    >

                `;

    entes.forEach((ente) => {
      html += `

                            <option
                                value="${escapeHTML(String(ente.id))}"
                            >
                                ${escapeHTML(ente.nombre)}
                            </option>

                        `;
    });

    html += `
                    </optgroup>
                `;
  });

  return html;
}

const CATEGORIA_OTRO = "Otro";

function getCategoriasEntes() {
  const categorias = catalogoEntes
    .filter((ente) => ente.activo !== false)
    .map((ente) => ente.grupo || "Sin categoría");

  return [...new Set(categorias)];
}

function renderCategoriaOptions() {
  return `
        <option value="">Seleccionar categoría</option>
        ${getCategoriasEntes()
          .map(
            (c) => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`,
          )
          .join("")}
        <option value="${CATEGORIA_OTRO}">Otro</option>
    `;
}

function renderEntesDeCategoria(categoria) {
  const entes = catalogoEntes.filter(
    (ente) =>
      ente.activo !== false && (ente.grupo || "Sin categoría") === categoria,
  );

  return `
        <option value="">Seleccionar ente</option>
        ${entes
          .map(
            (ente) =>
              `<option value="${escapeHTML(String(ente.id))}">${escapeHTML(ente.nombre)}</option>`,
          )
          .join("")}
    `;
}

// Bloque completo de persona moral: Categoría -> Ente (o input si es "Otro")
function renderMoralFields(containerId, base) {
  return `
        <div id="${containerId}" class="demanda-dynamic-field demanda-moral-group" hidden>

            <div class="demanda-field">
                <label for="${base}Categoria">Categoría <span>*</span></label>
                <select id="${base}Categoria">
                    ${renderCategoriaOptions()}
                </select>
            </div>

            <div id="${base}EnteWrap" class="demanda-field" hidden>
                <label for="${base}Ente">Ente <span>*</span></label>
                <select id="${base}Ente"></select>
            </div>

            <div id="${base}OtroWrap" class="demanda-field" hidden>
                <label for="${base}Otro">Nombre del ente <span>*</span></label>
                <input
                    id="${base}Otro"
                    type="text"
                    placeholder="Escribe el nombre del ente"
                    autocomplete="off"
                >
            </div>

        </div>
    `;
}

// ============================================================
// ACCIONES RECLAMADAS
// ============================================================

function renderAccionesCheckboxes() {
  if (!catalogoAcciones.length) {
    return `

            <div class="demanda-catalog-placeholder">

                <div class="demanda-catalog-icon">

                    <i class="fa-solid fa-list-check"></i>

                </div>

                <div>

                    <strong>
                        Catálogo de actos demandados pendiente
                    </strong>

                    <p>
                        Las opciones se cargarán automáticamente
                        desde acciones-reclamadas.json.
                    </p>

                </div>

            </div>

        `;
  }

  return catalogoAcciones
    .filter((item) => item.activo !== false)
    .map(
      (item) => `

                <label class="demanda-action-option">

                    <input
                        type="checkbox"
                        name="accionesReclamadas"
                        value="${escapeHTML(String(item.id || item.nombre))}"
                    >

                    <span class="demanda-check">

                        <i class="fa-solid fa-check"></i>

                    </span>

                    <span>
                        ${escapeHTML(item.nombre)}
                    </span>

                </label>

            `,
    )
    .join("");
}

// ============================================================
// FECHA
// ============================================================

function setToday() {
  const input = document.getElementById("demFecha");

  if (!input) {
    return;
  }

  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  input.value = `${year}-${month}-${day}`;
}

// ============================================================
// PERSONA FÍSICA / MORAL
// ============================================================
function setupPartySelectors() {
  setupPartySelector({
    tipo: "demActorTipo",
    fisica: "actorFisicaContainer",
    moral: "actorMoralContainer",
    nombre: "demActorNombre",
    base: "demActor",
  });

  setupPartySelector({
    tipo: "demDemandadoTipo",
    fisica: "demandadoFisicaContainer",
    moral: "demandadoMoralContainer",
    nombre: "demDemandadoNombre",
    base: "demDemandado",
  });
}

function setupPartySelector({ tipo, fisica, moral, nombre, base }) {
  const selector = document.getElementById(tipo);
  const fisicaEl = document.getElementById(fisica);
  const moralEl = document.getElementById(moral);
  const nombreEl = document.getElementById(nombre);

  const categoria = document.getElementById(`${base}Categoria`);
  const enteWrap = document.getElementById(`${base}EnteWrap`);
  const ente = document.getElementById(`${base}Ente`);
  const otroWrap = document.getElementById(`${base}OtroWrap`);
  const otro = document.getElementById(`${base}Otro`);

  if (!selector || !categoria || !ente || !otro) {
    return;
  }

  // Muestra/oculta campos y ajusta cuáles son obligatorios
  const sync = () => {
    const esFisica = selector.value === "fisica";
    const esMoral = selector.value === "moral";
    const cat = categoria.value;
    const esOtro = cat === CATEGORIA_OTRO;

    fisicaEl.hidden = !esFisica;
    moralEl.hidden = !esMoral;

    if (nombreEl) {
      nombreEl.required = esFisica;
    }

    categoria.required = esMoral;

    enteWrap.hidden = !cat || esOtro;
    ente.required = esMoral && !!cat && !esOtro;

    otroWrap.hidden = !esOtro;
    otro.required = esMoral && esOtro;
  };

  selector.addEventListener("change", sync);

  categoria.addEventListener("change", () => {
    ente.innerHTML = renderEntesDeCategoria(categoria.value);
    ente.value = "";
    otro.value = "";

    sync();

    if (categoria.value === CATEGORIA_OTRO) {
      otro.focus();
    }
  });
}

// ============================================================
// TERCEROS
// ============================================================

function setupTerceros() {
  const button = document.getElementById("addTerceroBtn");

  if (!button) {
    return;
  }

  button.addEventListener("click", addTercero);
}

function addTercero() {
  const catalogSelect = document.getElementById("demTerceroCatalogo");

  const manualInput = document.getElementById("demTerceroManual");

  const catalogId = catalogSelect?.value || "";

  const manual = manualInput?.value.trim() || "";

  if (!catalogId && !manual) {
    return;
  }

  if (catalogId) {
    const ente = catalogoEntes.find(
      (item) => String(item.id || item.nombre) === String(catalogId),
    );

    if (ente) {
      tercerosTemporales.push({
        id: createId(),

        tipo: "catalogo",

        enteId: catalogId,

        nombre: ente.nombre,
      });
    }
  }

  if (manual) {
    tercerosTemporales.push({
      id: createId(),

      tipo: "manual",

      nombre: manual,
    });
  }

  if (catalogSelect) {
    catalogSelect.value = "";
  }

  if (manualInput) {
    manualInput.value = "";
  }

  renderTerceros();
}

function renderTerceros() {
  const container = document.getElementById("tercerosList");

  if (!container) {
    return;
  }

  if (!tercerosTemporales.length) {
    container.innerHTML = `

            <div class="demanda-empty-inline">

                <i class="fa-solid fa-users"></i>

                <span>
                    No se han agregado terceros.
                </span>

            </div>

        `;

    return;
  }

  container.innerHTML = tercerosTemporales
    .map(
      (tercero) => `

                <div class="demanda-tercero-chip">

                    <div>

                        <span>

                            ${
                              tercero.tipo === "catalogo"
                                ? "Catálogo"
                                : "Manual"
                            }

                        </span>

                        <strong>

                            ${escapeHTML(tercero.nombre)}

                        </strong>

                    </div>


                    <button
                        type="button"
                        data-tercero-id="${tercero.id}"
                    >

                        <i class="fa-solid fa-xmark"></i>

                    </button>

                </div>

            `,
    )
    .join("");

  container.querySelectorAll("[data-tercero-id]").forEach((button) => {
    button.addEventListener("click", () => {
      tercerosTemporales = tercerosTemporales.filter(
        (item) => item.id !== button.dataset.terceroId,
      );

      renderTerceros();
    });
  });
}

// ============================================================
// CANCELAR
// ============================================================

function setupCancel() {
  document
    .getElementById("cancelDemandaBtn")
    ?.addEventListener("click", closeForm);
}

// ============================================================
// SUBMIT
// ============================================================

function setupSubmit() {
  document
    .getElementById("demandaFormElement")
    ?.addEventListener("submit", saveDemanda);
}

// ============================================================
// GUARDAR
// ============================================================

function saveDemanda(event) {
  event.preventDefault();

  const actor = getPartyData("demActorTipo", "demActorNombre", "demActor");

  const demandado = getPartyData(
    "demDemandadoTipo",
    "demDemandadoNombre",
    "demDemandado",
  );

  if (!actor.nombre || !demandado.nombre) {
    alert("Completa los datos del actor y del demandado.");

    return;
  }

  const manualOtro =
    document.getElementById("demAccionOtro")?.value.trim() || "";

  const acciones = Array.from(
    document.querySelectorAll('input[name="accionesReclamadas"]:checked'),
  ).map((input) => {
    const item = catalogoAcciones.find(
      (action) => String(action.id || action.nombre) === input.value,
    );

    const esOtros = input.value === "otros";

    return {
      id: input.value,
      nombre: esOtros ? manualOtro || "Otros" : item?.nombre || input.value,
      manual: esOtros,
    };
  });

  if (catalogoAcciones.length && acciones.length === 0) {
    alert("Selecciona al menos una acción demandada.");

    return;
  }

  const demandas = getData("demandas", []);

  // La Demanda origina el Expediente: el folio se genera aquí y
  // se reutiliza tanto en la demanda como en el expediente creado.
  const expedientes = getData("expedientes", []);
  const anioActual = new Date().getFullYear();
  const patronExpediente = new RegExp(`^EXP-${anioActual}-(\\d+)$`, "i");

  const ultimoConsecutivo = expedientes.reduce((maximo, item) => {
    const numero = String(item.numero || item.expediente || "").trim();
    const coincidencia = numero.match(patronExpediente);

    if (!coincidencia) {
      return maximo;
    }

    return Math.max(maximo, Number(coincidencia[1]) || 0);
  }, 0);

  const numeroExpediente = `EXP-${anioActual}-${String(ultimoConsecutivo + 1).padStart(3, "0")}`;

  const nuevaDemanda = {
    id: createId(),

    expediente: numeroExpediente,

    fecha: document.getElementById("demFecha").value,

    observacionesFecha: document
      .getElementById("demObservacionesFecha")
      .value.trim(),

    actorTipo: actor.tipo,

    actorNombre: actor.nombre,

    actorEnteId: actor.enteId,

    actorCategoria: actor.categoria,

    actor: actor.nombre,

    demandadoTipo: demandado.tipo,

    demandadoNombre: demandado.nombre,

    demandadoEnteId: demandado.enteId,

    demandadoCategoria: demandado.categoria,

    demandado: demandado.nombre,

    terceros: [...tercerosTemporales],

    accionesReclamadas: acciones,

    accion: acciones.map((item) => item.nombre).join(", "),

    actos: acciones.map((item) => item.nombre).join(", "),

    estado: document.getElementById("demEstado").value,

    creadoEn: new Date().toISOString(),
  };

  demandas.unshift(nuevaDemanda);

  saveData("demandas", demandas);

  // La demanda es el origen del expediente. Conservamos la clave
  // `expedientes` para que Amparos y los demás módulos sigan
  // trabajando con la misma fuente de referencia.
  expedientes.unshift({
    id: createId(),
    numero: nuevaDemanda.expediente,
    expediente: nuevaDemanda.expediente,
    fecha: nuevaDemanda.fecha,
    fechaRecepcion: nuevaDemanda.fecha,
    actor: nuevaDemanda.actor,
    demandado: nuevaDemanda.demandado,
    actoDemandado: nuevaDemanda.actos || nuevaDemanda.accion || "",
    estado: nuevaDemanda.estado,
    clasificacion: "",
    ubicacion: "",
    demandaId: nuevaDemanda.id,
    origen: "demanda",
    creadoEn: nuevaDemanda.creadoEn,
  });

  saveData("expedientes", expedientes);

  closeForm();

  if (window.renderDemandas) {
    window.renderDemandas();
  }

  if (window.initDashboardPage) {
    window.initDashboardPage();
  }
}

// ============================================================
// DATOS DE PARTE
// ============================================================

function getPartyData(tipoId, nombreId, base) {
  const tipo = document.getElementById(tipoId)?.value || "";

  if (tipo === "fisica") {
    return {
      tipo: "fisica",
      nombre: document.getElementById(nombreId)?.value.trim() || "",
      enteId: null,
      categoria: "",
    };
  }

  if (tipo === "moral") {
    const categoria = document.getElementById(`${base}Categoria`)?.value || "";

    // "Otro": el nombre se captura manualmente
    if (categoria === CATEGORIA_OTRO) {
      return {
        tipo: "moral",
        nombre: document.getElementById(`${base}Otro`)?.value.trim() || "",
        enteId: null,
        categoria: CATEGORIA_OTRO,
      };
    }

    const selectedId = document.getElementById(`${base}Ente`)?.value || "";

    const ente = catalogoEntes.find(
      (item) => String(item.id || item.nombre) === String(selectedId),
    );

    return {
      tipo: "moral",
      nombre: ente?.nombre || "",
      enteId: selectedId || null,
      categoria,
    };
  }

  return { tipo: "", nombre: "", enteId: null, categoria: "" };
}
