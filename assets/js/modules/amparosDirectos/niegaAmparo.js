// NIEGA AMPARO
// Amparos categorizados como "negado" en Envíos del TCC.
// Guarda: seg.niega = { notas, archivado? } (los documentos viven en el cuadernillo)

import { escapeHTML } from "../../utils.js";
import {
  amparosDirectos,
  obtenerAmparo,
  actualizarSeg,
  logSeg,
  quejosoDe,
  identificadorAmparo,
} from "./datos.js";
import {
  abrirCuadernillo,
  seccionCumplida,
  progresoCuadernillo,
} from "./cuadernillo.js";
import { showModal, closeForm } from "../../forms/formHelper.js";

const SECCION_OFICIO = "oficio-niega-amparo";
const SECCION_ACUERDO = "acuerdo-niega-amparo";

let aviso = null;

export function registrosNiegaAmparo() {
  return amparosDirectos()
    .filter(({ seg }) => seg.envioTcc?.resultado === "negado")
    .sort(
      (a, b) =>
        Number(a.seg.etapa === "archivo") - Number(b.seg.etapa === "archivo"),
    );
}

export function renderNiegaAmparo(host, deps = {}) {
  if (!host) return;

  const refrescar = () =>
    deps.alCambiar ? deps.alCambiar() : renderNiegaAmparo(host, deps);

  const filas = registrosNiegaAmparo();
  const mensaje = aviso;
  aviso = null;

  host.innerHTML = `
    <section class="mesas-fase4-section">
      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Amparos negados</span>
          <h2>Niega Amparo</h2>
          <p>
            Sube el oficio y el acuerdo de cada amparo negado (también aparecen en su cuadernillo).
            Con toda la documentación completa puedes enviarlo a archivo.
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
                <th>Amparo</th><th>Expediente</th><th>Quejoso</th><th>Oficio</th>
                <th>Acuerdo</th><th>Documentación</th><th>Comentarios</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>${filas.map(htmlFila).join("")}</tbody>
          </table>
        </div>`
            : `
        <div class="mesas-empty-state">
          <div class="mesas-empty-icon"><i class="fa-solid fa-ban"></i></div>
          <strong>No hay amparos negados</strong>
          <span>Aparecen aquí los amparos marcados como «Amparo negado» en Envíos del TCC.</span>
        </div>`
        }
      </section>
    </section>
  `;

  host.onclick = (evento) => {
    const boton = evento.target.closest("[data-niega-accion]");
    if (!boton || boton.disabled) return;

    const id = boton.dataset.amparoId;

    switch (boton.dataset.niegaAccion) {
      case "comentario":
        abrirComentario(id, refrescar);
        break;

      case "cuadernillo":
        abrirCuadernillo(id, { alCambiar: refrescar });
        break;

      case "oficio":
        abrirCuadernillo(id, {
          soloSeccion: SECCION_OFICIO,
          alCambiar: refrescar,
        });
        break;

      case "acuerdo":
        abrirCuadernillo(id, {
          soloSeccion: SECCION_ACUERDO,
          alCambiar: refrescar,
        });
        break;

      case "archivar": {
        const datos = obtenerAmparo(id);
        if (!datos || !progresoCuadernillo(datos.seg).completo) {
          aviso = {
            tipo: "error",
            texto:
              "Falta documentación: completa el cuadernillo para enviarlo a archivo.",
          };
          refrescar();
          break;
        }
        if (
          !window.confirm(
            `¿Enviar el amparo ${identificadorAmparo(datos.amparo, datos.seg)} a Archivo? Marca el fin de sus procesos.`,
          )
        )
          break;

        actualizarSeg(id, (s) => {
          const ahora = new Date().toISOString();
          s.etapa = "archivo";
          s.desde = ahora;
          s.archivadoEn = ahora;
          s.niega = { ...(s.niega || {}), archivado: true };
          logSeg(s, "Amparo negado: documentación completa; enviado a Archivo");
        });
        aviso = { tipo: "ok", texto: "El amparo se envió a Archivo." };
        refrescar();
        break;
      }
    }
  };
}

function htmlDoc(seg, seccion) {
  const registro = seg.cuadernillo?.docs?.[seccion];
  return seccionCumplida(seg, seccion)
    ? `<span class="mesas-stage-badge mamp-ok">Subido</span>
       <small class="mampd-pend-sub">${escapeHTML(registro.archivo || "")}</small>`
    : `<span class="mesas-stage-badge">Pendiente</span>`;
}

function htmlFila({ amparo, seg }) {
  const id = escapeHTML(amparo.id);
  const archivado = seg.etapa === "archivo";
  const p = progresoCuadernillo(seg);
  const bloqueo = archivado ? "disabled" : "";

  return `
    <tr>
      <td><strong>Amparo ${escapeHTML(identificadorAmparo(amparo, seg))}</strong></td>
      <td>${escapeHTML(amparo.expediente || "—")}</td>
      <td>${escapeHTML(quejosoDe(amparo, seg))}</td>
      <td>${htmlDoc(seg, SECCION_OFICIO)}</td>
      <td>${htmlDoc(seg, SECCION_ACUERDO)}</td>
      <td>
        <button type="button" class="mampd-doc-link" data-niega-accion="cuadernillo"
          data-amparo-id="${id}" title="Abrir el cuadernillo de este amparo">
          <span class="mesas-stage-badge ${p.completo ? "mamp-ok" : "acuerdo"}">${p.cargados}/${p.total}${p.completo ? " · completo" : ""}</span>
        </button>
      </td>
      <td class="mampd-nota-celda">${htmlComentario(seg, id)}</td>
      <td>
        <div class="mesas-actions">
          <button type="button" class="mesas-secondary-btn" data-niega-accion="oficio" data-amparo-id="${id}" ${bloqueo}>
            <i class="fa-solid fa-file-circle-plus"></i> Agregar oficio
          </button>
          <button type="button" class="mesas-secondary-btn" data-niega-accion="acuerdo" data-amparo-id="${id}" ${bloqueo}>
            <i class="fa-solid fa-file-signature"></i> Acordar
          </button>
          ${
            archivado
              ? `<span class="mesas-stage-badge mamp-ok">Archivado</span>`
              : `<button type="button" class="mesas-primary-btn" data-niega-accion="archivar" data-amparo-id="${id}"
                  ${p.completo ? "" : "disabled"}
                  title="${p.completo ? "Marca el fin de los procesos del amparo" : "Completa toda la documentación del cuadernillo"}">
                  <i class="fa-solid fa-box-archive"></i> Enviar a archivo
                </button>`
          }
        </div>
      </td>
    </tr>`;
}

function htmlComentario(seg, id) {
  const nota = (seg.niega?.notas || "").trim();

  if (!nota) {
    return `<button type="button" class="mesas-secondary-btn" data-niega-accion="comentario" data-amparo-id="${id}">
      <i class="fa-solid fa-comment-medical"></i> Agregar comentario
    </button>`;
  }

  return `<div class="mampd-nota">
    <span class="mampd-nota-texto" title="${escapeHTML(nota)}">${escapeHTML(nota)}</span>
    <button type="button" class="mampd-nota-editar" data-niega-accion="comentario" data-amparo-id="${id}"
      aria-label="Editar comentario" title="Editar comentario">
      <i class="fa-solid fa-pen"></i>
    </button>
  </div>`;
}

function abrirComentario(id, refrescar) {
  const datos = obtenerAmparo(id);
  if (!datos) return;

  const { amparo, seg } = datos;

  showModal(`
    <div class="mesas-modal-shell" id="mampdNotaModal">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-comment-dots"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Comentarios · Amparo ${escapeHTML(identificadorAmparo(amparo, seg))}</h2>
          <p>Expediente ${escapeHTML(amparo.expediente || "—")}</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        <textarea id="mampdNotaTexto" class="mampd-notas" rows="6"
          placeholder="Escribe tus comentarios...">${escapeHTML(seg.niega?.notas || "")}</textarea>
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="mampdNotaCancelar">Cancelar</button>
        <button type="button" class="mesas-primary-btn" id="mampdNotaGuardar">Guardar</button>
      </footer>
    </div>
  `);

  const modal = document.getElementById("mampdNotaModal");
  const texto = modal.querySelector("#mampdNotaTexto");

  texto.focus();
  texto.setSelectionRange(texto.value.length, texto.value.length);

  modal.querySelector("#mampdNotaCancelar").onclick = closeForm;

  modal.querySelector("#mampdNotaGuardar").onclick = () => {
    actualizarSeg(id, (s) => {
      s.niega = { ...(s.niega || {}), notas: texto.value.trim() };
    });

    closeForm();
    refrescar();
  };
}
