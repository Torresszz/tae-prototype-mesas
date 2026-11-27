// ============================================================
// AMPARA Y PROTEGE (Amparos Directos)
// assets/js/modules/amparosDirectos/amparaProtege.js
//
// Llegan aquí los amparos marcados como «Amparo concedido» en
// «Envíos del TCC». Todo vive en seg.amparaProtege:
//   {
//     efecto, fase, notas,
//     ultimosDocs: { acuerdo, oficio },     // docs del último «Acordar»
//     laudo, laudosPrevios[], acuerdoEfecto,  // documentos por efecto
//     laudoEnviadoEn, respuestaTccEn,
//     enReposicion, reposicion: { destino, desde, por },
//     requerimientos: [{ id, documentoId, archivo, subidoEn, subidoPor }],
//     cumplido, cumplidoEn, estadoProcesal, fojas, listaId?, listaNumero?,
//     finalizado, destino?
//   }
// El acuerdo y el oficio del «Acordar» se guardan en el cuadernillo
// (secciones acuerdo-ampara-protege / oficio-ampara-protege).
// ============================================================
import { createId, escapeHTML } from "../../utils.js";
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
} from "./datos.js";
import {
  abrirCuadernillo,
  cuadernilloDe,
  seccionCumplida,
  progresoCuadernillo,
} from "./cuadernillo.js";
import { montarBuscadorPlantillas } from "../mesas/buscadorPlantillas.js";
import {
  guardarDocumento,
  borrarDocumento,
  obtenerDocumento,
  descargarDocumento,
  validarArchivoDocumento,
  leerComoDataUrl,
  htmlVistaPreviaDocumento,
  activarVistasPreviasDocumento,
  DOCUMENTO_MAX_MB,
} from "../mesas/documentosFirma.js";
import { CATEGORIA_LISTA } from "./listas.js";

export const SECCION_OFICIO = "oficio-ampara-protege";
export const SECCION_ACUERDO = "acuerdo-ampara-protege";

const EFECTOS = [
  { clave: "nuevo-laudo", etiqueta: "Nuevo Laudo" },
  { clave: "reposicion", etiqueta: "Reposición" },
  { clave: "caducar", etiqueta: "Caducar" },
  { clave: "sin-efecto-caducidad", etiqueta: "Dejar sin efecto caducidad" },
];

// Etapa desde la que se retoma un amparo en reposición
const ETAPAS_REPOSICION = [
  { clave: "pendientes", etiqueta: "Amparos pendientes de realizar" },
  { clave: "tcc", etiqueta: "Pendiente de enviar al TCC" },
];

// Módulos a los que puede ir un expediente al dejar sin efecto la caducidad
const MODULOS_DESTINO = [
  "Expedientes",
  "Demandas",
  "Amparos",
  "Exhortos",
  "Promociones",
  "Registral",
  "Oficios",
  "Mesas",
  "Amparos Indirectos",
];

let aviso = null; // { tipo: "ok" | "error", texto }
let borrador = { id: "", efecto: "", destino: "" }; // formulario de «Acordar»

// ------------------------------------------------------------
// DATOS
// ------------------------------------------------------------
const ahoraISO = () => new Date().toISOString();

const etiquetaEfecto = (clave) =>
  EFECTOS.find((e) => e.clave === clave)?.etiqueta || "";

// Solo dentro de actualizarSeg(): crea lo que falte.
function apDe(seg) {
  if (!seg.amparaProtege || typeof seg.amparaProtege !== "object") {
    seg.amparaProtege = {};
  }
  const ap = seg.amparaProtege;
  if (typeof ap.notas !== "string") ap.notas = "";
  if (!Array.isArray(ap.requerimientos)) ap.requerimientos = [];
  if (!Array.isArray(ap.laudosPrevios)) ap.laudosPrevios = [];
  return ap;
}

export function esTerminado(seg) {
  return seg.etapa === "archivo" || Boolean(seg.amparaProtege?.finalizado);
}

export function registrosAmparaProtege() {
  return amparosDirectos()
    .filter(({ seg }) => seg.envioTcc?.resultado === "concedido")
    .sort((a, b) => Number(esTerminado(a.seg)) - Number(esTerminado(b.seg)));
}

function tieneDoc(registro) {
  return Boolean(
    registro?.documentoId && obtenerDocumento(registro.documentoId),
  );
}

// El acuerdo/oficio cuenta como «nuevo» si no es el del último Acordar.
function docNuevo(seg, seccion, clave) {
  const registro = seg.cuadernillo?.docs?.[seccion];
  return (
    tieneDoc(registro) &&
    registro.documentoId !== seg.amparaProtege?.ultimosDocs?.[clave]
  );
}

function textoEstado(seg) {
  const ap = seg.amparaProtege || {};
  if (esTerminado(seg)) {
    return ap.destino ? `Finalizado · enviado a ${ap.destino}` : "Finalizado";
  }
  if (ap.enReposicion) return "En reposición";
  const sinLaudo = "Falta subir el laudo";
  const fases = {
    laudo:
      ap.efecto === "caducar" || !tieneDoc(ap.laudo)
        ? sinLaudo
        : "Laudo listo para enviar al TCC",
    "espera-tcc": "Laudo enviado · esperando respuesta del TCC",
    respuesta: "Respuesta del TCC recibida · define el resultado",
    cumplido: ap.listaNumero
      ? `Cumplido · listado en la lista #${ap.listaNumero}`
      : "Cumplido · en Actuaría, pendiente de lista",
    completado: "Laudo subido · listo para enviar a Archivo",
    acuerdo: "Falta subir el acuerdo",
    "listo-envio": "Acuerdo subido · listo para enviar a otro módulo",
  };
  return fases[ap.fase] || "Por acordar";
}

// Archivo -> { ok, documento } | { ok: false, error }
async function guardarArchivo(archivo) {
  const problema = validarArchivoDocumento(archivo);
  if (problema) return { ok: false, error: problema };
  let dataUrl = "";
  try {
    dataUrl = await leerComoDataUrl(archivo);
  } catch (fallo) {
    console.error(fallo);
    return { ok: false, error: "No se pudo leer el archivo seleccionado." };
  }
  const guardado = guardarDocumento({ archivo, dataUrl });
  if (!guardado.ok) {
    return {
      ok: false,
      error:
        guardado.error === "cuota"
          ? "No hay espacio suficiente en el navegador para guardar el archivo. Prueba con uno más pequeño."
          : "No se pudo guardar el archivo.",
    };
  }
  return { ok: true, documento: guardado.documento };
}

// Sube un archivo a una sección del cuadernillo (reemplaza el anterior).
async function subirASeccion(id, seccion, archivo) {
  const resultado = await guardarArchivo(archivo);
  if (!resultado.ok) return resultado;
  let previoId = "";
  actualizarSeg(id, (s) => {
    const c = cuadernilloDe(s);
    previoId = c.docs[seccion]?.documentoId || "";
    c.docs[seccion] = {
      documentoId: resultado.documento.id,
      archivo: archivo.name,
      subidoEn: ahoraISO(),
      subidoPor: nombreUsuario(),
    };
    logSeg(s, `Ampara y protege: documento cargado (${archivo.name})`);
  });
  if (previoId) borrarDocumento(previoId);
  return { ok: true };
}

// ------------------------------------------------------------
// RENDER
// ------------------------------------------------------------
export function renderAmparaProtege(host, deps = {}) {
  if (!host) return;
  const refrescar = () =>
    deps.alCambiar ? deps.alCambiar() : renderAmparaProtege(host, deps);
  const filas = registrosAmparaProtege();
  const enCurso = filas.filter(({ seg }) => !esTerminado(seg)).length;
  const mensaje = aviso;
  aviso = null;

  host.innerHTML = `
    <section class="mesas-fase4-section">
      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Amparos concedidos</span>
          <h2>Ampara y Protege</h2>
          <p>
            Amparos marcados como «Amparo concedido» en Envíos del TCC. Acuerda el efecto
            y da seguimiento a cada proceso. ${enCurso} en curso.
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
          <div class="mesas-empty-icon"><i class="fa-solid fa-shield-halved"></i></div>
          <strong>No hay amparos concedidos</strong>
          <span>Aparecen aquí los amparos marcados como «Amparo concedido» en Envíos del TCC.</span>
        </div>`
        }
      </section>
    </section>
  `;

  host.onclick = (evento) => {
    const boton = evento.target.closest("[data-ap-accion]");
    if (!boton || boton.disabled) return;
    const id = boton.dataset.amparoId;
    const falla = (texto) => {
      aviso = { tipo: "error", texto };
      refrescar();
    };

    switch (boton.dataset.apAccion) {
      case "acordar":
        abrirAcordar(id, refrescar);
        break;

      case "comentario":
        abrirComentario(id, refrescar);
        break;

      case "cuadernillo":
        abrirCuadernillo(id, { alCambiar: refrescar });
        break;

      case "requerimientos":
        abrirRequerimientos(id, refrescar);
        break;

      // ---------- Nuevo laudo / Caducar ----------
      case "subir-laudo":
        abrirSubirDocumento(
          id,
          {
            campo: "laudo",
            titulo: "Laudo",
            categoria: "ampara-y-protege",
            ayuda:
              "Sube el archivo del laudo. Puedes hacerlo en cualquier momento",
            alGuardar: (s, ap) => {
              // Caducar: con el laudo subido el amparo queda completado
              if (ap.efecto === "caducar") ap.fase = "completado";
            },
          },
          refrescar,
        );
        break;

      case "enviar-laudo": {
        const ap = obtenerAmparo(id)?.seg.amparaProtege || {};
        if (!tieneDoc(ap.laudo)) {
          return falla("Sube el laudo antes de enviarlo al TCC.");
        }
        if (
          !window.confirm("¿Enviar el laudo al Tribunal Colegiado de Circuito?")
        )
          break;
        actualizarSeg(id, (s) => {
          const a = apDe(s);
          a.fase = "espera-tcc";
          a.laudoEnviadoEn = ahoraISO();
          logSeg(
            s,
            "Ampara y protege: laudo enviado al TCC; se espera su respuesta",
          );
        });
        aviso = {
          tipo: "ok",
          texto: "Laudo enviado al TCC. Registra su respuesta cuando llegue.",
        };
        refrescar();
        break;
      }

      case "respuesta-tcc":
        if (!window.confirm("¿Registrar que el TCC ya respondió al laudo?"))
          break;
        actualizarSeg(id, (s) => {
          const a = apDe(s);
          a.fase = "respuesta";
          a.respuestaTccEn = ahoraISO();
          logSeg(s, "Ampara y protege: respuesta del TCC recibida");
        });
        refrescar();
        break;

      case "cumplido":
        abrirCumplido(id, refrescar);
        break;

      case "defectos":
        if (
          !window.confirm(
            "¿Marcar «Defectos en el cumplimiento»? El proceso vuelve a la etapa de subir un laudo.",
          )
        ) {
          break;
        }
        actualizarSeg(id, (s) => {
          const a = apDe(s);
          if (a.laudo) {
            a.laudosPrevios.push({
              ...a.laudo,
              enviadoEn: a.laudoEnviadoEn || "",
              defectosEn: ahoraISO(),
            });
          }
          a.laudo = null;
          a.laudoEnviadoEn = null;
          a.respuestaTccEn = null;
          a.fase = "laudo";
          logSeg(
            s,
            "Ampara y protege: defectos en el cumplimiento; se solicita un nuevo laudo",
          );
        });
        aviso = {
          tipo: "ok",
          texto: "Defectos registrados. Sube un nuevo laudo.",
        };
        refrescar();
        break;

      // ---------- Caducar ----------
      case "archivar": {
        const datos = obtenerAmparo(id);
        if (!datos || datos.seg.amparaProtege?.fase !== "completado") {
          return falla("Sube el laudo para poder enviar el amparo a Archivo.");
        }
        if (
          !window.confirm(
            `¿Enviar el amparo ${identificadorAmparo(datos.amparo, datos.seg)} a Archivo? Marca el fin de sus procesos.`,
          )
        ) {
          break;
        }
        actualizarSeg(id, (s) => {
          const ahora = ahoraISO();
          const a = apDe(s);
          s.etapa = "archivo";
          s.desde = ahora;
          s.archivadoEn = ahora;
          a.finalizado = true;
          a.fase = "finalizado";
          logSeg(
            s,
            "Ampara y protege (caducar): laudo cargado; enviado a Archivo",
          );
        });
        aviso = { tipo: "ok", texto: "El amparo se envió a Archivo." };
        refrescar();
        break;
      }

      // ---------- Dejar sin efecto caducidad ----------
      case "subir-acuerdo":
        abrirSubirDocumento(
          id,
          {
            campo: "acuerdoEfecto",
            titulo: "Acuerdo",
            categoria: "ampara-y-protege",
            ayuda: "Sube el acuerdo que deja sin efecto la caducidad",
            alGuardar: (s, ap) => {
              ap.fase = "listo-envio";
            },
          },
          refrescar,
        );
        break;

      case "enviar-modulo":
        abrirEnviarModulo(id, refrescar);
        break;
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

function htmlComentario(seg, id) {
  const nota = (seg.amparaProtege?.notas || "").trim();
  if (!nota) {
    return `<button type="button" class="mesas-secondary-btn" data-ap-accion="comentario" data-amparo-id="${id}">
      <i class="fa-solid fa-comment-medical"></i> Agregar comentario
    </button>`;
  }
  return `<div class="mampd-nota">
    <span class="mampd-nota-texto" title="${escapeHTML(nota)}">${escapeHTML(nota)}</span>
    <button type="button" class="mampd-nota-editar" data-ap-accion="comentario" data-amparo-id="${id}"
      aria-label="Editar comentario" title="Editar comentario">
      <i class="fa-solid fa-pen"></i>
    </button>
  </div>`;
}

function htmlFila({ amparo, seg }) {
  const id = escapeHTML(amparo.id);
  const ap = seg.amparaProtege || {};
  const p = progresoCuadernillo(seg);
  return `
    <tr>
      <td>
        <strong>Amparo ${escapeHTML(identificadorAmparo(amparo, seg))}</strong>
        <small class="mampd-pend-sub">${ap.efecto ? `${escapeHTML(etiquetaEfecto(ap.efecto))} · ` : ""}${escapeHTML(textoEstado(seg))}</small>
        ${ap.enReposicion ? `<span class="mesas-stage-badge mamp-warn">En reposición</span>` : ""}
      </td>
      <td>${escapeHTML(amparo.expediente || "—")}</td>
      <td>${escapeHTML(quejosoDe(amparo, seg))}</td>
      <td>${htmlDoc(seg, SECCION_OFICIO)}</td>
      <td>${htmlDoc(seg, SECCION_ACUERDO)}</td>
      <td>
        <button type="button" class="mampd-doc-link" data-ap-accion="cuadernillo"
          data-amparo-id="${id}" title="Abrir el cuadernillo de este amparo">
          <span class="mesas-stage-badge ${p.completo ? "mamp-ok" : "acuerdo"}">${p.cargados}/${p.total}${p.completo ? " · completo" : ""}</span>
        </button>
      </td>
      <td class="mampd-nota-celda">${htmlComentario(seg, id)}</td>
      <td><div class="mesas-actions">${htmlAcciones(seg, id)}</div></td>
    </tr>`;
}

function htmlAcciones(seg, id) {
  const ap = seg.amparaProtege || {};
  if (esTerminado(seg)) {
    return `<span class="mesas-stage-badge mamp-ok">${ap.destino ? `Enviado a ${escapeHTML(ap.destino)}` : "Archivado"}</span>`;
  }

  const boton = (
    accion,
    icono,
    texto,
    { primario = false, off = false, titulo = "" } = {},
  ) => `
    <button type="button" class="${primario ? "mesas-primary-btn" : "mesas-secondary-btn"}"
      data-ap-accion="${accion}" data-amparo-id="${id}" ${off ? "disabled" : ""}
      ${titulo ? `title="${escapeHTML(titulo)}"` : ""}>
      <i class="fa-solid ${icono}"></i> ${texto}
    </button>`;

  if (ap.enReposicion) {
    const n = (ap.requerimientos || []).length;
    return boton(
      "requerimientos",
      "fa-file-circle-exclamation",
      `Requerimientos${n ? ` (${n})` : ""}`,
      {
        primario: true,
      },
    );
  }

  switch (ap.fase) {
    case "laudo": {
      const hayLaudo = tieneDoc(ap.laudo);
      const subir = boton(
        "subir-laudo",
        "fa-file-arrow-up",
        hayLaudo ? "Reemplazar laudo" : "Subir laudo",
        {
          primario: ap.efecto === "caducar" || !hayLaudo,
        },
      );
      return ap.efecto === "caducar"
        ? subir
        : subir +
            boton("enviar-laudo", "fa-paper-plane", "Enviar laudo al TCC", {
              primario: hayLaudo,
              off: !hayLaudo,
              titulo: hayLaudo ? "" : "Sube primero el laudo",
            });
    }
    case "espera-tcc":
      return boton("respuesta-tcc", "fa-inbox", "Respuesta del TCC recibida", {
        primario: true,
      });
    case "respuesta":
      return (
        boton("cumplido", "fa-circle-check", "Cumplido", { primario: true }) +
        boton(
          "defectos",
          "fa-triangle-exclamation",
          "Defectos en el cumplimiento",
        )
      );
    case "cumplido":
      return `<span class="mesas-stage-badge mamp-ok">${ap.listaNumero ? `Lista #${escapeHTML(ap.listaNumero)}` : "Cumplido"}</span>`;
    case "completado":
      return boton("archivar", "fa-box-archive", "Enviar a archivo", {
        primario: true,
      });
    case "acuerdo":
      return boton("subir-acuerdo", "fa-file-arrow-up", "Subir acuerdo", {
        primario: true,
      });
    case "listo-envio":
      return (
        boton("subir-acuerdo", "fa-file-arrow-up", "Reemplazar acuerdo") +
        boton("enviar-modulo", "fa-share", "Enviar a otro módulo", {
          primario: true,
        })
      );
    default:
      return boton("acordar", "fa-file-signature", "Acordar", {
        primario: true,
      });
  }
}

// ------------------------------------------------------------
// MODAL «ACORDAR»
// El acuerdo y el oficio se guardan al elegir el archivo (igual que en el
// cuadernillo); «Confirmar» valida y aplica el efecto.
// ------------------------------------------------------------
function abrirAcordar(id, refrescar) {
  const datos = obtenerAmparo(id);
  if (!datos) return;
  const { amparo, seg } = datos;
  if (borrador.id !== String(id)) {
    borrador = { id: String(id), efecto: "", destino: "" };
  }

  const bloqueDoc = (seccion, clave, titulo, categoria) => {
    const registro = seg.cuadernillo?.docs?.[seccion];
    const hay = docNuevo(seg, seccion, clave);
    return `
      <section class="mampd-rad-seccion">
        <strong>${titulo}</strong>
        <p class="mamp-note">Obligatorio · .pdf o .docx, máximo ${DOCUMENTO_MAX_MB} MB.</p>
        <div class="mesas-actions">
          <label class="mesas-secondary-btn mampd-upload-btn" for="apArchivo-${clave}">
            <i class="fa-solid fa-paperclip"></i> ${hay ? "Reemplazar" : "Subir documento"}
            <input type="file" id="apArchivo-${clave}" data-ap-subir="${seccion}" accept=".pdf,.docx" hidden>
          </label>
          <button type="button" class="mesas-secondary-btn" data-ap-plantillas="${categoria}">
            <i class="fa-regular fa-file-lines"></i> Plantillas
          </button>
        </div>
        ${
          hay
            ? `<small class="mampd-pend-sub">${escapeHTML(registro.archivo || "")}</small>
               ${htmlVistaPreviaDocumento({ documentoId: registro.documentoId })}`
            : ""
        }
      </section>`;
  };

  showModal(`
    <div class="mesas-modal-shell mampd-cuad-modal" id="apAcordarModal">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-file-signature"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Acordar · Amparo ${escapeHTML(identificadorAmparo(amparo, seg))}</h2>
          <p>Expediente ${escapeHTML(amparo.expediente || "—")} · ${escapeHTML(quejosoDe(amparo, seg))}</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        <label for="apEfecto"><strong>Efecto a desarrollar</strong></label>
        <select id="apEfecto" class="mampd-envio-input">
          <option value="">Selecciona un efecto...</option>
          ${EFECTOS.map(
            (e) =>
              `<option value="${e.clave}" ${e.clave === borrador.efecto ? "selected" : ""}>${e.etiqueta}</option>`,
          ).join("")}
        </select>

        <div id="apDestinoBox" ${borrador.efecto === "reposicion" ? "" : "hidden"}>
          <label for="apDestino"><strong>Retomar el proceso desde</strong></label>
          <select id="apDestino" class="mampd-envio-input">
            <option value="">Selecciona la etapa...</option>
            ${ETAPAS_REPOSICION.map(
              (e) =>
                `<option value="${e.clave}" ${e.clave === borrador.destino ? "selected" : ""}>${e.etiqueta}</option>`,
            ).join("")}
          </select>
          <p class="mamp-note">El amparo se marca «En reposición» hasta que vuelva a quedar concedido en Envíos del TCC.</p>
        </div>

        ${bloqueDoc(SECCION_ACUERDO, "acuerdo", "Acuerdo", "ampara-y-protege")}
        ${bloqueDoc(SECCION_OFICIO, "oficio", "Oficio para el TCC", "oficios")}
        <section class="mampd-rad-seccion" id="apPlantillas"></section>
        <p class="mesas-fase6-error" id="apError" hidden></p>
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="apCancelar">Cancelar</button>
        <button type="button" class="mesas-modal-confirm" id="apConfirmar">
          <i class="fa-solid fa-check"></i> Confirmar efecto
        </button>
      </footer>
    </div>
  `);

  const modal = document.getElementById("apAcordarModal");
  activarVistasPreviasDocumento(modal);
  const buscador = montarBuscadorPlantillas(
    modal.querySelector("#apPlantillas"),
    {
      contexto: "directos",
      categoria: "ampara-y-protege",
    },
  );
  const error = (texto) => {
    const caja = modal.querySelector("#apError");
    caja.textContent = texto;
    caja.hidden = !texto;
  };

  modal.querySelector("#apEfecto").onchange = (e) => {
    borrador.efecto = e.target.value;
    modal.querySelector("#apDestinoBox").hidden =
      borrador.efecto !== "reposicion";
  };
  modal.querySelector("#apDestino").onchange = (e) => {
    borrador.destino = e.target.value;
  };

  modal.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-ap-plantillas]");
    if (!boton) return;
    buscador.definir({ categoria: boton.dataset.apPlantillas });
    modal.querySelector("#apPlantillas").scrollIntoView({ block: "nearest" });
  });

  modal.addEventListener("change", async (evento) => {
    const input = evento.target.closest("[data-ap-subir]");
    const archivo = input?.files?.[0];
    if (!archivo) return;
    const resultado = await subirASeccion(id, input.dataset.apSubir, archivo);
    if (!resultado.ok) {
      input.value = "";
      return error(resultado.error);
    }
    abrirAcordar(id, refrescar); // repinta con la vista previa
  });

  modal.querySelector("#apCancelar").onclick = () => {
    closeForm();
    refrescar();
  };

  modal.querySelector("#apConfirmar").onclick = () => {
    const fresco = obtenerAmparo(id)?.seg;
    if (!fresco) return;
    if (!borrador.efecto) return error("Selecciona el efecto a desarrollar.");
    if (borrador.efecto === "reposicion" && !borrador.destino) {
      return error("Indica desde qué etapa se retoma el proceso.");
    }
    if (!docNuevo(fresco, SECCION_ACUERDO, "acuerdo")) {
      return error("Sube el archivo del acuerdo.");
    }
    if (!docNuevo(fresco, SECCION_OFICIO, "oficio")) {
      return error("Sube el archivo del oficio que se enviará al TCC.");
    }
    const efecto = borrador.efecto;
    aplicarEfecto(id, efecto, borrador.destino);
    borrador = { id: "", efecto: "", destino: "" };
    closeForm();
    aviso = {
      tipo: "ok",
      texto: `Efecto «${etiquetaEfecto(efecto)}» registrado.`,
    };
    refrescar();
  };
}

function aplicarEfecto(id, efecto, destino) {
  const ahora = ahoraISO();
  actualizarSeg(id, (s) => {
    const a = apDe(s);
    const docs = s.cuadernillo?.docs || {};
    a.ultimosDocs = {
      acuerdo: docs[SECCION_ACUERDO]?.documentoId || "",
      oficio: docs[SECCION_OFICIO]?.documentoId || "",
    };
    a.efecto = efecto;
    a.acordadoEn = ahora;
    a.acordadoPor = nombreUsuario();

    if (efecto === "reposicion") {
      a.fase = "reposicion";
      a.enReposicion = true;
      a.reposicion = { destino, desde: ahora, por: nombreUsuario() };
      s.actuaria = null;
      s.desde = ahora;
      if (destino === "pendientes") {
        // Vuelve a «Amparos pendientes de realizar»
        s.etapa = "acuerdo";
        s.categoria = CATEGORIA_LISTA;
        if (s.radicacion) {
          s.radicacion.enviadaActuaria = false;
          delete s.radicacion.enviadaActuariaEn;
        }
      } else {
        // Vuelve a «Pendiente de enviar al TCC»
        s.etapa = "informe";
        if (s.informe) {
          s.informe.enviado = false;
          delete s.informe.enviadoEn;
        }
        s.tcc = {
          ...(s.tcc || {}),
          llegadaEn: ahora,
          alerta: { activa: true },
        };
      }
    } else if (efecto === "sin-efecto-caducidad") {
      a.fase = "acuerdo";
    } else {
      a.fase = "laudo"; // nuevo laudo / caducar
    }
    logSeg(
      s,
      `Ampara y protege: efecto «${etiquetaEfecto(efecto)}»${
        efecto === "reposicion"
          ? ` (se retoma desde ${ETAPAS_REPOSICION.find((e) => e.clave === destino)?.etiqueta})`
          : ""
      }`,
    );
  });
}

// ------------------------------------------------------------
// SUBIR UN DOCUMENTO (laudo / acuerdo del efecto)
// Mismo patrón: subir, vista previa del subido y buscador de plantillas.
// ------------------------------------------------------------
function abrirSubirDocumento(
  id,
  { campo, titulo, ayuda, categoria, alGuardar },
  refrescar,
) {
  const datos = obtenerAmparo(id);
  if (!datos) return;
  const { amparo, seg } = datos;
  const previo = seg.amparaProtege?.[campo] || null;

  showModal(`
    <div class="mesas-modal-shell" id="apDocModal">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-file-arrow-up"></i></div>
        <div class="mesas-modal-header-text">
          <h2>${escapeHTML(titulo)} · Amparo ${escapeHTML(identificadorAmparo(amparo, seg))}</h2>
          <p>Expediente ${escapeHTML(amparo.expediente || "—")}</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        <p class="mamp-note">${escapeHTML(ayuda)} (.pdf o .docx, máximo ${DOCUMENTO_MAX_MB} MB).</p>
        <section class="mampd-rad-seccion" id="apDocPlantillas"></section>
        <section class="mampd-rad-seccion">
          <strong>Documento</strong>
          <input type="file" id="apDocArchivo" accept=".pdf,.docx">
        </section>
        ${
          tieneDoc(previo)
            ? `<section class="mampd-rad-seccion">
                 <strong>Documento subido</strong>
                 <small class="mampd-pend-sub">${escapeHTML(previo.archivo || "")}</small>
                 ${htmlVistaPreviaDocumento({ documentoId: previo.documentoId })}
               </section>`
            : ""
        }
        <p class="mesas-fase6-error" id="apDocError" hidden></p>
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="apDocCancelar">Cancelar</button>
        <button type="button" class="mesas-modal-confirm" id="apDocGuardar">
          <i class="fa-solid fa-check"></i> Guardar
        </button>
      </footer>
    </div>
  `);

  const modal = document.getElementById("apDocModal");
  activarVistasPreviasDocumento(document.getElementById("modalContent"));
  montarBuscadorPlantillas(modal.querySelector("#apDocPlantillas"), {
    contexto: "directos",
    categoria,
  });
  const error = (texto) => {
    const caja = modal.querySelector("#apDocError");
    caja.textContent = texto;
    caja.hidden = !texto;
  };

  modal.querySelector("#apDocCancelar").onclick = closeForm;
  modal.querySelector("#apDocGuardar").onclick = async () => {
    const archivo = modal.querySelector("#apDocArchivo").files[0];
    if (!archivo) return error("Selecciona el archivo.");
    const resultado = await guardarArchivo(archivo);
    if (!resultado.ok) return error(resultado.error);

    let previoId = "";
    actualizarSeg(id, (s) => {
      const a = apDe(s);
      previoId = a[campo]?.documentoId || "";
      a[campo] = {
        documentoId: resultado.documento.id,
        archivo: archivo.name,
        subidoEn: ahoraISO(),
        subidoPor: nombreUsuario(),
      };
      alGuardar?.(s, a);
      logSeg(
        s,
        `Ampara y protege: ${titulo.toLowerCase()} cargado (${archivo.name})`,
      );
    });
    if (previoId) borrarDocumento(previoId);
    closeForm();
    aviso = { tipo: "ok", texto: `${titulo} guardado.` };
    refrescar();
  };
}

// ------------------------------------------------------------
// CUMPLIDO (nuevo laudo)
// ------------------------------------------------------------
function documentosFaltantes(seg) {
  const faltan = [];
  if (!seccionCumplida(seg, SECCION_ACUERDO)) faltan.push("acuerdo");
  if (!seccionCumplida(seg, SECCION_OFICIO)) faltan.push("oficio");
  if (!tieneDoc(seg.amparaProtege?.laudo)) faltan.push("laudo");
  return faltan;
}

function abrirCumplido(id, refrescar) {
  const datos = obtenerAmparo(id);
  if (!datos) return;
  const { amparo, seg } = datos;
  const faltan = documentosFaltantes(seg);

  showModal(`
    <div class="mesas-modal-shell" id="apCumplidoModal">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-circle-check"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Cumplido · Amparo ${escapeHTML(identificadorAmparo(amparo, seg))}</h2>
          <p>Expediente ${escapeHTML(amparo.expediente || "—")}</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        ${
          faltan.length
            ? `<p class="mesas-fase6-error">Faltan documentos por subir: ${faltan.join(", ")}.</p>`
            : `<p class="mamp-note">Documentos completos. Al confirmar, el amparo pasa a <strong>Actuaría</strong> y se incluye en el siguiente PDF de lista.</p>`
        }
        <label for="apEstado"><strong>Estado procesal</strong> (aparece en la lista)</label>
        <input id="apEstado" class="mampd-envio-input" type="text" autocomplete="off"
          value="Se tiene por cumplida la ejecutoria de amparo">
        <label for="apFojas"><strong>Fojas</strong></label>
        <input id="apFojas" class="mampd-envio-input" type="number" min="1" step="1" placeholder="Ej. 12">
        <p class="mesas-form-error" id="apCumplidoError" hidden></p>
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="apCumplidoCancelar">Cancelar</button>
        <button type="button" class="mesas-modal-confirm" id="apCumplidoGuardar" ${faltan.length ? "disabled" : ""}>
          <i class="fa-solid fa-check"></i> Confirmar cumplido
        </button>
      </footer>
    </div>
  `);

  const modal = document.getElementById("apCumplidoModal");
  const error = (texto) => {
    const caja = modal.querySelector("#apCumplidoError");
    caja.textContent = texto;
    caja.hidden = !texto;
  };
  modal.querySelector("#apCumplidoCancelar").onclick = closeForm;
  modal.querySelector("#apCumplidoGuardar").onclick = () => {
    const estado = modal.querySelector("#apEstado").value.trim();
    const fojas = Number(modal.querySelector("#apFojas").value);
    if (!estado) return error("Captura el estado procesal.");
    if (!Number.isInteger(fojas) || fojas < 1) {
      return error("Captura las fojas (número entero mayor a 0).");
    }
    actualizarSeg(id, (s) => {
      const ahora = ahoraISO();
      const a = apDe(s);
      a.fase = "cumplido";
      a.cumplido = true;
      a.cumplidoEn = ahora;
      a.estadoProcesal = estado;
      a.fojas = fojas;
      // Ubicación: Actuaría (etapaOrigen propio para no alterar el flujo al regresar)
      s.actuaria = {
        activo: true,
        desde: ahora,
        motivo: "Ampara y protege cumplido",
        etapaOrigen: "ampara-protege",
      };
      logSeg(
        s,
        "Ampara y protege: laudo cumplido; pasa a Actuaría y a la siguiente lista",
      );
    });
    closeForm();
    aviso = {
      tipo: "ok",
      texto:
        "Cumplido: el amparo pasa a Actuaría y entrará en la siguiente lista.",
    };
    refrescar();
  };
}

// ------------------------------------------------------------
// ENVIAR A OTRO MÓDULO (dejar sin efecto caducidad)
// ------------------------------------------------------------
function abrirEnviarModulo(id, refrescar) {
  const datos = obtenerAmparo(id);
  if (!datos) return;
  const { amparo, seg } = datos;

  showModal(`
    <div class="mesas-modal-shell" id="apModuloModal">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-share"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Enviar a otro módulo · Amparo ${escapeHTML(identificadorAmparo(amparo, seg))}</h2>
          <p>Expediente ${escapeHTML(amparo.expediente || "—")}</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        <label for="apModulo"><strong>Módulo de destino</strong></label>
        <select id="apModulo" class="mampd-envio-input">
          <option value="">Selecciona un módulo...</option>
          ${MODULOS_DESTINO.map((m) => `<option value="${escapeHTML(m)}">${escapeHTML(m)}</option>`).join("")}
        </select>
        <p class="mamp-note">Al enviarlo, el expediente se procesa en ese módulo y se da por finalizado en Amparos Directos.</p>
        <p class="mesas-form-error" id="apModuloError" hidden></p>
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="apModuloCancelar">Cancelar</button>
        <button type="button" class="mesas-modal-confirm" id="apModuloGuardar">
          <i class="fa-solid fa-check"></i> Enviar
        </button>
      </footer>
    </div>
  `);

  const modal = document.getElementById("apModuloModal");
  modal.querySelector("#apModuloCancelar").onclick = closeForm;
  modal.querySelector("#apModuloGuardar").onclick = () => {
    const modulo = modal.querySelector("#apModulo").value;
    if (!modulo) {
      const caja = modal.querySelector("#apModuloError");
      caja.textContent = "Selecciona el módulo de destino.";
      caja.hidden = false;
      return;
    }
    actualizarSeg(id, (s) => {
      const ahora = ahoraISO();
      const a = apDe(s);
      a.destino = modulo;
      a.enviadoModuloEn = ahora;
      a.finalizado = true;
      a.fase = "finalizado";
      s.etapa = "archivo"; // fin del flujo en Amparos Directos
      s.ubicacion = modulo;
      s.desde = ahora;
      logSeg(
        s,
        `Ampara y protege: caducidad sin efecto; enviado a ${modulo} (finaliza en Amparos Directos)`,
      );
    });
    closeForm();
    aviso = { tipo: "ok", texto: `El expediente se envió a ${modulo}.` };
    refrescar();
  };
}

// ------------------------------------------------------------
// REQUERIMIENTOS DEL TCC (solo en reposición): varios archivos
// ------------------------------------------------------------
function abrirRequerimientos(id, refrescar, errorInicial = "") {
  const datos = obtenerAmparo(id);
  if (!datos) return;
  const { amparo, seg } = datos;
  const lista = (seg.amparaProtege?.requerimientos || []).filter((r) =>
    tieneDoc(r),
  );

  showModal(`
    <div class="mesas-modal-shell mampd-cuad-modal" id="apReqModal">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-file-circle-exclamation"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Requerimientos del TCC · Amparo ${escapeHTML(identificadorAmparo(amparo, seg))}</h2>
          <p>Expediente ${escapeHTML(amparo.expediente || "—")}</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        <p class="mamp-note">
          Sube los requerimientos que lleguen del TCC. Puedes elegir varios archivos a la vez
          (.pdf o .docx, máximo ${DOCUMENTO_MAX_MB} MB cada uno).
        </p>
        <label class="mesas-secondary-btn mampd-upload-btn" for="apReqArchivos">
          <i class="fa-solid fa-paperclip"></i> Subir requerimientos
          <input type="file" id="apReqArchivos" accept=".pdf,.docx" multiple hidden>
        </label>
        ${
          lista.length
            ? `<ul class="mampd-cuad-docs">
                ${lista
                  .map(
                    (r) => `
                  <li class="mampd-cuad-doc ok">
                    <div class="mampd-cuad-doc-main">
                      <span class="mampd-cuad-check ok" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
                      <div>
                        <strong>${escapeHTML(r.archivo || "Documento")}</strong>
                        <small>${escapeHTML(r.subidoPor || "—")} · ${escapeHTML(formatFecha(r.subidoEn))}</small>
                      </div>
                    </div>
                    <div class="mampd-cuad-doc-actions">
                      <button type="button" class="mesas-secondary-btn" data-req-accion="ver" data-req-id="${escapeHTML(r.id)}">
                        <i class="fa-regular fa-eye"></i> Ver
                      </button>
                      <button type="button" class="mesas-secondary-btn" data-req-accion="descargar" data-req-id="${escapeHTML(r.id)}">
                        <i class="fa-solid fa-download"></i> Descargar
                      </button>
                      <button type="button" class="mesas-secondary-btn danger" data-req-accion="quitar" data-req-id="${escapeHTML(r.id)}">
                        <i class="fa-regular fa-trash-can"></i> Quitar
                      </button>
                    </div>
                  </li>`,
                  )
                  .join("")}
              </ul>`
            : `<p class="mamp-note">Aún no se han subido requerimientos.</p>`
        }
        <p class="mesas-fase6-error" id="apReqError" ${errorInicial ? "" : "hidden"}>${escapeHTML(errorInicial)}</p>
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="apReqCerrar">Cerrar</button>
      </footer>
    </div>
  `);

  const modal = document.getElementById("apReqModal");
  modal.querySelector("#apReqCerrar").onclick = () => {
    closeForm();
    refrescar();
  };

  modal.querySelector("#apReqArchivos").onchange = async (evento) => {
    const nuevos = [];
    const errores = [];
    for (const archivo of [...evento.target.files]) {
      const resultado = await guardarArchivo(archivo);
      if (resultado.ok) {
        nuevos.push({
          id: createId(),
          documentoId: resultado.documento.id,
          archivo: archivo.name,
          subidoEn: ahoraISO(),
          subidoPor: nombreUsuario(),
        });
      } else {
        errores.push(`${archivo.name}: ${resultado.error}`);
      }
    }
    if (nuevos.length) {
      actualizarSeg(id, (s) => {
        apDe(s).requerimientos.push(...nuevos);
        logSeg(
          s,
          `Ampara y protege: ${nuevos.length} requerimiento(s) del TCC cargado(s)`,
        );
      });
    }
    abrirRequerimientos(id, refrescar, errores.join(" "));
  };

  modal.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-req-accion]");
    if (!boton) return;
    const req = lista.find((r) => r.id === boton.dataset.reqId);
    if (!req) return;
    switch (boton.dataset.reqAccion) {
      case "ver":
        verRequerimiento(id, req, refrescar);
        break;
      case "descargar":
        descargarDocumento(req.documentoId);
        break;
      case "quitar":
        if (!window.confirm(`¿Quitar el requerimiento «${req.archivo}»?`))
          return;
        actualizarSeg(id, (s) => {
          const a = apDe(s);
          a.requerimientos = a.requerimientos.filter((r) => r.id !== req.id);
          logSeg(
            s,
            `Ampara y protege: requerimiento retirado (${req.archivo})`,
          );
        });
        borrarDocumento(req.documentoId);
        abrirRequerimientos(id, refrescar);
        break;
    }
  });
}

function verRequerimiento(id, req, refrescar) {
  showModal(`
    <div class="mesas-modal-shell mesas-plantilla-preview-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-regular fa-eye"></i></div>
        <div class="mesas-modal-header-text">
          <h2>${escapeHTML(req.archivo || "Requerimiento")}</h2>
          <p>Amparo ${escapeHTML(id)} · vista previa</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        ${htmlVistaPreviaDocumento({ documentoId: req.documentoId })}
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="apReqVolver">
          <i class="fa-solid fa-arrow-left"></i> Volver a requerimientos
        </button>
      </footer>
    </div>
  `);
  document.getElementById("apReqVolver").onclick = () =>
    abrirRequerimientos(id, refrescar);
  activarVistasPreviasDocumento(document.getElementById("modalContent"));
}

// ------------------------------------------------------------
// COMENTARIOS
// ------------------------------------------------------------
function abrirComentario(id, refrescar) {
  const datos = obtenerAmparo(id);
  if (!datos) return;
  const { amparo, seg } = datos;
  showModal(`
    <div class="mesas-modal-shell" id="apNotaModal">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-comment-dots"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Comentarios · Amparo ${escapeHTML(identificadorAmparo(amparo, seg))}</h2>
          <p>Expediente ${escapeHTML(amparo.expediente || "—")}</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        <textarea id="apNotaTexto" class="mampd-notas" rows="6"
          placeholder="Escribe tus comentarios...">${escapeHTML(seg.amparaProtege?.notas || "")}</textarea>
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="apNotaCancelar">Cancelar</button>
        <button type="button" class="mesas-primary-btn" id="apNotaGuardar">Guardar</button>
      </footer>
    </div>
  `);
  const modal = document.getElementById("apNotaModal");
  const texto = modal.querySelector("#apNotaTexto");
  texto.focus();
  texto.setSelectionRange(texto.value.length, texto.value.length);
  modal.querySelector("#apNotaCancelar").onclick = closeForm;
  modal.querySelector("#apNotaGuardar").onclick = () => {
    actualizarSeg(id, (s) => {
      apDe(s).notas = texto.value.trim();
    });
    closeForm();
    refrescar();
  };
}
