// ============================================================
// AGENDA DEL MÓDULO MESAS
// assets/js/modules/mesas/agenda.js
// FASE 3 - T-09 / T-10
// ============================================================

import { getData, saveData } from "../../storage.js";
import { createId, escapeHTML } from "../../utils.js";
import { getSession } from "../../auth.js";
import { showModal, closeForm } from "../../forms/formHelper.js";

import {
  TIPOS_AGENDA_MANUALES,
  TIPOS_EVENTO_AGENDA,
  etiquetaTipoEventoAgenda,
  iconoTipoEventoAgenda,
} from "./catalogos.js";

import {
  generarNotificacionesEvento,
  sincronizarNotificacionesEvento,
  eliminarNotificacionesEvento,
} from "./notificaciones.js";


// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY_AGENDA = "mesasAgenda";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DIAS_SEMANA = [
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
  "Dom",
];

// Cada calendario mantiene su propio mes/filtro.
const estadosCalendario = new WeakMap();


// ============================================================
// OBTENER EVENTOS
// ============================================================

export function getEventosAgenda() {
  const eventos = getData(KEY_AGENDA, []);

  return Array.isArray(eventos)
    ? eventos
    : [];
}


// ============================================================
// EVENTOS VISIBLES PARA EL USUARIO ACTUAL
// ============================================================

function getEventosVisiblesParaUsuario() {
  const eventos = getEventosAgenda();

  const mesa = getSession()?.mesa || null;

  // Magistrada o usuarios sin mesa asignada:
  // pueden ver los eventos de todas las mesas.
  if (!mesa) {
    return eventos;
  }

  return eventos.filter(
    (evento) =>
      Number(evento.mesa) === Number(mesa),
  );
}


// ============================================================
// MONTAR CALENDARIO
// ============================================================

export function montarAgendaEn(
  contenedor,
  {
        tipoInicial = "audiencia",
    filtroInicial = "ambas",
    titulo = "Agenda",
    tipos = TIPOS_EVENTO_AGENDA.map(
      (tipo) => tipo.clave,
    ),
  } = {},
) {
  if (!contenedor) {
    return;
  }

  const hoy = new Date();

  let estado = estadosCalendario.get(contenedor);

  if (!estado) {
    estado = {
      anio: hoy.getFullYear(),
      mes: hoy.getMonth(),
            filtro: normalizarFiltro(filtroInicial),
      tipoInicial: normalizarTipo(tipoInicial),
      titulo,
      tipos,
    };

    estadosCalendario.set(
      contenedor,
      estado,
    );
  } else {
        estado.tipos = tipos;
    estado.tipoInicial =
      normalizarTipo(tipoInicial);

    estado.titulo =
      titulo || "Agenda";
  }

  renderAgenda(contenedor);
}


// ============================================================
// RENDER PRINCIPAL
// ============================================================

function renderAgenda(contenedor) {
  const estado =
    estadosCalendario.get(contenedor);

  if (!estado) {
    return;
  }

  const eventos =
    getEventosVisiblesParaUsuario()
      .filter(
        (evento) =>
          obtenerAnio(evento.fecha) === estado.anio &&
          obtenerMes(evento.fecha) === estado.mes,
      )
      .filter(
        (evento) =>
          estado.tipos.includes(
            evento.tipo,
          ),
      )
      .filter(
        (evento) =>
          estado.filtro === "ambas" ||
          evento.tipo === estado.filtro,
      );

  contenedor.innerHTML = `
    <section class="mesas-agenda">

      <header class="mesas-agenda-header">

        <div>
          <span class="mesas-mini-eyebrow">
            Año ${estado.anio}
          </span>

          <h2>
            ${escapeHTML(estado.titulo)}
          </h2>
        </div>

        <button
          type="button"
          class="mesas-primary-btn"
          data-agenda-action="nuevo"
        >
          <i class="fa-solid fa-plus"></i>
          Nuevo evento
        </button>

      </header>


      <div class="mesas-agenda-controls">

        <div class="mesas-agenda-month-nav">

          <button
            type="button"
            class="mesas-icon-btn"
            data-agenda-action="mes-anterior"
            aria-label="Mes anterior"
            ${estado.mes === 0 ? "disabled" : ""}
          >
            <i class="fa-solid fa-chevron-left"></i>
          </button>

          <strong>
            ${MESES[estado.mes]} ${estado.anio}
          </strong>

          <button
            type="button"
            class="mesas-icon-btn"
            data-agenda-action="mes-siguiente"
            aria-label="Mes siguiente"
            ${estado.mes === 11 ? "disabled" : ""}
          >
            <i class="fa-solid fa-chevron-right"></i>
          </button>

        </div>


        ${
          estado.tipos.length > 1
            ? `
        <label class="mesas-agenda-filter">
          <span>Mostrar</span>
          <select data-agenda-filter>
            <option
              value="ambas"
              ${estado.filtro === "ambas" ? "selected" : ""}
            >
              Todos
            </option>
            ${estado.tipos
              .map(
                (clave) => `
              <option
                value="${clave}"
                ${estado.filtro === clave ? "selected" : ""}
              >
                ${escapeHTML(etiquetaTipoEventoAgenda(clave))}
              </option>`,
              )
              .join("")}
          </select>
        </label>`
            : ""
        }

      </div>


      <div class="mesas-agenda-legend">
        ${estado.tipos
          .map(
            (clave) => `
        <span class="mesas-agenda-legend-item ${clave}">
          <i class="fa-solid ${iconoTipoEventoAgenda(clave)}"></i>
          ${escapeHTML(etiquetaTipoEventoAgenda(clave))}
        </span>`,
          )
          .join("")}
      </div>


      <div class="mesas-agenda-calendar">

        <div class="mesas-agenda-weekdays">

          ${DIAS_SEMANA.map(
            (dia) => `
              <span>${dia}</span>
            `,
          ).join("")}

        </div>


        <div class="mesas-agenda-grid">

          ${renderDiasMes(
            estado.anio,
            estado.mes,
            eventos,
          )}

        </div>

      </div>

    </section>
  `;

  configurarEventosAgenda(
    contenedor,
  );
}


// ============================================================
// RENDER DE LOS DÍAS DEL MES
// ============================================================

function renderDiasMes(
  anio,
  mes,
  eventos,
) {
  const primerDia =
    new Date(
      anio,
      mes,
      1,
    );

  const totalDias =
    new Date(
      anio,
      mes + 1,
      0,
    ).getDate();

  // JavaScript:
  // domingo = 0
  //
  // Calendario:
  // lunes = 0
  const espaciosAntes =
    (primerDia.getDay() + 6) % 7;

  const celdas = [];

  for (
    let i = 0;
    i < espaciosAntes;
    i += 1
  ) {
    celdas.push(`
      <div
        class="mesas-agenda-day is-empty"
        aria-hidden="true"
      ></div>
    `);
  }

  for (
    let dia = 1;
    dia <= totalDias;
    dia += 1
  ) {
    const fecha =
      construirFechaISO(
        anio,
        mes,
        dia,
      );

    const eventosDia =
      eventos
        .filter(
          (evento) =>
            evento.fecha === fecha,
        )
        .sort(ordenarEventos);

    celdas.push(`
      <div
        class="mesas-agenda-day ${
          esHoy(fecha)
            ? "is-today"
            : ""
        }"
      >

        <button
          type="button"
          class="mesas-agenda-day-number"
          data-agenda-action="nuevo-dia"
          data-agenda-fecha="${fecha}"
          aria-label="Crear evento el ${dia} de ${MESES[mes]}"
        >
          ${dia}
        </button>


        <div class="mesas-agenda-day-events">

          ${
            eventosDia.length
              ? eventosDia
                  .map(
                    (evento) =>
                      renderEventoCalendario(
                        evento,
                      ),
                  )
                  .join("")
              : ""
          }

        </div>

      </div>
    `);
  }

  return celdas.join("");
}


// ============================================================
// EVENTO DEL CALENDARIO
// ============================================================

function renderEventoCalendario(
  evento,
) {
  const tipo =
    normalizarTipo(evento.tipo);

  const hora =
    evento.hora
      ? `
          <span>
            ${escapeHTML(evento.hora)}
          </span>
        `
      : "";

  return `
    <button
      type="button"
      class="mesas-agenda-event ${tipo}"
      data-agenda-action="ver"
      data-agenda-id="${escapeHTML(evento.id)}"
      title="${escapeHTML(evento.expediente)}"
    >

      <i class="fa-solid ${iconoTipoEventoAgenda(tipo)}"></i>

      <strong>
        ${escapeHTML(
          etiquetaTipoEventoAgenda(tipo),
        )}
      </strong>

      ${hora}

      <small>
        ${escapeHTML(evento.expediente)}
      </small>

    </button>
  `;
}


// ============================================================
// EVENTOS DEL COMPONENTE
// ============================================================

function configurarEventosAgenda(
  contenedor,
) {
  const estado =
    estadosCalendario.get(contenedor);

  if (!estado) {
    return;
  }

  contenedor.onclick = (
    event,
  ) => {
    const boton =
      event.target.closest(
        "[data-agenda-action]",
      );

    if (!boton) {
      return;
    }

    const accion =
      boton.dataset.agendaAction;

    switch (accion) {
      case "mes-anterior":
        if (estado.mes > 0) {
          estado.mes -= 1;

          renderAgenda(
            contenedor,
          );
        }
        break;


      case "mes-siguiente":
        if (estado.mes < 11) {
          estado.mes += 1;

          renderAgenda(
            contenedor,
          );
        }
        break;


      case "nuevo":
        openEventoForm({
          tipos:
            estado.tipos,
          tipoInicial:
            estado.tipoInicial,
          fechaInicial:
            fechaInicialParaMes(
              estado.anio,
              estado.mes,
            ),

          onSaved: () =>
            renderAgenda(
              contenedor,
            ),
        });
        break;


      case "nuevo-dia":
        openEventoForm({
          tipos:
            estado.tipos,
          tipoInicial:
            estado.tipoInicial,
          fechaInicial:
            boton.dataset.agendaFecha,

          onSaved: () =>
            renderAgenda(
              contenedor,
            ),
        });
        break;


      case "ver":
        openDetalleEvento(
          boton.dataset.agendaId,

          () =>
            renderAgenda(
              contenedor,
            ),
        );
        break;
    }
  };


  const filtro =
    contenedor.querySelector(
      "[data-agenda-filter]",
    );

  if (filtro) {
    filtro.onchange = (
      event,
    ) => {
      estado.filtro =
        normalizarFiltro(
          event.target.value,
        );

      renderAgenda(
        contenedor,
      );
    };
  }
}


// ============================================================
// MODAL CREAR / EDITAR EVENTO
// T-10
// ============================================================

function openEventoForm({
  evento = null,
  tipos = null,
  tipoInicial = "audiencia",
  fechaInicial = "",
  onSaved = null,
} = {}) {
  const expedientes =
    getExpedientesPermitidos();

  const tipoActual =
    evento
      ? normalizarTipo(
          evento.tipo,
        )
      : normalizarTipo(
          tipoInicial,
        );

  const fechaActual =
    evento?.fecha ||
    fechaInicial ||
    hoyISO();

  const horaActual =
    evento?.hora || "";

  const notasActuales =
    evento?.notas || "";

  showModal(`
    <div class="mesas-modal-shell mesas-agenda-modal">

      <header class="mesas-modal-header">

        <div class="mesas-modal-step">
          <i class="fa-regular fa-calendar"></i>
        </div>

        <div class="mesas-modal-header-text">

          <h2>
            ${
              evento
                ? "Editar evento"
                : "Nuevo evento"
            }
          </h2>

          <p>
            Agenda de Secretaría de Acuerdos
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        <form
          id="mesasAgendaForm"
          class="mesas-agenda-form"
        >

          <div class="mesas-agenda-form-grid">

            <label class="mesas-agenda-field">

              <span>
                Tipo *
              </span>

              <select
                id="agendaTipo"
                required
              >

                ${TIPOS_EVENTO_AGENDA.filter(
                  (tipo) =>
                    tipo.clave === evento?.tipo ||
                    (TIPOS_AGENDA_MANUALES.includes(
                      tipo.clave,
                    ) &&
                      (!tipos ||
                        tipos.includes(
                          tipo.clave,
                        ))),
                ).map(
                  (tipo) => `
                    <option
                      value="${tipo.clave}"
                      ${
                        tipo.clave === tipoActual
                          ? "selected"
                          : ""
                      }
                    >
                      ${escapeHTML(tipo.etiqueta)}
                    </option>
                  `,
                ).join("")}

              </select>

            </label>


            <label class="mesas-agenda-field">

              <span>
                Expediente *
              </span>

              <select
                id="agendaExpediente"
                required
              >

                <option value="">
                  Selecciona un expediente
                </option>

                ${expedientes.map(
                  (expediente) => {
                    const numero =
                      getNumeroExpediente(
                        expediente,
                      );

                    return `
                      <option
                        value="${escapeHTML(numero)}"
                        ${
                          evento?.expediente === numero
                            ? "selected"
                            : ""
                        }
                      >
                        ${escapeHTML(numero)}
                      </option>
                    `;
                  },
                ).join("")}

              </select>

            </label>


            <label class="mesas-agenda-field">

              <span>
                Fecha *
              </span>

              <input
                id="agendaFecha"
                type="date"
                required
                min="${anioActual()}-01-01"
                max="${anioActual()}-12-31"
                value="${escapeHTML(fechaActual)}"
              >

            </label>


            <label class="mesas-agenda-field">

              <span>
                Hora

                <small id="agendaHoraRequerida">
                  ${
                    tipoActual === "audiencia"
                      ? "*"
                      : "(opcional)"
                  }
                </small>
              </span>

              <input
                id="agendaHora"
                type="time"
                value="${escapeHTML(horaActual)}"
                ${
                  tipoActual === "audiencia"
                    ? "required"
                    : ""
                }
              >

            </label>


            <label class="mesas-agenda-field full">

              <span>
                Anotaciones
              </span>

              <textarea
                id="agendaNotas"
                class="mesas-textarea"
                rows="5"
                placeholder="Escribe las anotaciones del evento..."
              >${escapeHTML(notasActuales)}</textarea>

            </label>

          </div>


          <p
            class="mesas-form-error"
            id="agendaFormError"
            hidden
          ></p>

        </form>

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="cancelAgendaEvento"
        >
          Cancelar
        </button>

        <button
          type="button"
          class="mesas-modal-confirm"
          id="saveAgendaEvento"
        >
          <i class="fa-solid fa-floppy-disk"></i>
          Guardar
        </button>

      </footer>

    </div>
  `);


  document
    .getElementById(
      "cancelAgendaEvento",
    )
    ?.addEventListener(
      "click",
      closeForm,
    );


  const tipoSelect =
    document.getElementById(
      "agendaTipo",
    );

  const horaInput =
    document.getElementById(
      "agendaHora",
    );

  const horaLabel =
    document.getElementById(
      "agendaHoraRequerida",
    );


  tipoSelect
    ?.addEventListener(
      "change",
      () => {
        const audiencia =
          tipoSelect.value ===
          "audiencia";

        if (horaInput) {
          horaInput.required =
            audiencia;
        }

        if (horaLabel) {
          horaLabel.textContent =
            audiencia
              ? "*"
              : "(opcional)";
        }
      },
    );


  document
    .getElementById(
      "saveAgendaEvento",
    )
    ?.addEventListener(
      "click",
      () => {
        guardarEventoDesdeForm(
          evento,
          onSaved,
        );
      },
    );
}


// ============================================================
// GUARDAR EVENTO
// ============================================================

function guardarEventoDesdeForm(
  eventoAnterior,
  onSaved,
) {
  const tipo =
    document
      .getElementById(
        "agendaTipo",
      )
      ?.value || "";

  const expediente =
    document
      .getElementById(
        "agendaExpediente",
      )
      ?.value || "";

  const fecha =
    document
      .getElementById(
        "agendaFecha",
      )
      ?.value || "";

  const hora =
    document
      .getElementById(
        "agendaHora",
      )
      ?.value || "";

  const notas =
    document
      .getElementById(
        "agendaNotas",
      )
      ?.value.trim() || "";


  const error =
    validarEvento({
      tipo,
      expediente,
      fecha,
      hora,
    });


  if (error) {
    mostrarErrorForm(
      error,
    );

    return;
  }


  const expedientes =
    getExpedientesPermitidos();

  const expedienteData =
    expedientes.find(
      (item) =>
        getNumeroExpediente(
          item,
        ) === expediente,
    );


  if (!expedienteData) {
    mostrarErrorForm(
      "El expediente seleccionado no pertenece a la mesa actual.",
    );

    return;
  }


  const eventos =
    getEventosAgenda();

  const session =
    getSession();


  const nuevoEvento = {
    ...(eventoAnterior || {}),
    id:
      eventoAnterior?.id ||
      createId(),

    tipo,

    expediente,

    fecha,

    hora:
      hora || "",

    notas,

    mesa:
      mesaDeExpediente(
        expedienteData,
      ),

    creadoPor:
      eventoAnterior?.creadoPor ||
      session?.nombre ||
      session?.email ||
      "Secretaría de Acuerdos",
  };


  if (eventoAnterior) {
    const actualizados =
      eventos.map(
        (evento) =>
          evento.id ===
          eventoAnterior.id
            ? nuevoEvento
            : evento,
      );

    saveData(
      KEY_AGENDA,
      actualizados,
    );

    sincronizarNotificacionesEvento(
      nuevoEvento,
    );
  } else {
    saveData(
      KEY_AGENDA,
      [
        ...eventos,
        nuevoEvento,
      ],
    );

    generarNotificacionesEvento(
      nuevoEvento,
    );
  }


  closeForm();


  if (
    typeof onSaved ===
    "function"
  ) {
    onSaved(
      nuevoEvento,
    );
  }
}


// ============================================================
// DETALLE DEL EVENTO
// ============================================================

function openDetalleEvento(
  id,
  onChanged,
) {
  const evento =
    getEventosAgenda()
      .find(
        (item) =>
          item.id === id,
      );

  if (!evento) {
    return;
  }


  showModal(`
    <div class="mesas-modal-shell">

      <header class="mesas-modal-header">

        <div class="mesas-modal-step">
          <i class="fa-solid ${iconoTipoEventoAgenda(evento.tipo)}"></i>
        </div>

        <div class="mesas-modal-header-text">

          <h2>
            ${escapeHTML(
              etiquetaTipoEventoAgenda(
                evento.tipo,
              ),
            )}
          </h2>

          <p>
            Expediente
            ${escapeHTML(evento.expediente)}
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        <div class="mesas-modal-info">

          <div class="mesas-modal-info-item">

            <span>Tipo</span>

            <strong>
              ${escapeHTML(
                etiquetaTipoEventoAgenda(
                  evento.tipo,
                ),
              )}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>Expediente</span>

            <strong>
              ${escapeHTML(evento.expediente)}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>Fecha</span>

            <strong>
              ${escapeHTML(
                formatFecha(
                  evento.fecha,
                ),
              )}
            </strong>

          </div>


          <div class="mesas-modal-info-item">

            <span>Hora</span>

            <strong>
              ${escapeHTML(
                evento.hora ||
                "Sin hora",
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
          id="closeAgendaDetalle"
        >
          Cerrar
        </button>


        <button
          type="button"
          class="mesas-secondary-btn"
          id="editAgendaEvento"
        >
          <i class="fa-solid fa-pen"></i>
          Editar
        </button>


        <button
          type="button"
          class="mesas-modal-confirm danger"
          id="deleteAgendaEvento"
        >
          <i class="fa-solid fa-trash"></i>
          Eliminar
        </button>

      </footer>

    </div>
  `);


  document
    .getElementById(
      "closeAgendaDetalle",
    )
    ?.addEventListener(
      "click",
      closeForm,
    );


    // Los exhortos se gestionan desde el apartado Exhortos.
  if (evento.tipo === "exhorto") {
    document.getElementById("editAgendaEvento")?.remove();
    document.getElementById("deleteAgendaEvento")?.remove();
  }
  document
    .getElementById(
      "editAgendaEvento",
    )
    ?.addEventListener(
      "click",
      () => {
        closeForm();

        openEventoForm({
          evento,

          tipoInicial:
            evento.tipo,

          fechaInicial:
            evento.fecha,

          onSaved:
            onChanged,
        });
      },
    );


  document
    .getElementById(
      "deleteAgendaEvento",
    )
    ?.addEventListener(
      "click",
      () => {
        openConfirmarEliminar(
          evento,
          onChanged,
        );
      },
    );
}


// ============================================================
// CONFIRMACIÓN DE ELIMINACIÓN
// ============================================================

function openConfirmarEliminar(
  evento,
  onChanged,
) {
  showModal(`
    <div class="mesas-modal-shell">

      <header class="mesas-modal-header">

        <div class="mesas-modal-step">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>

        <div class="mesas-modal-header-text">

          <h2>
            Eliminar evento
          </h2>

          <p>
            Esta acción no se puede deshacer.
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        <div class="mesas-modal-message">

          <i class="fa-solid fa-trash"></i>

          <span>
            Se eliminará
            ${escapeHTML(
              etiquetaTipoEventoAgenda(
                evento.tipo,
              ),
            )}
            del expediente

            <strong>
              ${escapeHTML(
                evento.expediente,
              )}
            </strong>.
          </span>

        </div>

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="cancelDeleteAgenda"
        >
          Cancelar
        </button>

        <button
          type="button"
          class="mesas-modal-confirm danger"
          id="confirmDeleteAgenda"
        >
          <i class="fa-solid fa-trash"></i>
          Eliminar
        </button>

      </footer>

    </div>
  `);


  document
    .getElementById(
      "cancelDeleteAgenda",
    )
    ?.addEventListener(
      "click",
      closeForm,
    );


  document
    .getElementById(
      "confirmDeleteAgenda",
    )
    ?.addEventListener(
      "click",
      () => {
        eliminarEventoAgenda(
          evento.id,
        );

        closeForm();

        if (
          typeof onChanged ===
          "function"
        ) {
          onChanged();
        }
      },
    );
}


// ============================================================
// ELIMINAR EVENTO
// ============================================================

export function eliminarEventoAgenda(
  id,
) {
  const eventos =
    getEventosAgenda()
      .filter(
        (evento) =>
          evento.id !== id,
      );

  saveData(
    KEY_AGENDA,
    eventos,
  );

  eliminarNotificacionesEvento(
    id,
  );
}


// ============================================================
// VALIDAR EVENTO
// ============================================================

function validarEvento({
  tipo,
  expediente,
  fecha,
  hora,
}) {
  const tipoValido =
    TIPOS_EVENTO_AGENDA.some(
      (item) =>
        item.clave === tipo,
    );

  if (!tipoValido) {
    return "Selecciona un tipo de evento válido.";
  }


  if (!expediente) {
    return "Selecciona un expediente.";
  }


  const expedientes =
    getExpedientesPermitidos();

  const permitido =
    expedientes.some(
      (item) =>
        getNumeroExpediente(
          item,
        ) === expediente,
    );


  if (!permitido) {
    return "El expediente seleccionado no pertenece a la mesa actual.";
  }


  if (!fecha) {
    return "Selecciona la fecha del evento.";
  }


  if (
    obtenerAnio(fecha) !==
    anioActual()
  ) {
    return `La agenda corresponde al año vigente (${anioActual()}).`;
  }


  if (
    tipo === "audiencia" &&
    !hora
  ) {
    return "La hora es obligatoria para una audiencia.";
  }


  return "";
}


// ============================================================
// MOSTRAR ERROR DEL FORMULARIO
// ============================================================

function mostrarErrorForm(
  mensaje,
) {
  const error =
    document.getElementById(
      "agendaFormError",
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
// EXPEDIENTES DE LA MESA ACTUAL
// ============================================================

function getExpedientesPermitidos() {
  const datos =
    getData(
      "expedientes",
      [],
    );

  const expedientes =
    Array.isArray(datos)
      ? datos
      : [];

  const mesa =
    getSession()?.mesa ||
    null;

  // Usuarios generales pueden ver todos.
  if (!mesa) {
    return expedientes;
  }

  return expedientes.filter(
    (expediente) =>
      mesaDeExpediente(
        expediente,
      ) === Number(mesa),
  );
}


// ============================================================
// ASIGNACIÓN DE MESA
// MISMA REGLA UTILIZADA ACTUALMENTE EN mesas.js
// ============================================================

function mesaDeExpediente(
  expediente,
) {
  const numero =
    getNumeroExpediente(
      expediente,
    );

  const {
    consecutivo,
    anio,
  } =
    parseNumero(
      numero,
    );

  const anioFecha =
    Number(
      String(
        expediente.fechaRecepcion ||
        expediente.fecha ||
        expediente.creadoEn ||
        "",
      ).slice(0, 4),
    );

  const anioEfectivo =
    anio ||
    anioFecha ||
    null;

  const texto = [
    numero,
    expediente.tipo,
    expediente.clasificacion,
    expediente.asunto,
  ]
    .filter(Boolean)
    .join(" ");


  if (
    /\bOJC\b/i.test(texto) ||
    (
      anioEfectivo &&
      anioEfectivo <= 2021
    )
  ) {
    return 3;
  }


  if (
    consecutivo === null
  ) {
    return 1;
  }


  return (
    consecutivo % 2 === 0
      ? 1
      : 2
  );
}


// ============================================================
// INTERPRETAR NÚMERO DE EXPEDIENTE
// ============================================================

function parseNumero(
  numero,
) {
  const texto =
    String(
      numero || "",
    );

  let match =
    texto.match(
      /(\d+)\s*\/\s*(\d{4})/,
    );


  if (match) {
    return {
      consecutivo:
        Number(match[1]),

      anio:
        Number(match[2]),
    };
  }


  match =
    texto.match(
      /(\d{4})\D+(\d+)/,
    );


  if (match) {
    return {
      consecutivo:
        Number(match[2]),

      anio:
        Number(match[1]),
    };
  }


  return {
    consecutivo: null,
    anio: null,
  };
}


// ============================================================
// NÚMERO DE EXPEDIENTE
// ============================================================

function getNumeroExpediente(
  expediente,
) {
  return String(
    expediente?.numero ||
    expediente?.expediente ||
    "",
  );
}


// ============================================================
// HELPERS DEL CALENDARIO
// ============================================================

function normalizarTipo(
  tipo,
) {
  return TIPOS_EVENTO_AGENDA.some(
    (item) =>
      item.clave === tipo,
  )
    ? tipo
    : "audiencia";
}


function normalizarFiltro(
  filtro,
) {
    if (
    TIPOS_EVENTO_AGENDA.some(
      (item) =>
        item.clave === filtro,
    )
  ) {
    return filtro;
  }

  return "ambas";
}


function construirFechaISO(
  anio,
  mes,
  dia,
) {
  return [
    anio,

    String(
      mes + 1,
    ).padStart(
      2,
      "0",
    ),

    String(
      dia,
    ).padStart(
      2,
      "0",
    ),
  ].join("-");
}


function hoyISO() {
  const hoy =
    new Date();

  return construirFechaISO(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate(),
  );
}


function anioActual() {
  return new Date()
    .getFullYear();
}


function obtenerAnio(
  fecha,
) {
  return Number(
    String(
      fecha || "",
    ).slice(
      0,
      4,
    ),
  );
}


function obtenerMes(
  fecha,
) {
  const mes =
    Number(
      String(
        fecha || "",
      ).slice(
        5,
        7,
      ),
    );

  return (
    Number.isFinite(mes)
      ? mes - 1
      : -1
  );
}


function esHoy(
  fecha,
) {
  return (
    fecha === hoyISO()
  );
}


function fechaInicialParaMes(
  anio,
  mes,
) {
  const hoy =
    new Date();

  if (
    hoy.getFullYear() === anio &&
    hoy.getMonth() === mes
  ) {
    return hoyISO();
  }

  return construirFechaISO(
    anio,
    mes,
    1,
  );
}


// ============================================================
// ORDEN DE EVENTOS DEL MISMO DÍA
// ============================================================

function ordenarEventos(
  a,
  b,
) {
  const horaA =
    a.hora || "99:99";

  const horaB =
    b.hora || "99:99";


  if (
    horaA !== horaB
  ) {
    return horaA.localeCompare(
      horaB,
    );
  }


  return String(
    a.tipo || "",
  ).localeCompare(
    String(
      b.tipo || "",
    ),
  );
}


// ============================================================
// FORMATO DE FECHA
// ============================================================

function formatFecha(
  valor,
) {
  if (!valor) {
    return "—";
  }

  const partes =
    String(valor)
      .slice(
        0,
        10,
      )
      .split("-");


  if (
    partes.length !== 3
  ) {
    return String(valor);
  }


  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}