// ============================================================
// EXHORTOS EN MESAS
// assets/js/modules/mesas/exhortos.js
//
// Oficialía registra el exhorto (llave "exhortos") con su número
// EXH-001/2026. Mesa lo RECIBE, define su fecha de señalamiento
// y lo envía a Actuaría. Si tiene fecha, aparece en la agenda
// combinada de Promociones / Calificaciones.
//
// Campos que agrega Mesa al registro:
//   recibidoMesa, recibidoMesaEn, mesa, estadoMesa, historialMesa,
//   senalamiento: { modo: "por-senalar" | "con-fecha" | "no-requiere",
//                   fecha, hora, eventoId }
// ============================================================

import { getData, saveData } from "../../storage.js";
import { escapeHTML } from "../../utils.js";
import { showModal, closeForm } from "../../forms/formHelper.js";
import { getSession, canSign } from "../../auth.js";
import { aplicarFiltrosGlobales } from "./filtros.js";
import { getExpedientesMesaActual, getNumeroExpediente, mesaDeExpediente, mesaUsuarioActual } from "./mesaUtils.js";
import {
  aplicarAccion,
  accionDeBoton,
  renderBotonesFlujo,
  renderEstadoBadge,
} from "./flujoEstados.js";

const KEY_EXHORTOS = "exhortos";
const KEY_AGENDA = "mesasAgenda";

let filtroActivo = "todos";

// ------------------------------------------------------------
// NUMERACIÓN PROPIA: EXH-001/2026 (la asigna Oficialía al registrar)
// ------------------------------------------------------------
export function siguienteNumeroExhorto(anio = new Date().getFullYear()) {
  const lista = getData(KEY_EXHORTOS, []);

  const usados = (Array.isArray(lista) ? lista : [])
    .map((item) => String(item.numero || "").match(/^EXH-(\d+)\/(\d{4})$/i))
    .filter((m) => m && Number(m[2]) === anio)
    .map((m) => Number(m[1]));

  const siguiente = (usados.length ? Math.max(...usados) : 0) + 1;

  return `EXH-${String(siguiente).padStart(3, "0")}/${anio}`;
}

// ------------------------------------------------------------
// DATOS
// ------------------------------------------------------------
function leer() {
  const lista = getData(KEY_EXHORTOS, []);

  return Array.isArray(lista) ? lista : [];
}

// Mesa: si es interno y está vinculado, la del expediente; si no, por
// paridad del consecutivo del exhorto (mismo criterio que expedientes).
// PENDIENTE: confirmar la regla de asignación de mesa para exhortos.
function mesaDeExhorto(exhorto) {
  if (exhorto.mesa) return Number(exhorto.mesa);

  const vinculado = getExpedientesMesaActual().find(
    (item) => getNumeroExpediente(item) === exhorto.expedienteVinculado,
  );

  return mesaDeExpediente(vinculado || { numero: exhorto.numero });
}

function registros() {
  const mesa = mesaUsuarioActual();

  return leer()
    .map((exhorto) => ({ exhorto, mesa: mesaDeExhorto(exhorto) }))
    .filter((item) => !mesa || Number(item.mesa) === Number(mesa));
}

function claveEstado(exhorto) {
  return exhorto.recibidoMesa ? exhorto.estadoMesa || "en-proceso" : "por-recibir";
}

function guardarExhorto(id, cambiar) {
  const lista = leer();

  const exhorto = lista.find((item) => item.id === id);

  if (!exhorto) return null;

  cambiar(exhorto);

  saveData(KEY_EXHORTOS, lista);

  return exhorto;
}

// ------------------------------------------------------------
// AGENDA: un evento "exhorto" por exhorto con fecha
// ------------------------------------------------------------
function sincronizarAgenda(exhorto, mesa) {
  const agenda = getData(KEY_AGENDA, []);

  const resto = (Array.isArray(agenda) ? agenda : []).filter(
    (evento) => evento.exhortoId !== exhorto.id,
  );

  const s = exhorto.senalamiento;

  if (s?.modo === "con-fecha" && s.fecha) {
    const evento = {
      id: s.eventoId || `exh-${exhorto.id}`,
      tipo: "exhorto",
      expediente: exhorto.numero,
      exhortoId: exhorto.id,
      origen: "exhorto",
      fecha: s.fecha,
      hora: s.hora || "",
      notas: `Exhorto de ${exhorto.autoridad || "autoridad exhortante"}`,
      mesa,
      creadoPor: getSession()?.nombre || "Secretaría de Acuerdos",
    };

    s.eventoId = evento.id;

    resto.push(evento);
  }

  saveData(KEY_AGENDA, resto);
}

// ------------------------------------------------------------
// RENDER
// ------------------------------------------------------------
export function renderExhortosMesa() {
  const vista = document.querySelector('[data-mesas-vista="exhortos"]');

  if (!vista) return;

  const todos = registros();

  const cuenta = (fn) => todos.filter(fn).length;

  const contadores = [
    ["todos", "Todos", todos.length],
    ["por-recibir", "Por recibir", cuenta((i) => claveEstado(i.exhorto) === "por-recibir")],
    ["por-senalar", "Fecha por señalar", cuenta((i) => i.exhorto.recibidoMesa && i.exhorto.senalamiento?.modo === "por-senalar")],
    ["en-actuaria", "En Actuaría", cuenta((i) => claveEstado(i.exhorto) === "en-actuaria")],
  ];

  const visibles = aplicarFiltrosGlobales(todos, {
    numero: (i) => i.exhorto.numero,
    fecha: (i) => i.exhorto.fecha,
    estado: (i) => (i.exhorto.recibidoMesa ? claveEstado(i.exhorto) : ""),
  }).filter((i) => {
    if (filtroActivo === "todos") return true;

    if (filtroActivo === "por-senalar") {
      return i.exhorto.recibidoMesa && i.exhorto.senalamiento?.modo === "por-senalar";
    }

    return claveEstado(i.exhorto) === filtroActivo;
  });

  vista.innerHTML = `
    <section class="mesas-fase4-section">
      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Exhortos</span>
          <h2>Exhortos</h2>
          <p>Registrados en Oficialía de Partes con numeración EXH-000/AAAA.</p>
        </div>
      </div>

      <div class="mesas-fase4-counters">
        ${contadores
          .map(
            ([clave, etiqueta, total]) => `
          <button type="button"
            class="mesas-fase4-counter ${filtroActivo === clave ? "active" : ""}"
            data-exhortos-action="filtro" data-filtro="${clave}">
            <span>${etiqueta}</span><strong>${total}</strong>
          </button>`,
          )
          .join("")}
      </div>

      <section class="mesas-secretaria-table-card">
        <div class="mesas-table-wrapper">
          <table class="mesas-promociones-table">
            <thead>
              <tr>
                <th>Exhorto</th><th>Llegada</th><th>Origen</th><th>Autoridad</th>
                <th>Actor</th><th>Demandado</th><th>Estado</th>
                <th>Fecha de señalamiento</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${
                visibles.length
                  ? visibles.map(renderFila).join("")
                  : `<tr><td colspan="9">No hay exhortos en esta vista.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `;

  vista.onclick = (event) => {
    const boton = event.target.closest("[data-exhortos-action]");

    if (!boton) return;

    const id = boton.dataset.exhortoId;

    switch (boton.dataset.exhortosAction) {
      case "filtro":
        filtroActivo = boton.dataset.filtro;
        renderExhortosMesa();
        break;
      case "recibir":
        recibir(id);
        break;
      case "senalamiento":
        abrirSenalamiento(id);
        break;
      case "flujo":
        ejecutarAccion(id, accionDeBoton(boton));
        break;
    }
  };
}

function textoSenalamiento(exhorto) {
  if (!exhorto.recibidoMesa) return "—";

  const s = exhorto.senalamiento || { modo: "por-senalar" };

  if (s.modo === "con-fecha") {
    return `${escapeHTML(s.fecha.split("-").reverse().join("/"))}${s.hora ? ` · ${escapeHTML(s.hora)}` : ""}`;
  }

  return s.modo === "no-requiere"
    ? "No requiere fecha"
    : `<span class="mesas-fase4-category-badge pending">Fecha por señalar</span>`;
}

function renderFila({ exhorto, mesa }) {
  const estado = claveEstado(exhorto);

  const id = escapeHTML(exhorto.id);

  const attrs = `data-exhorto-id="${id}"`;

  const acciones = !exhorto.recibidoMesa
    ? canSign()
      ? ""
      : `<button type="button" class="mesas-primary-btn" data-exhortos-action="recibir" ${attrs}>
           <i class="fa-solid fa-inbox"></i> Recibir</button>`
    : `${
        canSign()
          ? ""
          : `<button type="button" class="mesas-secondary-btn" data-exhortos-action="senalamiento" ${attrs}>
               <i class="fa-regular fa-calendar-plus"></i> Fecha</button>`
      }
       ${renderBotonesFlujo(estado, { actionAttr: "data-exhortos-action", attrs, tipo: "exhorto" })}`;

  return `
    <tr>
      <td>
        <strong class="mesas-expediente-number">${escapeHTML(exhorto.numero)}</strong>
        <span class="mesas-mesa-tag">Mesa ${mesa}</span>
      </td>
      <td>${escapeHTML(String(exhorto.fecha || "—").split("-").reverse().join("/"))}</td>
      <td>${escapeHTML(exhorto.origen || "—")}</td>
      <td>${escapeHTML(exhorto.autoridad || "—")}</td>
      <td>${escapeHTML(exhorto.actor || "—")}</td>
      <td>${escapeHTML(exhorto.demandado || "—")}</td>
      <td>${
        estado === "por-recibir"
          ? `<span class="mesas-estado-badge">Por recibir</span>`
          : renderEstadoBadge(estado)
      }</td>
      <td>${textoSenalamiento(exhorto)}</td>
      <td><div class="mesas-actions">${acciones}</div></td>
    </tr>
  `;
}

// ------------------------------------------------------------
// ACCIONES
// ------------------------------------------------------------
function recibir(id) {
  const lista = registros();

  const item = lista.find((r) => r.exhorto.id === id);

  if (!item) return;

  guardarExhorto(id, (exhorto) => {
    const ahora = new Date().toISOString();

    exhorto.recibidoMesa = true;
    exhorto.recibidoMesaEn = ahora;
    exhorto.mesa = item.mesa;
    exhorto.estadoMesa = "en-proceso";
    exhorto.senalamiento = exhorto.senalamiento || { modo: "por-senalar" };
    exhorto.historialMesa = [
      { fecha: ahora, movimiento: "Recibido en Mesa; pasa a En proceso" },
    ];
  });

  renderExhortosMesa();
}

function ejecutarAccion(id, accion) {
  if (!accion) return;

  let error = "";

  guardarExhorto(id, (exhorto) => {
    const resultado = aplicarAccion(exhorto, accion, {
      campo: "estadoMesa",
      campoHistorial: "historialMesa",
      tipo: "exhorto",
      usuario: getSession()?.nombre || "",
    });

    if (!resultado.ok) error = resultado.error;
  });

  if (error) {
    window.alert(error);
    return;
  }

  renderExhortosMesa();
}

// "Fecha por señalar": el exhorto puede llegar sin fecha y asignarse después.
function abrirSenalamiento(id) {
  const item = registros().find((r) => r.exhorto.id === id);

  if (!item) return;

  const s = item.exhorto.senalamiento || { modo: "por-senalar" };

  showModal(`
    <div class="mesas-modal-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-regular fa-calendar"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Fecha de señalamiento</h2>
          <p>Exhorto ${escapeHTML(item.exhorto.numero)}</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        <label class="mesas-plantillas-field"><span>Situación</span>
          <select id="exhModo">
            <option value="por-senalar" ${s.modo === "por-senalar" ? "selected" : ""}>Fecha por señalar</option>
            <option value="con-fecha" ${s.modo === "con-fecha" ? "selected" : ""}>Con fecha</option>
            <option value="no-requiere" ${s.modo === "no-requiere" ? "selected" : ""}>No requiere fecha</option>
          </select></label>
        <div id="exhCamposFecha">
          <label class="mesas-plantillas-field"><span>Fecha</span>
            <input type="date" id="exhFecha" value="${escapeHTML(s.fecha || "")}"></label>
          <label class="mesas-plantillas-field"><span>Hora (opcional)</span>
            <input type="time" id="exhHora" value="${escapeHTML(s.hora || "")}"></label>
        </div>
        <p class="mesas-form-error" id="exhError" hidden></p>
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="exhCancelar">Cancelar</button>
        <button type="button" class="mesas-modal-confirm" id="exhGuardar">Guardar</button>
      </footer>
    </div>
  `);

  const $ = (x) => document.getElementById(x);

  const alternar = () => {
    $("exhCamposFecha").hidden = $("exhModo").value !== "con-fecha";
  };

  alternar();

  $("exhModo").onchange = alternar;

  $("exhCancelar").onclick = closeForm;

  $("exhGuardar").onclick = () => {
    const modo = $("exhModo").value;

    const fecha = $("exhFecha").value;

    const error = $("exhError");

    if (modo === "con-fecha") {
      if (!fecha) {
        error.textContent = "Selecciona la fecha del señalamiento.";
        error.hidden = false;
        return;
      }

      // La agenda trabaja con el año vigente.
      if (Number(fecha.slice(0, 4)) !== new Date().getFullYear()) {
        error.textContent = `La agenda corresponde al año vigente (${new Date().getFullYear()}).`;
        error.hidden = false;
        return;
      }
    }

    const exhorto = guardarExhorto(id, (e) => {
      e.senalamiento = {
        modo,
        fecha: modo === "con-fecha" ? fecha : "",
        hora: modo === "con-fecha" ? $("exhHora").value : "",
        eventoId: e.senalamiento?.eventoId || "",
      };
    });

    sincronizarAgenda(exhorto, item.mesa);

    saveData(KEY_EXHORTOS, leer().map((e) => (e.id === id ? exhorto : e)));

    closeForm();

    renderExhortosMesa();
  };
}
