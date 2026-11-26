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

import { renderMesasAmparosIndirectos } from "./mesasAmparosIndirectos.js";

import { formatoNumeroOficio } from "./mesas/oficios.js";

// Apartados propios de Amparos Directos (cuadernillo, plantillas, listas, firma)
import { renderSeccionesDirectos } from "./amparosDirectos/index.js";

import {
  abrirCuadernillo,
  cuadernilloCompleto,
  htmlResumenCuadernillo,
  progresoCuadernillo,
  sembrarCuadernilloDemo,
} from "./amparosDirectos/cuadernillo.js";

import {
  htmlCajaFirma,
  enviarAFirma,
  verDocumentoFirma,
  sembrarFirmaDemo,
} from "./amparosDirectos/firma.js";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY = "mesasAmparosSeguimiento";

// Repositorio de oficios de Mesas (mismo consecutivo TAE-SA que usa la sección Oficios)
const KEY_OFICIOS = "registroOficios";

const DIAS_INFORME = 15; // amparo indirecto: días para informar
const DIAS_LAUDOS = 3; // amparo indirecto: días de Laudos para el cumplimiento
const DIAS_AVISO = 3; // avisar cuando falten estos días o menos

// Plazos en días naturales (confirmar con el tribunal si son hábiles).

const FLUJOS = {
  directo: [
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

// D-03 / D-11: categoría y ubicación (solo Amparos Directos)
const CATEGORIAS = ["Radicación", "Laudo", "Otro"];

// D-05: anexos que acompañan al oficio de Informe Justificado
const ANEXOS_INFORME = [
  { id: "expediente", texto: "Expediente" },
  { id: "demanda", texto: "Demanda de amparo original" },
  {
    id: "notificaciones",
    texto: "Notificaciones al quejoso y terceros interesados",
  },
];

// D-05: plantilla del oficio (⚠️ texto provisional; confirmar redacción con el tribunal)
const PLANTILLA_INFORME = [
  "TRIBUNAL DE ARBITRAJE Y ESCALAFÓN",
  "Secretaría de Acuerdos · Mesa de Amparos",
  "",
  "Oficio: {{numero}}",
  "Asunto: Informe Justificado",
  "Fecha: {{fecha}}",
  "",
  "{{tribunal}}",
  "P R E S E N T E",
  "",
  "Dentro del juicio de amparo directo {{amparo}}, promovido por {{quejosos}}{{terceros}}, derivado del expediente laboral {{expediente}}, se rinde el presente INFORME JUSTIFICADO, que se remite a ese Tribunal Colegiado para los efectos legales correspondientes.",
  "",
  "Se anexan: {{anexos}}.",
  "",
  "Sin otro particular, quedo de usted.",
  "",
  "A T E N T A M E N T E",
  "Secretaría de Acuerdos",
].join("\n");

// Estado de la vista
let estadoFiltro = "todos";
let categoriaFiltro = "";
let ubicacionFiltro = "";

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

  // D-01: bandeja "por recibir" (solo Amparos Directos)
  renderPorRecibir();

  renderConteos(registros);

  renderFiltroEtapas();

  renderTabla(registros);

  renderAlertas(registros);

  // Apartados Cuadernillos / Plantillas / Listas (solo Amparos Directos)
  if (tipoPagina() === "directo") {
    renderSeccionesDirectos({
      nombreEtapa: (seg) => getEtapa(seg.tipo, seg.etapa).nombre,
      alCambiar: renderMesasAmparos,
      // Documentos de Oficialía que la Mesa aún no recibe
      deOficialia: () =>
        pendientesPorRecibir()
          .filter((item) => item.origen === "Oficialía de Partes")
          .map((item) => item.amparo),
      recibir: recibirDeOficialia,
      // Regreso de Actuaría (pasa a Informe Justificado)
      regresarDeActuaria: aplicarRegresoActuaria,
    });
  }

  if (tipoPagina() === "indirecto") {
    renderMesasAmparosIndirectos();
  }
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

    const tipo = detectarTipo(amparo);

    // D-01: un amparo directo nuevo queda "por recibir" y no tiene seguimiento
    // hasta que la Mesa pulsa Recibir (así Oficialía aún puede editarlo).
    if (tipo === "directo") {
      return;
    }

    seguimiento[id] = crearEstado(amparo, tipo);

    changed = true;
  });

  // La etapa "Registro" ya no existe (el registro lo hace Oficialía de
  // Partes): los amparos directos que se quedaron ahí pasan a "Acuerdo".
  Object.values(seguimiento).forEach((seg) => {
    if (seg?.tipo === "directo" && seg.etapa === "registro") {
      seg.etapa = "acuerdo";

      changed = true;
    }
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
    // D-02: partes como lista estructurada (quejoso / terceros se conservan
    // como texto para búsquedas y compatibilidad)
    partes: {
      quejosos: amparo.promovente
        ? [{ nombre: amparo.promovente, domicilio: "" }]
        : [],
      terceros: [],
    },
    quejoso: amparo.promovente || "",
    terceros: "",
    // D-03
    categoria: "",
    // D-04
    actuaria: null,
    // D-05
    informe: null,
    // D-06 (símbolico): cuadernillo propio del amparo
    // Cuadernillo propio (apartado "Cuadernillos"): un documento por sección
    cuadernillo: {
      oficiosTC: [],
      generado: false,
      docs: {},
      observaciones: "",
    },
    acuerdoTexto: "",
    informeOficio: "",
    suspension: null,
    cumplimiento: { laudoNuevo: false, reenviado: false, cumplido: false },
    juzgado: JUZGADOS.includes(amparo.juzgadoOrigen)
      ? amparo.juzgadoOrigen
      : "",
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

  const categoria = document.getElementById("mampCategoriaFilter");

  const ubicacion = document.getElementById("mampUbicacionFilter");

  if (categoria) {
    categoria.value = categoriaFiltro;

    categoria.onchange = (event) => {
      categoriaFiltro = event.target.value;

      renderMesasAmparos();
    };
  }

  if (ubicacion) {
    ubicacion.value = ubicacionFiltro;

    ubicacion.onchange = (event) => {
      ubicacionFiltro = event.target.value;

      renderMesasAmparos();
    };
  }

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

      if (boton?.dataset.mampAction === "por-recibir") {
        abrirPorRecibir();
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

  if (categoriaFiltro) {
    visibles = visibles.filter(
      (r) => (r.seg.categoria || "") === categoriaFiltro,
    );
  }

  if (ubicacionFiltro) {
    visibles = visibles.filter((r) => ubicacionDe(r.seg) === ubicacionFiltro);
  }

  if (busqueda) {
    visibles = visibles.filter((r) =>
      [
        r.amparo.id,
        r.amparo.expediente,
        r.amparo.promovente,
        r.amparo.juzgado,
        r.seg.quejoso,
        r.seg.terceros,
      ]
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
            <td>${escapeHTML(quejosoTabla(amparo, seg))}</td>
            ${
              tipoPagina() === "directo"
                ? `<td>${renderCategoria(seg)}</td>
            <td>${renderUbicacion(seg)}</td>`
                : ""
            }
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
    return {
      restantes,
      nivel: "danger",
      texto: `Vencido hace ${-restantes} d`,
    };
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
  const amparo = getData("amparos", []).find(
    (a) => String(a.id) === String(id),
  );

  const seg = getData(KEY, {})[String(id)];

  if (!amparo || !seg) {
    return;
  }

  const flujo = FLUJOS[seg.tipo];

  const indice = flujo.findIndex((etapa) => etapa.id === seg.etapa);

  const final = seg.etapa === ETAPA_FINAL[seg.tipo];

  const panel = final
    ? {
        html:
          `<p class="mamp-note">Amparo concluido. ${seg.tipo === "directo" ? "El cuadernillo queda en la Mesa de Amparos y el expediente en Archivo." : "El juzgado notificó el archivo."}</p>` +
          (seg.tipo === "directo" ? htmlResumenCuadernillo(seg) : ""),
      }
    : panelEtapa(amparo, seg);

  // D-04: mientras el expediente está en Actuaría solo se avanza al recibirlo
  if (
    seg.tipo === "directo" &&
    !final &&
    panel.accion &&
    enActuaria(seg) &&
    seg.etapa !== "notificacion"
  ) {
    panel.accion = { ...panel.accion, disabled: true };
  }

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
                    ${infoDirectos(seg)}
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

                ${seg.tipo === "directo" && !final ? cajaActuaria(seg) : ""}

                ${seg.tipo === "directo" ? htmlCajaFirma(seg, { final }) : ""}

                ${seg.tipo === "directo" && !final ? htmlResumenCuadernillo(seg) : ""}

                <p class="mamp-note warn" id="mampAviso" hidden></p>

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
      ejecutar(boton.dataset.mampAct, id, modal, boton);
    }
  });

  modal.addEventListener("change", (event) => {
    const input = event.target;

    // D-05: anexos del oficio de Informe Justificado
    if (input.matches("[data-anexo]")) {
      actualizar(id, (s) => {
        if (s.informe) {
          s.informe.anexos[input.dataset.anexo] = input.checked;
        }
      });

      abrirAmparo(id);

      return;
    }

    // D-03: la categoría se puede cambiar en cualquier etapa
    if (input.id === "mampCategoria") {
      actualizarYRefrescar(id, (s) => {
        s.categoria = input.value;

        log(s, `Categoría: ${input.value || "sin categoría"}`);
      });

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
    case "directo:acuerdo":
      return {
        html: `
                <div class="mamp-field">
                    <label for="mampAcuerdo">Acuerdo de trámite</label>
                    <textarea id="mampAcuerdo" placeholder="Se tiene por recibida la demanda de amparo directo...">${escapeHTML(seg.acuerdoTexto)}</textarea>
                </div>`,
        accion: {
          act: "dir-acuerdo",
          label: "Dictar acuerdo y turnar a Actuaría",
          icono: "fa-file-signature",
        },
      };

    case "directo:notificacion": {
      const p = partesDe(seg);

      return {
        html: `<p class="mamp-note">En Actuaría: debe notificar al quejoso (${escapeHTML(nombres(p.quejosos) || "—")}) y a los terceros interesados${p.terceros.length ? ` (${escapeHTML(nombres(p.terceros))})` : ""}. Al regresar se genera el oficio de Informe Justificado.</p>`,
        accion: {
          act: "dir-notificacion",
          label: "Actuaría devolvió las notificaciones",
          icono: "fa-envelope-circle-check",
        },
      };
    }

    case "directo:informe": {
      const inf = seg.informe;

      if (!inf && !seg.informeOficio) {
        return {
          html: `<p class="mamp-note">Aún no se genera el oficio de <strong>Informe Justificado</strong> (se genera al regresar de Actuaría).</p>`,
          accion: {
            act: "dir-generar-informe",
            label: "Generar oficio de Informe Justificado",
            icono: "fa-file-lines",
          },
        };
      }

      if (!inf) {
        // Seguimiento anterior: solo traía el número de oficio
        return {
          html: `<p class="mamp-note">Oficio <strong>${escapeHTML(seg.informeOficio)}</strong> (Informe Justificado) dirigido al Tribunal Colegiado de Circuito.</p>`,
          accion: {
            act: "dir-informe",
            label: "Enviar al Tribunal Colegiado",
            icono: "fa-paper-plane",
          },
        };
      }

      const completo = ANEXOS_INFORME.every((a) => inf.anexos?.[a.id]);

      return {
        html: `
                <p class="mamp-note">Oficio <strong>${escapeHTML(inf.numero)}</strong> · Informe Justificado dirigido a <strong>${escapeHTML(inf.dirigidoA)}</strong>. Adjunta el expediente, la demanda original y las notificaciones.</p>
                <pre class="mamp-oficio">${escapeHTML(inf.texto)}</pre>
                <div class="mamp-options">
                    ${ANEXOS_INFORME.map(
                      (a) => `
                            <label class="mamp-option">
                                <input type="checkbox" data-anexo="${a.id}" ${inf.anexos?.[a.id] ? "checked" : ""}>
                                Adjuntar: ${escapeHTML(a.texto)}
                            </label>`,
                    ).join("")}
                </div>
                <div class="mamp-inline-actions">
                    <button type="button" class="mesas-secondary-btn" data-mamp-act="informe-descargar">
                        <i class="fa-solid fa-download"></i> Descargar oficio
                    </button>
                </div>`,
        accion: {
          act: "dir-informe",
          label: "Enviar al Tribunal Colegiado",
          icono: "fa-paper-plane",
          disabled: !completo,
        },
      };
    }

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
        accion: {
          act: "dir-resolucion",
          label: "Registrar resolución",
          icono: "fa-gavel",
        },
      };

    case "directo:cumplimiento": {
      const c = seg.cumplimiento;

      const paso = !c.laudoNuevo
        ? {
            label: "Dejar sin efecto el primer laudo y emitir uno nuevo",
            icono: "fa-file-pen",
          }
        : !c.reenviado
          ? { label: "Reenviar al Tribunal Colegiado", icono: "fa-paper-plane" }
          : !c.cumplido
            ? {
                label: "Tribunal confirma cumplimiento",
                icono: "fa-circle-check",
              }
            : {
                label: "Pasar el laudo a Actuaría",
                icono: "fa-envelope-open-text",
              };

      const marca = (ok) => (ok ? "✔" : "○");

      return {
        html: `
                <p class="mamp-note">${rutaConcedido(seg)} El primer laudo se ignora y se emite uno nuevo que cumpla la sentencia.</p>
                <p class="mamp-note warn">PENDIENTE (pendiente 3): las diferencias de trámite entre las dos rutas de amparo concedido aún no están definidas; por ahora ambas siguen los mismos pasos.</p>
                <ul class="mamp-req-list">
                    <li>${marca(c.laudoNuevo)} Primer laudo sin efecto y nuevo laudo emitido</li>
                    <li>${marca(c.reenviado)} Reenviado al Tribunal Colegiado</li>
                    <li>${marca(c.cumplido)} Cumplimiento confirmado</li>
                </ul>`,
        accion: { act: "dir-cumplimiento", ...paso },
      };
    }

    case "directo:cuadernillo": {
      const negada = seg.suspension?.resultado === "niega";

      const { cargados, total } = progresoCuadernillo(seg);

      return {
        html: `
                ${
                  negada
                    ? `<p class="mamp-note warn">Suspensión negada: se integra el cuadernillo y se manda a Archivo.</p>`
                    : ""
                }
                <p class="mamp-note">El cuadernillo se integra en su apartado: sube un documento en cada una de sus ${total} secciones (${cargados} de ${total} cargados). El amparo solo puede ir a Archivo con el cuadernillo completo.</p>`,
        accion: {
          act: "dir-archivar",
          label: negada ? "Mandar a Archivo" : "Enviar a Archivo",
          icono: "fa-box-archive",
          disabled: !cuadernilloCompleto(seg),
        },
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
        accion: {
          act: "ind-recibido",
          label: "Registrar y pasar a informe",
          icono: "fa-clipboard-check",
        },
      };

    case "indirecto:informe":
      return {
        html: `
                <p class="mamp-note warn">Informe en el plazo de ${DIAS_INFORME} días: ¿es cierto el acto reclamado?</p>
                <div class="mamp-options">
                    <label class="mamp-option"><input type="radio" name="mampCierto" value="si"> Sí es cierto: se avisa a Laudos (${DIAS_LAUDOS} días para el cumplimiento)</label>
                    <label class="mamp-option"><input type="radio" name="mampCierto" value="no"> No es cierto: se arma el cuadernillo</label>
                </div>`,
        accion: {
          act: "ind-informe",
          label: "Registrar informe",
          icono: "fa-file-circle-check",
        },
      };

    case "indirecto:laudos":
      return {
        html: `<p class="mamp-note warn">Laudos tiene ${DIAS_LAUDOS} días para que llegue el cumplimiento.</p>`,
        accion: {
          act: "ind-laudos",
          label: "Cumplimiento recibido de Laudos",
          icono: "fa-circle-check",
        },
      };

    case "indirecto:cuadernillo":
      return {
        html: `
                <p class="mamp-note">El cuadernillo se arma con los requerimientos del juzgado. El amparo se queda en la mesa hasta que el juzgado notifique que fue archivado.</p>
                ${
                  seg.requerimientos.length
                    ? `<ul class="mamp-req-list">${seg.requerimientos
                        .map(
                          (req) =>
                            `<li><strong>${escapeHTML(formatFecha(req.fecha))}</strong>${escapeHTML(req.texto)}</li>`,
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
        accion: {
          act: "ind-concluir",
          label: "Juzgado notificó el archivo: concluir",
          icono: "fa-flag-checkered",
        },
      };
  }

  return { html: "" };
}

// ============================================================
// ACCIONES
// ============================================================

function ejecutar(act, id, modal, boton) {
  const val = (selector) => modal.querySelector(selector)?.value.trim() || "";

  const error = (mensaje) => {
    const caja = modal.querySelector("#mampError");

    caja.textContent = mensaje;

    caja.hidden = false;
  };

  const aviso = (mensaje) => {
    const caja = modal.querySelector("#mampAviso");

    if (caja) {
      caja.textContent = mensaje;

      caja.hidden = false;
    }
  };

  switch (act) {
    // ------------------------------------------------ DIRECTOS
    // D-02: lista de partes (alta / baja de filas sin volver a dibujar el modal)
    case "parte-add": {
      const filas = boton
        ?.closest("[data-partes]")
        ?.querySelector(".mamp-partes-rows");

      if (filas) {
        filas.insertAdjacentHTML("beforeend", filaParte());

        filas.lastElementChild?.querySelector("input")?.focus();
      }

      return;
    }

    case "parte-del":
      boton?.closest(".mamp-parte-row")?.remove();

      return;

    // D-04: enviar a Actuaría desde cualquier etapa
    case "actuaria-enviar": {
      const motivo = val("#mampActuariaMotivo");

      if (!motivo) {
        return error("Indica el motivo del envío a Actuaría.");
      }

      return actualizarYRefrescar(id, (s) => {
        enviarAActuaria(s, motivo);
      });
    }

    case "actuaria-regresar":
      return regresarYRefrescar(id);

    // D-05
    case "dir-generar-informe":
      return actualizarYRefrescar(id, (s) => {
        generarInforme(s, getAmparo(id));
      });

    case "informe-descargar":
      return descargarInforme(id);

    // Cuadernillo propio y firma de Presidencia (amparosDirectos/)
    case "cuad-abrir":
      return abrirCuadernillo(id, { alCambiar: renderMesasAmparos });

    case "firma-enviar":
      return enviarAFirma(id, {
        alTerminar: () => {
          renderMesasAmparos();

          abrirAmparo(id);
        },
      });

    case "firma-ver":
      return verDocumentoFirma(boton?.dataset.docid);

    case "dir-acuerdo": {
      if (!val("#mampAcuerdo")) {
        return error("Escribe el acuerdo antes de continuar.");
      }

      return avanzar(id, "notificacion", (s) => {
        s.acuerdoTexto = val("#mampAcuerdo");

        enviarAActuaria(
          s,
          "Notificar al quejoso y terceros interesados",
          false,
        );

        return "Acuerdo dictado; turnado a Actuaría para notificar a quejoso y terceros interesados";
      });
    }

    case "dir-notificacion":
      return regresarYRefrescar(id);

    case "dir-informe": {
      const seg = getData(KEY, {})[String(id)];

      if (
        seg.informe &&
        !ANEXOS_INFORME.every((a) => seg.informe.anexos?.[a.id])
      ) {
        return error(
          "Adjunta el expediente, la demanda original y las notificaciones.",
        );
      }

      if (!seg.informe && !seg.informeOficio) {
        return error("Genera primero el oficio de Informe Justificado.");
      }

      return avanzar(id, "resolucion", (s) => {
        if (s.informe) {
          s.informe.enviado = true;
          s.informe.enviadoEn = new Date().toISOString();
        }

        return `Informe Justificado (oficio ${s.informeOficio}) enviado al ${s.informe?.dirigidoA || "Tribunal Colegiado de Circuito"} con el expediente, la demanda original y las notificaciones`;
      });
    }

    case "dir-resolucion": {
      const resultado = modal.querySelector(
        'input[name="mampResultado"]:checked',
      )?.value;

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
          return "Suspensión negada: se recibe el amparo negado; se hace oficio y acuerdo de recepción del expediente, se integra el cuadernillo y se manda a Archivo";
        }

        return resultado === "concede_cantidad"
          ? `Suspensión concedida (ruta con cantidad fijada: $${cantidad}); el primer laudo se deja sin efecto`
          : "Suspensión concedida (ruta sin cantidad fijada); el primer laudo se deja sin efecto";
      });
    }

    case "dir-cumplimiento": {
      const seg = getData(KEY, {})[String(id)];

      const c = seg.cumplimiento;

      if (!c.laudoNuevo) {
        return actualizarYRefrescar(id, (s) => {
          s.cumplimiento.laudoNuevo = true;
          log(
            s,
            "Primer laudo sin efecto; se emite un nuevo laudo que cumple la sentencia",
          );
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

      return avanzar(
        id,
        "cuadernillo",
        () => "Laudo cumplido pasa a Actuaría; se integra el cuadernillo",
      );
    }

    case "dir-archivar": {
      const seguimiento = getData(KEY, {})[String(id)];

      if (!cuadernilloCompleto(seguimiento)) {
        return error(
          "El cuadernillo está incompleto: sube un documento en cada sección.",
        );
      }

      return avanzar(id, "archivo", (s) => {
        s.archivadoEn = new Date().toISOString();

        return s.suspension?.resultado === "niega"
          ? "Suspensión negada: cuadernillo integrado (queda en la mesa); expediente mandado a Archivo"
          : "Cuadernillo integrado (queda en la mesa); expediente enviado a Archivo";
      });
    }

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
      const cierto = modal.querySelector(
        'input[name="mampCierto"]:checked',
      )?.value;

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
      return avanzar(
        id,
        "cuadernillo",
        () => "Laudos informó el cumplimiento; se integra al cuadernillo",
      );

    case "ind-req": {
      if (!val("#mampReq")) {
        return error("Describe el requerimiento.");
      }

      return actualizarYRefrescar(id, (s) => {
        s.requerimientos.push({
          fecha: new Date().toISOString(),
          texto: val("#mampReq"),
        });
        log(
          s,
          `Requerimiento del juzgado agregado al cuadernillo: ${val("#mampReq")}`,
        );
      });
    }

    case "ind-concluir":
      return avanzar(
        id,
        "concluido",
        () => "El juzgado notificó el archivo del amparo: concluido",
      );

    // ------------------------------------------------ RECLASIFICAR
    case "cambiar-tipo": {
      const seg = getData(KEY, {})[String(id)];

      const nuevo = seg.tipo === "directo" ? "indirecto" : "directo";

      if (
        !window.confirm(
          `¿Reclasificar como amparo ${nuevo}? El flujo se reinicia desde su primera etapa.`,
        )
      ) {
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
// AMPAROS DIRECTOS: partes, categoría, ubicación (D-02, D-03, D-11)
// ============================================================

function idCorto() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function getAmparo(id) {
  return getData("amparos", []).find((a) => String(a.id) === String(id));
}

// D-02: lista estructurada; si el seguimiento es anterior se migra el texto
// separado por comas.
function partesDe(seg) {
  const p = seg.partes;

  if (p && Array.isArray(p.quejosos) && Array.isArray(p.terceros)) {
    return p;
  }

  const lista = (texto) =>
    String(texto || "")
      .split(",")
      .map((nombre) => nombre.trim())
      .filter(Boolean)
      .map((nombre) => ({ nombre, domicilio: "" }));

  return { quejosos: lista(seg.quejoso), terceros: lista(seg.terceros) };
}

function nombres(lista) {
  return lista.map((p) => p.nombre).join(", ");
}

function quejosoTabla(amparo, seg) {
  if (seg.tipo !== "directo") {
    return amparo.promovente || "—";
  }

  const quejosos = partesDe(seg).quejosos;

  if (!quejosos.length) {
    return amparo.promovente || "—";
  }

  return quejosos.length > 1
    ? `${quejosos[0].nombre} +${quejosos.length - 1}`
    : quejosos[0].nombre;
}

function filaParte(parte = {}) {
  return `
        <div class="mamp-parte-row">
            <input type="text" data-parte="nombre" placeholder="Nombre" value="${escapeHTML(parte.nombre || "")}">
            <input type="text" data-parte="domicilio" placeholder="Domicilio para notificar (opcional)" value="${escapeHTML(parte.domicilio || "")}">
            <button type="button" class="mamp-parte-del" data-mamp-act="parte-del" title="Quitar" aria-label="Quitar">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>`;
}

function editorPartes(lista, etiqueta, partes, minimoUno) {
  const filas = partes.length || !minimoUno ? partes : [{}];

  return `
        <div class="mamp-field mamp-partes" data-partes="${lista}">
            <label>${etiqueta}</label>
            <div class="mamp-partes-rows">${filas.map(filaParte).join("")}</div>
            <button type="button" class="mesas-secondary-btn mamp-parte-add" data-mamp-act="parte-add">
                <i class="fa-solid fa-plus"></i> Agregar
            </button>
        </div>`;
}

function leerPartes(modal, lista) {
  return [...modal.querySelectorAll(`[data-partes="${lista}"] .mamp-parte-row`)]
    .map((fila) => ({
      nombre: fila.querySelector('[data-parte="nombre"]')?.value.trim() || "",
      domicilio:
        fila.querySelector('[data-parte="domicilio"]')?.value.trim() || "",
    }))
    .filter((parte) => parte.nombre);
}

function opcionesCategoria(valor) {
  return (
    `<option value="">Selecciona...</option>` +
    CATEGORIAS.map(
      (c) => `<option ${valor === c ? "selected" : ""}>${c}</option>`,
    ).join("")
  );
}

function selectCategoria(id, valor) {
  return `
        <div class="mamp-field">
            <label for="${id}">Categoría</label>
            <select id="${id}">${opcionesCategoria(valor)}</select>
        </div>`;
}

function claseCategoria(categoria) {
  return (
    {
      Radicación: "mamp-cat-rad",
      Laudo: "mamp-cat-laudo",
      Otro: "mamp-cat-otro",
    }[categoria] || "mamp-cat-sin"
  );
}

function renderCategoria(seg) {
  return `<span class="mesas-stage-badge ${claseCategoria(seg.categoria)}">${escapeHTML(seg.categoria || "Sin categoría")}</span>`;
}

// D-11: ubicación actual del expediente
function enActuaria(seg) {
  return Boolean(
    seg.actuaria?.activo ||
    (seg.tipo === "directo" && seg.etapa === "notificacion"),
  );
}

function ubicacionDe(seg) {
  if (seg.etapa === ETAPA_FINAL[seg.tipo]) {
    return "Archivo";
  }

  if (enActuaria(seg)) {
    return "Actuaría";
  }

  return getEtapa(seg.tipo, seg.etapa).dep;
}

function renderUbicacion(seg) {
  const ubicacion = ubicacionDe(seg);

  return `<span class="mesas-stage-badge ${ubicacion === "Actuaría" ? "mamp-warn" : ""}">${escapeHTML(ubicacion)}</span>`;
}

function infoDirectos(seg) {
  if (seg.tipo !== "directo") {
    return "";
  }

  const p = partesDe(seg);

  return `
        <div class="mesas-modal-info-item">
            <span>Quejoso(s)</span>
            <strong>${escapeHTML(nombres(p.quejosos) || "—")}</strong>
        </div>
        <div class="mesas-modal-info-item">
            <span>Terceros interesados</span>
            <strong>${escapeHTML(nombres(p.terceros) || "—")}</strong>
        </div>
        <div class="mesas-modal-info-item">
            <span>Categoría</span>
            <select id="mampCategoria" class="mamp-info-select">${opcionesCategoria(seg.categoria)}</select>
        </div>
        <div class="mesas-modal-info-item">
            <span>Ubicación</span>
            <strong>${escapeHTML(ubicacionDe(seg))}</strong>
        </div>`;
}

// ============================================================
// D-04: ACTUARÍA DESDE CUALQUIER ETAPA
// ============================================================

function cajaActuaria(seg) {
  if (enActuaria(seg)) {
    // En la etapa Notificación el botón principal ya hace el regreso
    if (seg.etapa === "notificacion") {
      return "";
    }

    return `
        <div class="mamp-actuaria-box">
            <p class="mamp-note warn">
                En Actuaría desde ${escapeHTML(formatFecha(seg.actuaria?.desde))}${seg.actuaria?.motivo ? ` · ${escapeHTML(seg.actuaria.motivo)}` : ""}.
                Al regresar se genera el oficio de Informe Justificado.
            </p>
            <button type="button" class="mesas-secondary-btn" data-mamp-act="actuaria-regresar">
                <i class="fa-solid fa-rotate-left"></i> Regresó de Actuaría
            </button>
        </div>`;
  }

  return `
        <div class="mamp-actuaria-box">
            <div class="mamp-field">
                <label for="mampActuariaMotivo">Enviar a Actuaría (desde cualquier etapa)</label>
                <input type="text" id="mampActuariaMotivo" placeholder="Motivo: documento o notificación a practicar">
            </div>
            <button type="button" class="mesas-secondary-btn" data-mamp-act="actuaria-enviar">
                <i class="fa-solid fa-paper-plane"></i> Enviar a Actuaría
            </button>
        </div>`;
}

function enviarAActuaria(s, motivo, conHistorial = true) {
  s.actuaria = {
    activo: true,
    desde: new Date().toISOString(),
    motivo,
    etapaOrigen: s.etapa,
  };

  if (conHistorial) {
    log(
      s,
      `Enviado a Actuaría desde la etapa ${getEtapa(s.tipo, s.etapa).nombre}: ${motivo}`,
    );
  }
}

// Regreso de Actuaría: genera el Informe Justificado (si no existe). Si venía
// de una etapa anterior al informe, el amparo pasa a Informe Justificado.
// ⚠️ Interpretación: se conserva la etapa si ya estaba en el informe o después.
function aplicarRegresoActuaria(id) {
  actualizar(id, (s) => {
    const origen = s.actuaria?.etapaOrigen || s.etapa;

    s.actuaria = null;

    log(s, "Regresó de Actuaría");

    if (!s.informe) {
      generarInforme(s, getAmparo(id));
    }

    if (["registro", "acuerdo", "notificacion"].includes(origen)) {
      s.etapa = "informe";

      s.desde = new Date().toISOString();

      log(s, "Pasa a Informe Justificado");
    }
  });
}

function regresarYRefrescar(id) {
  aplicarRegresoActuaria(id);

  renderMesasAmparos();

  abrirAmparo(id);
}

// ============================================================
// D-05: OFICIO DE INFORME JUSTIFICADO
// ============================================================

function tribunalDe(amparo = {}) {
  const candidato = [amparo.juzgadoOrigen, amparo.juzgado].find(
    (texto) => texto && /colegiado|TCC|tribunal/i.test(texto),
  );

  return candidato || "Tribunal Colegiado de Circuito";
}

// Siguiente consecutivo TAE-SA del año (mismo repositorio que la sección Oficios)
function generarInforme(seg, amparo) {
  if (!amparo) {
    return;
  }

  const hoy = new Date();

  const fecha = fechaISO(hoy);

  const anio = Number(fecha.slice(0, 4));

  const guardados = getData(KEY_OFICIOS, []);

  const lista = Array.isArray(guardados) ? guardados : [];

  const consecutivo =
    Math.max(
      0,
      ...lista
        .filter((oficio) => Number(oficio.anio) === anio)
        .map((oficio) => Number(oficio.consecutivo) || 0),
    ) + 1;

  const numero = formatoNumeroOficio({ consecutivo, anio });

  const tribunal = tribunalDe(amparo);

  const partes = partesDe(seg);

  const numAmparo = /\d/.test(amparo.juzgado || "")
    ? amparo.juzgado
    : amparo.id;

  const texto = PLANTILLA_INFORME.replace("{{numero}}", numero)
    .replace(
      "{{fecha}}",
      hoy.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    )
    .replace("{{tribunal}}", tribunal.toUpperCase())
    .replace("{{amparo}}", numAmparo)
    .replace("{{quejosos}}", nombres(partes.quejosos) || "el quejoso")
    .replace(
      "{{terceros}}",
      partes.terceros.length
        ? `, siendo terceros interesados ${nombres(partes.terceros)}`
        : "",
    )
    .replace("{{expediente}}", amparo.expediente || "—")
    .replace(
      "{{anexos}}",
      `el expediente laboral ${amparo.expediente || ""}, la demanda de amparo original y las notificaciones practicadas al quejoso y terceros interesados`,
    );

  saveData(KEY_OFICIOS, [
    ...lista,
    {
      id: idCorto(),
      anio,
      consecutivo,
      fecha,
      dirigidoA: tribunal,
      asunto: `Informe Justificado · amparo directo ${numAmparo}`,
      expediente: amparo.expediente || "",
      elaboradoPor: getSession()?.nombre || getSession()?.email || "—",
      origen: "amparo-directo",
      amparoId: amparo.id,
    },
  ]);

  seg.informe = {
    numero,
    consecutivo,
    anio,
    fecha,
    dirigidoA: tribunal,
    texto,
    anexos: { expediente: false, demanda: false, notificaciones: false },
    enviado: false,
  };

  seg.informeOficio = numero;

  log(
    seg,
    `Oficio de Informe Justificado generado (${numero}) dirigido a ${tribunal}`,
  );
}

function descargarInforme(id) {
  const seg = getData(KEY, {})[String(id)];

  if (!seg?.informe) {
    return;
  }

  const html = `<html><head><meta charset="utf-8"></head><body><pre style="font-family:Arial,sans-serif;font-size:12pt;white-space:pre-wrap">${escapeHTML(seg.informe.texto)}</pre></body></html>`;

  const enlace = document.createElement("a");

  enlace.href = URL.createObjectURL(
    new Blob([html], { type: "application/msword" }),
  );

  enlace.download = `${seg.informe.numero.replace("/", "-")}.doc`;

  document.body.appendChild(enlace);

  enlace.click();

  enlace.remove();

  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000);
}

// ============================================================
// D-06 (símbolico): CUADERNILLO PROPIO DEL AMPARO
// D-08 / D-09 / D-10: copias, suspensión y archivo
// ============================================================

// D-09: las dos rutas de amparo concedido
function rutaConcedido(seg) {
  return seg.suspension?.resultado === "concede_cantidad"
    ? `Suspensión concedida · ruta 1: fija una cantidad ($${escapeHTML(String(seg.suspension.cantidad ?? ""))}).`
    : "Suspensión concedida · ruta 2: sin fijar cantidad (p. ej. reinstalación del trabajador).";
}

// ============================================================
// D-01: BANDEJA "POR RECIBIR" (patrón de recepcionExpedientes.js)
// ============================================================

// Documentos de Oficialía de Partes (amparo directo sin seguimiento) y
// documentos ubicados en Actuaría que regresan a la Mesa.
function pendientesPorRecibir() {
  const amparos = getData("amparos", []);

  const seguimiento = getData(KEY, {});

  const deOficialia = amparos
    .filter(
      (amparo) =>
        amparo.id &&
        !seguimiento[String(amparo.id)] &&
        detectarTipo(amparo) === "directo",
    )
    .map((amparo) => ({ origen: "Oficialía de Partes", amparo }));

  const deActuaria = amparos
    .filter((amparo) => {
      const seg = seguimiento[String(amparo.id)];

      return seg?.tipo === "directo" && enActuaria(seg);
    })
    .map((amparo) => ({
      origen: "Actuaría",
      amparo,
      seg: seguimiento[String(amparo.id)],
    }));

  return [...deOficialia, ...deActuaria];
}

function renderPorRecibir() {
  const host = document.getElementById("mampPorRecibir");

  if (!host || tipoPagina() !== "directo") {
    return;
  }

  const pendientes = pendientesPorRecibir();

  host.innerHTML = `
        <section class="mesas-recepcion-card">
            <div class="mesas-recepcion-card-header">
                <div>
                    <span class="mesas-mini-eyebrow">Oficialía de Partes y Actuaría</span>
                    <h2>Amparos por recibir</h2>
                </div>
                <span class="mesas-recepcion-counter">${pendientes.length}</span>
            </div>
            <div class="mesas-recepcion-card-body">
                <p>${
                  pendientes.length
                    ? `${pendientes.length} ${pendientes.length === 1 ? "documento pendiente" : "documentos pendientes"} de recibir.`
                    : "No hay documentos pendientes de recibir."
                }</p>
                <button type="button" class="mesas-secondary-btn mesas-recepcion-open-btn" data-mamp-action="por-recibir" ${pendientes.length ? "" : "disabled"}>
                    <i class="fa-solid fa-inbox"></i> Ver documentos
                </button>
            </div>
        </section>`;
}

function sugerirCategoria(amparo) {
  const texto = `${amparo.actoReclamado || ""} ${amparo.acciones || ""}`;

  if (/laudo/i.test(texto)) {
    return "Laudo";
  }

  return /radica/i.test(texto) ? "Radicación" : "Otro";
}

function abrirPorRecibir() {
  const pendientes = pendientesPorRecibir();

  showModal(`
        <div class="mesas-modal-shell mesas-recepcion-modal">
            <header class="mesas-modal-header">
                <div class="mesas-modal-step"><i class="fa-solid fa-inbox"></i></div>
                <div class="mesas-modal-header-text">
                    <h2>Amparos por recibir</h2>
                    <p>Documentos de Oficialía de Partes y expedientes que regresan de Actuaría.</p>
                </div>
            </header>
            <div class="mesas-modal-body">
                ${
                  pendientes.length
                    ? `<div class="mesas-recepcion-list">${pendientes
                        .map((item) => {
                          const a = item.amparo;

                          const deActuaria = item.origen === "Actuaría";

                          return `
                        <article class="mesas-recepcion-item">
                            <div class="mesas-recepcion-item-main">
                                <div class="mesas-recepcion-item-top">
                                    <strong>Amparo ${escapeHTML(a.id)} · Exp. ${escapeHTML(a.expediente || "—")}</strong>
                                    <span class="mesas-recepcion-mesa-badge">${escapeHTML(item.origen)}</span>
                                </div>
                                <div class="mesas-recepcion-item-grid">
                                    <div><span>Promovente</span><strong>${escapeHTML(a.promovente || "—")}</strong></div>
                                    <div><span>Acto reclamado</span><strong>${escapeHTML(a.actoReclamado || "—")}</strong></div>
                                    ${
                                      deActuaria
                                        ? `<div><span>En Actuaría desde</span><strong>${escapeHTML(formatFecha(item.seg.actuaria?.desde || item.seg.desde))}</strong></div>
                                           <div><span>Motivo</span><strong>${escapeHTML(item.seg.actuaria?.motivo || "Notificaciones")}</strong></div>`
                                        : `<div><span>Fecha</span><strong>${escapeHTML(formatFecha(a.dia))}</strong></div>
                                           <div><span>Categoría</span>
                                               <select data-recibir-cat="${escapeHTML(a.id)}">${CATEGORIAS.map((c) => `<option ${c === sugerirCategoria(a) ? "selected" : ""}>${c}</option>`).join("")}</select>
                                           </div>`
                                    }
                                </div>
                            </div>
                            <button type="button" class="mesas-primary-btn" data-recibir-amparo="${escapeHTML(a.id)}" data-origen="${deActuaria ? "actuaria" : "oficialia"}">
                                <i class="fa-solid fa-inbox"></i> Recibir
                            </button>
                        </article>`;
                        })
                        .join("")}</div>`
                    : `<p>No hay documentos pendientes de recibir.</p>`
                }
            </div>
            <footer class="mesas-modal-footer">
                <button type="button" class="mesas-modal-cancel" id="mampCerrarRecepcion">Cerrar</button>
            </footer>
        </div>`);

  document
    .getElementById("mampCerrarRecepcion")
    ?.addEventListener("click", closeForm);

  document.querySelectorAll("[data-recibir-amparo]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const id = boton.dataset.recibirAmparo;

      if (boton.dataset.origen === "actuaria") {
        aplicarRegresoActuaria(id);
      } else {
        const categoria =
          document.querySelector(`[data-recibir-cat="${CSS.escape(id)}"]`)
            ?.value || "Otro";

        recibirDeOficialia(id, categoria);
      }

      renderMesasAmparos();

      // Deja abierto el modal para recibir los restantes
      if (pendientesPorRecibir().length) {
        abrirPorRecibir();
      } else {
        closeForm();
      }
    });
  });
}

function recibirDeOficialia(id, categoria) {
  const amparo = getAmparo(id);

  const todo = getData(KEY, {});

  if (!amparo || todo[String(id)]) {
    return;
  }

  const ahora = new Date().toISOString();

  const quien =
    getSession()?.nombre || getSession()?.email || "Mesa de Amparos";

  const seg = crearEstado(amparo, "directo");

  seg.categoria = categoria;

  seg.recibidoMesa = true;

  seg.recibidoEn = ahora;

  seg.recibidoPor = quien;

  seg.historial = [
    {
      fecha: ahora,
      movimiento: `Recibido de Oficialía de Partes en la Mesa de Amparos (${categoria})`,
      por: quien,
    },
  ];

  todo[String(id)] = seg;

  saveData(KEY, todo);
}

// ============================================================
// DEMO
// ============================================================

// Actor y demandado de prueba para los amparos demo
const PARTES_DEMO = [
  ["C. ROSA ELENA PÉREZ", "H. AYTO. COQUIMATLÁN, COLIMA"],
  ["C. JOSÉ MANUEL TORRES", "H. AYTO. COLIMA, COLIMA"],
  ["C. LAURA PATRICIA VEGA", "GOBIERNO DEL ESTADO DE COLIMA"],
  ["C. ARTURO NAVA CHÁVEZ", "DIF MUNICIPAL MANZANILLO"],
  ["C. MIRIAM LÓPEZ CRUZ", "H. AYTO. VILLA DE ÁLVAREZ, COLIMA"],
  ["C. DANIEL ORTIZ RUBIO", "SERVICIOS DE SALUD DEL ESTADO"],
  ["C. ELENA VARGAS LUNA", "H. AYTO. IXTLAHUACÁN, COLIMA"],
];

function cargarDemo() {
  const amparos = getData("amparos", []);

  const seguimiento = getData(KEY, {});

  const hace = (dias) => new Date(Date.now() - dias * 86400000);

  const demo = [
    {
      n: "D1",
      tipo: "directo",
      etapa: "acuerdo",
      dia: 1,
      prom: "HAC COQUIMATLÁN",
      juz: "Tribunal Colegiado en Materia de Trabajo",
      acto: "Laudo definitivo",
    },
    {
      n: "D2",
      tipo: "directo",
      etapa: "notificacion",
      dia: 6,
      prom: "MARÍA GÓMEZ RUIZ",
      juz: "Tribunal Colegiado en Materia de Trabajo",
      acto: "Laudo absolutorio",
      // Demo de firma: esperando a la Magistrada
      cat: "Radicación",
      firmas: [
        {
          estado: "en-firma",
          estadoProcesal: "RADICACIÓN A.D. PARTE ACTORA",
          fojas: 242,
        },
      ],
    },
    {
      n: "D3",
      tipo: "directo",
      etapa: "resolucion",
      dia: 20,
      prom: "CARLOS MARTÍNEZ",
      juz: "Tribunal Colegiado de Circuito",
      acto: "Laudo condenatorio",
      // Demo de lista: ya firmado, pendiente de listar
      cat: "Radicación",
      firmas: [
        {
          estado: "firmado",
          estadoProcesal: "RADICACIÓN A.D. PARTE DEMANDADA",
          fojas: 255,
        },
      ],
    },
    {
      n: "D4",
      tipo: "directo",
      etapa: "cumplimiento",
      dia: 35,
      prom: "ANA TORRES",
      juz: "Tribunal Colegiado en Materia de Trabajo",
      acto: "Laudo",
      suspension: { resultado: "concede_sin_cantidad" },
    },
    {
      n: "D5",
      tipo: "directo",
      etapa: "cuadernillo",
      dia: 50,
      prom: "LUIS HERNÁNDEZ",
      juz: "Tribunal Colegiado de Circuito",
      acto: "Laudo",
      suspension: { resultado: "niega" },
      // Demo de cuadernillo: falta la última sección
      cuadDemo: 8,
    },
    {
      n: "I1",
      tipo: "indirecto",
      etapa: "recibido",
      dia: 1,
      prom: "SOFÍA RAMÍREZ",
      juz: "Juzgado Primero de Distrito",
      acto: "Omisión de radicar la demanda",
    },
    {
      n: "I2",
      tipo: "indirecto",
      etapa: "informe",
      dia: 13,
      prom: "MIGUEL CASTILLO",
      juz: "Juzgado Segundo de Distrito",
      acto: "Fecha de audiencia muy lejana",
    },
    {
      n: "I3",
      tipo: "indirecto",
      etapa: "informe",
      dia: 18,
      prom: "LAURA DÍAZ",
      juz: "Juzgado Tercero de Distrito",
      acto: "Omisión de cierre de instrucción",
    },
    {
      n: "I4",
      tipo: "indirecto",
      etapa: "laudos",
      dia: 25,
      desde: 5,
      prom: "ROBERTO SÁNCHEZ",
      juz: "Juzgado Primero de Distrito",
      acto: "Acuerdo de alegatos",
    },
    {
      n: "I5",
      tipo: "indirecto",
      etapa: "cuadernillo",
      dia: 40,
      prom: "PATRICIA MORALES",
      juz: "Juzgado Segundo de Distrito",
      acto: "Calificación de pruebas",
    },
    // Amparos directos extra: uno por recibir de Oficialía y uno en Actuaría
    {
      n: "D6",
      tipo: "directo",
      pendiente: true,
      dia: 0,
      prom: "JOSÉ LUIS ORTEGA",
      juz: "Tribunal Colegiado en Materia de Trabajo",
      acto: "Laudo condenatorio",
    },
    {
      n: "D7",
      tipo: "directo",
      etapa: "informe",
      actuaria: true,
      dia: 12,
      prom: "ELENA VARGAS",
      juz: "Tribunal Colegiado de Circuito",
      acto: "Falta de radicación de la demanda",
      cat: "Radicación",
      firmas: [
        {
          estado: "firmado",
          estadoProcesal: "LAUDO EN CUMPLIMIENTO A.D. 258/2025",
          fojas: 1065,
        },
        {
          estado: "firmado",
          estadoProcesal: "RADICACIÓN A.D. PARTE DEMANDADA",
          fojas: 1065,
        },
      ],
    },
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
        // Partes del juicio laboral (la lista de amparos las usa)
        actor: PARTES_DEMO[indice % PARTES_DEMO.length][0],
        demandado: PARTES_DEMO[indice % PARTES_DEMO.length][1],
        juzgado: item.juz,
        oficio: `TAE-SA-${200 + indice}/2026`,
        actoReclamado: item.acto,
        acciones: "",
        observaciones:
          item.tipo === "indirecto" ? "Amparo indirecto" : "Amparo directo",
        estado: "En trámite",
        creadoEn: hace(item.dia).toISOString(),
      });
    }

    // D-01: un amparo directo por recibir no tiene seguimiento todavía
    if (item.pendiente || seguimiento[id]) {
      return;
    }

    const seg = crearEstado({ promovente: item.prom }, item.tipo);

    seg.etapa = item.etapa;

    seg.desde = hace(item.desde ?? 0).toISOString();

    if (item.tipo === "directo") {
      seg.ubicacion = "Mesa 2";
      seg.suspension = item.suspension || null;

      // D-02 / D-03: partes estructuradas y categoría
      seg.categoria = item.cat || (indice % 2 ? "Laudo" : "Otro");
      seg.partes = {
        quejosos: [{ nombre: item.prom, domicilio: "" }],
        terceros:
          indice % 2 === 0
            ? [{ nombre: "CONSTRUCTORA DEL NORTE S.A. DE C.V.", domicilio: "" }]
            : [],
      };
      seg.quejoso = nombres(seg.partes.quejosos);
      seg.terceros = nombres(seg.partes.terceros);

      // D-04: expediente ubicado en Actuaría
      if (item.actuaria) {
        seg.actuaria = {
          activo: true,
          desde: hace(2).toISOString(),
          motivo: "Notificar acuerdo a terceros interesados",
          etapaOrigen: item.etapa,
        };
      }

      // D-05: etapas posteriores al informe ya traen su oficio enviado
      if (["resolucion", "cumplimiento", "cuadernillo"].includes(item.etapa)) {
        generarInforme(
          seg,
          amparos.find((a) => a.id === id),
        );

        if (seg.informe) {
          seg.informe.anexos = {
            expediente: true,
            demanda: true,
            notificaciones: true,
          };
          seg.informe.enviado = true;
        }
      }

      // Firma de Presidencia y cuadernillo de demostración
      (item.firmas || []).forEach((firma) => sembrarFirmaDemo(seg, id, firma));

      if (item.cuadDemo) {
        sembrarCuadernilloDemo(seg, id, item.cuadDemo);
      }

      if (item.etapa === "cumplimiento") {
        seg.cumplimiento.laudoNuevo = true;
      }
    } else {
      seg.juzgado = JUZGADOS[indice % 3];
      seg.motivo = MOTIVOS[indice % MOTIVOS.length];
      seg.firmaRecibido = item.etapa !== "recibido";

      if (item.etapa === "cuadernillo") {
        seg.requerimientos = [
          {
            fecha: hace(3).toISOString(),
            texto: "Remitir copia certificada del expediente",
          },
        ];
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
