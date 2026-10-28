// ============================================================
// MESA DE AMPAROS (DIRECTOS E INDIRECTOS)
// assets/js/modules/mesasAmparos.js
// ============================================================
//
// Lee los amparos que registra Oficialía (clave "amparos") y lleva su
// seguimiento en la clave "mesasAmparosSeguimiento":
//
//   { [idAmparo]: { tipo, etapa, desde, historial[], ... } }
//
// El módulo 1 no distingue directo/indirecto, así que el tipo se deduce
// por texto y se puede reclasificar desde el modal.
// ============================================================

import { getData, saveData } from "../storage.js";

import { escapeHTML, getTipoAmparo, JUZGADOS_DISTRITO } from "../utils.js";

import { showModal, closeForm } from "../forms/formHelper.js";

import { getSession } from "../auth.js";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY = "mesasAmparosSeguimiento";

const DIAS_INFORME = 15; // amparo indirecto: días para informar
const DIAS_LAUDOS = 3; // amparo indirecto: días de Laudos para el cumplimiento
const DIAS_AVISO = 3; // avisar cuando falten estos días o menos

// Plazos en días naturales (confirmar con el tribunal si son hábiles).

const FLUJOS = {
  directo: [
    { id: "registro", nombre: "Registro", dep: "Mesa de Amparos" },
    { id: "acuerdo", nombre: "Acuerdo", dep: "Mesa de Amparos" },
    { id: "notificacion", nombre: "Notificación", dep: "Actuaría" },
    { id: "informe", nombre: "Informe Justificado", dep: "Mesa de Amparos" },
    { id: "resolucion", nombre: "Resolución", dep: "Tribunal Colegiado" },
    { id: "cumplimiento", nombre: "Cumplimiento", dep: "Laudos" },
    { id: "cuadernillo", nombre: "Cuadernillo", dep: "Mesa de Amparos" },
    { id: "archivo", nombre: "Archivo", dep: "Archivo" },
  ],

  indirecto: [
    { id: "recibido", nombre: "Recibido", dep: "Mesa de Amparos" },
    { id: "informe", nombre: "Informe (15 días)", dep: "Mesa de Amparos" },
    { id: "laudos", nombre: "Laudos (3 días)", dep: "Laudos" },
    { id: "cuadernillo", nombre: "Cuadernillo", dep: "Mesa de Amparos" },
    { id: "concluido", nombre: "Concluido", dep: "Archivo" },
  ],
};

const ETAPA_FINAL = { directo: "archivo", indirecto: "concluido" };

const JUZGADOS = JUZGADOS_DISTRITO;

const MOTIVOS = [
  "Omisión de radicar la demanda",
  "Señalar fecha",
  "Acordar calificación de pruebas",
  "Acuerdo de los alegatos",
  "Omisión de cierre",
  "Fecha señalada muy lejana (se pide adelantarla)",
  "Otro",
];

const DOCS_CUADERNILLO = [
  { id: "laudo", texto: "Copia del laudo" },
  {
    id: "notificaciones",
    texto: "Notificaciones y acuerdos posteriores al laudo",
  },
  { id: "demanda", texto: "Copia de la demanda de amparo" },
  { id: "informe", texto: "Informe resultante" },
  {
    id: "oficioRecepcion",
    texto: "Oficio y acuerdo de recepción del expediente (amparo negado)",
    soloSiNegada: true,
  },
];

// Estado de la vista
let estadoFiltro = "todos";

// Cada página (directos / indirectos) declara su tipo en #mampPage[data-tipo]
function tipoPagina() {
  return document.getElementById("mampPage")?.dataset.tipo || "directo";
}
let busqueda = "";
let etapaFiltro = "";

// ============================================================
// INICIALIZACIÓN
// ============================================================

export function initMesasAmparos() {
  window.renderMesasAmparos = renderMesasAmparos;
}

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderMesasAmparos() {
  if (!document.getElementById("mampPage")) {
    return;
  }

  prepararSeguimiento();

  setupEvents();

    const registros = getRegistros().filter((r) => r.seg.tipo === tipoPagina());

  renderConteos(registros);

  renderFiltroEtapas();

  renderTabla(registros);

  renderAlertas(registros);
}

// ============================================================
// SEGUIMIENTO
// ============================================================

function prepararSeguimiento() {
  const amparos = getData("amparos", []);

  const seguimiento = getData(KEY, {});

  let changed = false;

  amparos.forEach((amparo) => {
    const id = String(amparo.id || "");

    if (!id || seguimiento[id]) {
      return;
    }

    seguimiento[id] = crearEstado(amparo, detectarTipo(amparo));

    changed = true;
  });

  if (changed) {
    saveData(KEY, seguimiento);
  }
}

function crearEstado(amparo, tipo) {
  const ahora = new Date().toISOString();

  return {
    tipo,
    etapa: FLUJOS[tipo][0].id,
    desde: ahora,
    ubicacion: "",
    quejoso: amparo.promovente || "",
    terceros: "",
    acuerdoTexto: "",
    informeOficio: "",
    suspension: null,
    cumplimiento: { laudoNuevo: false, reenviado: false, cumplido: false },
    cuad: {},
    juzgado: JUZGADOS.includes(amparo.juzgadoOrigen) ? amparo.juzgadoOrigen : "",
    motivo: "",
    firmaRecibido: false,
    actoCierto: null,
    requerimientos: [],
    historial: [
      {
        fecha: ahora,
        movimiento: "Amparo recibido en la Mesa de Amparos",
        por: "Sistema",
      },
    ],
  };
}

// "indirecto" contiene "directo": se revisa primero.
function detectarTipo(amparo) {
  return getTipoAmparo(amparo);
}

function getRegistros() {
  const amparos = getData("amparos", []);

  const seguimiento = getData(KEY, {});

  return amparos
    .filter((amparo) => seguimiento[String(amparo.id)])
    .map((amparo) => {
      const seg = seguimiento[String(amparo.id)];

      const etapa = getEtapa(seg.tipo, seg.etapa);

      return { amparo, seg, etapa, plazo: calcularPlazo(amparo, seg) };
    });
}

function getEtapa(tipo, etapaId) {
  return FLUJOS[tipo].find((etapa) => etapa.id === etapaId) || FLUJOS[tipo][0];
}

// ============================================================
// EVENTOS
// ============================================================

function setupEvents() {
  const page = document.getElementById("mampPage");

  const search = document.getElementById("mampSearch");

  const etapa = document.getElementById("mampEtapaFilter");

  if (search) {
    search.value = busqueda;

    search.oninput = (event) => {
      busqueda = event.target.value.trim().toLowerCase();

      renderMesasAmparos();
    };
  }

  if (etapa) {
    etapa.onchange = (event) => {
      etapaFiltro = event.target.value;

      renderMesasAmparos();
    };
  }

  document.querySelectorAll("#mampTabs .mesas-status-tab").forEach((boton) => {
    boton.onclick = () => {
      estadoFiltro = boton.dataset.estado;

      etapaFiltro = "";

      renderMesasAmparos();
    };
  });

  const demo = document.getElementById("mampLoadDemoBtn");

  if (demo) {
    demo.onclick = cargarDemo;
  }

  if (page) {
    page.onclick = (event) => {
      const boton = event.target.closest("[data-mamp-action]");

      if (boton?.dataset.mampAction === "abrir") {
        abrirAmparo(boton.dataset.id);
      }
    };
  }
}

// ============================================================
// CONTEOS, FILTRO DE ETAPAS Y TABLA
// ============================================================

function renderConteos(registros) {
  const concluidos = registros.filter(
    (r) => r.seg.etapa === ETAPA_FINAL[r.seg.tipo],
  ).length;

  setText("mampCountTodos", registros.length);

  setText("mampCountActivos", registros.length - concluidos);

  setText("mampCountConcluidos", concluidos);

  document.querySelectorAll("#mampTabs .mesas-status-tab").forEach((boton) => {
    boton.classList.toggle("active", boton.dataset.estado === estadoFiltro);
  });
}

function renderFiltroEtapas() {
  const select = document.getElementById("mampEtapaFilter");

  if (!select) {
    return;
  }

  const tipos = [tipoPagina()];

  const titulos = { directo: "Directos", indirecto: "Indirectos" };

  select.innerHTML =
    `<option value="">Todas las etapas</option>` +
    tipos
      .map(
        (tipo) => `
            <optgroup label="${titulos[tipo]}">
                ${FLUJOS[tipo]
                  .map(
                    (etapa) =>
                      `<option value="${tipo}:${etapa.id}">${escapeHTML(etapa.nombre)}</option>`,
                  )
                  .join("")}
            </optgroup>
        `,
      )
      .join("");

  select.value = etapaFiltro;

  if (select.value !== etapaFiltro) {
    etapaFiltro = "";
    select.value = "";
  }
}

function renderTabla(registros) {
  const tbody = document.getElementById("mampTable");

  const empty = document.getElementById("mampEmpty");

  if (!tbody) {
    return;
  }

  let visibles = registros;

  if (estadoFiltro !== "todos") {
    const concluido = (r) => r.seg.etapa === ETAPA_FINAL[r.seg.tipo];

    visibles = visibles.filter((r) =>
      estadoFiltro === "concluidos" ? concluido(r) : !concluido(r),
    );
  }

  if (etapaFiltro) {
    visibles = visibles.filter(
      (r) => `${r.seg.tipo}:${r.seg.etapa}` === etapaFiltro,
    );
  }

  if (busqueda) {
    visibles = visibles.filter((r) =>
      [r.amparo.id, r.amparo.expediente, r.amparo.promovente, r.amparo.juzgado]
        .join(" ")
        .toLowerCase()
        .includes(busqueda),
    );
  }

  if (empty) {
    empty.hidden = visibles.length > 0;
  }

  tbody.innerHTML = visibles.map(renderFila).join("");
}

function renderFila({ amparo, seg, etapa, plazo }) {
  const final = seg.etapa === ETAPA_FINAL[seg.tipo];

  const claseEtapa = final ? "mamp-ok" : "acuerdo";

  return `
        <tr>
            <td>
                <span class="mesas-expediente-number">${escapeHTML(amparo.id)}</span>
            </td>
            <td>${escapeHTML(amparo.expediente || "—")}</td>
            <td>${escapeHTML(amparo.promovente || "—")}</td>
            <td>
                <span class="mesas-stage-badge ${claseEtapa}">${escapeHTML(etapa.nombre)}</span>
                ${final ? "" : `<span class="mamp-dep">${escapeHTML(etapa.dep)}</span>`}
            </td>
            <td>
                ${
                  plazo
                    ? `<span class="mesas-stage-badge mamp-${plazo.nivel}">${escapeHTML(plazo.texto)}</span>`
                    : "—"
                }
            </td>
            <td>
                <div class="mesas-actions">
                    <button
                        type="button"
                        class="${final ? "mesas-secondary-btn" : "mesas-primary-btn"}"
                        data-mamp-action="abrir"
                        data-id="${escapeHTML(amparo.id)}"
                    >
                        <i class="fa-solid ${final ? "fa-folder-open" : "fa-pen-to-square"}"></i>
                        ${final ? "Ver" : "Gestionar"}
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// ============================================================
// PLAZOS Y ALERTAS
// ============================================================

function calcularPlazo(amparo, seg) {
  let inicio = null;

  let limite = 0;

  if (seg.tipo === "indirecto" && ["recibido", "informe"].includes(seg.etapa)) {
    inicio = parseFecha(amparo.dia) || parseFecha(seg.desde);

    limite = DIAS_INFORME;
  } else if (seg.tipo === "indirecto" && seg.etapa === "laudos") {
    inicio = parseFecha(seg.desde);

    limite = DIAS_LAUDOS;
  }

  if (!inicio) {
    return null;
  }

  const restantes = limite - diasDesde(inicio);

  if (restantes < 0) {
    return { restantes, nivel: "danger", texto: `Vencido hace ${-restantes} d` };
  }

  return {
    restantes,
    nivel: restantes <= DIAS_AVISO ? "warn" : "ok",
    texto: restantes === 0 ? "Vence hoy" : `${restantes} d restantes`,
  };
}

function renderAlertas(registros) {
  const contenedor = document.getElementById("mampAlerts");

  if (!contenedor) {
    return;
  }

  const alertas = [];

  registros.forEach(({ amparo, seg, plazo }) => {
    const etiqueta = `${amparo.id} · ${amparo.expediente || "sin expediente"}`;

    if (plazo && plazo.nivel !== "ok") {
      const que = seg.etapa === "laudos" ? "cumplimiento de Laudos" : "informe";

      alertas.push({
        clase: plazo.nivel === "danger" ? "danger" : "",
        icono: "fa-triangle-exclamation",
        numero: etiqueta,
        texto:
          plazo.restantes < 0
            ? `Plazo de ${que} vencido hace ${-plazo.restantes} d`
            : `Plazo de ${que}: ${plazo.texto.toLowerCase()}`,
      });
    }

    if (seg.etapa === FLUJOS[seg.tipo][0].id) {
      alertas.push({
        clase: "blue",
        icono: "fa-flag",
        numero: etiqueta,
        texto: "Amparo nuevo por registrar",
      });
    }
  });

  setText("mampAlertCount", alertas.length);

  if (!alertas.length) {
    contenedor.innerHTML = `
            <div class="mesas-no-alerts">
                <i class="fa-regular fa-bell"></i>
                <span>Sin alertas pendientes.</span>
            </div>
        `;

    return;
  }

  contenedor.innerHTML = alertas
    .slice(0, 10)
    .map(
      (alerta) => `
            <div class="mesas-alert-item ${alerta.clase}">
                <div class="mesas-alert-icon"><i class="fa-solid ${alerta.icono}"></i></div>
                <div class="mesas-alert-body">
                    <strong>${escapeHTML(alerta.numero)}</strong>
                    <span>${escapeHTML(alerta.texto)}</span>
                </div>
            </div>
        `,
    )
    .join("");
}

// ============================================================
// MODAL DEL AMPARO
// ============================================================

function abrirAmparo(id) {
  const amparo = getData("amparos", []).find((a) => String(a.id) === String(id));

  const seg = getData(KEY, {})[String(id)];

  if (!amparo || !seg) {
    return;
  }

  const flujo = FLUJOS[seg.tipo];

  const indice = flujo.findIndex((etapa) => etapa.id === seg.etapa);

  const final = seg.etapa === ETAPA_FINAL[seg.tipo];

  const panel = final
    ? { html: `<p class="mamp-note">Amparo concluido. ${seg.tipo === "directo" ? "El cuadernillo queda en la Mesa de Amparos." : "El juzgado notificó el archivo."}</p>` }
    : panelEtapa(amparo, seg);

  const plazo = calcularPlazo(amparo, seg);

  const historial = seg.historial
    .slice()
    .reverse()
    .map(
      (evento) => `
            <li>
                <strong>${escapeHTML(formatFecha(evento.fecha))} · ${escapeHTML(evento.por || "")}</strong>
                ${escapeHTML(evento.movimiento)}
            </li>
        `,
    )
    .join("");

  showModal(`
        <div class="mesas-modal-shell" id="mampModal" data-id="${escapeHTML(id)}">
            <header class="mesas-modal-header">
                <div class="mesas-modal-header-text">
                    <h2>Amparo ${seg.tipo === "directo" ? "directo" : "indirecto"} ${escapeHTML(amparo.id)}</h2>
                    <p>
                        Expediente ${escapeHTML(amparo.expediente || "—")}
                        ·
                        <button type="button" class="mamp-inline-link" data-mamp-act="cambiar-tipo">
                            Turnar a amparos ${seg.tipo === "directo" ? "indirectos" : "directos"}
                        </button>
                    </p>
                </div>
            </header>

            <div class="mesas-modal-body">
                <div class="mesas-modal-info">
                    <div class="mesas-modal-info-item">
                        <span>Promovente</span>
                        <strong>${escapeHTML(amparo.promovente || "—")}</strong>
                    </div>
                    <div class="mesas-modal-info-item">
                        <span>Juzgado / oficio</span>
                        <strong>${escapeHTML([amparo.juzgado, amparo.oficio].filter(Boolean).join(" · ") || "—")}</strong>
                    </div>
                    <div class="mesas-modal-info-item">
                        <span>Acto reclamado</span>
                        <strong>${escapeHTML(amparo.actoReclamado || "—")}</strong>
                    </div>
                    <div class="mesas-modal-info-item">
                        <span>Plazo</span>
                        <strong>${escapeHTML(plazo ? plazo.texto : "Sin plazo en esta etapa")}</strong>
                    </div>
                </div>

                <ol class="mamp-steps">
                    ${flujo
                      .map(
                        (etapa, i) =>
                          `<li class="${i < indice || final ? "done" : i === indice ? "current" : ""}">${escapeHTML(etapa.nombre)}</li>`,
                      )
                      .join("")}
                </ol>

                ${panel.html}

                <p class="mesas-form-error" id="mampError" hidden></p>

                <ul class="mesas-history">${historial}</ul>
            </div>

            <footer class="mesas-modal-footer">
                <button type="button" class="mesas-modal-cancel" id="mampCerrar">Cerrar</button>
                ${
                  panel.accion
                    ? `<button type="button" class="mesas-modal-confirm" data-mamp-act="${panel.accion.act}" ${panel.accion.disabled ? "disabled" : ""}>
                            <i class="fa-solid ${panel.accion.icono || "fa-arrow-right"}"></i>
                            ${escapeHTML(panel.accion.label)}
                       </button>`
                    : ""
                }
            </footer>
        </div>
    `);

  const modal = document.getElementById("mampModal");

  document.getElementById("mampCerrar")?.addEventListener("click", closeForm);

  modal.addEventListener("click", (event) => {
    const boton = event.target.closest("[data-mamp-act]");

    if (boton && !boton.disabled) {
      ejecutar(boton.dataset.mampAct, id, modal);
    }
  });

  modal.addEventListener("change", (event) => {
    const input = event.target;

    // Cuadernillo: marcar documentos
    if (input.matches("[data-cuad]")) {
      actualizar(id, (s) => {
        s.cuad[input.dataset.cuad] = input.checked;
      });

      abrirAmparo(id);

      return;
    }

    // Resolución: mostrar cantidad solo si concede fijando cantidad
    if (input.name === "mampResultado") {
      const campo = document.getElementById("mampCantidadWrap");

      if (campo) {
        campo.hidden = input.value !== "concede_cantidad";
      }
    }
  });
}

// ============================================================
// PANEL SEGÚN ETAPA  →  { html, accion }
// ============================================================

function campoTexto(id, etiqueta, valor, placeholder = "") {
  return `
        <div class="mamp-field">
            <label for="${id}">${etiqueta}</label>
            <input type="text" id="${id}" value="${escapeHTML(valor || "")}" placeholder="${escapeHTML(placeholder)}">
        </div>
    `;
}

function panelEtapa(amparo, seg) {
  const clave = `${seg.tipo}:${seg.etapa}`;

  switch (clave) {
    // ------------------------------------------------ DIRECTOS
    case "directo:registro":
      return {
        html:
          campoTexto(
            "mampUbicacion",
            "¿Dónde está el expediente?",
            seg.ubicacion,
            "Ej. Mesa 2, Actuaría, Archivo...",
          ) +
          campoTexto("mampQuejoso", "Quejoso", seg.quejoso) +
          campoTexto(
            "mampTerceros",
            "Terceros interesados",
            seg.terceros,
            "Separados por comas",
          ),
        accion: { act: "dir-registro", label: "Registrar y turnar a acuerdo", icono: "fa-clipboard-check" },
      };

    case "directo:acuerdo":
      return {
        html: `
                <div class="mamp-field">
                    <label for="mampAcuerdo">Acuerdo de trámite</label>
                    <textarea id="mampAcuerdo" placeholder="Se tiene por recibida la demanda de amparo directo...">${escapeHTML(seg.acuerdoTexto)}</textarea>
                </div>`,
        accion: { act: "dir-acuerdo", label: "Dictar acuerdo y turnar a Actuaría", icono: "fa-file-signature" },
      };

    case "directo:notificacion":
      return {
        html: `<p class="mamp-note">En Actuaría: debe notificar al quejoso (${escapeHTML(seg.quejoso || "—")}) y a los terceros interesados${seg.terceros ? ` (${escapeHTML(seg.terceros)})` : ""}.</p>`,
        accion: { act: "dir-notificacion", label: "Actuaría devolvió las notificaciones", icono: "fa-envelope-circle-check" },
      };

    case "directo:informe":
      return {
        html:
          `<p class="mamp-note">Se emite el oficio <strong>Informe Justificado</strong> dirigido al Tribunal Colegiado de Circuito y se envía el expediente, la demanda de amparo original y las notificaciones.</p>` +
          campoTexto(
            "mampOficio",
            "Número del oficio (Informe Justificado)",
            seg.informeOficio || amparo.oficio,
          ),
        accion: { act: "dir-informe", label: "Enviar al Tribunal Colegiado", icono: "fa-paper-plane" },
      };

    case "directo:resolucion":
      return {
        html: `
                <p class="mamp-note">Resultado de la suspensión del acto reclamado.</p>
                <div class="mamp-options">
                    <label class="mamp-option"><input type="radio" name="mampResultado" value="concede_cantidad"> Concede y fija una cantidad</label>
                    <label class="mamp-option"><input type="radio" name="mampResultado" value="concede_sin_cantidad"> Concede sin fijar cantidad (p. ej. reinstalación del trabajador)</label>
                    <label class="mamp-option"><input type="radio" name="mampResultado" value="niega"> Niega la suspensión</label>
                </div>
                <div class="mamp-field" id="mampCantidadWrap" hidden>
                    <label for="mampCantidad">Cantidad fijada (MXN)</label>
                    <input type="number" id="mampCantidad" min="0" step="0.01">
                </div>`,
        accion: { act: "dir-resolucion", label: "Registrar resolución", icono: "fa-gavel" },
      };

    case "directo:cumplimiento": {
      const c = seg.cumplimiento;

      const paso = !c.laudoNuevo
        ? { label: "Dejar sin efecto el primer laudo y emitir uno nuevo", icono: "fa-file-pen" }
        : !c.reenviado
          ? { label: "Reenviar al Tribunal Colegiado", icono: "fa-paper-plane" }
          : !c.cumplido
            ? { label: "Tribunal confirma cumplimiento", icono: "fa-circle-check" }
            : { label: "Pasar el laudo a Actuaría", icono: "fa-envelope-open-text" };

      const marca = (ok) => (ok ? "✔" : "○");

      return {
        html: `
                <p class="mamp-note">Suspensión concedida${seg.suspension?.cantidad ? ` por $${escapeHTML(String(seg.suspension.cantidad))}` : ""}. El primer laudo se ignora y se emite uno nuevo que cumpla la sentencia.</p>
                <ul class="mamp-req-list">
                    <li>${marca(c.laudoNuevo)} Primer laudo sin efecto y nuevo laudo emitido</li>
                    <li>${marca(c.reenviado)} Reenviado al Tribunal Colegiado</li>
                    <li>${marca(c.cumplido)} Cumplimiento confirmado</li>
                </ul>`,
        accion: { act: "dir-cumplimiento", ...paso },
      };
    }

    case "directo:cuadernillo": {
      const docs = DOCS_CUADERNILLO.filter(
        (doc) => !doc.soloSiNegada || seg.suspension?.resultado === "niega",
      );

      const completo = docs.every((doc) => seg.cuad[doc.id]);

      return {
        html: `
                <p class="mamp-note">El cuadernillo se queda en la Mesa de Amparos. Marca los documentos integrados.</p>
                <div class="mamp-options">
                    ${docs
                      .map(
                        (doc) => `
                            <label class="mamp-option">
                                <input type="checkbox" data-cuad="${doc.id}" ${seg.cuad[doc.id] ? "checked" : ""}>
                                ${escapeHTML(doc.texto)}
                            </label>`,
                      )
                      .join("")}
                </div>`,
        accion: { act: "dir-archivar", label: "Enviar a Archivo", icono: "fa-box-archive", disabled: !completo },
      };
    }

    // ------------------------------------------------ INDIRECTOS
    case "indirecto:recibido":
      return {
        html: `
                <div class="mamp-field">
                    <label for="mampJuzgado">Juzgado de origen</label>
                    <select id="mampJuzgado">
                        <option value="">Selecciona...</option>
                        ${JUZGADOS.map((j) => `<option ${seg.juzgado === j ? "selected" : ""}>${j}</option>`).join("")}
                    </select>
                </div>
                <div class="mamp-field">
                    <label for="mampMotivo">Motivo del amparo</label>
                    <select id="mampMotivo">
                        <option value="">Selecciona...</option>
                        ${MOTIVOS.map((m) => `<option ${seg.motivo === m ? "selected" : ""}>${m}</option>`).join("")}
                    </select>
                </div>
                <label class="mamp-option">
                    <input type="checkbox" id="mampFirma" ${seg.firmaRecibido ? "checked" : ""}>
                    El juzgado lo entregó con firma de recibido
                </label>
                <p class="mamp-note warn">Se tienen ${DIAS_INFORME} días para informar si el amparo sigue activo.</p>`,
        accion: { act: "ind-recibido", label: "Registrar y pasar a informe", icono: "fa-clipboard-check" },
      };

    case "indirecto:informe":
      return {
        html: `
                <p class="mamp-note warn">Informe en el plazo de ${DIAS_INFORME} días: ¿es cierto el acto reclamado?</p>
                <div class="mamp-options">
                    <label class="mamp-option"><input type="radio" name="mampCierto" value="si"> Sí es cierto: se avisa a Laudos (${DIAS_LAUDOS} días para el cumplimiento)</label>
                    <label class="mamp-option"><input type="radio" name="mampCierto" value="no"> No es cierto: se arma el cuadernillo</label>
                </div>`,
        accion: { act: "ind-informe", label: "Registrar informe", icono: "fa-file-circle-check" },
      };

    case "indirecto:laudos":
      return {
        html: `<p class="mamp-note warn">Laudos tiene ${DIAS_LAUDOS} días para que llegue el cumplimiento.</p>`,
        accion: { act: "ind-laudos", label: "Cumplimiento recibido de Laudos", icono: "fa-circle-check" },
      };

    case "indirecto:cuadernillo":
      return {
        html: `
                <p class="mamp-note">El cuadernillo se arma con los requerimientos del juzgado. El amparo se queda en la mesa hasta que el juzgado notifique que fue archivado.</p>
                ${
                  seg.requerimientos.length
                    ? `<ul class="mamp-req-list">${seg.requerimientos
                        .map(
                          (req) => `<li><strong>${escapeHTML(formatFecha(req.fecha))}</strong>${escapeHTML(req.texto)}</li>`,
                        )
                        .join("")}</ul>`
                    : ""
                }
                <div class="mamp-field">
                    <label for="mampReq">Nuevo requerimiento del juzgado</label>
                    <input type="text" id="mampReq" placeholder="Describe el requerimiento">
                </div>
                <button type="button" class="mesas-secondary-btn" data-mamp-act="ind-req">
                    <i class="fa-solid fa-plus"></i> Agregar al cuadernillo
                </button>`,
        accion: { act: "ind-concluir", label: "Juzgado notificó el archivo: concluir", icono: "fa-flag-checkered" },
      };
  }

  return { html: "" };
}

// ============================================================
// ACCIONES
// ============================================================

function ejecutar(act, id, modal) {
  const val = (selector) => modal.querySelector(selector)?.value.trim() || "";

  const error = (mensaje) => {
    const caja = modal.querySelector("#mampError");

    caja.textContent = mensaje;

    caja.hidden = false;
  };

  switch (act) {
    // ------------------------------------------------ DIRECTOS
    case "dir-registro": {
      if (!val("#mampUbicacion") || !val("#mampQuejoso")) {
        return error("Indica dónde está el expediente y quién es el quejoso.");
      }

      return avanzar(id, "acuerdo", (s) => {
        s.ubicacion = val("#mampUbicacion");
        s.quejoso = val("#mampQuejoso");
        s.terceros = val("#mampTerceros");

        return `Registro completo. Expediente ubicado en: ${s.ubicacion}`;
      });
    }

    case "dir-acuerdo": {
      if (!val("#mampAcuerdo")) {
        return error("Escribe el acuerdo antes de continuar.");
      }

      return avanzar(id, "notificacion", (s) => {
        s.acuerdoTexto = val("#mampAcuerdo");

        return "Acuerdo dictado; turnado a Actuaría para notificar a quejoso y terceros interesados";
      });
    }

    case "dir-notificacion":
      return avanzar(id, "informe", () => "Actuaría devolvió las notificaciones");

    case "dir-informe": {
      if (!val("#mampOficio")) {
        return error("Indica el número del oficio del Informe Justificado.");
      }

      return avanzar(id, "resolucion", (s) => {
        s.informeOficio = val("#mampOficio");

        return `Informe Justificado emitido (oficio ${s.informeOficio}); se envía al Tribunal Colegiado de Circuito con el expediente, la demanda original y las notificaciones`;
      });
    }

    case "dir-resolucion": {
      const resultado = modal.querySelector('input[name="mampResultado"]:checked')?.value;

      if (!resultado) {
        return error("Selecciona el resultado de la suspensión.");
      }

      const cantidad = Number(val("#mampCantidad"));

      if (resultado === "concede_cantidad" && !(cantidad > 0)) {
        return error("Indica la cantidad fijada.");
      }

      const destino = resultado === "niega" ? "cuadernillo" : "cumplimiento";

      return avanzar(id, destino, (s) => {
        s.suspension = {
          resultado,
          cantidad: resultado === "concede_cantidad" ? cantidad : null,
          fecha: new Date().toISOString(),
        };

        if (resultado === "niega") {
          return "Suspensión negada: se recibe el amparo negado; se hace oficio y acuerdo de recepción del expediente y se integra al cuadernillo";
        }

        return resultado === "concede_cantidad"
          ? `Suspensión concedida fijando cantidad ($${cantidad}); el primer laudo se deja sin efecto`
          : "Suspensión concedida sin fijar cantidad; el primer laudo se deja sin efecto";
      });
    }

    case "dir-cumplimiento": {
      const seg = getData(KEY, {})[String(id)];

      const c = seg.cumplimiento;

      if (!c.laudoNuevo) {
        return actualizarYRefrescar(id, (s) => {
          s.cumplimiento.laudoNuevo = true;
          log(s, "Primer laudo sin efecto; se emite un nuevo laudo que cumple la sentencia");
        });
      }

      if (!c.reenviado) {
        return actualizarYRefrescar(id, (s) => {
          s.cumplimiento.reenviado = true;
          log(s, "Nuevo laudo reenviado al Tribunal Colegiado");
        });
      }

      if (!c.cumplido) {
        return actualizarYRefrescar(id, (s) => {
          s.cumplimiento.cumplido = true;
          log(s, "El Tribunal Colegiado tiene por cumplida la sentencia");
        });
      }

      return avanzar(id, "cuadernillo", () => "Laudo cumplido pasa a Actuaría; se integra el cuadernillo");
    }

    case "dir-archivar":
      return avanzar(id, "archivo", () => "Cuadernillo integrado (queda en la mesa); expediente enviado a Archivo");

    // ------------------------------------------------ INDIRECTOS
    case "ind-recibido": {
      if (!val("#mampJuzgado") || !val("#mampMotivo")) {
        return error("Selecciona el juzgado de origen y el motivo.");
      }

      if (!modal.querySelector("#mampFirma")?.checked) {
        return error("El amparo debe llevar firma de recibido del juzgado.");
      }

      return avanzar(id, "informe", (s) => {
        s.juzgado = val("#mampJuzgado");
        s.motivo = val("#mampMotivo");
        s.firmaRecibido = true;

        return `Recibido de ${s.juzgado} con firma de recibido. Motivo: ${s.motivo}. Plazo de ${DIAS_INFORME} días para informar`;
      });
    }

    case "ind-informe": {
      const cierto = modal.querySelector('input[name="mampCierto"]:checked')?.value;

      if (!cierto) {
        return error("Indica si el acto reclamado es cierto.");
      }

      return avanzar(id, cierto === "si" ? "laudos" : "cuadernillo", (s) => {
        s.actoCierto = cierto === "si";

        return s.actoCierto
          ? `Informe rendido: acto reclamado cierto. Se avisa a Laudos (${DIAS_LAUDOS} días para el cumplimiento)`
          : "Informe rendido: acto reclamado no cierto. Se arma el cuadernillo";
      });
    }

    case "ind-laudos":
      return avanzar(id, "cuadernillo", () => "Laudos informó el cumplimiento; se integra al cuadernillo");

    case "ind-req": {
      if (!val("#mampReq")) {
        return error("Describe el requerimiento.");
      }

      return actualizarYRefrescar(id, (s) => {
        s.requerimientos.push({ fecha: new Date().toISOString(), texto: val("#mampReq") });
        log(s, `Requerimiento del juzgado agregado al cuadernillo: ${val("#mampReq")}`);
      });
    }

    case "ind-concluir":
      return avanzar(id, "concluido", () => "El juzgado notificó el archivo del amparo: concluido");

    // ------------------------------------------------ RECLASIFICAR
    case "cambiar-tipo": {
      const seg = getData(KEY, {})[String(id)];

      const nuevo = seg.tipo === "directo" ? "indirecto" : "directo";

      if (!window.confirm(`¿Reclasificar como amparo ${nuevo}? El flujo se reinicia desde su primera etapa.`)) {
        return;
      }

            // Al cambiar de tipo, el amparo pasa a la mesa del otro usuario
      actualizar(id, (s) => {
        s.tipo = nuevo;
        s.etapa = FLUJOS[nuevo][0].id;
        s.desde = new Date().toISOString();

        log(s, `Reclasificado como amparo ${nuevo}; el flujo reinicia`);
      });

      closeForm();

      return renderMesasAmparos();
    }
  }
}

function log(seg, movimiento) {
  seg.historial.push({
    fecha: new Date().toISOString(),
    movimiento,
    por: getSession()?.nombre || "Mesa de Amparos",
  });
}

function actualizar(id, fn) {
  const todo = getData(KEY, {});

  const seg = todo[String(id)];

  if (!seg) {
    return;
  }

  fn(seg);

  saveData(KEY, todo);
}

function actualizarYRefrescar(id, fn) {
  actualizar(id, fn);

  renderMesasAmparos();

  abrirAmparo(id);
}

// fn(seg) llena datos y devuelve el texto del historial
function avanzar(id, etapaNueva, fn) {
  actualizarYRefrescar(id, (seg) => {
    const movimiento = fn(seg);

    seg.etapa = etapaNueva;
    seg.desde = new Date().toISOString();

    log(seg, movimiento);
  });
}

// ============================================================
// DEMO
// ============================================================

function cargarDemo() {
  const amparos = getData("amparos", []);

  const seguimiento = getData(KEY, {});

  const hace = (dias) => new Date(Date.now() - dias * 86400000);

  const demo = [
    { n: "D1", tipo: "directo", etapa: "registro", dia: 1, prom: "HAC COQUIMATLÁN", juz: "Tribunal Colegiado en Materia de Trabajo", acto: "Laudo definitivo" },
    { n: "D2", tipo: "directo", etapa: "notificacion", dia: 6, prom: "MARÍA GÓMEZ RUIZ", juz: "Tribunal Colegiado en Materia de Trabajo", acto: "Laudo absolutorio" },
    { n: "D3", tipo: "directo", etapa: "resolucion", dia: 20, prom: "CARLOS MARTÍNEZ", juz: "Tribunal Colegiado de Circuito", acto: "Laudo condenatorio" },
    { n: "D4", tipo: "directo", etapa: "cumplimiento", dia: 35, prom: "ANA TORRES", juz: "Tribunal Colegiado en Materia de Trabajo", acto: "Laudo", suspension: { resultado: "concede_sin_cantidad" } },
    { n: "D5", tipo: "directo", etapa: "cuadernillo", dia: 50, prom: "LUIS HERNÁNDEZ", juz: "Tribunal Colegiado de Circuito", acto: "Laudo", suspension: { resultado: "niega" } },
    { n: "I1", tipo: "indirecto", etapa: "recibido", dia: 1, prom: "SOFÍA RAMÍREZ", juz: "Juzgado Primero de Distrito", acto: "Omisión de radicar la demanda" },
    { n: "I2", tipo: "indirecto", etapa: "informe", dia: 13, prom: "MIGUEL CASTILLO", juz: "Juzgado Segundo de Distrito", acto: "Fecha de audiencia muy lejana" },
    { n: "I3", tipo: "indirecto", etapa: "informe", dia: 18, prom: "LAURA DÍAZ", juz: "Juzgado Tercero de Distrito", acto: "Omisión de cierre de instrucción" },
    { n: "I4", tipo: "indirecto", etapa: "laudos", dia: 25, desde: 5, prom: "ROBERTO SÁNCHEZ", juz: "Juzgado Primero de Distrito", acto: "Acuerdo de alegatos" },
    { n: "I5", tipo: "indirecto", etapa: "cuadernillo", dia: 40, prom: "PATRICIA MORALES", juz: "Juzgado Segundo de Distrito", acto: "Calificación de pruebas" },
  ];

  demo.forEach((item, indice) => {
    const id = `AMP-${item.n}`;

    if (!amparos.some((a) => a.id === id)) {
      amparos.push({
        id,
        dia: fechaISO(hace(item.dia)),
        hora: "09:00",
        expediente: `${130 + indice}/2026`,
        promovente: item.prom,
        juzgado: item.juz,
        oficio: `TAE-SA-${200 + indice}/2026`,
        actoReclamado: item.acto,
        acciones: "",
        observaciones: item.tipo === "indirecto" ? "Amparo indirecto" : "Amparo directo",
        estado: "En trámite",
        creadoEn: hace(item.dia).toISOString(),
      });
    }

    const seg = crearEstado({ promovente: item.prom }, item.tipo);

    seg.etapa = item.etapa;

    seg.desde = hace(item.desde ?? 0).toISOString();

    if (item.tipo === "directo") {
      seg.ubicacion = item.etapa === "registro" ? "" : "Mesa 2";
      seg.suspension = item.suspension || null;

      if (item.etapa === "cumplimiento") {
        seg.cumplimiento.laudoNuevo = true;
      }
    } else {
      seg.juzgado = JUZGADOS[indice % 3];
      seg.motivo = MOTIVOS[indice % MOTIVOS.length];
      seg.firmaRecibido = item.etapa !== "recibido";

      if (item.etapa === "cuadernillo") {
        seg.requerimientos = [{ fecha: hace(3).toISOString(), texto: "Remitir copia certificada del expediente" }];
      }
    }

    seguimiento[id] = seg;
  });

  saveData("amparos", amparos);

  saveData(KEY, seguimiento);

  renderMesasAmparos();
}

// ============================================================
// HELPERS
// ============================================================

function setText(id, valor) {
  const elemento = document.getElementById(id);

  if (elemento) {
    elemento.textContent = valor;
  }
}

function parseFecha(valor) {
  if (!valor) {
    return null;
  }

  const texto = String(valor).slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return null;
  }

  const [y, m, d] = texto.split("-").map(Number);

  return new Date(y, m - 1, d);
}

function diasDesde(fecha) {
  const hoy = new Date();

  const hoy0 = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  return Math.round((hoy0 - fecha) / 86400000);
}

function fechaISO(fecha) {
  const m = String(fecha.getMonth() + 1).padStart(2, "0");

  const d = String(fecha.getDate()).padStart(2, "0");

  return `${fecha.getFullYear()}-${m}-${d}`;
}

function formatFecha(valor) {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return "—";
  }

  return fecha.toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
