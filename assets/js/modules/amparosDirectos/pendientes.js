// ============================================================
// AMPAROS PENDIENTES DE REALIZAR (Amparos Directos)
// assets/js/modules/amparosDirectos/pendientes.js
//
// Aquí llegan los documentos que vienen directamente de Oficialía
// de Partes y es donde el usuario de Amparos Directos inicia sus
// tareas:
//   1. Tabla con los documentos y el EXPEDIENTE al que pertenecen.
//   2. "Generar radicación": elige una de tres opciones
//      (Con suspensión y subsistencia · Suspensión sin subsistencia ·
//      Sin suspensión por cosa juzgada), descarga la plantilla
//      correspondiente (Plantillas > Radicaciones > subcategoría) y,
//      si quiere, sube el documento (también se puede subir después).
//   3. "Generar lista": antes estaba en la pestaña Listas.
//   4. "Enviar a Actuaría": solo se habilita si el amparo ya tiene
//      radicación (tipo elegido Y documento subido) Y forma parte de
//      una lista. Por ahora solo cambia
//      la ubicación a ACTUARÍA (más adelante se une con otros módulos).
//
// Qué se considera pendiente ⚠️ (interpretación; fácil de cambiar en
// `esPendiente`):
//   - Documentos de Oficialía que la Mesa aún no recibe (sin seguimiento).
//     Al generar su radicación se reciben solos como "Radicación".
//   - Amparos directos recibidos en categoría Radicación, etapa
//     Acuerdo, que todavía no se envían a Actuaría.
//
// Datos nuevos dentro del seguimiento del amparo:
//   seg.radicacion = {
//     tipo, tipoEtiqueta, generadaEn, generadaPor,
//     documentoId?, archivo?, subidoEn?,        // documento subido
//     enviadaActuaria?, enviadaActuariaEn?
//   }
// ============================================================

import { escapeHTML } from "../../utils.js";

import { showModal, closeForm } from "../../forms/formHelper.js";

import { subcategoriasPlantillaAmparos } from "../mesas/catalogos.js";

import {
  htmlVistaPreviaDocumento,
  activarVistasPreviasDocumento,
  validarArchivoDocumento,
  leerComoDataUrl,
  guardarDocumento,
  borrarDocumento,
  DOCUMENTO_MAX_MB,
} from "../mesas/documentosFirma.js";

import { storePlantillasDirectos } from "./plantillasDirectos.js";

import {
  amparosDirectos,
  actualizarSeg,
  logSeg,
  nombreUsuario,
} from "./datos.js";

import { firmasDe, enviarAFirma, ESTADO_EN_FIRMA } from "./firma.js";

import {
  tieneRadicacion,
  htmlEncabezadoTabla,
  htmlCeldasDatos,
} from "./tablaAmparos.js";

import {
  crearLista,
  pendientesDeLista,
  puedeCrearListas,
  CATEGORIA_LISTA,
} from "./listas.js";

import { getData, saveData } from "../../storage.js";

// Categoría de las plantillas de radicación (catalogos.js)
const CATEGORIA_PLANTILLA_RADICACION = "radicaciones";

const ETAPA_PENDIENTE = "acuerdo";

let aviso = null; // { tipo: "ok" | "error", texto }

// ------------------------------------------------------------
// DATOS
// ------------------------------------------------------------
// Las tres opciones de radicación (mismas claves que las subcategorías
// de Plantillas > Radicaciones). Si el catálogo no las trae, se usan estas.
const TIPOS_RADICACION = [
  {
    clave: "con-suspension-subsistencia",
    etiqueta: "Con suspensión y subsistencia",
  },
  {
    clave: "suspension-sin-subsistencia",
    etiqueta: "Suspensión sin subsistencia",
  },
  {
    clave: "sin-suspension-cosa-juzgada",
    etiqueta: "Sin suspensión por cosa juzgada",
  },
];

function tiposRadicacion() {
  const catalogo = subcategoriasPlantillaAmparos(
    CATEGORIA_PLANTILLA_RADICACION,
  );

  return catalogo.length ? catalogo : TIPOS_RADICACION;
}

function esPendiente(seg) {
  return (
    seg.categoria === CATEGORIA_LISTA &&
    seg.etapa === ETAPA_PENDIENTE &&
    !seg.actuaria?.activo &&
    !seg.radicacion?.enviadaActuaria
  );
}

// [{ amparo, seg|null }]: primero los más antiguos.
function filasPendientes(deps) {
  const porRecibir = (deps.deOficialia?.() || []).map((amparo) => ({
    amparo,
    seg: null,
  }));

  const recibidos = amparosDirectos().filter(({ seg }) => esPendiente(seg));

  return [...porRecibir, ...recibidos].sort((a, b) =>
    String(a.amparo.dia || "").localeCompare(String(b.amparo.dia || "")),
  );
}

// Lo que falta para poder enviar a Actuaría ([] = ya se puede).
// "Tener radicación" exige haber subido el documento de la radicación.
function faltaParaActuaria(seg) {
  const falta = [];

  if (!tieneRadicacion(seg)) {
    falta.push(
      seg?.radicacion?.tipo
        ? "subir el documento de la radicación"
        : "generar la radicación y subir su documento",
    );
  }

  if (!firmasDe(seg).some((firma) => firma.listaId)) {
    falta.push("formar parte de una lista");
  }

  return falta;
}

function descargarArchivo(dataUrl, nombre) {
  const enlace = document.createElement("a");

  enlace.href = dataUrl;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
}

// ------------------------------------------------------------
// RENDER
// ------------------------------------------------------------
export function renderPendientesDirectos(host, deps = {}) {
  if (!host) return;

  const refrescar = () =>
    deps.alCambiar ? deps.alCambiar() : renderPendientesDirectos(host, deps);

  const filas = filasPendientes(deps);

  const mensaje = aviso;

  aviso = null;

  const puedeCrear = puedeCrearListas();

  const porListar = pendientesDeLista().length;

  host.innerHTML = `
    <section class="mesas-fase4-section">
      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Oficialía de Partes</span>
          <h2>Amparos pendientes de realizar</h2>
          <p>
            Documentos que llegan de Oficialía de Partes. Genera la radicación,
            inclúyela en una lista y, cuando cumpla ambas condiciones, envíala a Actuaría.
          </p>
        </div>
        <div class="mesas-actions">
          <button type="button" class="mesas-secondary-btn" data-pend-action="demo">
            <i class="fa-solid fa-flask"></i> Cargar datos de prueba
          </button>
          ${
            puedeCrear
              ? `<button type="button" class="mesas-primary-btn" data-pend-action="lista"
                   ${porListar ? "" : "disabled"}
                   title="${porListar ? "Crear la lista con lo firmado pendiente de listar" : "No hay documentos firmados pendientes de listar"}">
                   <i class="fa-solid fa-list-check"></i> Generar lista
                   ${porListar ? `<span class="mampd-pend-count">${porListar}</span>` : ""}
                 </button>`
              : ""
          }
        </div>
      </div>

      ${
        mensaje
          ? `<p class="${mensaje.tipo === "ok" ? "mesas-fase6-notice" : "mesas-fase6-error"}">${escapeHTML(mensaje.texto)}</p>`
          : ""
      }

      <section class="mesas-secretaria-table-card">
        ${
          filas.length
            ? `
        <div class="mesas-table-wrapper">
          <table class="mesas-secretaria-table mampd-pend-table">
            ${htmlEncabezadoTabla()}
            <tbody>${filas.map((fila) => htmlFila(fila, puedeCrear)).join("")}</tbody>
          </table>
        </div>`
            : `
        <div class="mesas-empty-state">
          <div class="mesas-empty-icon"><i class="fa-solid fa-clipboard-list"></i></div>
          <strong>No hay amparos pendientes de realizar</strong>
          <span>Los documentos que lleguen de Oficialía de Partes aparecerán aquí.</span>
        </div>`
        }
      </section>
    </section>
  `;

  host.onclick = (evento) => {
    const boton = evento.target.closest("[data-pend-action]");

    if (!boton || boton.disabled) return;

    const id = boton.dataset.amparoId;

    switch (boton.dataset.pendAction) {
      case "lista": {
        const resultado = crearLista();

        aviso = resultado.ok
          ? {
              tipo: "ok",
              texto: `Se generó la lista #${resultado.lista.numero}.`,
            }
          : { tipo: "error", texto: resultado.error };

        refrescar();

        break;
      }

      case "demo":
        cargarDatosPrueba(deps);

        aviso = { tipo: "ok", texto: "Se cargaron datos de prueba." };

        refrescar();

        break;

      case "radicacion":
        abrirRadicacion({ id, filas, deps, refrescar });

        break;

      case "ver-radicacion":
        verDocumentoRadicacion(boton.dataset.docId, id);

        break;

      case "firma": {
        const rad = filas.find((f) => String(f.amparo.id) === String(id))?.seg
          ?.radicacion;

        // El documento de la radicación ya cuenta: no se vuelve a pedir.
        enviarAFirma(id, {
          alTerminar: refrescar,
          documento: rad?.documentoId
            ? { documentoId: rad.documentoId, archivo: rad.archivo }
            : null,
        });

        break;
      }

      case "actuaria":
        enviarAActuaria(id, refrescar);

        break;
    }
  };
}

function htmlFila({ amparo, seg }, puedeActuar) {
  const id = escapeHTML(amparo.id);

  const rad = seg?.radicacion;

  const falta = faltaParaActuaria(seg);

  const enFirma = firmasDe(seg).some((f) => f.estado === ESTADO_EN_FIRMA);

  const radicada = tieneRadicacion(seg);

  return `
    <tr>
      ${htmlCeldasDatos({ amparo, seg })}
      <td>
        ${
          puedeActuar
            ? `<div class="mesas-actions mampd-pend-actions">
                <button type="button" class="mesas-primary-btn" data-pend-action="radicacion" data-amparo-id="${id}">
                  <i class="fa-solid fa-file-signature"></i> ${rad?.tipo ? "Radicación" : "Generar radicación"}
                </button>
                ${
                  rad?.documentoId
                    ? `<button type="button" class="mesas-secondary-btn" data-pend-action="ver-radicacion" data-amparo-id="${id}" data-doc-id="${escapeHTML(rad.documentoId)}">
                         <i class="fa-regular fa-eye"></i> Ver documento
                       </button>`
                    : ""
                }
                <button type="button" class="mesas-secondary-btn" data-pend-action="firma" data-amparo-id="${id}"
                  ${radicada && !enFirma ? "" : "disabled"}
                  title="${radicada ? (enFirma ? "Ya hay un documento esperando la firma de la Magistrada" : "Enviar documento a firma de la Magistrada") : "Primero genera la radicación y sube su documento"}">
                  <i class="fa-solid fa-paper-plane"></i> Enviar a firma
                </button>
                <button type="button" class="mesas-primary-btn" data-pend-action="actuaria" data-amparo-id="${id}"
                  ${falta.length ? "disabled" : ""}
                  title="${falta.length ? `Falta: ${escapeHTML(falta.join(" y "))}` : "Cambiar la ubicación a Actuaría"}">
                  <i class="fa-solid fa-truck-fast"></i> Enviar a Actuaría
                </button>
              </div>`
            : "—"
        }
      </td>
    </tr>`;
}

// ------------------------------------------------------------
// MODAL: GENERAR RADICACIÓN
// ------------------------------------------------------------
function abrirRadicacion({ id, filas, deps, refrescar }) {
  const fila = filas.find((item) => String(item.amparo.id) === String(id));

  if (!fila) return;

  const { amparo, seg } = fila;

  const previa = seg?.radicacion || null;

  const tipos = tiposRadicacion();

  let tipoElegido = previa?.tipo || "";

  showModal(`
    <div class="mesas-modal-shell mampd-rad-modal">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-file-signature"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Generar radicación</h2>
          <p>Amparo ${escapeHTML(amparo.id)} · Expediente ${escapeHTML(amparo.expediente || "—")}</p>
        </div>
      </header>

      <div class="mesas-modal-body">
        <p class="mampd-rad-titulo">Selecciona el tipo de radicación</p>

        <div class="mampd-rad-opciones">
          ${tipos
            .map(
              (tipo) => `
            <label class="mampd-rad-opcion">
              <input type="radio" name="mampdRadTipo" value="${escapeHTML(tipo.clave)}"
                ${tipo.clave === tipoElegido ? "checked" : ""}>
              <span>${escapeHTML(tipo.etiqueta)}</span>
            </label>`,
            )
            .join("")}
        </div>

        <section class="mampd-rad-seccion" id="mampdRadPlantillas" hidden></section>

        <section class="mampd-rad-seccion" id="mampdRadSubir" hidden>
          <strong>Documento de la radicación</strong>
          <p class="mamp-note">
            Puedes subirlo ahora o más tarde (.pdf o .docx, máximo ${DOCUMENTO_MAX_MB} MB).
            <strong>Sin el documento no se considera que el amparo tiene radicación ni se puede enviar a Actuaría.</strong>
            ${previa?.documentoId ? `Ya hay uno subido (${escapeHTML(previa.archivo || "documento")}); si eliges otro, lo reemplaza.` : ""}
          </p>
          <input type="file" id="mampdRadArchivo" accept=".pdf,.docx">
        </section>
                ${
                  previa?.documentoId
                    ? `<section class="mampd-rad-seccion">
          <strong>Documento subido</strong>
          ${htmlVistaPreviaDocumento({ documentoId: previa.documentoId })}
        </section>`
                    : ""
                }

        <p class="mesas-fase6-error" id="mampdRadError" hidden></p>
      </div>

      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="mampdRadCancelar">Cancelar</button>
        <button type="button" class="mesas-modal-confirm" id="mampdRadGuardar">
          <i class="fa-solid fa-check"></i> ${previa?.tipo ? "Guardar cambios" : "Generar radicación"}
        </button>
      </footer>
    </div>
  `);

  const $ = (idElemento) => document.getElementById(idElemento);
  activarVistasPreviasDocumento(document.getElementById("modalContent"));

  const error = (texto) => {
    $("mampdRadError").textContent = texto;
    $("mampdRadError").hidden = !texto;
  };

  const pintarPlantillas = () => {
    const caja = $("mampdRadPlantillas");

    $("mampdRadSubir").hidden = !tipoElegido;
    caja.hidden = !tipoElegido;

    if (!tipoElegido) return;

    const todas = storePlantillasDirectos.listar({
      categoria: CATEGORIA_PLANTILLA_RADICACION,
    });

    const especificas = todas.filter((p) => p.subcategoria === tipoElegido);

    // Subidas a Radicaciones sin elegir subcategoría: sirven para cualquiera.
    const generales = todas.filter((p) => !p.subcategoria);

    const filaPlantilla = (p) => `
      <div class="mampd-rad-plantilla">
        <span><i class="fa-regular fa-file-lines"></i> ${escapeHTML(p.nombre)}
          <small>${escapeHTML(p.nombreArchivo || "")}</small></span>
        <button type="button" class="mesas-secondary-btn" data-rad-plantilla="${escapeHTML(p.id)}">
          <i class="fa-solid fa-download"></i> Descargar
        </button>
      </div>`;

    caja.innerHTML = `
      <strong>Plantilla</strong>
      ${especificas.map(filaPlantilla).join("")}
      ${
        generales.length
          ? `<small class="mamp-note">Plantillas generales de radicación (sin subcategoría)</small>
             ${generales.map(filaPlantilla).join("")}`
          : ""
      }
      ${
        !especificas.length
          ? `<p class="mamp-note">${
              generales.length
                ? "No hay una plantilla específica para esta opción; puedes usar una general."
                : "No hay una plantilla cargada para esta opción. Súbela en Plantillas › Radicaciones eligiendo esta subcategoría."
            }</p>`
          : ""
      }`;

    caja.querySelectorAll("[data-rad-plantilla]").forEach((boton) => {
      boton.onclick = () => {
        const plantilla = storePlantillasDirectos.obtener(
          boton.dataset.radPlantilla,
        );

        if (plantilla) {
          descargarArchivo(
            plantilla.dataUrl,
            plantilla.nombreArchivo ||
              `${plantilla.nombre}.${plantilla.tipoArchivo}`,
          );
        }
      };
    });
  };

  document.querySelectorAll("input[name='mampdRadTipo']").forEach((radio) => {
    radio.onchange = () => {
      tipoElegido = radio.value;

      error("");

      pintarPlantillas();
    };
  });

  pintarPlantillas();

  $("mampdRadCancelar").onclick = closeForm;

  $("mampdRadGuardar").onclick = async () => {
    if (!tipoElegido) {
      error("Selecciona una de las tres opciones de radicación.");

      return;
    }

    const archivo = $("mampdRadArchivo").files[0];

    let documento = null;

    if (archivo) {
      const problema = validarArchivoDocumento(archivo);

      if (problema) {
        error(problema);

        return;
      }

      try {
        const resultado = guardarDocumento({
          archivo,
          dataUrl: await leerComoDataUrl(archivo),
        });

        if (!resultado.ok) {
          error(
            resultado.error === "cuota"
              ? "No hay espacio en el navegador para guardar el documento."
              : "No se pudo guardar el documento.",
          );

          return;
        }

        documento = resultado.documento;
      } catch (fallo) {
        console.error(fallo);

        error("No se pudo leer el archivo.");

        return;
      }
    }

    // Documento de Oficialía aún sin recibir: se recibe como Radicación.
    if (!seg) deps.recibir?.(amparo.id, CATEGORIA_LISTA);

    const etiqueta =
      tipos.find((t) => t.clave === tipoElegido)?.etiqueta || tipoElegido;

    const guardado = actualizarSeg(amparo.id, (s) => {
      const antes = s.radicacion || {};

      const ahora = new Date().toISOString();

      // No se borra el anterior si ya se mandó a firma (la firma lo usa).
      if (
        documento &&
        antes.documentoId &&
        !firmasDe(s).some((f) => f.documentoId === antes.documentoId)
      ) {
        borrarDocumento(antes.documentoId);
      }

      s.radicacion = {
        ...antes,
        tipo: tipoElegido,
        tipoEtiqueta: etiqueta,
        generadaEn: antes.generadaEn || ahora,
        generadaPor: antes.generadaPor || nombreUsuario(),
        ...(documento
          ? {
              documentoId: documento.id,
              archivo: documento.nombre,
              subidoEn: ahora,
            }
          : {}),
      };

      logSeg(
        s,
        `${antes.tipo ? "Radicación actualizada" : "Radicación generada"}: ${etiqueta}` +
          (documento ? ` (documento ${documento.nombre})` : ""),
      );
    });

    if (!guardado) {
      error("No se encontró el seguimiento del amparo.");

      return;
    }

    aviso = {
      tipo: "ok",
      texto:
        documento || previa?.documentoId
          ? `Radicación guardada: ${etiqueta}.`
          : `Radicación guardada: ${etiqueta}. Falta subir el documento para que cuente como radicación.`,
    };

    closeForm();

    refrescar();
  };
}

// ------------------------------------------------------------
// ENVIAR A ACTUARÍA
// Solo cambia la ubicación (D-11: seg.actuaria.activo = ubicación
// "Actuaría"). Más adelante se une con el módulo de Actuaría.
// ------------------------------------------------------------
function enviarAActuaria(id, refrescar) {
  const filaSeg = amparosDirectos().find(
    ({ amparo }) => String(amparo.id) === String(id),
  );

  const falta = faltaParaActuaria(filaSeg?.seg);

  if (!filaSeg || falta.length) {
    aviso = { tipo: "error", texto: `Falta ${falta.join(" y ")}.` };

    refrescar();

    return;
  }

  actualizarSeg(id, (seg) => {
    const ahora = new Date().toISOString();

    seg.actuaria = {
      activo: true,
      desde: ahora,
      motivo: "Notificación de radicación",
      etapaOrigen: seg.etapa,
    };

    seg.ubicacion = "Actuaría";

    seg.radicacion = {
      ...seg.radicacion,
      enviadaActuaria: true,
      enviadaActuariaEn: ahora,
    };

    logSeg(seg, "Enviado a Actuaría (radicación en lista)");
  });

  aviso = { tipo: "ok", texto: `El amparo ${id} se envió a Actuaría.` };

  refrescar();
}

// ------------------------------------------------------------
// DATOS DE PRUEBA para "Amparos pendientes de realizar"
// Cada caso queda en un punto distinto del proceso.
// ------------------------------------------------------------
const DEMO_PENDIENTES = [
  {
    n: "P1",
    prom: "MARTHA ELENA CORTÉS",
    acto: "Laudo condenatorio",
    paso: "oficialia",
  },
  {
    n: "P2",
    prom: "RICARDO LÓPEZ VEGA",
    acto: "Laudo absolutorio",
    paso: "oficialia",
  },
  {
    n: "P3",
    prom: "SANDRA PATRICIA NAVA",
    acto: "Laudo definitivo",
    paso: "sin-documento",
  },
  {
    n: "P4",
    prom: "JORGE ALBERTO PRECIADO",
    acto: "Laudo condenatorio",
    paso: "con-documento",
  },
  {
    n: "P5",
    prom: "LUCÍA FERNANDA OROZCO",
    acto: "Laudo absolutorio",
    paso: "firmado",
  },
  {
    n: "P6",
    prom: "MIGUEL ÁNGEL RÍOS",
    acto: "Laudo definitivo",
    paso: "en-lista",
  },
];

const DEMANDADOS_DEMO = [
  "H. AYTO. COLIMA",
  "SERVICIOS DE SALUD DEL ESTADO",
  "H. AYTO. VILLA DE ÁLVAREZ",
  "SECRETARÍA DE EDUCACIÓN",
  "H. AYTO. MANZANILLO",
  "H. AYTO. TECOMÁN",
];

function cargarDatosPrueba(deps) {
  const tipos = tiposRadicacion();

  const amparos = getData("amparos", []);

  const lista = Array.isArray(amparos) ? amparos : [];

  DEMO_PENDIENTES.forEach((item, indice) => {
    const id = `AMP-${item.n}`;

    if (lista.some((a) => a.id === id)) return;

    const dia = new Date(Date.now() - (indice + 1) * 86400000);

    lista.push({
      id,
      dia: dia.toISOString().slice(0, 10),
      hora: "09:00",
      expediente: `${320 + indice}/2026`,
      promovente: item.prom,
      actor: `C. ${item.prom}`,
      demandado: DEMANDADOS_DEMO[indice],
      juzgado: "Tribunal Colegiado en Materia de Trabajo",
      oficio: `TAE-SA-${420 + indice}/2026`,
      actoReclamado: item.acto,
      acciones: "",
      observaciones: "Amparo directo",
      estado: "En trámite",
      creadoEn: dia.toISOString(),
    });

    saveData("amparos", lista);

    // P1 y P2 se quedan en Oficialía (aún sin recibir).
    if (item.paso === "oficialia") return;

    deps.recibir?.(id, CATEGORIA_LISTA);

    const tipo = tipos[indice % tipos.length];

    const ahora = new Date().toISOString();

    actualizarSeg(id, (seg) => {
      seg.radicacion = {
        tipo: tipo.clave,
        tipoEtiqueta: tipo.etiqueta,
        generadaEn: ahora,
        generadaPor: "Demostración",
      };

      // P3: elegida la opción pero sin documento subido.
      if (item.paso === "sin-documento") return;

      const doc = sembrarDocumentoDemo("demanda", `demo-doc-rad-${id}`, {
        nombreBase: `radicacion_${id}`,
        concepto: "Radicación",
      });

      seg.radicacion.documentoId = doc?.documentoId;

      seg.radicacion.archivo = doc?.archivo;

      seg.radicacion.subidoEn = ahora;

      // P4: documento subido, aún sin enviar a firma.
      if (item.paso === "con-documento") return;

      const docFirma = sembrarDocumentoDemo("demanda", `demo-doc-firma-${id}`, {
        nombreBase: `acuerdo_${id}`,
        concepto: "Acuerdo de radicación",
      });

      // P5: firmado, pendiente de lista. P6: firmado y ya listado.
      seg.firmas = [
        {
          id: `demo-firma-${id}`,
          documentoId: docFirma?.documentoId,
          archivo: docFirma?.archivo,
          estadoProcesal: "RADICACIÓN A.D. PARTE ACTORA",
          fojas: 90 + indice * 10,
          estado: "firmado",
          enviadoEn: ahora,
          enviadoPor: "Demostración",
          firmadoEn: ahora,
          firmadoPor: "Magistrada",
          ...(item.paso === "en-lista"
            ? { listaId: `demo-lista-${id}`, listaNumero: 200 + indice }
            : {}),
        },
      ];
    });
  });
}

// ------------------------------------------------------------
// VER DOCUMENTO de la radicación (vista previa; trae su botón Descargar)
// ------------------------------------------------------------
function verDocumentoRadicacion(documentoId, amparoId) {
  showModal(`
    <div class="mesas-modal-shell mesas-plantilla-preview-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-regular fa-eye"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Documento de la radicación</h2>
          <p>Amparo ${escapeHTML(amparoId)} · vista previa</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        ${htmlVistaPreviaDocumento({ documentoId })}
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="mampdVerRadCerrar">Cerrar</button>
      </footer>
    </div>
  `);

  document.getElementById("mampdVerRadCerrar").onclick = closeForm;

  activarVistasPreviasDocumento(document.getElementById("modalContent"));
}
