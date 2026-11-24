// ============================================================
// ACTUACIONES Y AUDIENCIAS DEL EXPEDIENTE
// assets/js/modules/mesas/expedienteActuaciones.js
// ============================================================

import { escapeHTML } from "../../utils.js";


// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderExpedienteActuaciones(expediente) {

  const audiencias =
    expediente.audiencias || [];

  const actuaciones =
    expediente.actuaciones || [];


  const pendientes = audiencias.filter(
    (item) =>
      item.estadoAudiencia === "por-desahogar",
  );


  const desahogadas = audiencias.filter(
    (item) =>
      item.estadoAudiencia === "desahogada",
  );


  return `

    <div class="expediente-tab-panel">


      <!-- ENCABEZADO -->

      <header class="expediente-panel-header">

        <div>

          <h3>
            Actuaciones y audiencias
          </h3>

          <p>
            Consulta cronológica de movimientos y audiencias
            relacionadas con el expediente.
          </p>

        </div>

      </header>


      <!-- CONTADORES -->

      <div class="expediente-actuaciones-stats">

        ${renderContador(
          "Actuaciones registradas",
          actuaciones.length,
          "fa-clock-rotate-left",
        )}

        ${renderContador(
          "Audiencias por desahogar",
          pendientes.length,
          "fa-calendar-days",
        )}

        ${renderContador(
          "Audiencias desahogadas",
          desahogadas.length,
          "fa-circle-check",
        )}

      </div>


      <!-- AUDIENCIAS -->

      <section class="expediente-audiencias-section">

        <div class="expediente-section-heading">

          <i class="fa-solid fa-calendar-days"></i>

          <h4>
            Audiencias del expediente
          </h4>

        </div>


        ${
          audiencias.length

            ? `
              <div class="expediente-audiencias-list">

                ${audiencias.map(
                  renderAudiencia,
                ).join("")}

              </div>
            `

            : renderEmpty(
                "fa-calendar",
                "No hay audiencias registradas",
                "Las audiencias vinculadas aparecerán en este apartado.",
              )
        }

      </section>


      <!-- HISTORIAL CRONOLÓGICO -->

      <section class="expediente-actuaciones-section">


        <div class="expediente-section-heading">

          <i class="fa-solid fa-clock-rotate-left"></i>

          <h4>
            Historial de actuaciones
          </h4>

          <span class="expediente-count-badge">

            ${actuaciones.length} movimientos

          </span>

        </div>


        ${
          actuaciones.length

            ? renderTimeline(actuaciones)

            : renderEmpty(
                "fa-clock-rotate-left",
                "No hay actuaciones registradas",
                "Los movimientos del expediente aparecerán aquí.",
              )
        }


      </section>


    </div>

  `;

}


// ============================================================
// CONTADORES
// ============================================================

function renderContador(
  titulo,
  cantidad,
  icono,
) {

  return `

    <article class="expediente-actuacion-stat">


      <div class="expediente-actuacion-stat-icon">

        <i class="fa-solid ${icono}"></i>

      </div>


      <div class="expediente-actuacion-stat-info">

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
// TARJETA DE AUDIENCIA
// ============================================================

function renderAudiencia(audiencia) {

  const fecha =
    separarFecha(audiencia.fecha);

  const estado =
    obtenerEstadoAudiencia(audiencia);


  return `

    <article class="expediente-audiencia-card">


      <!-- FECHA -->

      <div class="expediente-audiencia-date">

        <span>

          ${escapeHTML(fecha.mes)}

        </span>


        <strong>

          ${escapeHTML(fecha.dia)}

        </strong>


        <small>

          ${escapeHTML(fecha.anio)}

        </small>

      </div>


      <!-- INFORMACIÓN -->

      <div class="expediente-audiencia-info">


        <h5>

          ${escapeHTML(
            audiencia.tipoAudiencia || "Audiencia",
          )}

        </h5>


        <div class="expediente-audiencia-meta">


          <span>

            <i class="fa-regular fa-calendar"></i>

            ${escapeHTML(
              formatFecha(audiencia.fecha),
            )}

          </span>


          <span>

            <i class="fa-regular fa-clock"></i>

            ${escapeHTML(
              formatHora(audiencia.hora),
            )}

          </span>


          ${
            audiencia.mesa

              ? `
                <span>

                  <i class="fa-solid fa-briefcase"></i>

                  ${escapeHTML(
                    formatMesa(audiencia.mesa),
                  )}

                </span>
              `

              : ""
          }


        </div>


        ${
          audiencia.notas

            ? `
              <p>

                ${escapeHTML(audiencia.notas)}

              </p>
            `

            : ""
        }


        ${
          audiencia.origen === "promocion"

            ? `
              <span class="expediente-audiencia-origen">

                <i class="fa-solid fa-link"></i>

                Vinculada a una promoción

              </span>
            `

            : ""
        }


      </div>


      <!-- ESTADO -->

      <div class="expediente-audiencia-status">

        <span class="expediente-situacion-badge ${estado.clase}">

          ${escapeHTML(estado.texto)}

        </span>

      </div>


    </article>

  `;

}


// ============================================================
// ESTADO DE AUDIENCIA
// ============================================================

function obtenerEstadoAudiencia(audiencia) {

  switch (audiencia.estadoAudiencia) {

    case "desahogada":

      return {

        texto: "Desahogada",

        clase: "done",

      };


    case "por-desahogar":

      return {

        texto: "Por desahogar",

        clase: "pending",

      };


    default:

      return {

        texto: "Sin estado registrado",

        clase: "neutral",

      };

  }

}


// ============================================================
// LÍNEA DE TIEMPO
// ============================================================

function renderTimeline(actuaciones) {

  return `

    <div class="expediente-timeline">


      ${actuaciones.map(
        renderActuacion,
      ).join("")}


    </div>

  `;

}


// ============================================================
// MOVIMIENTO INDIVIDUAL
// ============================================================

function renderActuacion(actuacion) {

  const origen =
    obtenerOrigenActuacion(actuacion);


  return `

    <article class="expediente-timeline-item">


      <!-- ICONO -->

      <div class="expediente-timeline-marker ${origen.clase}">

        <i class="fa-solid ${origen.icono}"></i>

      </div>


      <!-- CONTENIDO -->

      <div class="expediente-timeline-content">


        <div class="expediente-timeline-header">


          <span class="expediente-timeline-date">

            ${escapeHTML(
              formatFechaHora(actuacion.fecha),
            )}

          </span>


          <span class="expediente-timeline-origin ${origen.clase}">

            ${escapeHTML(origen.texto)}

          </span>


        </div>


        <h5>

          ${escapeHTML(
            actuacion.movimiento ||
            "Movimiento registrado",
          )}

        </h5>


        ${
          actuacion.detalle

            ? `
              <p>

                ${escapeHTML(actuacion.detalle)}

              </p>
            `

            : ""
        }


        ${
          actuacion.usuario

            ? `
              <div class="expediente-timeline-user">

                <i class="fa-regular fa-user"></i>

                ${escapeHTML(actuacion.usuario)}

              </div>
            `

            : ""
        }


      </div>


    </article>

  `;

}


// ============================================================
// ORIGEN DEL MOVIMIENTO
// ============================================================

function obtenerOrigenActuacion(actuacion) {

  switch (actuacion.origen) {


    case "Demanda inicial":

      return {

        texto: "Demanda inicial",

        icono: "fa-file-lines",

        clase: "demanda",

      };


    case "Promoción":

      return {

        texto: "Promoción",

        icono: "fa-folder-open",

        clase: "promocion",

      };


    default:

      return {

        texto: "Expediente",

        icono: "fa-briefcase",

        clase: "general",

      };

  }

}


// ============================================================
// ESTADO VACÍO
// ============================================================

function renderEmpty(
  icono,
  titulo,
  descripcion,
) {

  return `

    <div class="expediente-detalle-empty">


      <i class="fa-solid ${icono}"></i>


      <strong>

        ${escapeHTML(titulo)}

      </strong>


      <span>

        ${escapeHTML(descripcion)}

      </span>


    </div>

  `;

}


// ============================================================
// SEPARAR FECHA PARA TARJETA DE AUDIENCIA
// ============================================================

function separarFecha(value) {

  const meses = [

    "ENE",
    "FEB",
    "MAR",
    "ABR",
    "MAY",
    "JUN",
    "JUL",
    "AGO",
    "SEP",
    "OCT",
    "NOV",
    "DIC",

  ];


  const fecha = String(value || "")
    .slice(0, 10);

  const parts = fecha.split("-");


  if (parts.length !== 3) {

    return {

      dia: "—",

      mes: "—",

      anio: "",

    };

  }


  const [anio, mes, dia] = parts;


  return {

    dia,

    mes:
      meses[Number(mes) - 1] || "—",

    anio,

  };

}


// ============================================================
// FORMATO DE FECHA
// ============================================================

function formatFecha(value) {

  if (!value) {
    return "Sin fecha";
  }


  const parts = String(value)
    .slice(0, 10)
    .split("-");


  if (parts.length === 3) {

    return `${parts[2]}/${parts[1]}/${parts[0]}`;

  }


  return String(value);

}


// ============================================================
// FORMATO DE HORA
// ============================================================

function formatHora(value) {

  if (!value) {
    return "Sin hora";
  }


  const [horas, minutos] =
    String(value).split(":");


  const hora = Number(horas);


  if (
    !Number.isInteger(hora) ||
    hora < 0 ||
    hora > 23 ||
    !/^[0-5]\d$/.test(minutos || "")
  ) {

    return String(value);

  }


  const periodo =
    hora >= 12 ? "p. m." : "a. m.";


  const hora12 =
    hora % 12 || 12;


  return `${hora12}:${minutos} ${periodo}`;

}


// ============================================================
// FORMATO DE FECHA Y HORA
// ============================================================

function formatFechaHora(value) {

  if (!value) {
    return "Fecha no registrada";
  }


  // Las fechas sin hora se conservan sin
  // agregarles una hora ficticia.

  if (!String(value).includes("T")) {

    return formatFecha(value);

  }


  const fecha = new Date(value);


  if (Number.isNaN(fecha.getTime())) {

    return formatFecha(value);

  }


  return new Intl.DateTimeFormat(
    "es-MX",
    {

      day: "2-digit",

      month: "2-digit",

      year: "numeric",

      hour: "2-digit",

      minute: "2-digit",

      hour12: true,

    },
  ).format(fecha);

}


// ============================================================
// FORMATO DE MESA
// ============================================================

function formatMesa(value) {

  if (!value) {
    return "Sin asignar";
  }


  const texto = String(value);


  if (
    texto.toLowerCase().startsWith("mesa")
  ) {

    return texto;

  }


  return `Mesa ${texto}`;

}