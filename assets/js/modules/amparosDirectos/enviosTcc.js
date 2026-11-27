// ENVÍOS DEL TCC
// Oficios de Oficialía con procedencia TCC → se muestra su amparo designado.
// Aquí solo se categoriza (negado / concedido) y se asigna el No. de Amparo Directo.
// Guarda: seg.envioTcc = { resultado, numeroAD, oficioId, oficioNumero, categorizadoEn, categorizadoPor }

import { getData } from "../../storage.js";
import { escapeHTML } from "../../utils.js";
import { showModal, closeForm } from "../../forms/formHelper.js";
import {
  amparosDirectos,
  obtenerAmparo,
  actualizarSeg,
  logSeg,
  nombreUsuario,
  quejosoDe,
  formatFecha,
  identificadorAmparo,
  numeroAmparoDirecto,
} from "./datos.js";

let aviso = null;

export function esOficioDelTcc(oficio) {
  return /colegiado|tcc/i.test(String(oficio?.procedencia || ""));
}

// [{ amparo, seg, oficio }]: un renglón por amparo (con su oficio TCC más reciente).
// Primero los pendientes de categorizar.
export function registrosEnviosTcc() {
  const oficios = getData("oficios", []);
  const porAmparo = new Map();

  (Array.isArray(oficios) ? oficios : [])
    .filter((o) => o.amparoId && esOficioDelTcc(o))
    .forEach((o) => {
      const previo = porAmparo.get(String(o.amparoId));
      if (!previo || String(o.creadoEn || "") > String(previo.creadoEn || "")) {
        porAmparo.set(String(o.amparoId), o);
      }
    });

  return [...porAmparo.entries()]
    .map(([id, oficio]) => {
      const datos = obtenerAmparo(id);
      return datos && datos.seg.tipo === "directo"
        ? { amparo: datos.amparo, seg: datos.seg, oficio }
        : null;
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        Number(Boolean(a.seg.envioTcc?.resultado)) -
        Number(Boolean(b.seg.envioTcc?.resultado)),
    );
}

export function renderEnviosTcc(host, deps = {}) {
  if (!host) return;

  const refrescar = () =>
    deps.alCambiar ? deps.alCambiar() : renderEnviosTcc(host, deps);

  const filas = registrosEnviosTcc();
  const pendientes = filas.filter((f) => !f.seg.envioTcc?.resultado).length;
  const mensaje = aviso;
  aviso = null;

  host.innerHTML = `
    <section class="mesas-fase4-section">
      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Oficialía de Partes</span>
          <h2>Envíos del TCC</h2>
          <p>
            Oficios recibidos del Tribunal Colegiado y su amparo. Clasifica cada amparo como
            negado o concedido y asigna su No. de Amparo Directo. ${pendientes} por categorizar.
          </p>
        </div>
      </div>

      ${mensaje ? `<p class="${mensaje.tipo === "ok" ? "mesas-fase6-notice" : "mesas-fase6-error"}">${escapeHTML(mensaje.texto)}</p>` : ""}

      <section class="mesas-secretaria-table-card">
        ${
          filas.length
            ? `
        <div class="mesas-table-wrapper">
          <table class="mesas-secretaria-table">
            <thead>
              <tr>
                <th>Oficio</th><th>Amparo</th><th>Expediente</th><th>Quejoso</th>
                <th>Resultado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>${filas.map(htmlFila).join("")}</tbody>
          </table>
        </div>`
            : `
        <div class="mesas-empty-state">
          <div class="mesas-empty-icon"><i class="fa-solid fa-inbox"></i></div>
          <strong>No hay envíos del TCC</strong>
          <span>Aparecen los oficios de Oficialía con procedencia del Tribunal Colegiado y un amparo directo asignado.</span>
        </div>`
        }
      </section>
    </section>
  `;

  host.onclick = (evento) => {
    const boton = evento.target.closest("[data-envio-accion]");
    if (!boton || boton.disabled) return;

    const fila = filas.find(
      (f) => String(f.amparo.id) === boton.dataset.amparoId,
    );
    if (fila) abrirCategorizar(fila, boton.dataset.envioAccion, refrescar);
  };
}

function htmlFila({ amparo, seg, oficio }) {
  const id = escapeHTML(amparo.id);
  const resultado = seg.envioTcc?.resultado || "";
  const archivado = seg.etapa === "archivo";
  const bloqueo = archivado
    ? 'disabled title="El amparo ya está en Archivo"'
    : "";

  return `
    <tr>
      <td>
        <strong>${escapeHTML(oficio.numero || "—")}</strong>
        <small class="mampd-pend-sub">${escapeHTML(formatFecha(oficio.fecha))}</small>
      </td>
      <td>
        <strong>Amparo ${escapeHTML(identificadorAmparo(amparo, seg))}</strong>
        <small class="mampd-pend-sub">${numeroAmparoDirecto(seg) ? `Registro ${id}` : "Sin No. de Amparo Directo"}</small>
      </td>
      <td>${escapeHTML(amparo.expediente || "—")}</td>
      <td>${escapeHTML(quejosoDe(amparo, seg))}</td>
      <td>
        ${
          resultado
            ? `<span class="mesas-stage-badge ${resultado === "negado" ? "mamp-warn" : "mamp-ok"}">${resultado === "negado" ? "Amparo negado" : "Amparo concedido"}</span>`
            : `<span class="mesas-stage-badge">Por categorizar</span>`
        }
      </td>
      <td>
        <div class="mesas-actions">
          <button type="button" class="mesas-secondary-btn" data-envio-accion="negado" data-amparo-id="${id}" ${bloqueo}>
            <i class="fa-solid fa-ban"></i> Amparo negado
          </button>
          <button type="button" class="mesas-primary-btn" data-envio-accion="concedido" data-amparo-id="${id}" ${bloqueo}>
            <i class="fa-solid fa-check"></i> Amparo concedido
          </button>
        </div>
      </td>
    </tr>`;
}

function abrirCategorizar({ amparo, seg, oficio }, resultado, refrescar) {
  const id = amparo.id;
  const etiqueta =
    resultado === "negado" ? "Amparo negado" : "Amparo concedido";
  const previo = seg.envioTcc?.resultado;

  if (
    previo &&
    previo !== resultado &&
    !window.confirm(
      `Este amparo ya estaba como «${previo}». ¿Cambiarlo a «${resultado}»?`,
    )
  ) {
    return;
  }

  showModal(`
    <div class="mesas-modal-shell" id="mampdEnvioModal">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-gavel"></i></div>
        <div class="mesas-modal-header-text">
          <h2>${etiqueta} · ${escapeHTML(identificadorAmparo(amparo, seg))}</h2>
          <p>Oficio ${escapeHTML(oficio.numero || "—")} · Expediente ${escapeHTML(amparo.expediente || "—")}</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        <label for="mampdEnvioNumero"><strong>No. de Amparo Directo</strong></label>
        <input id="mampdEnvioNumero" class="mampd-envio-input" type="text"
          value="${escapeHTML(numeroAmparoDirecto(seg))}" placeholder="Ej. 123/2026" autocomplete="off">
        <p class="mamp-note">Será el identificador de este amparo de ahora en adelante.</p>
        <p class="mesas-form-error" id="mampdEnvioError" hidden></p>
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="mampdEnvioCancelar">Cancelar</button>
        <button type="button" class="mesas-primary-btn" id="mampdEnvioGuardar">Guardar</button>
      </footer>
    </div>
  `);

  const modal = document.getElementById("mampdEnvioModal");
  const input = modal.querySelector("#mampdEnvioNumero");
  const error = modal.querySelector("#mampdEnvioError");
  input.focus();

  const mostrarError = (texto) => {
    error.textContent = texto;
    error.hidden = !texto;
  };

  const guardar = () => {
    const numero = input.value.trim();
    if (!numero) return mostrarError("Captura el No. de Amparo Directo.");

    const repetido = amparosDirectos().some(
      ({ amparo: a, seg: s }) =>
        String(a.id) !== String(id) &&
        numeroAmparoDirecto(s).toLowerCase() === numero.toLowerCase(),
    );
    if (repetido)
      return mostrarError(
        "Ese No. de Amparo Directo ya está asignado a otro amparo.",
      );

    actualizarSeg(id, (s) => {
      s.envioTcc = {
        resultado,
        numeroAD: numero,
        oficioId: oficio.id,
        oficioNumero: oficio.numero || "",
        categorizadoEn: new Date().toISOString(),
        categorizadoPor: nombreUsuario(),
      };
      if (resultado === "negado") s.niega = { notas: "", ...(s.niega || {}) };
      if (resultado === "concedido") {
        s.amparaProtege = { notas: "", ...(s.amparaProtege || {}) };
        // Terminó la reposición: vuelve a Ampara y Protege listo para un nuevo efecto
        if (s.amparaProtege.enReposicion) {
          s.amparaProtege.enReposicion = false;
          s.amparaProtege.fase = "";
          s.amparaProtege.efecto = "";
          logSeg(
            s,
            "Reposición concluida: el amparo regresa a Ampara y Protege",
          );
        }
      }
      logSeg(s, `Envío del TCC: ${etiqueta}. No. de Amparo Directo ${numero}`);
    });

    closeForm();
    aviso = {
      tipo: "ok",
      texto: `${etiqueta}: amparo ${numero} categorizado.`,
    };
    refrescar();
  };

  modal.querySelector("#mampdEnvioGuardar").onclick = guardar;
  modal.querySelector("#mampdEnvioCancelar").onclick = closeForm;
  input.onkeydown = (e) => {
    if (e.key === "Enter") guardar();
  };
}
