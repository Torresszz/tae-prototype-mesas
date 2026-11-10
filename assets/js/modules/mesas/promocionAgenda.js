// ============================================================
// AGENDAR AUDIENCIA DESDE UNA PROMOCIÓN
// assets/js/modules/mesas/promocionAgenda.js
//
// PROTOTIPO:
// Crea un evento tipo "audiencia" dentro de mesasAgenda.
// Por lo tanto aparece automáticamente en la Agenda de Audiencias.
// ============================================================

import {
  getData,
  saveData,
} from "../../storage.js";

import {
  createId,
  escapeHTML,
} from "../../utils.js";

import {
  getSession,
} from "../../auth.js";

import {
  showModal,
  closeForm,
} from "../../forms/formHelper.js";

import {
  buscarExpedienteExacto,
  mesaDeExpediente,
} from "./mesaUtils.js";

import {
  generarNotificacionesEvento,
} from "./notificaciones.js";


// ============================================================
// LLAVES
// ============================================================

const KEY_PROMOCIONES =
  "promociones";

const KEY_AGENDA =
  "mesasAgenda";


// ============================================================
// ABRIR MODAL
// ============================================================

export function openAgendarAudienciaPromocion(
  promocionId,
  onSaved = null,
) {
  if (!promocionId) {
    return;
  }


  const promociones =
    getPromociones();


  const promocion =
    promociones.find(
      (item) =>
        String(
          item.id ||
          "",
        ) ===
        String(
          promocionId,
        ),
    );


  if (!promocion) {
    return;
  }


  if (
    promocion.recibidaMesa !==
    true
  ) {
    return;
  }


  const numeroExpediente =
    String(
      promocion.expediente ||
      promocion.numero ||
      "",
    ).trim();


  if (!numeroExpediente) {
    return;
  }


  const expediente =
    buscarExpedienteExacto(
      numeroExpediente,
    );


  if (!expediente) {
    return;
  }


  const eventoExistente =
    getEventoPromocion(
      promocion,
    );


  if (eventoExistente) {
    openAudienciaExistente(
      promocion,
      eventoExistente,
    );

    return;
  }


  openNuevaAudiencia(
    promocion,
    expediente,
    onSaved,
  );
}


// ============================================================
// MODAL NUEVA AUDIENCIA
// ============================================================

function openNuevaAudiencia(
  promocion,
  expediente,
  onSaved,
) {
  const numeroExpediente =
    String(
      promocion.expediente ||
      promocion.numero ||
      "",
    ).trim();


  showModal(`
    <div class="mesas-modal-shell mesas-agenda-modal">

      <header class="mesas-modal-header">

        <div class="mesas-modal-step">

          <i class="fa-solid fa-gavel"></i>

        </div>


        <div class="mesas-modal-header-text">

          <h2>
            Agendar audiencia
          </h2>

          <p>
            Audiencia relacionada con una promoción.
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        <form
          id="promocionAudienciaForm"
          class="mesas-agenda-form"
        >

          <div class="mesas-agenda-form-grid">


            <!-- EXPEDIENTE -->

            <label class="mesas-agenda-field">

              <span>
                Expediente
              </span>

              <input
                type="text"
                value="${escapeHTML(
                  numeroExpediente,
                )}"
                disabled
              >

            </label>


            <!-- PROMOCIÓN -->

            <label class="mesas-agenda-field">

              <span>
                Promoción
              </span>

              <input
                type="text"
                value="${escapeHTML(
                  getNombrePromocion(
                    promocion,
                  ),
                )}"
                disabled
              >

            </label>


            <!-- FECHA -->

            <label class="mesas-agenda-field">

              <span>
                Fecha *
              </span>

              <input
                id="promocionAudienciaFecha"
                type="date"
                required
              >

            </label>


            <!-- HORA -->

            <label class="mesas-agenda-field">

              <span>
                Hora *
              </span>

              <input
                id="promocionAudienciaHora"
                type="time"
                required
              >

            </label>


            <!-- NOTAS -->

            <label class="mesas-agenda-field full">

              <span>
                Anotaciones
              </span>

              <textarea
                id="promocionAudienciaNotas"
                class="mesas-textarea"
                rows="5"
                placeholder="Anotaciones de la audiencia..."
              >Audiencia agendada desde promoción: ${escapeHTML(
                getNombrePromocion(
                  promocion,
                ),
              )}</textarea>

            </label>


          </div>


          <p
            class="mesas-form-error"
            id="promocionAudienciaError"
            hidden
          ></p>

        </form>

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="cancelPromocionAudiencia"
        >
          Cancelar
        </button>


        <button
          type="button"
          class="mesas-modal-confirm"
          id="savePromocionAudiencia"
        >

          <i class="fa-solid fa-calendar-plus"></i>

          Agendar audiencia

        </button>

      </footer>

    </div>
  `);


  document
    .getElementById(
      "cancelPromocionAudiencia",
    )
    ?.addEventListener(
      "click",
      closeForm,
    );


  document
    .getElementById(
      "savePromocionAudiencia",
    )
    ?.addEventListener(
      "click",
      () => {
        guardarAudiencia(
          promocion,
          expediente,
          onSaved,
        );
      },
    );
}


// ============================================================
// GUARDAR AUDIENCIA
// ============================================================

function guardarAudiencia(
  promocion,
  expediente,
  onSaved,
) {
  const fecha =
    document
      .getElementById(
        "promocionAudienciaFecha",
      )
      ?.value ||
    "";


  const hora =
    document
      .getElementById(
        "promocionAudienciaHora",
      )
      ?.value ||
    "";


  const notas =
    document
      .getElementById(
        "promocionAudienciaNotas",
      )
      ?.value
      .trim() ||
    "";


  const error =
    validarAudiencia(
      fecha,
      hora,
    );


  if (error) {
    mostrarError(
      error,
    );

    return;
  }


  const promociones =
    getPromociones();


  const promocionActual =
    promociones.find(
      (item) =>
        String(
          item.id,
        ) ===
        String(
          promocion.id,
        ),
    );


  if (!promocionActual) {
    mostrarError(
      "La promoción ya no existe.",
    );

    return;
  }


  const eventos =
    getAgenda();


  const session =
    getSession();


  const numeroExpediente =
    String(
      promocionActual.expediente ||
      promocionActual.numero ||
      "",
    ).trim();


  const evento = {

    id:
      createId(),


    tipo:
      "audiencia",


    expediente:
      numeroExpediente,


    fecha,


    hora,


    notas,


    mesa:
      mesaDeExpediente(
        expediente,
      ),


    creadoPor:
      session?.nombre ||
      session?.email ||
      "Secretaría de Acuerdos",


    // ================================================
    // RELACIÓN CON PROMOCIÓN
    // ================================================

    origen:
      "promocion",


    promocionId:
      promocionActual.id,


    tipoAudiencia:
      "",


    estadoAudiencia:
      "por-desahogar",
  };


  eventos.push(
    evento,
  );


  saveData(
    KEY_AGENDA,
    eventos,
  );


  // Guardamos la relación también
  // dentro de la promoción.
  promocionActual.audienciaEventoId =
    evento.id;


  promocionActual.audienciaAgendadaEn =
    new Date()
      .toISOString();


  saveData(
    KEY_PROMOCIONES,
    promociones,
  );


  // Utiliza el mismo sistema de avisos
  // que las audiencias normales.
  generarNotificacionesEvento(
    evento,
  );


  closeForm();


  if (
    typeof onSaved ===
    "function"
  ) {
    onSaved(
      evento,
    );
  }
}


// ============================================================
// AUDIENCIA YA AGENDADA
// ============================================================

function openAudienciaExistente(
  promocion,
  evento,
) {
  showModal(`
    <div class="mesas-modal-shell">

      <header class="mesas-modal-header">

        <div class="mesas-modal-step">

          <i class="fa-solid fa-calendar-check"></i>

        </div>


        <div class="mesas-modal-header-text">

          <h2>
            Audiencia agendada
          </h2>

          <p>
            Esta promoción ya tiene una audiencia relacionada.
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        <div class="mesas-modal-info">


          <div class="mesas-modal-info-item">

            <span>
              Expediente
            </span>

            <strong>
              ${escapeHTML(
                evento.expediente ||
                "—",
              )}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>
              Promoción
            </span>

            <strong>
              ${escapeHTML(
                getNombrePromocion(
                  promocion,
                ),
              )}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>
              Fecha
            </span>

            <strong>
              ${escapeHTML(
                formatFecha(
                  evento.fecha,
                ),
              )}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>
              Hora
            </span>

            <strong>
              ${escapeHTML(
                evento.hora ||
                "—",
              )}
            </strong>

          </div>


        </div>


        <div class="mesas-modal-info-item">

          <span>
            Anotaciones
          </span>

          <strong>
            ${escapeHTML(
              evento.notas ||
              "Sin anotaciones.",
            )}
          </strong>

        </div>

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="closePromocionAudienciaExistente"
        >
          Cerrar
        </button>

      </footer>

    </div>
  `);


  document
    .getElementById(
      "closePromocionAudienciaExistente",
    )
    ?.addEventListener(
      "click",
      closeForm,
    );
}


// ============================================================
// VALIDACIÓN
// ============================================================

function validarAudiencia(
  fecha,
  hora,
) {
  if (!fecha) {
    return "Selecciona la fecha de la audiencia.";
  }


  if (!hora) {
    return "Selecciona la hora de la audiencia.";
  }


  return "";
}


// ============================================================
// ERROR
// ============================================================

function mostrarError(
  mensaje,
) {
  const error =
    document.getElementById(
      "promocionAudienciaError",
    );


  if (!error) {
    return;
  }


  error.textContent =
    mensaje;


  error.hidden =
    false;
}


// ============================================================
// PROMOCIONES
// ============================================================

function getPromociones() {
  const datos =
    getData(
      KEY_PROMOCIONES,
      [],
    );


  return Array.isArray(
    datos,
  )
    ? datos
    : [];
}


// ============================================================
// AGENDA
// ============================================================

function getAgenda() {
  const datos =
    getData(
      KEY_AGENDA,
      [],
    );


  return Array.isArray(
    datos,
  )
    ? datos
    : [];
}


// ============================================================
// EVENTO RELACIONADO
// ============================================================

function getEventoPromocion(
  promocion,
) {
  const eventos =
    getAgenda();


  if (
    promocion.audienciaEventoId
  ) {
    const porId =
      eventos.find(
        (evento) =>
          evento.id ===
          promocion.audienciaEventoId,
      );


    if (porId) {
      return porId;
    }
  }


  return eventos.find(
    (evento) =>
      evento.tipo ===
        "audiencia" &&
      evento.origen ===
        "promocion" &&
      evento.promocionId ===
        promocion.id,
  ) || null;
}


// ============================================================
// NOMBRE PROMOCIÓN
// ============================================================

function getNombrePromocion(
  promocion,
) {
  if (
    promocion.numeroPromocion
  ) {
    return promocion
      .numeroPromocion;
  }


  if (
    promocion.tipo
  ) {
    return promocion.tipo;
  }


  return "Promoción";
}


// ============================================================
// FECHA
// ============================================================

function formatFecha(
  value,
) {
  if (!value) {
    return "—";
  }


  const parts =
    String(
      value,
    )
      .slice(
        0,
        10,
      )
      .split(
        "-",
      );


  if (
    parts.length ===
    3
  ) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }


  return String(
    value,
  );
}