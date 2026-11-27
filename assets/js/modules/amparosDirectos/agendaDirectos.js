// ============================================================
// AGENDA DE AMPAROS DIRECTOS
// assets/js/modules/amparosDirectos/agendaDirectos.js
//
// Calendario mensual con las fechas CONFIRMADAS de Amparos Directos.
// Los eventos nacen desde el panel de Notificaciones de "Pendiente de
// enviar al TCC" (tcc.js):
//   - "Posponer": NO hay fecha asignada todavía; solo se oculta el aviso
//     hasta el día elegido. No entra a la agenda (se lista aparte como
//     "Pospuestos, sin fecha confirmada").
//   - "Agendar": la fecha ya está confirmada; se crea el evento en esta
//     agenda y el aviso vuelve a aparecer el día del evento.
//
// Datos (localStorage):
//   amparosDirectosAgenda = [{ id, amparoId, expediente, fecha (AAAA-MM-DD),
//                              hora (HH:MM), nota, creadoEn, creadoPor }]
//   seguimiento del amparo: seg.tcc.alerta = { activa, pospuestaHasta,
//                              pospuestaFecha?, agenda?: { eventoId, fecha, hora } }
// Al migrar, la agenda pasa al servidor (una tabla de eventos).
// ============================================================

import { getData, saveData } from "../../storage.js";
import { createId, escapeHTML } from "../../utils.js";
import { showModal, closeForm } from "../../forms/formHelper.js";

import {
  amparosDirectos,
  obtenerAmparo,
  actualizarSeg,
  logSeg,
  nombreUsuario,
} from "./datos.js";

export const KEY_AGENDA_DIRECTOS = "amparosDirectosAgenda";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Mes visible del calendario (se conserva entre repintados).
let vista = null; // { anio, mes }

let aviso = null; // { tipo: "ok" | "error", texto }

// ------------------------------------------------------------
// FECHAS (hora local)
// ------------------------------------------------------------
export function fechaLocalISO(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

// "AAAA-MM-DD" (+ "HH:MM") -> Date local
export function aFechaLocal(fecha, hora = "00:00") {
  const [anio, mes, dia] = String(fecha).split("-").map(Number);
  const [h, m] = String(hora || "00:00").split(":").map(Number);

  return new Date(anio, (mes || 1) - 1, dia || 1, h || 0, m || 0, 0, 0);
}

// "AAAA-MM-DD" -> "DD/MM/AAAA" sin pasar por UTC (evita el día anterior).
export function fechaCorta(fecha) {
  const [anio, mes, dia] = String(fecha || "").slice(0, 10).split("-");

  return anio && mes && dia ? `${dia}/${mes}/${anio}` : "—";
}

export function sumarDias(fecha, dias) {
  const copia = new Date(fecha);

  copia.setDate(copia.getDate() + dias);

  return copia;
}

// ------------------------------------------------------------
// DATOS
// ------------------------------------------------------------
export function eventosAgendaDirectos() {
  const eventos = getData(KEY_AGENDA_DIRECTOS, []);

  return Array.isArray(eventos) ? eventos : [];
}

function guardarEventos(eventos) {
  saveData(KEY_AGENDA_DIRECTOS, eventos);
}

const ordenar = (a, b) =>
  `${a.fecha} ${a.hora || ""}`.localeCompare(`${b.fecha} ${b.hora || ""}`);

// Alertas pospuestas SIN fecha confirmada (todavía ocultas).
export function pospuestosSinFecha(ahora = Date.now()) {
  return amparosDirectos()
    .filter(({ seg }) => {
      const alerta = seg.tcc?.alerta;

      return (
        alerta?.activa !== false &&
        !alerta?.agenda &&
        alerta?.pospuestaHasta &&
        Date.parse(alerta.pospuestaHasta) > ahora
      );
    })
    .sort(
      (a, b) =>
        Date.parse(a.seg.tcc.alerta.pospuestaHasta) -
        Date.parse(b.seg.tcc.alerta.pospuestaHasta),
    );
}

// ------------------------------------------------------------
// ACCIONES (las usa el panel de Notificaciones de tcc.js)
// Devuelven { ok, error?, evento? }.
// ------------------------------------------------------------

// Posponer: sin fecha confirmada. El aviso se oculta hasta el día elegido.
export function posponerAviso(amparoId, fecha, ahora = new Date()) {
  if (!fecha) {
    return { ok: false, error: "Elige en el calendario hasta qué día se pospone el aviso." };
  }

  const hasta = aFechaLocal(fecha);

  if (hasta <= ahora) {
    return { ok: false, error: "Para posponer, elige un día posterior a hoy." };
  }

  if (!obtenerAmparo(amparoId)) {
    return { ok: false, error: "No se encontró el amparo." };
  }

  actualizarSeg(amparoId, (seg) => {
    seg.tcc = seg.tcc && typeof seg.tcc === "object" ? seg.tcc : {};
    seg.tcc.alerta = seg.tcc.alerta || { activa: true, pospuestaHasta: null };
    seg.tcc.alerta.activa = true;
    seg.tcc.alerta.pospuestaHasta = hasta.toISOString();
    seg.tcc.alerta.pospuestaFecha = fecha;

    logSeg(seg, `Aviso pospuesto hasta el ${fechaCorta(fecha)} (sin fecha confirmada)`);
  });

  return { ok: true };
}

// Agendar: la fecha ya está confirmada. Se crea el evento y el aviso
// vuelve a aparecer el día del evento. Si ya estaba agendado, se
// reprograma el mismo evento.
export function agendarAviso(amparoId, { fecha, hora, nota = "" }, ahora = new Date()) {
  if (!fecha || !hora) {
    return { ok: false, error: "Para agendar, indica la fecha confirmada y la hora." };
  }

  if (aFechaLocal(fecha, hora) <= ahora) {
    return { ok: false, error: "La fecha y hora confirmadas deben ser posteriores a este momento." };
  }

  const datos = obtenerAmparo(amparoId);

  if (!datos) {
    return { ok: false, error: "No se encontró el amparo." };
  }

  const eventos = eventosAgendaDirectos();
  const previoId = datos.seg.tcc?.alerta?.agenda?.eventoId;
  let evento = eventos.find((item) => item.id === previoId);

  if (evento) {
    Object.assign(evento, {
      fecha,
      hora,
      nota: String(nota || "").trim(),
      actualizadoEn: ahora.toISOString(),
    });
  } else {
    evento = {
      id: createId(),
      amparoId: String(amparoId),
      expediente: datos.amparo.expediente || "",
      fecha,
      hora,
      nota: String(nota || "").trim(),
      creadoEn: ahora.toISOString(),
      creadoPor: nombreUsuario(),
    };

    eventos.push(evento);
  }

  guardarEventos(eventos);

  actualizarSeg(amparoId, (seg) => {
    seg.tcc = seg.tcc && typeof seg.tcc === "object" ? seg.tcc : {};
    seg.tcc.alerta = seg.tcc.alerta || { activa: true, pospuestaHasta: null };
    seg.tcc.alerta.activa = true;
    seg.tcc.alerta.agenda = { eventoId: evento.id, fecha, hora };
    seg.tcc.alerta.pospuestaHasta = aFechaLocal(fecha).toISOString();
    delete seg.tcc.alerta.pospuestaFecha;

    logSeg(seg, `Agendado el ${fechaCorta(fecha)} a las ${hora} (fecha confirmada)`);
  });

  return { ok: true, evento };
}

// Quita el evento de la agenda y vuelve a mostrar el aviso.
export function quitarDeAgenda(eventoId) {
  const eventos = eventosAgendaDirectos();
  const evento = eventos.find((item) => item.id === eventoId);

  if (!evento) return { ok: false, error: "El evento ya no existe." };

  guardarEventos(eventos.filter((item) => item.id !== eventoId));

  if (obtenerAmparo(evento.amparoId)) {
    actualizarSeg(evento.amparoId, (seg) => {
      const alerta = seg.tcc?.alerta;

      if (alerta?.agenda?.eventoId === eventoId) {
        delete alerta.agenda;
        alerta.pospuestaHasta = null;
      }

      logSeg(seg, `Se quitó de la agenda el evento del ${fechaCorta(evento.fecha)}`);
    });
  }

  return { ok: true };
}

// ------------------------------------------------------------
// RENDER
// ------------------------------------------------------------
export function renderAgendaDirectos(host, deps = {}) {
  if (!host) return;

  const refrescar = () => renderAgendaDirectos(host, deps);

  const hoy = new Date();
  const hoyISO = fechaLocalISO(hoy);

  if (!vista) vista = { anio: hoy.getFullYear(), mes: hoy.getMonth() };

  const eventos = eventosAgendaDirectos().slice().sort(ordenar);
  const proximos = eventos.filter((e) => e.fecha >= hoyISO);
  const pospuestos = pospuestosSinFecha();
  const mensaje = aviso;

  aviso = null;

  host.innerHTML = `
    <section class="mesas-fase4-section mampd-agenda">
      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Agenda</span>
          <h2>Agenda de Amparos Directos</h2>
          <p>
            Fechas confirmadas desde el panel de Notificaciones ("Agendar").
            Lo pospuesto sin fecha confirmada se lista aparte.
          </p>
        </div>
      </div>

      ${
        mensaje
          ? `<p class="${mensaje.tipo === "ok" ? "mesas-fase6-notice" : "mesas-fase6-error"}" data-agenda-aviso>${escapeHTML(mensaje.texto)}</p>`
          : ""
      }

      <div class="mampd-agenda-layout">
        <section class="mesas-secretaria-table-card mampd-agenda-calendario">
          <header class="mampd-agenda-mes">
            <button type="button" class="mesas-secondary-btn" data-agd-action="mes-anterior" aria-label="Mes anterior">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <strong data-agd-mes>${MESES[vista.mes]} ${vista.anio}</strong>
            <button type="button" class="mesas-secondary-btn" data-agd-action="mes-siguiente" aria-label="Mes siguiente">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
            <button type="button" class="mesas-secondary-btn" data-agd-action="hoy">Hoy</button>
          </header>
          <div class="mampd-agenda-semana">
            ${DIAS_SEMANA.map((dia) => `<span>${dia}</span>`).join("")}
          </div>
          <div class="mampd-agenda-grid">
            ${htmlDiasMes(vista.anio, vista.mes, eventos, hoyISO)}
          </div>
        </section>

        <aside class="mampd-agenda-lateral">
          <section class="mesas-secretaria-table-card mampd-agenda-bloque">
            <h3><i class="fa-regular fa-calendar-check"></i> Próximos (fecha confirmada)</h3>
            ${
              proximos.length
                ? `<ul class="mampd-agenda-lista" data-agd-proximos>
                    ${proximos.map(htmlItemEvento).join("")}
                  </ul>`
                : `<p class="mampd-agenda-vacio">No hay eventos agendados.</p>`
            }
          </section>

          <section class="mesas-secretaria-table-card mampd-agenda-bloque">
            <h3><i class="fa-regular fa-clock"></i> Pospuestos (sin fecha confirmada)</h3>
            ${
              pospuestos.length
                ? `<ul class="mampd-agenda-lista" data-agd-pospuestos>
                    ${pospuestos
                      .map(
                        ({ amparo, seg }) => `
                      <li>
                        <strong>Amparo ${escapeHTML(amparo.id)}</strong>
                        <span>Expediente ${escapeHTML(amparo.expediente || "—")}</span>
                        <small>Se vuelve a avisar el ${escapeHTML(
                          fechaCorta(
                            seg.tcc.alerta.pospuestaFecha ||
                              fechaLocalISO(new Date(seg.tcc.alerta.pospuestaHasta)),
                          ),
                        )}</small>
                      </li>`,
                      )
                      .join("")}
                  </ul>`
                : `<p class="mampd-agenda-vacio">No hay avisos pospuestos.</p>`
            }
          </section>
        </aside>
      </div>
    </section>
  `;

  host.onclick = (event) => {
    const boton = event.target.closest("[data-agd-action]");

    if (!boton) return;

    switch (boton.dataset.agdAction) {
      case "mes-anterior":
        vista = vista.mes === 0
          ? { anio: vista.anio - 1, mes: 11 }
          : { anio: vista.anio, mes: vista.mes - 1 };
        refrescar();
        break;

      case "mes-siguiente":
        vista = vista.mes === 11
          ? { anio: vista.anio + 1, mes: 0 }
          : { anio: vista.anio, mes: vista.mes + 1 };
        refrescar();
        break;

      case "hoy":
        vista = { anio: hoy.getFullYear(), mes: hoy.getMonth() };
        refrescar();
        break;

      case "ver-evento":
        abrirEvento(boton.dataset.eventoId, deps, refrescar);
        break;
    }
  };
}

// Lleva el calendario al mes de una fecha (al agendar desde el panel).
export function mostrarMesDe(fecha) {
  const d = aFechaLocal(fecha);

  vista = { anio: d.getFullYear(), mes: d.getMonth() };
}

function htmlDiasMes(anio, mes, eventos, hoyISO) {
  const primerDia = new Date(anio, mes, 1);
  const totalDias = new Date(anio, mes + 1, 0).getDate();
  const espaciosAntes = (primerDia.getDay() + 6) % 7; // lunes = 0
  const celdas = [];

  for (let i = 0; i < espaciosAntes; i += 1) {
    celdas.push(`<div class="mampd-agenda-dia vacio" aria-hidden="true"></div>`);
  }

  for (let dia = 1; dia <= totalDias; dia += 1) {
    const fecha = fechaLocalISO(new Date(anio, mes, dia));
    const delDia = eventos.filter((e) => e.fecha === fecha);

    celdas.push(`
      <div class="mampd-agenda-dia ${fecha === hoyISO ? "hoy" : ""}" data-agd-fecha="${fecha}">
        <span class="mampd-agenda-num">${dia}</span>
        ${delDia
          .map(
            (evento) => `
          <button type="button" class="mampd-agenda-evento" data-agd-action="ver-evento" data-evento-id="${escapeHTML(evento.id)}"
            title="Amparo ${escapeHTML(evento.amparoId)} · ${escapeHTML(evento.hora || "")}">
            <b>${escapeHTML(evento.hora || "")}</b> ${escapeHTML(evento.amparoId)}
          </button>`,
          )
          .join("")}
      </div>
    `);
  }

  return celdas.join("");
}

function htmlItemEvento(evento) {
  return `
    <li>
      <button type="button" class="mampd-agenda-item" data-agd-action="ver-evento" data-evento-id="${escapeHTML(evento.id)}">
        <strong>${escapeHTML(fechaCorta(evento.fecha))} · ${escapeHTML(evento.hora || "")}</strong>
        <span>Amparo ${escapeHTML(evento.amparoId)} · Expediente ${escapeHTML(evento.expediente || "—")}</span>
        ${evento.nota ? `<small>${escapeHTML(evento.nota)}</small>` : ""}
      </button>
    </li>`;
}

function abrirEvento(eventoId, deps, refrescar) {
  const evento = eventosAgendaDirectos().find((item) => item.id === eventoId);

  if (!evento) return;

  showModal(`
    <div class="mesas-modal-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-regular fa-calendar-check"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Amparo ${escapeHTML(evento.amparoId)}</h2>
          <p>Expediente ${escapeHTML(evento.expediente || "—")}</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        <dl class="mampd-agenda-detalle">
          <div><dt>Fecha confirmada</dt><dd>${escapeHTML(fechaCorta(evento.fecha))}</dd></div>
          <div><dt>Hora</dt><dd>${escapeHTML(evento.hora || "—")}</dd></div>
          <div><dt>Nota</dt><dd>${escapeHTML(evento.nota || "—")}</dd></div>
          <div><dt>Agendó</dt><dd>${escapeHTML(evento.creadoPor || "—")}</dd></div>
        </dl>
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="mampdAgendaCerrar">Cerrar</button>
        ${
          deps.abrirAmparo
            ? `<button type="button" class="mesas-secondary-btn" id="mampdAgendaVerAmparo">
                 <i class="fa-regular fa-folder-open"></i> Ver amparo
               </button>`
            : ""
        }
        <button type="button" class="mesas-modal-confirm mampd-agenda-quitar" id="mampdAgendaQuitar">
          <i class="fa-regular fa-calendar-xmark"></i> Quitar de la agenda
        </button>
      </footer>
    </div>
  `);

  document.getElementById("mampdAgendaCerrar").onclick = closeForm;

  const ver = document.getElementById("mampdAgendaVerAmparo");

  if (ver) {
    ver.onclick = () => {
      closeForm();
      deps.abrirAmparo(evento.amparoId);
    };
  }

  document.getElementById("mampdAgendaQuitar").onclick = () => {
    const resultado = quitarDeAgenda(eventoId);

    aviso = resultado.ok
      ? { tipo: "ok", texto: "Se quitó el evento de la agenda; el aviso vuelve a mostrarse en Notificaciones." }
      : { tipo: "error", texto: resultado.error };

    closeForm();
    refrescar();
    deps.alCambiarAgenda?.();
  };
}
