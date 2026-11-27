// ============================================================
// PENDIENTE DE ENVIAR AL TCC (Amparos Directos)
// assets/js/modules/amparosDirectos/tcc.js
//
// Aquí llegan los documentos una vez procesados por Actuaría
// (etapa "Informe Justificado" y fuera de Actuaría). El módulo de
// Actuaría aún no existe: hoy se trabaja con DATOS DE PRUEBA como si
// ya hubieran llegado (botones "Cargar datos de prueba" y "Simular
// llegada desde Actuaría"). Al migrar, la llegada la hará Actuaría.
//
//   - Misma tabla que "Amparos pendientes de realizar" (tablaAmparos.js);
//     solo cambian las acciones.
//   - "Gestionar informe justificado" abre el modal donde se sube el
//     documento del Informe Justificado (la misma sección del
//     cuadernillo: lo subido aquí cuenta allá).
//   - "Enviar al TCC" se habilita con el documento del informe subido y
//     lo pasa a la etapa de Resolución (Tribunal Colegiado).
//   - Al llegar se avisa que hay 3 DÍAS HÁBILES para presentar el informe.
//     La alerta se puede posponer 24 h, 48 h, 3 días o 1 semana, o
//     desactivar (con confirmación).
//
// Datos en el seguimiento del amparo:
//   seg.tcc = { llegadaEn?, alerta: { activa, pospuestaHasta?, desactivadaEn? } }
//   (si no hay llegadaEn se usa seg.desde: cuando pasó a Informe)
// ============================================================

import { getData, saveData } from "../../storage.js";

import { escapeHTML } from "../../utils.js";

import { showModal, closeForm } from "../../forms/formHelper.js";

import { sembrarDocumentoDemo } from "../mesas/documentosFirma.js";

import {
  amparosDirectos,
  obtenerAmparo,
  actualizarSeg,
  logSeg,
} from "./datos.js";

import { abrirCuadernillo, seccionCumplida } from "./cuadernillo.js";

import {
  DIAS_INFORME_TCC,
  htmlEncabezadoTabla,
  htmlCeldasDatos,
  venceInforme,
  textoVencimiento,
} from "./tablaAmparos.js";

export const OPCIONES_POSPONER = [
  { horas: 24, etiqueta: "24 horas" },
  { horas: 48, etiqueta: "48 horas" },
  { horas: 72, etiqueta: "3 días" },
  { horas: 168, etiqueta: "1 semana" },
];

// Sección del cuadernillo donde se sube el informe justificado.
const SECCION_INFORME = "informe-justificado";

const SECCION_CERTIFICACION = "certificacion";

let aviso = null; // { tipo: "ok" | "error", texto }

// ------------------------------------------------------------
// DATOS
// ------------------------------------------------------------

// Documentos que ya regresaron de Actuaría y esperan el informe.
// [{ amparo, seg }], primero los que vencen antes.
export function registrosTcc() {
  return amparosDirectos()
    .filter(
      ({ seg }) =>
        seg.etapa === "informe" &&
        !seg.actuaria?.activo &&
        !seg.informe?.enviado,
    )
    .sort(
      (a, b) =>
        (venceInforme(a.seg)?.getTime() ?? 0) -
        (venceInforme(b.seg)?.getTime() ?? 0),
    );
}

// ¿Hay que mostrar el aviso de este registro ahora?
export function alertaVisible(seg, ahora = Date.now()) {
  const alerta = seg?.tcc?.alerta;

  if (alerta?.activa === false) return false;

  const hasta = alerta?.pospuestaHasta ? Date.parse(alerta.pospuestaHasta) : 0;

  return !hasta || ahora >= hasta;
}

export function totalAlertasTcc() {
  return registrosTcc().filter(({ seg }) => alertaVisible(seg)).length;
}

// Amparos enviados a Actuaría desde "pendientes de realizar".
function enActuariaDePendientes() {
  return amparosDirectos().filter(
    ({ seg }) => seg.actuaria?.activo && seg.radicacion?.enviadaActuaria,
  );
}

// ------------------------------------------------------------
// RENDER
// ------------------------------------------------------------
export function renderTccDirectos(host, deps = {}) {
  if (!host) return;

  const refrescar = () =>
    deps.alCambiar ? deps.alCambiar() : renderTccDirectos(host, deps);

  const filas = registrosTcc();

  const conAlerta = filas.filter(({ seg }) => alertaVisible(seg));

  const simulables = enActuariaDePendientes().length;

  const mensaje = aviso;

  aviso = null;

  host.innerHTML = `
    <section class="mesas-fase4-section">
      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Actuaría</span>
          <h2>Pendiente de enviar al TCC</h2>
          <p>
            Documentos que regresan de Actuaría. Tienes ${DIAS_INFORME_TCC} días hábiles para
            presentar el informe justificado al Tribunal Colegiado.
          </p>
        </div>
        <div class="mesas-actions">
          <button type="button" class="mesas-secondary-btn" data-tcc-action="simular"
            ${simulables ? "" : "disabled"}
            title="${simulables ? "Prueba: trae aquí lo que se envió a Actuaría" : "No hay amparos enviados a Actuaría desde Pendientes de realizar"}">
            <i class="fa-solid fa-flask"></i> Simular llegada desde Actuaría${simulables ? ` (${simulables})` : ""}
          </button>
          <button type="button" class="mesas-secondary-btn" data-tcc-action="demo">
            <i class="fa-solid fa-flask"></i> Cargar datos de prueba
          </button>
        </div>
      </div>

      ${
        mensaje
          ? `<p class="${mensaje.tipo === "ok" ? "mesas-fase6-notice" : "mesas-fase6-error"}">${escapeHTML(mensaje.texto)}</p>`
          : ""
      }

            <div class="mampd-tcc-layout">
      <aside class="mampd-tcc-panel" aria-label="Notificaciones">
        <header class="mampd-tcc-panel-header">
          <strong><i class="fa-solid fa-bell"></i> Notificaciones</strong>
          <span class="mampd-tcc-panel-count">${conAlerta.length}</span>
        </header>
        <div class="mampd-tcc-panel-lista">
          ${
            conAlerta.length
              ? conAlerta.map(htmlAlerta).join("")
              : `<p class="mampd-tcc-panel-vacio">Sin notificaciones pendientes.</p>`
          }
        </div>
      </aside>

      <section class="mesas-secretaria-table-card">
        ${
          filas.length
            ? `
        <div class="mesas-table-wrapper">
          <table class="mesas-secretaria-table mampd-pend-table">
            ${htmlEncabezadoTabla()}
            <tbody>${filas.map(htmlFila).join("")}</tbody>
          </table>
        </div>`
            : `
        <div class="mesas-empty-state">
          <div class="mesas-empty-icon"><i class="fa-solid fa-building-columns"></i></div>
          <strong>No hay documentos pendientes de enviar al TCC</strong>
          <span>Los documentos que regresen de Actuaría aparecerán aquí. Mientras ese módulo no esté listo, puedes cargar datos de prueba.</span>
        </div>`
        }
      </section>
      </div>
    </section>
  `;

  host.onclick = (evento) => {
    const boton = evento.target.closest("[data-tcc-action]");

    if (!boton || boton.disabled) return;

    const id = boton.dataset.amparoId;

    switch (boton.dataset.tccAction) {
      case "gestionar":
        abrirCuadernillo(id, {
          soloSeccion: SECCION_INFORME,
          alCambiar: refrescar,
        });

        break;

      case "gestionar-certificacion":
        abrirCuadernillo(id, {
          soloSeccion: SECCION_CERTIFICACION,
          alCambiar: refrescar,
        });
        break;

      case "enviar-tcc": {
        const resultado = enviarAlTcc(id);
        aviso = resultado.ok
          ? {
              tipo: "ok",
              texto: resultado.informePendiente
                ? `Amparo ${id} enviado al TCC. El informe justificado quedó pendiente.`
                : `Amparo ${id} enviado al Tribunal Colegiado con su informe.`,
            }
          : {
              tipo: "error",
              texto: "Sube primero la certificación para enviarlo al TCC.",
            };
        refrescar();
        break;
      }

      case "posponer":
        cambiarAlerta(id, (alerta) => {
          alerta.activa = true;

          alerta.pospuestaHasta = new Date(
            Date.now() + Number(boton.dataset.horas) * 3600000,
          ).toISOString();
        });

        aviso = {
          tipo: "ok",
          texto: `Alerta pospuesta ${boton.dataset.etiqueta}.`,
        };

        refrescar();

        break;

      case "desactivar":
        confirmarDesactivar(id, filas, () => {
          cambiarAlerta(id, (alerta) => {
            alerta.activa = false;

            alerta.pospuestaHasta = null;

            alerta.desactivadaEn = new Date().toISOString();
          });

          aviso = { tipo: "ok", texto: "Alerta desactivada." };

          refrescar();
        });

        break;

      case "reactivar":
        cambiarAlerta(id, (alerta) => {
          alerta.activa = true;

          alerta.pospuestaHasta = null;

          delete alerta.desactivadaEn;
        });

        refrescar();

        break;

      case "demo":
        cargarDatosPrueba(deps);

        aviso = {
          tipo: "ok",
          texto: "Se cargaron datos de prueba como si llegaran de Actuaría.",
        };

        refrescar();

        break;

      case "simular":
        simularLlegadas(deps);

        aviso = {
          tipo: "ok",
          texto: "Los documentos enviados a Actuaría llegaron a esta pestaña.",
        };

        refrescar();

        break;
    }
  };
}

function htmlFila({ amparo, seg }) {
  const id = escapeHTML(amparo.id);
  const desactivada = seg.tcc?.alerta?.activa === false;
  const informeListo = seccionCumplida(seg, SECCION_INFORME);
  const certificacionLista = seccionCumplida(seg, SECCION_CERTIFICACION);

  return `
    <tr>
      ${htmlCeldasDatos({ amparo, seg })}
      <td>
        <div class="mesas-actions mampd-pend-actions">
          <button type="button" class="mesas-secondary-btn" data-tcc-action="gestionar-certificacion" data-amparo-id="${id}">
            <i class="fa-solid fa-stamp"></i> ${certificacionLista ? "Ver certificación" : "Subir certificación"}
          </button>
          <button type="button" class="mesas-primary-btn" data-tcc-action="gestionar" data-amparo-id="${id}">
            <i class="fa-solid fa-file-lines"></i> Gestionar informe justificado
          </button>
          <button type="button" class="mesas-primary-btn" data-tcc-action="enviar-tcc" data-amparo-id="${id}"
            ${certificacionLista ? "" : "disabled"}
            title="${
              certificacionLista
                ? informeListo
                  ? "Enviar al Tribunal Colegiado"
                  : "Se enviará con el informe justificado pendiente"
                : "Primero sube la certificación"
            }">
            <i class="fa-solid fa-paper-plane"></i> Enviar al TCC
          </button>
          ${
            certificacionLista && !informeListo
              ? `<small class="mampd-pend-sub">Informe justificado pendiente</small>`
              : ""
          }
          ${
            desactivada
              ? `<button type="button" class="mesas-secondary-btn" data-tcc-action="reactivar" data-amparo-id="${id}">
                 <i class="fa-regular fa-bell"></i> Reactivar alerta
               </button>`
              : ""
          }
        </div>
      </td>
    </tr>`;
}
// Notificación de los 3 días hábiles (tarjeta del panel izquierdo).
function htmlAlerta({ amparo, seg }) {
  const id = escapeHTML(amparo.id);

  const vencida = (venceInforme(seg)?.getTime() ?? Infinity) <= Date.now();

  return `
    <article class="mampd-tcc-alerta ${vencida ? "vencida" : ""}">
      <div class="mampd-tcc-alerta-cabecera">
        <i class="fa-solid ${vencida ? "fa-circle-exclamation" : "fa-bell"}"></i>
        <div>
          <strong>Amparo ${id}</strong>
          <small>Expediente ${escapeHTML(amparo.expediente || "—")}</small>
        </div>
      </div>

      <p class="mampd-tcc-alerta-texto">
        ${
          vencida
            ? `El plazo de ${DIAS_INFORME_TCC} días hábiles para presentar el informe justificado ya venció.`
            : `Se tienen ${DIAS_INFORME_TCC} días hábiles para presentar el informe justificado.`
        }
      </p>

      <span class="mampd-tcc-alerta-fecha">${escapeHTML(textoVencimiento(seg))}</span>

      <div class="mampd-tcc-alerta-acciones">
        <span>Posponer</span>
        <div class="mampd-tcc-alerta-botones">
          ${OPCIONES_POSPONER.map(
            (opcion) => `
          <button type="button" class="mesas-secondary-btn" data-tcc-action="posponer"
            data-amparo-id="${id}" data-horas="${opcion.horas}" data-etiqueta="${escapeHTML(opcion.etiqueta)}">
            ${escapeHTML(opcion.etiqueta)}
          </button>`,
          ).join("")}
        </div>
        <button type="button" class="mesas-secondary-btn mampd-tcc-desactivar" data-tcc-action="desactivar" data-amparo-id="${id}">
          <i class="fa-solid fa-bell-slash"></i> Desactivar alerta
        </button>
      </div>
    </article>`;
}

// Pasa el amparo a la etapa de Resolución (Tribunal Colegiado), igual que
// el envío del informe que ya existía en el modal del amparo.
function enviarAlTcc(id) {
  const datos = obtenerAmparo(id);

  // Candado real, no solo el botón deshabilitado
  if (!datos || !seccionCumplida(datos.seg, SECCION_CERTIFICACION)) {
    return { ok: false };
  }

  const informePendiente = !seccionCumplida(datos.seg, SECCION_INFORME);

  actualizarSeg(id, (seg) => {
    const ahora = new Date().toISOString();

    if (seg.informe && !informePendiente) {
      seg.informe.enviado = true;
      seg.informe.enviadoEn = ahora;
    }

    seg.tcc = seg.tcc && typeof seg.tcc === "object" ? seg.tcc : {};
    seg.tcc.informePendiente = informePendiente;
    seg.etapa = "resolucion";
    seg.desde = ahora;

    logSeg(
      seg,
      informePendiente
        ? "Enviado al Tribunal Colegiado con certificación; informe justificado pendiente"
        : "Certificación e Informe Justificado enviados al Tribunal Colegiado de Circuito",
    );
  });

  return { ok: true, informePendiente };
}

function cambiarAlerta(id, fn) {
  actualizarSeg(id, (seg) => {
    seg.tcc = seg.tcc && typeof seg.tcc === "object" ? seg.tcc : {};

    seg.tcc.alerta = seg.tcc.alerta || { activa: true, pospuestaHasta: null };

    fn(seg.tcc.alerta);
  });
}

function confirmarDesactivar(id, filas, alConfirmar) {
  const amparo = filas.find((f) => String(f.amparo.id) === String(id))?.amparo;

  showModal(`
    <div class="mesas-modal-shell">
      <header class="mesas-modal-header">
        <div class="mesas-modal-step"><i class="fa-solid fa-bell-slash"></i></div>
        <div class="mesas-modal-header-text">
          <h2>Desactivar alerta</h2>
          <p>Amparo ${escapeHTML(id)} · Expediente ${escapeHTML(amparo?.expediente || "—")}</p>
        </div>
      </header>
      <div class="mesas-modal-body">
        <p>
          Dejarás de ver el aviso del plazo de ${DIAS_INFORME_TCC} días hábiles para presentar el
          informe justificado de este amparo. El plazo sigue corriendo aunque no se avise.
          ¿Seguro que quieres desactivarla?
        </p>
      </div>
      <footer class="mesas-modal-footer">
        <button type="button" class="mesas-modal-cancel" id="mampdTccNo">Cancelar</button>
        <button type="button" class="mesas-modal-confirm" id="mampdTccSi">
          <i class="fa-solid fa-bell-slash"></i> Sí, desactivar
        </button>
      </footer>
    </div>
  `);

  document.getElementById("mampdTccNo").onclick = closeForm;

  document.getElementById("mampdTccSi").onclick = () => {
    closeForm();

    alConfirmar();
  };
}

// ------------------------------------------------------------
// DATOS DE PRUEBA (hasta que exista el módulo de Actuaría)
// ------------------------------------------------------------

// Marca que el documento llegó ahora (o hace `horas`) y enciende la alerta.
function marcarLlegada(id, horasAtras = 0) {
  const llegada = new Date(Date.now() - horasAtras * 3600000).toISOString();

  actualizarSeg(id, (seg) => {
    seg.desde = llegada;

    seg.tcc = {
      llegadaEn: llegada,
      alerta: { activa: true, pospuestaHasta: null },
    };
  });
}

// Lo enviado a Actuaría "regresa" ya procesado.
function simularLlegadas(deps) {
  enActuariaDePendientes().forEach(({ amparo }) => {
    deps.regresarDeActuaria?.(amparo.id);

    marcarLlegada(amparo.id);
  });
}

const DEMO_TCC = [
  {
    n: "T1",
    prom: "JOSEFINA RUIZ CORTÉS",
    acto: "Laudo condenatorio",
    horas: 2,
  },
  {
    n: "T2",
    prom: "ALBERTO MENDOZA SILVA",
    acto: "Laudo absolutorio",
    horas: 50,
  },
  {
    n: "T3",
    prom: "GUADALUPE ARREOLA PÉREZ",
    acto: "Laudo definitivo",
    horas: 170,
  },
];

const PARTES_TCC = [
  ["C. JOSEFINA RUIZ CORTÉS", "H. AYTO. MANZANILLO, COLIMA"],
  ["C. ALBERTO MENDOZA SILVA", "SERVICIOS DE SALUD DEL ESTADO"],
  ["C. GUADALUPE ARREOLA PÉREZ", "H. AYTO. TECOMÁN, COLIMA"],
];

function cargarDatosPrueba(deps) {
  const amparos = getData("amparos", []);

  const lista = Array.isArray(amparos) ? amparos : [];

  DEMO_TCC.forEach((item, indice) => {
    const id = `AMP-${item.n}`;

    if (lista.some((a) => a.id === id)) return;

    const dia = new Date(Date.now() - (item.horas + 72) * 3600000);

    lista.push({
      id,
      dia: dia.toISOString().slice(0, 10),
      hora: "09:00",
      expediente: `${300 + indice}/2026`,
      promovente: item.prom,
      actor: PARTES_TCC[indice][0],
      demandado: PARTES_TCC[indice][1],
      juzgado: "Tribunal Colegiado en Materia de Trabajo",
      oficio: `TAE-SA-${400 + indice}/2026`,
      actoReclamado: item.acto,
      acciones: "",
      observaciones: "Amparo directo",
      estado: "En trámite",
      creadoEn: dia.toISOString(),
    });

    saveData("amparos", lista);

    // Se recibe como Radicación y se arma el recorrido completo:
    // radicación con documento -> en lista -> Actuaría -> regreso.
    deps.recibir?.(id, "Radicación");

    const ahora = new Date().toISOString();

    const docRad = sembrarDocumentoDemo("demanda", `demo-doc-rad-${id}`, {
      nombreBase: `radicacion_${id}`,
      concepto: "Radicación",
    });

    const docFirma = sembrarDocumentoDemo("demanda", `demo-doc-firma-${id}`, {
      nombreBase: `acuerdo_${id}`,
      concepto: "Acuerdo de radicación",
    });

    actualizarSeg(id, (seg) => {
      seg.radicacion = {
        tipo: "con-suspension-subsistencia",
        tipoEtiqueta: "Con suspensión y subsistencia",
        generadaEn: ahora,
        generadaPor: "Demostración",
        documentoId: docRad?.documentoId,
        archivo: docRad?.archivo,
        subidoEn: ahora,
        enviadaActuaria: true,
        enviadaActuariaEn: ahora,
      };

      seg.firmas = [
        {
          id: `demo-firma-${id}`,
          documentoId: docFirma?.documentoId,
          archivo: docFirma?.archivo,
          estadoProcesal: "RADICACIÓN A.D. PARTE ACTORA",
          fojas: 120 + indice * 15,
          estado: "firmado",
          enviadoEn: ahora,
          enviadoPor: "Demostración",
          firmadoEn: ahora,
          firmadoPor: "Magistrada",
          listaId: `demo-lista-${id}`,
          listaNumero: 100 + indice,
        },
      ];

      seg.actuaria = {
        activo: true,
        desde: ahora,
        motivo: "Notificación de radicación",
        etapaOrigen: seg.etapa,
      };

      seg.ubicacion = "Actuaría";
    });

    deps.regresarDeActuaria?.(id);

    marcarLlegada(id, item.horas);
  });
}
