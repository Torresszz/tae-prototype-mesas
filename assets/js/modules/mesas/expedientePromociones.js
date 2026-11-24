// ============================================================
// CONSULTA DE PROMOCIONES DEL EXPEDIENTE
// assets/js/modules/mesas/expedientePromociones.js
// ============================================================

import { escapeHTML } from "../../utils.js";

import {
  renderEstadoBadge,
} from "./flujoEstados.js";

import {
  abrirDocumentoExpediente,
  tieneContenido,
} from "./expedienteDemanda.js";


// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderExpedientePromociones(expediente) {

  const promociones = expediente.promociones || [];


  const pendientes = promociones.filter(
    (item) => item.estadoPromocion !== "acordado",
  ).length;


  const acordadas = promociones.filter(
    (item) => item.estadoPromocion === "acordado",
  ).length;


  return `

    <div class="expediente-tab-panel">


      <!-- ENCABEZADO -->

      <header class="expediente-panel-header">

        <div>

          <h3>Promociones del expediente</h3>

          <p>
            Consulta de escritos y acuerdos relacionados
            con el expediente ${escapeHTML(expediente.numero)}.
          </p>

        </div>

        <span class="expediente-count-badge">

          ${promociones.length} promociones

        </span>

      </header>


      <!-- CONTADORES -->

      <div class="expediente-promociones-stats">

        ${renderContador(
          "Total de promociones",
          promociones.length,
          "fa-folder-open",
        )}

        ${renderContador(
          "Pendientes de acordar",
          pendientes,
          "fa-clock",
        )}

        ${renderContador(
          "Acordadas",
          acordadas,
          "fa-circle-check",
        )}

      </div>


      <!-- TABLA -->

      ${
        promociones.length

          ? renderTabla(promociones)

          : renderEmpty()
      }


    </div>

  `;

}


// ============================================================
// CONTADORES
// ============================================================

function renderContador(titulo, cantidad, icono) {

  return `

    <article class="expediente-promocion-stat">

      <div class="expediente-promocion-stat-icon">

        <i class="fa-solid ${icono}"></i>

      </div>


      <div>

        <span>
          ${escapeHTML(titulo)}
        </span>

        <strong>
          ${cantidad}
        </strong>

      </div>

    </article>

  `;

}


// ============================================================
// TABLA DE PROMOCIONES
// ============================================================

function renderTabla(promociones) {

  return `

    <section class="expediente-promociones-card">


      <div class="expediente-promociones-table-wrapper">

        <table class="expediente-promociones-table">

          <thead>

            <tr>

              <th>Fecha</th>

              <th>Promovente</th>

              <th>Resumen / Asunto</th>

              <th>Estado del acuerdo</th>

              <th>Situación</th>

              <th>Acciones</th>

            </tr>

          </thead>


          <tbody>

            ${promociones.map(
              (item, index) =>
                renderFila(item, index),
            ).join("")}

          </tbody>

        </table>

      </div>


      <footer class="expediente-table-footer">

        <span>

          ${promociones.length}
          ${
            promociones.length === 1
              ? "promoción relacionada"
              : "promociones relacionadas"
          }

        </span>

      </footer>


    </section>

  `;

}


// ============================================================
// FILA DE PROMOCIÓN
// ============================================================

function renderFila(item, index) {

  const situacion = obtenerSituacion(item);

  const documento = obtenerEscrito(item);

  const escritoDisponible =
    tieneContenido(documento);

  const acuerdoDisponible =
    tieneContenido(item.acuerdo);


  return `

    <tr>


      <!-- FECHA -->

      <td>

        ${escapeHTML(
          formatFecha(item.fecha),
        )}

      </td>


      <!-- PROMOVENTE -->

      <td>

        <strong class="expediente-promocion-persona">

          ${escapeHTML(
            item.promovente || "—",
          )}

        </strong>

      </td>


      <!-- RESUMEN -->

      <td>

        <div class="expediente-promocion-resumen">

          ${escapeHTML(
            item.resumen || "Sin resumen registrado.",
          )}

        </div>


        ${
          item.anexos?.length

            ? `
              <span class="expediente-promocion-anexos">

                <i class="fa-solid fa-paperclip"></i>

                ${item.anexos.length}
                ${
                  item.anexos.length === 1
                    ? "anexo"
                    : "anexos"
                }

              </span>
            `

            : ""
        }

      </td>


      <!-- ESTADO DEL ACUERDO -->

      <td>

        ${renderEstadoBadge(
          item.estadoAcuerdo || "en-proceso",
        )}

      </td>


      <!-- SITUACIÓN -->

      <td>

        <span class="expediente-situacion-badge ${situacion.clase}">

          ${escapeHTML(situacion.texto)}

        </span>

      </td>


      <!-- ACCIONES -->

      <td>

        <div class="expediente-promocion-actions">


          <button
            type="button"
            class="mesas-secondary-btn"
            data-consulta-promocion="detalle"
            data-promocion-index="${index}"
          >

            <i class="fa-regular fa-eye"></i>

            Ver detalle

          </button>


          <button
            type="button"
            class="mesas-secondary-btn"
            data-consulta-promocion="escrito"
            data-promocion-index="${index}"
            ${escritoDisponible ? "" : "disabled"}
          >

            <i class="fa-regular fa-file-lines"></i>

            Ver escrito

          </button>


          <button
            type="button"
            class="mesas-secondary-btn"
            data-consulta-promocion="acuerdo"
            data-promocion-index="${index}"
            ${acuerdoDisponible ? "" : "disabled"}
          >

            <i class="fa-solid fa-file-signature"></i>

            Ver acuerdo

          </button>


        </div>

      </td>


    </tr>

  `;

}


// ============================================================
// SITUACIÓN DE LA PROMOCIÓN
// ============================================================

function obtenerSituacion(item) {

  if (
    item.estadoPromocion === "acordado" ||
    [
      "en-lista",
      "en-actuaria",
      "en-archivo",
    ].includes(item.estadoAcuerdo)
  ) {

    return {
      texto: "Acordada",
      clase: "done",
    };

  }


  if (!item.recibidaMesa) {

    return {
      texto: "Pendiente de recibir",
      clase: "pending",
    };

  }


  if (item.estadoAcuerdo === "en-firma") {

    return {
      texto: "En firma",
      clase: "sign",
    };

  }


  if (
    item.estadoAcuerdo === "en-revision-interna" ||
    tieneContenido(item.acuerdo)
  ) {

    return {
      texto: "En proyecto",
      clase: "project",
    };

  }


  return {
    texto: "Por acordar",
    clase: "pending",
  };

}


// ============================================================
// OBTENER ESCRITO ORIGINAL
// ============================================================

function obtenerEscrito(item) {

  const promocion = item.promocion || {};


  if (tieneContenido(item.documento)) {

    return item.documento;

  }


  if (
    promocion.archivoDataUrl ||
    promocion.dataUrl
  ) {

    return {

      nombre:
        promocion.nombreArchivo ||
        promocion.archivoNombre ||
        "Escrito de promoción.pdf",

      dataUrl:
        promocion.archivoDataUrl ||
        promocion.dataUrl,

    };

  }


  return null;

}


// ============================================================
// EVENTOS DE CONSULTA
// ============================================================

export function activarConsultaPromociones(
  contenedor,
  expediente,
) {

  if (!contenedor) {
    return;
  }


  contenedor

    .querySelectorAll("[data-consulta-promocion]")

    .forEach((button) => {

      button.onclick = () => {

        if (button.disabled) {
          return;
        }


        const index = Number(
          button.dataset.promocionIndex,
        );


        const promocion =
          expediente.promociones[index];


        if (!promocion) {
          return;
        }


        const accion =
          button.dataset.consultaPromocion;


        switch (accion) {


          case "detalle":

            abrirDetallePromocion(
              expediente,
              promocion,
            );

            break;


          case "escrito":

            abrirDocumentoExpediente({

              titulo: "Escrito de promoción",

              numero: expediente.numero,

              documento: obtenerEscrito(promocion),

            });

            break;


          case "acuerdo":

            abrirDocumentoExpediente({

              titulo: "Acuerdo de promoción",

              numero: expediente.numero,

              documento: promocion.acuerdo,

            });

            break;

        }

      };

    });

}


// ============================================================
// CONSULTA DEL DETALLE DE UNA PROMOCIÓN
// ============================================================

function abrirDetallePromocion(
  expediente,
  promocion,
) {

  const situacion =
    obtenerSituacion(promocion);


  const anexos =
    Array.isArray(promocion.anexos)
      ? promocion.anexos
      : [];


  const nombresAnexos = anexos.map(
    (anexo, index) => {

      if (typeof anexo === "string") {
        return anexo;
      }

      return (
        anexo?.nombre ||
        anexo?.nombreArchivo ||
        `Anexo ${index + 1}`
      );

    },
  );


  const texto = [

    `EXPEDIENTE: ${expediente.numero}`,

    `FECHA: ${formatFecha(promocion.fecha)}`,

    `PROMOVENTE: ${promocion.promovente}`,

    `ACTOR: ${expediente.actor}`,

    `DEMANDADO: ${expediente.demandado}`,

    `SITUACIÓN: ${situacion.texto}`,

    "",

    "RESUMEN DE LA PROMOCIÓN",

    promocion.resumen ||
      "Sin resumen registrado.",

    "",

    "ANEXOS",

    nombresAnexos.length

      ? nombresAnexos.map(
          (nombre, index) =>
            `${index + 1}. ${nombre}`,
        ).join("\n")

      : "Sin anexos registrados.",

  ].join("\n");


  abrirDocumentoExpediente({

    titulo: "Detalle de promoción",

    numero: expediente.numero,

    documento: {
      texto,
    },

  });

}


// ============================================================
// ESTADO VACÍO
// ============================================================

function renderEmpty() {

  return `

    <div class="expediente-detalle-empty">

      <i class="fa-regular fa-folder-open"></i>

      <strong>

        No hay promociones registradas

      </strong>

      <span>

        Las promociones relacionadas con este
        expediente aparecerán aquí.

      </span>

    </div>

  `;

}


// ============================================================
// FORMATO DE FECHA
// ============================================================

function formatFecha(value) {

  if (!value) {
    return "—";
  }


  const parts = String(value)
    .slice(0, 10)
    .split("-");


  if (parts.length === 3) {

    return `${parts[2]}/${parts[1]}/${parts[0]}`;

  }


  return String(value);

}