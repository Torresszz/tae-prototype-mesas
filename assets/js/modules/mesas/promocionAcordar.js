// ============================================================
// ACORDAR PROMOCIÓN
// assets/js/modules/mesas/promocionAcordar.js
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
  showModal,
  closeForm,
} from "../../forms/formHelper.js";

import {
  getSession,
} from "../../auth.js";

import {
  etiquetaEstado,
} from "./estados.js";


// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY_PROMOCIONES =
  "promociones";

const KEY_EXPEDIENTES =
  "expedientes";

const KEY_SEGUIMIENTO =
  "mesasSeguimiento";

const KEY_AGENDA =
  "mesasAgenda";

const KEY_NOTIFICACIONES =
  "mesasNotificaciones";

const DIAS_ALERTA_AUDIENCIA =
  7;


// ============================================================
// ABRIR MODAL
// ============================================================

export function openAcordarPromocion(
  promocionId,
  alTerminar = null,
) {

  const contexto =
    getContextoPromocion(
      promocionId,
    );


  if (!contexto) {

    window.alert(
      "No se encontró la promoción seleccionada.",
    );

    return;
  }


  const {
    promocion,
    expediente,
    numero,
    seguimiento,
  } =
    contexto;


  const acuerdoActual =
    normalizarAcuerdo(
      promocion.acuerdo,
    );


  const sentidoActual =
    acuerdoActual.sentido ||
    "procede";


  const escrito =
    obtenerEscritoPromocion(
      promocion,
    );


  const anexos =
    obtenerAnexosPromocion(
      promocion,
    );


  const audienciaActual =
    obtenerAudienciaPromocion(
      promocion,
    );


  showModal(`
    <div class="promocion-acordar-modal">


      <!-- ==================================================
      HEADER
      =================================================== -->

      <header class="promocion-acordar-header">

        <div>

          <span class="mesas-mini-eyebrow">
            Secretaría de Acuerdos
          </span>

          <h2>
            Acordar Promoción
          </h2>

          <p>
            Revisión del escrito y elaboración del proyecto de acuerdo.
          </p>

        </div>


        <span class="promocion-acordar-expediente">

          Expediente

          <strong>
            ${escapeHTML(
              numero,
            )}
          </strong>

        </span>

      </header>


      <!-- ==================================================
      INFORMACIÓN SUPERIOR
      =================================================== -->

      <section class="promocion-acordar-meta">


        <div>

          <span>
            Fecha de promoción
          </span>

          <strong>
            ${escapeHTML(
              formatFecha(
                promocion.fecha ||
                promocion.creadoEn,
              ),
            )}
          </strong>

        </div>


        <div>

          <span>
            Promovente
          </span>

          <strong>
            ${escapeHTML(
              obtenerPromovente(
                promocion,
                expediente,
              ),
            )}
          </strong>

        </div>


        <div>

          <span>
            Actor
          </span>

          <strong>
            ${escapeHTML(
              expediente.actor ||
              expediente.promovente ||
              "—",
            )}
          </strong>

        </div>


        <div>

          <span>
            Demandado
          </span>

          <strong>
            ${escapeHTML(
              expediente.demandado ||
              "—",
            )}
          </strong>

        </div>


        <div>

          <span>
            Estado del expediente
          </span>

          <strong>
            ${escapeHTML(
              etiquetaEstado(
                seguimiento?.estado ||
                "en-proceso",
              ),
            )}
          </strong>

        </div>


      </section>


      <!-- ==================================================
      DOS COLUMNAS
      =================================================== -->

      <div class="promocion-acordar-grid">


        <!-- ================================================
        COLUMNA IZQUIERDA
        CONSULTA
        ================================================= -->

        <section class="promocion-acordar-panel consulta">


          <div class="promocion-acordar-panel-title">

            <div class="promocion-acordar-panel-icon">

              <i class="fa-regular fa-file-lines"></i>

            </div>


            <div>

              <span>
                Consulta
              </span>

              <h3>
                Promoción recibida
              </h3>

            </div>

          </div>


          <!-- RESUMEN -->

          <div class="promocion-consulta-block">

            <span class="promocion-consulta-label">
              Resumen de la promoción
            </span>


            <p class="promocion-consulta-resumen">

              ${escapeHTML(
                promocion.descripcion ||
                promocion.extracto ||
                promocion.observacion ||
                promocion.tipo ||
                "Sin resumen registrado.",
              )}

            </p>

          </div>


          <!-- ESCRITO PRINCIPAL -->

          <div class="promocion-consulta-block">

            <span class="promocion-consulta-label">
              Escrito presentado
            </span>


            ${renderArchivoPrincipal(
              escrito,
            )}

          </div>


          <!-- VISTA PREVIA -->

          <div class="promocion-consulta-block">

            <span class="promocion-consulta-label">
              Vista previa
            </span>


            <div
              class="promocion-document-preview"
              id="promocionDocumentPreview"
            >

              ${renderVistaPrevia(
                escrito,
              )}

            </div>

          </div>


          <!-- ANEXOS -->

          <div class="promocion-consulta-block">

            <span class="promocion-consulta-label">

              Anexos

              ${
                anexos.length
                  ? `(${anexos.length})`
                  : ""
              }

            </span>


            <div class="promocion-anexos-list">

              ${renderAnexos(
                anexos,
              )}

            </div>

          </div>


        </section>


        <!-- ================================================
        COLUMNA DERECHA
        RESOLUCIÓN
        ================================================= -->

        <section class="promocion-acordar-panel resolucion">


          <div class="promocion-acordar-panel-title">

            <div class="promocion-acordar-panel-icon">

              <i class="fa-solid fa-scale-balanced"></i>

            </div>


            <div>

              <span>
                Resolución
              </span>

              <h3>
                Sentido y proyecto de acuerdo
              </h3>

            </div>

          </div>


          <!-- ============================================
          SENTIDO
          ============================================= -->

          <div class="promocion-resolucion-section">

            <span class="promocion-resolucion-label">
              Sentido del acuerdo
            </span>


            <div class="promocion-sentidos-grid">


              ${renderSentidoOption(
                "procede",
                "De conformidad / Procede",
                "fa-circle-check",
                "Dar trámite favorable a lo solicitado.",
                sentidoActual,
              )}


              ${renderSentidoOption(
                "improcedente",
                "No ha lugar / Improcedente",
                "fa-circle-xmark",
                "Negar o declarar improcedente la petición.",
                sentidoActual,
              )}


              ${renderSentidoOption(
                "requerir",
                "Dar vista / Requerir",
                "fa-clock",
                "Conceder plazo para manifestarse o cumplir.",
                sentidoActual,
              )}


              ${renderSentidoOption(
                "cumplimiento",
                "Cumple / No cumple prevención",
                "fa-list-check",
                "Resolver sobre una prevención previamente realizada.",
                sentidoActual,
              )}


            </div>

          </div>


          <!-- ============================================
          CAMPOS CONDICIONALES DEL SENTIDO
          ============================================= -->

          <div
            class="promocion-conditional-box"
            id="promocionPlazoBox"
            ${
              sentidoActual ===
              "requerir"
                ? ""
                : "hidden"
            }
          >

            <label>

              Días de plazo

              <input
                type="number"
                id="promocionDiasPlazo"
                min="1"
                max="365"
                value="${escapeHTML(
                  String(
                    acuerdoActual.diasPlazo ||
                    "",
                  ),
                )}"
                placeholder="Ej. 3"
              >

            </label>

          </div>


          <div
            class="promocion-conditional-box"
            id="promocionCumplimientoBox"
            ${
              sentidoActual ===
              "cumplimiento"
                ? ""
                : "hidden"
            }
          >

            <span class="promocion-resolucion-label">
              Resultado de la prevención
            </span>


            <div class="promocion-inline-options">


              <label>

                <input
                  type="radio"
                  name="promocionCumplimiento"
                  value="cumple"
                  ${
                    acuerdoActual.cumplimiento !==
                    "no-cumple"
                      ? "checked"
                      : ""
                  }
                >

                Cumple

              </label>


              <label>

                <input
                  type="radio"
                  name="promocionCumplimiento"
                  value="no-cumple"
                  ${
                    acuerdoActual.cumplimiento ===
                    "no-cumple"
                      ? "checked"
                      : ""
                  }
                >

                No cumple

              </label>


            </div>

          </div>


          <!-- ============================================
          ACCIONES COMPLEMENTARIAS
          ============================================= -->

          <div class="promocion-resolucion-section">

            <span class="promocion-resolucion-label">
              Acciones complementarias
            </span>


            <div class="promocion-check-list">


              <label class="promocion-check-option">

                <input
                  type="checkbox"
                  id="promocionNotificacionPersonal"
                  ${
                    acuerdoActual
                      .requiereNotificacionPersonal
                      ? "checked"
                      : ""
                  }
                >

                <span>

                  <strong>
                    Requiere notificación personal
                  </strong>

                  <small>
                    Marcar cuando el acuerdo deba notificarse personalmente.
                  </small>

                </span>

              </label>


              <label class="promocion-check-option">

                <input
                  type="checkbox"
                  id="promocionAgendarAudiencia"
                  ${
                    audienciaActual
                      ? "checked"
                      : ""
                  }
                >

                <span>

                  <strong>
                    Agendar audiencia
                  </strong>

                  <small>
                    Vincular una audiencia directamente con esta promoción.
                  </small>

                </span>

              </label>


            </div>

          </div>


          <!-- ============================================
          DATOS DE AUDIENCIA
          ============================================= -->

          <div
            class="promocion-audiencia-fields"
            id="promocionAudienciaFields"
            ${
              audienciaActual
                ? ""
                : "hidden"
            }
          >

            <div>

              <label for="promocionAudienciaFecha">
                Fecha
              </label>

              <input
                type="date"
                id="promocionAudienciaFecha"
                value="${escapeHTML(
                  audienciaActual?.fecha ||
                  "",
                )}"
              >

            </div>


            <div>

              <label for="promocionAudienciaHora">
                Hora
              </label>

              <input
                type="time"
                id="promocionAudienciaHora"
                value="${escapeHTML(
                  audienciaActual?.hora ||
                  "",
                )}"
              >

            </div>


            <div class="full">

              <label for="promocionAudienciaTipo">
                Tipo de audiencia
              </label>

              <input
                type="text"
                id="promocionAudienciaTipo"
                value="${escapeHTML(
                  audienciaActual
                    ?.tipoAudiencia ||
                  "",
                )}"
                placeholder="Ej. Conciliación, pruebas y alegatos..."
              >

            </div>

          </div>


          <!-- ============================================
          EDITOR
          ============================================= -->

          <div class="promocion-resolucion-section">

            <div class="promocion-editor-header">

              <div>

                <span class="promocion-resolucion-label">
                  Proyecto de acuerdo
                </span>

                <small>
                  La base cambia automáticamente según el sentido seleccionado.
                </small>

              </div>


              <button
                type="button"
                class="mesas-secondary-btn"
                id="promocionRegenerarAcuerdo"
              >

                <i class="fa-solid fa-rotate"></i>

                Regenerar base

              </button>

            </div>


            <textarea
              id="promocionTextoAcuerdo"
              class="promocion-acuerdo-editor"
              rows="15"
            >${escapeHTML(
              acuerdoActual.texto ||
              generarTextoBase(
                sentidoActual,
                contexto,
                acuerdoActual,
              ),
            )}</textarea>

          </div>


          <p
            class="mesas-form-error"
            id="promocionAcordarError"
            hidden
          ></p>


        </section>


      </div>


      <!-- ==================================================
      FOOTER
      =================================================== -->

      <footer class="promocion-acordar-footer">


        <button
          type="button"
          class="mesas-modal-cancel"
          id="promocionAcordarCancelar"
        >

          Cancelar

        </button>


        <div class="promocion-acordar-footer-actions">


          <button
            type="button"
            class="mesas-secondary-btn"
            id="promocionGuardarBorrador"
          >

            <i class="fa-regular fa-floppy-disk"></i>

            Guardar borrador

          </button>


          <button
            type="button"
            class="mesas-primary-btn"
            id="promocionGuardarFirma"
          >

            <i class="fa-solid fa-paper-plane"></i>

            Guardar y enviar a firma

          </button>


        </div>


      </footer>


    </div>
  `);


  configurarEventosModal(
    contexto,
    alTerminar,
  );

}
// ============================================================
// CONTEXTO DE LA PROMOCIÓN
// ============================================================

function getContextoPromocion(
  promocionId,
) {

  const promociones =
    getData(
      KEY_PROMOCIONES,
      [],
    );


  const expedientes =
    getData(
      KEY_EXPEDIENTES,
      [],
    );


  const seguimiento =
    getData(
      KEY_SEGUIMIENTO,
      {},
    );


  if (
    !Array.isArray(
      promociones,
    )
  ) {
    return null;
  }


  const promocion =
    promociones.find(
      (item) =>
        String(
          item?.id ||
          "",
        ) ===
        String(
          promocionId ||
          "",
        ),
    );


  if (!promocion) {
    return null;
  }


  const numero =
    String(
      promocion.expediente ||
      promocion.numero ||
      "",
    );


  const expediente =
    Array.isArray(
      expedientes,
    )

      ? expedientes.find(
          (item) => {

            const expedienteNumero =
              String(
                item.numero ||
                item.expediente ||
                item.numeroExpediente ||
                "",
              );


            return (
              expedienteNumero ===
              numero
            );

          },
        )

      : null;


  if (!expediente) {
    return null;
  }


  return {

    promocion,

    expediente,

    numero,

    seguimiento:
      seguimiento[numero] ||
      null,

  };

}


// ============================================================
// NORMALIZAR ACUERDO
// ============================================================

function normalizarAcuerdo(
  acuerdo,
) {

  if (!acuerdo) {

    return {
      sentido:
        "procede",

      texto:
        "",

      diasPlazo:
        "",

      cumplimiento:
        "cumple",

      requiereNotificacionPersonal:
        false,
    };

  }


  if (
    typeof acuerdo ===
    "string"
  ) {

    return {

      sentido:
        "procede",

      texto:
        acuerdo,

      diasPlazo:
        "",

      cumplimiento:
        "cumple",

      requiereNotificacionPersonal:
        false,

    };

  }


  return {

    sentido:
      acuerdo.sentido ||
      "procede",

    texto:
      acuerdo.texto ||
      acuerdo.contenido ||
      "",

    diasPlazo:
      acuerdo.diasPlazo ||
      "",

    cumplimiento:
      acuerdo.cumplimiento ||
      "cumple",

    requiereNotificacionPersonal:
      Boolean(
        acuerdo
          .requiereNotificacionPersonal,
      ),

    ...acuerdo,

  };

}


// ============================================================
// PROMOVENTE
// ============================================================

function obtenerPromovente(
  promocion,
  expediente,
) {

  return (
    promocion.promovente ||
    promocion.actor ||
    expediente.actor ||
    expediente.promovente ||
    "—"
  );

}


// ============================================================
// ESCRITO PRINCIPAL
// ============================================================

function obtenerEscritoPromocion(
  promocion,
) {

  const candidatos = [

    promocion.archivo,

    promocion.documento,

    promocion.escrito,

    promocion.pdf,

  ];


  const objeto =
    candidatos.find(
      (item) =>
        item &&
        typeof item ===
          "object",
    );


  if (objeto) {

    return {

      nombre:
        objeto.nombre ||
        objeto.nombreArchivo ||
        "Escrito de promoción",

      tipo:
        objeto.tipo ||
        objeto.mimeType ||
        "",

      dataUrl:
        objeto.dataUrl ||
        objeto.url ||
        "",

      tamano:
        objeto.tamano ||
        objeto.size ||
        null,

    };

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

      tipo:
        promocion.tipoArchivo ||
        "application/pdf",

      dataUrl:
        promocion.archivoDataUrl ||
        promocion.dataUrl,

      tamano:
        promocion.tamanoArchivo ||
        null,

    };

  }


  return null;

}


// ============================================================
// ANEXOS
// ============================================================

function obtenerAnexosPromocion(
  promocion,
) {

  const posibles =

    promocion.anexos ||
    promocion.archivosAnexos ||
    promocion.documentosAnexos ||
    [];


  if (
    !Array.isArray(
      posibles,
    )
  ) {
    return [];
  }


  return posibles.map(
    (
      anexo,
      index,
    ) => {

      if (
        typeof anexo ===
        "string"
      ) {

        return {

          nombre:
            anexo,

          dataUrl:
            "",

        };

      }


      return {

        nombre:
          anexo.nombre ||
          anexo.nombreArchivo ||
          `Anexo ${index + 1}`,

        tipo:
          anexo.tipo ||
          anexo.mimeType ||
          "",

        dataUrl:
          anexo.dataUrl ||
          anexo.url ||
          "",

        tamano:
          anexo.tamano ||
          anexo.size ||
          null,

      };

    },
  );

}


// ============================================================
// AUDIENCIA ACTUAL
// ============================================================

function obtenerAudienciaPromocion(
  promocion,
) {

  const agenda =
    getData(
      KEY_AGENDA,
      [],
    );


  if (
    !Array.isArray(
      agenda,
    )
  ) {
    return null;
  }


  if (
    promocion.audienciaEventoId
  ) {

    const directa =
      agenda.find(
        (item) =>
          String(
            item.id,
          ) ===
          String(
            promocion
              .audienciaEventoId,
          ),
      );


    if (directa) {
      return directa;
    }

  }


  return (
    agenda.find(
      (item) =>
        item.tipo ===
          "audiencia" &&

        item.origen ===
          "promocion" &&

        String(
          item.promocionId,
        ) ===
        String(
          promocion.id,
        ),
    ) ||
    null
  );

}


// ============================================================
// RENDER DEL ESCRITO PRINCIPAL
// ============================================================

function renderArchivoPrincipal(
  archivo,
) {

  if (!archivo) {

    return `
      <div class="promocion-file-empty">

        <i class="fa-regular fa-file"></i>

        <span>
          No hay escrito digital adjunto.
        </span>

      </div>
    `;

  }


  return `
    <div class="promocion-file-card">

      <div class="promocion-file-icon">

        <i class="fa-regular fa-file-pdf"></i>

      </div>


      <div class="promocion-file-info">

        <strong>
          ${escapeHTML(
            archivo.nombre,
          )}
        </strong>

        <span>
          ${
            archivo.tamano

              ? escapeHTML(
                  formatFileSize(
                    archivo.tamano,
                  ),
                )

              : "Documento adjunto"
          }
        </span>

      </div>


      ${
        archivo.dataUrl

          ? `
            <button
              type="button"
              class="mesas-secondary-btn"
              data-preview-documento="principal"
            >

              <i class="fa-regular fa-eye"></i>

              Ver

            </button>
          `

          : ""
      }

    </div>
  `;

}


// ============================================================
// VISTA PREVIA
// ============================================================

function renderVistaPrevia(
  archivo,
) {

  if (
    !archivo ||
    !archivo.dataUrl
  ) {

    return `
      <div class="promocion-preview-empty">

        <i class="fa-regular fa-file-lines"></i>

        <strong>
          Sin vista previa disponible
        </strong>

        <span>
          El escrito no tiene un archivo digital asociado.
        </span>

      </div>
    `;

  }


  const extension =
    String(
      archivo.nombre ||
      "",
    )
      .split(".")
      .pop()
      ?.toLowerCase();


  if (
    extension ===
      "pdf" ||
    archivo.tipo ===
      "application/pdf"
  ) {

    return `
      <iframe
        src="${archivo.dataUrl}"
        title="Vista previa de la promoción"
        class="promocion-preview-frame"
      ></iframe>
    `;

  }


  return `
    <div class="promocion-preview-empty">

      <i class="fa-regular fa-file-word"></i>

      <strong>
        ${escapeHTML(
          archivo.nombre,
        )}
      </strong>

      <span>
        Este formato no puede visualizarse directamente en el navegador.
      </span>

      <a
        href="${archivo.dataUrl}"
        download="${escapeHTML(
          archivo.nombre,
        )}"
        class="mesas-secondary-btn"
      >

        <i class="fa-solid fa-download"></i>

        Abrir documento

      </a>

    </div>
  `;

}


// ============================================================
// ANEXOS
// ============================================================

function renderAnexos(
  anexos,
) {

  if (
    !anexos.length
  ) {

    return `
      <div class="promocion-anexos-empty">
        Sin anexos registrados.
      </div>
    `;

  }


  return anexos
    .map(
      (
        anexo,
        index,
      ) => {

        return `
          <div class="promocion-anexo-item">

            <div>

              <i class="fa-solid fa-paperclip"></i>

              <span>
                ${escapeHTML(
                  anexo.nombre,
                )}
              </span>

            </div>


            ${
              anexo.dataUrl

                ? `
                  <button
                    type="button"
                    class="mesas-secondary-btn"
                    data-preview-anexo="${index}"
                  >

                    Ver

                  </button>
                `

                : ""
            }

          </div>
        `;

      },
    )
    .join("");

}


// ============================================================
// OPCIONES DE SENTIDO
// ============================================================

function renderSentidoOption(
  value,
  titulo,
  icono,
  descripcion,
  seleccionado,
) {

  return `
    <label
      class="promocion-sentido-card ${
        seleccionado ===
        value
          ? "active"
          : ""
      }"
    >

      <input
        type="radio"
        name="promocionSentido"
        value="${escapeHTML(
          value,
        )}"
        ${
          seleccionado ===
          value
            ? "checked"
            : ""
        }
      >


      <div class="promocion-sentido-icon">

        <i class="fa-solid ${escapeHTML(
          icono,
        )}"></i>

      </div>


      <div>

        <strong>
          ${escapeHTML(
            titulo,
          )}
        </strong>

        <span>
          ${escapeHTML(
            descripcion,
          )}
        </span>

      </div>

    </label>
  `;

}


// ============================================================
// CONFIGURAR EVENTOS DEL MODAL
// ============================================================

function configurarEventosModal(
  contexto,
  alTerminar,
) {

  const {
    promocion,
  } =
    contexto;


  // ==========================================================
  // CANCELAR
  // ==========================================================

  document
    .getElementById(
      "promocionAcordarCancelar",
    )
    ?.addEventListener(
      "click",
      closeForm,
    );


  // ==========================================================
  // CAMBIO DE SENTIDO
  // ==========================================================

  document
    .querySelectorAll(
      'input[name="promocionSentido"]',
    )
    .forEach(
      (radio) => {

        radio.addEventListener(
          "change",
          () => {

            actualizarSentidoVisual();

            actualizarCamposCondicionales();


            const nuevoTexto =
              generarTextoBase(
                getSentidoSeleccionado(),
                contexto,
                leerConfiguracionActual(),
              );


            const editor =
              document.getElementById(
                "promocionTextoAcuerdo",
              );


            if (editor) {

              editor.value =
                nuevoTexto;

            }

          },
        );

      },
    );


  // ==========================================================
  // CAMBIO CUMPLIMIENTO
  // ==========================================================

  document
    .querySelectorAll(
      'input[name="promocionCumplimiento"]',
    )
    .forEach(
      (radio) => {

        radio.addEventListener(
          "change",
          () => {

            regenerarTextoActual(
              contexto,
            );

          },
        );

      },
    );


  // ==========================================================
  // DÍAS DE PLAZO
  // ==========================================================

  document
    .getElementById(
      "promocionDiasPlazo",
    )
    ?.addEventListener(
      "input",
      () => {

        if (
          getSentidoSeleccionado() ===
          "requerir"
        ) {

          regenerarTextoActual(
            contexto,
          );

        }

      },
    );


  // ==========================================================
  // CHECK AUDIENCIA
  // ==========================================================

  document
    .getElementById(
      "promocionAgendarAudiencia",
    )
    ?.addEventListener(
      "change",
      (event) => {

        const fields =
          document.getElementById(
            "promocionAudienciaFields",
          );


        if (fields) {

          fields.hidden =
            !event.target.checked;

        }

      },
    );


  // ==========================================================
  // REGENERAR BASE
  // ==========================================================

  document
    .getElementById(
      "promocionRegenerarAcuerdo",
    )
    ?.addEventListener(
      "click",
      () => {

        regenerarTextoActual(
          contexto,
        );

      },
    );


  // ==========================================================
  // ESCRITO PRINCIPAL
  // ==========================================================

  document
    .querySelector(
      '[data-preview-documento="principal"]',
    )
    ?.addEventListener(
      "click",
      () => {

        const escrito =
          obtenerEscritoPromocion(
            promocion,
          );


        actualizarVistaPrevia(
          escrito,
        );

      },
    );


  // ==========================================================
  // ANEXOS
  // ==========================================================

  const anexos =
    obtenerAnexosPromocion(
      promocion,
    );


  document
    .querySelectorAll(
      "[data-preview-anexo]",
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            const index =
              Number(
                button.dataset
                  .previewAnexo,
              );


            const anexo =
              anexos[index];


            if (anexo) {

              actualizarVistaPrevia(
                anexo,
              );

            }

          },
        );

      },
    );


  // ==========================================================
  // GUARDAR BORRADOR
  // ==========================================================

  document
    .getElementById(
      "promocionGuardarBorrador",
    )
    ?.addEventListener(
      "click",
      () => {

        guardarResolucionPromocion(
          contexto,
          {
            enviarFirma:
              false,

            alTerminar,
          },
        );

      },
    );


  // ==========================================================
  // GUARDAR Y ENVIAR A FIRMA
  // ==========================================================

  document
    .getElementById(
      "promocionGuardarFirma",
    )
    ?.addEventListener(
      "click",
      () => {

        guardarResolucionPromocion(
          contexto,
          {
            enviarFirma:
              true,

            alTerminar,
          },
        );

      },
    );


  actualizarSentidoVisual();

  actualizarCamposCondicionales();

}


// ============================================================
// SENTIDO SELECCIONADO
// ============================================================

function getSentidoSeleccionado() {

  return (
    document.querySelector(
      'input[name="promocionSentido"]:checked',
    )?.value ||
    "procede"
  );

}


// ============================================================
// ESTILO DE TARJETAS DE SENTIDO
// ============================================================

function actualizarSentidoVisual() {

  document
    .querySelectorAll(
      ".promocion-sentido-card",
    )
    .forEach(
      (card) => {

        const input =
          card.querySelector(
            'input[type="radio"]',
          );


        card.classList.toggle(
          "active",
          Boolean(
            input?.checked,
          ),
        );

      },
    );

}


// ============================================================
// CAMPOS CONDICIONALES
// ============================================================

function actualizarCamposCondicionales() {

  const sentido =
    getSentidoSeleccionado();


  const plazoBox =
    document.getElementById(
      "promocionPlazoBox",
    );


  const cumplimientoBox =
    document.getElementById(
      "promocionCumplimientoBox",
    );


  if (plazoBox) {

    plazoBox.hidden =
      sentido !==
      "requerir";

  }


  if (cumplimientoBox) {

    cumplimientoBox.hidden =
      sentido !==
      "cumplimiento";

  }

}


// ============================================================
// CONFIGURACIÓN ACTUAL DEL MODAL
// ============================================================

function leerConfiguracionActual() {

  return {

    sentido:
      getSentidoSeleccionado(),


    diasPlazo:
      document
        .getElementById(
          "promocionDiasPlazo",
        )
        ?.value ||
      "",


    cumplimiento:
      document.querySelector(
        'input[name="promocionCumplimiento"]:checked',
      )?.value ||
      "cumple",


    requiereNotificacionPersonal:
      Boolean(
        document
          .getElementById(
            "promocionNotificacionPersonal",
          )
          ?.checked,
      ),

  };

}


// ============================================================
// REGENERAR TEXTO
// ============================================================

function regenerarTextoActual(
  contexto,
) {

  const editor =
    document.getElementById(
      "promocionTextoAcuerdo",
    );


  if (!editor) {
    return;
  }


  editor.value =
    generarTextoBase(
      getSentidoSeleccionado(),
      contexto,
      leerConfiguracionActual(),
    );

}


// ============================================================
// GENERAR TEXTO BASE
// ============================================================

function generarTextoBase(
  sentido,
  contexto,
  configuracion = {},
) {

  const {
    promocion,
    expediente,
    numero,
  } =
    contexto;


  const actor =
    expediente.actor ||
    expediente.promovente ||
    "la parte actora";


  const demandado =
    expediente.demandado ||
    "la parte demandada";


  const resumen =
    promocion.descripcion ||
    promocion.extracto ||
    promocion.tipo ||
    "la promoción presentada";


  const fecha =
    formatFecha(
      promocion.fecha ||
      promocion.creadoEn,
    );


  const encabezado =
`EXPEDIENTE: ${numero}

Se tiene por recibido el escrito presentado con fecha ${fecha}, relacionado con el expediente citado al rubro, promovido dentro del procedimiento seguido por ${actor} en contra de ${demandado}.

Visto el contenido de la promoción mediante la cual ${resumen}`;


  switch (sentido) {


    // ========================================================
    // PROCEDE
    // ========================================================

    case "procede":

      return `${encabezado}

SE ACUERDA:

Se tiene por presentada la promoción de cuenta y, atendiendo a su contenido, se determina procedente lo solicitado para los efectos correspondientes dentro del expediente.

Agrégese el escrito y sus anexos a los autos para que obren como corresponda.

Notifíquese y cúmplase.`;


    // ========================================================
    // IMPROCEDENTE
    // ========================================================

    case "improcedente":

      return `${encabezado}

SE ACUERDA:

No ha lugar a acordar favorablemente lo solicitado en los términos planteados, por lo que se declara improcedente la petición contenida en la promoción.

Agrégese el escrito a los autos para constancia.

Notifíquese.`;


    // ========================================================
    // REQUERIR / DAR VISTA
    // ========================================================

    case "requerir": {

      const dias =
        configuracion.diasPlazo ||
        "[DÍAS]";


      return `${encabezado}

SE ACUERDA:

Dese vista y/o requiérase a la parte correspondiente para que, dentro del plazo de ${dias} días, manifieste lo que a su derecho convenga o dé cumplimiento a lo solicitado en el presente acuerdo.

Transcurrido el plazo concedido, con o sin manifestación, continúese con el trámite que corresponda.

Notifíquese.`;

    }


    // ========================================================
    // CUMPLIMIENTO
    // ========================================================

    case "cumplimiento": {

      const cumple =
        configuracion
          .cumplimiento !==
        "no-cumple";


      if (cumple) {

        return `${encabezado}

SE ACUERDA:

Se tiene a la parte promovente dando cumplimiento a la prevención formulada dentro del expediente.

En consecuencia, téngase por cumplido el requerimiento y continúese con el trámite correspondiente.

Notifíquese.`;

      }


      return `${encabezado}

SE ACUERDA:

Se determina que la prevención formulada dentro del expediente no ha sido cumplida en los términos requeridos.

En consecuencia, procédase conforme corresponda al estado procesal del asunto.

Notifíquese.`;

    }


    default:

      return encabezado;

  }

}


// ============================================================
// ACTUALIZAR VISTA PREVIA
// ============================================================

function actualizarVistaPrevia(
  archivo,
) {

  const preview =
    document.getElementById(
      "promocionDocumentPreview",
    );


  if (!preview) {
    return;
  }


  preview.innerHTML =
    renderVistaPrevia(
      archivo,
    );

}


// ============================================================
// TAMAÑO DE ARCHIVO
// ============================================================

function formatFileSize(
  bytes,
) {

  const numero =
    Number(
      bytes,
    );


  if (
    !numero ||
    Number.isNaN(
      numero,
    )
  ) {

    return "";

  }


  if (
    numero <
    1024
  ) {

    return `${numero} B`;

  }


  if (
    numero <
    1024 * 1024
  ) {

    return `${(
      numero /
      1024
    ).toFixed(1)} KB`;

  }


  return `${(
    numero /
    1024 /
    1024
  ).toFixed(1)} MB`;

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
      .split("-");


  if (
    parts.length ===
    3
  ) {

    return (
      `${parts[2]}/` +
      `${parts[1]}/` +
      `${parts[0]}`
    );

  }


  return String(
    value,
  );

}
// ============================================================
// GUARDAR RESOLUCIÓN
// ============================================================

function guardarResolucionPromocion(
  contexto,
  {
    enviarFirma = false,
    alTerminar = null,
  } = {},
) {

  const {
    promocion,
    expediente,
    numero,
    seguimiento,
  } =
    contexto;


  const sentido =
    getSentidoSeleccionado();


  const configuracion =
    leerConfiguracionActual();


  const texto =
    document
      .getElementById(
        "promocionTextoAcuerdo",
      )
      ?.value
      .trim() ||
    "";


  const agendarAudiencia =
    Boolean(
      document
        .getElementById(
          "promocionAgendarAudiencia",
        )
        ?.checked,
    );


  // ==========================================================
  // VALIDAR TEXTO
  // ==========================================================

  if (!texto) {

    mostrarErrorAcordar(
      "Debes escribir el contenido del acuerdo.",
    );

    return;
  }


  // ==========================================================
  // VALIDAR PLAZO
  // ==========================================================

  if (
    sentido ===
      "requerir" &&
    (
      !configuracion.diasPlazo ||
      Number(
        configuracion.diasPlazo,
      ) <= 0
    )
  ) {

    mostrarErrorAcordar(
      "Indica los días de plazo para el requerimiento.",
    );

    return;
  }


  // ==========================================================
  // DATOS DE AUDIENCIA
  // ==========================================================

  let audienciaDatos =
    null;


  if (agendarAudiencia) {

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


    const tipoAudiencia =
      document
        .getElementById(
          "promocionAudienciaTipo",
        )
        ?.value
        .trim() ||
      "";


    if (
      !fecha ||
      !hora ||
      !tipoAudiencia
    ) {

      mostrarErrorAcordar(
        "Completa fecha, hora y tipo de audiencia.",
      );

      return;
    }


    audienciaDatos = {

      fecha,

      hora,

      tipoAudiencia,

    };

  }


  // ==========================================================
  // BUSCAR PROMOCIÓN REAL EN LOCALSTORAGE
  // ==========================================================

  const promociones =
    getData(
      KEY_PROMOCIONES,
      [],
    );


  if (
    !Array.isArray(
      promociones,
    )
  ) {

    mostrarErrorAcordar(
      "No fue posible cargar las promociones.",
    );

    return;
  }


  const registro =
    promociones.find(
      (item) =>
        String(
          item.id,
        ) ===
        String(
          promocion.id,
        ),
    );


  if (!registro) {

    mostrarErrorAcordar(
      "No se encontró la promoción que se intenta guardar.",
    );

    return;
  }


  const ahora =
    new Date()
      .toISOString();


  const session =
    getSession();


  const usuario =
    session?.nombre ||
    session?.email ||
    "Secretaría de Acuerdos";


  // ==========================================================
  // ACUERDO
  // ==========================================================

  registro.acuerdo = {

    ...(
      typeof registro.acuerdo ===
        "object" &&
      registro.acuerdo
        ? registro.acuerdo
        : {}
    ),


    concepto:
      "Acuerdo",


    sentido,


    texto,


    diasPlazo:
      sentido ===
        "requerir"

        ? Number(
            configuracion.diasPlazo,
          )

        : null,


    cumplimiento:
      sentido ===
        "cumplimiento"

        ? configuracion
            .cumplimiento

        : null,


    requiereNotificacionPersonal:
      configuracion
        .requiereNotificacionPersonal,


    estado:
      enviarFirma
        ? "en-firma"
        : "borrador",


    actualizadoEn:
      ahora,


    actualizadoPor:
      usuario,

  };


  // ==========================================================
  // ESTADO DEL ACUERDO
  // ==========================================================
  //
  // Borrador -> En proyecto
  // Firma    -> En firma
  //
  // ==========================================================

  registro.estadoAcuerdo =
    enviarFirma

      ? "en-firma"

      : "en-revision-interna";


  // La promoción sigue "por acordar" hasta
  // que realmente sea firmada.
  registro.estadoPromocion =
    registro.estadoPromocion ||
    "por-acordar";


  // ==========================================================
  // HISTORIAL
  // ==========================================================

  registro.historialAcuerdo =
    Array.isArray(
      registro.historialAcuerdo,
    )

      ? registro.historialAcuerdo

      : [];


  registro.historialAcuerdo.push({

    fecha:
      ahora,


    movimiento:
      enviarFirma

        ? "Proyecto de acuerdo guardado y enviado a firma"

        : "Proyecto de acuerdo guardado en borrador",


    usuario,

  });


  // ==========================================================
  // AUDIENCIA
  // ==========================================================

  if (
    audienciaDatos
  ) {

    const audiencia =
      guardarAudienciaPromocion(
        registro,
        expediente,
        seguimiento,
        audienciaDatos,
      );


    registro.audienciaEventoId =
      audiencia.id;

  }


  // ==========================================================
  // GUARDAR PROMOCIÓN
  // ==========================================================

  saveData(
    KEY_PROMOCIONES,
    promociones,
  );


  closeForm();


  if (
    typeof alTerminar ===
    "function"
  ) {

    alTerminar();

    return;
  }


  if (
    typeof window.renderMesas ===
    "function"
  ) {

    window.renderMesas();

  }

}


// ============================================================
// GUARDAR / ACTUALIZAR AUDIENCIA
// ============================================================

function guardarAudienciaPromocion(
  promocion,
  expediente,
  seguimiento,
  datos,
) {

  const agendaRaw =
    getData(
      KEY_AGENDA,
      [],
    );


  const agenda =
    Array.isArray(
      agendaRaw,
    )

      ? agendaRaw

      : [];


  let audiencia =
    null;


  // ==========================================================
  // BUSCAR POR ID GUARDADO
  // ==========================================================

  if (
    promocion.audienciaEventoId
  ) {

    audiencia =
      agenda.find(
        (item) =>
          String(
            item.id,
          ) ===
          String(
            promocion
              .audienciaEventoId,
          ),
      );

  }


  // ==========================================================
  // BUSCAR POR PROMOCIÓN
  // ==========================================================

  if (!audiencia) {

    audiencia =
      agenda.find(
        (item) =>
          item.tipo ===
            "audiencia" &&

          item.origen ===
            "promocion" &&

          String(
            item.promocionId,
          ) ===
          String(
            promocion.id,
          ),
      );

  }


  const session =
    getSession();


  const ahora =
    new Date()
      .toISOString();


  const numero =
    String(
      promocion.expediente ||
      promocion.numero ||
      "",
    );


  // ==========================================================
  // CREAR
  // ==========================================================

  if (!audiencia) {

    audiencia = {

      id:
        createId(),


      tipo:
        "audiencia",


      origen:
        "promocion",


      promocionId:
        promocion.id,


      expediente:
        numero,


      estadoAudiencia:
        "por-desahogar",


      creadoEn:
        ahora,


      creadoPor:
        session?.nombre ||
        session?.email ||
        "Secretaría de Acuerdos",

    };


    agenda.push(
      audiencia,
    );

  }


  // ==========================================================
  // ACTUALIZAR
  // ==========================================================

  audiencia.fecha =
    datos.fecha;


  audiencia.hora =
    datos.hora;


  audiencia.tipoAudiencia =
    datos.tipoAudiencia;


  audiencia.notas =
    `Audiencia vinculada a promoción del expediente ${numero}.`;


  audiencia.estadoExpediente =
    seguimiento?.estado ||
    "en-proceso";


  audiencia.mesa =
    promocion.mesaRecepcion ||
    expediente.mesa ||
    session?.mesa ||
    null;


  audiencia.actualizadoEn =
    ahora;


  saveData(
    KEY_AGENDA,
    agenda,
  );


  // ==========================================================
  // NOTIFICACIONES
  // ==========================================================

  actualizarNotificacionesAudiencia(
    audiencia,
  );


  return audiencia;

}


// ============================================================
// NOTIFICACIONES DE AUDIENCIA
// ============================================================
//
// Audiencia:
// - aviso para Actuaría
// - aviso para Archivo
//
// Se programa 7 días antes.
// ============================================================

function actualizarNotificacionesAudiencia(
  audiencia,
) {

  const notificacionesRaw =
    getData(
      KEY_NOTIFICACIONES,
      [],
    );


  let notificaciones =
    Array.isArray(
      notificacionesRaw,
    )

      ? notificacionesRaw

      : [];


  // ==========================================================
  // BORRAR AVISOS ANTERIORES DEL MISMO EVENTO
  // ==========================================================

  notificaciones =
    notificaciones.filter(
      (item) =>
        String(
          item.eventoId,
        ) !==
        String(
          audiencia.id,
        ),
    );


  const fechaAviso =
    restarDiasFecha(
      audiencia.fecha,
      DIAS_ALERTA_AUDIENCIA,
    );


  const destinatarios = [
    "actuaria",
    "archivo",
  ];


  destinatarios.forEach(
    (destinatario) => {

      notificaciones.push({

        id:
          createId(),


        eventoId:
          audiencia.id,


        destinatario,


        expediente:
          audiencia.expediente,


        fechaAviso,


        mensaje:
          `Audiencia programada para el ${formatFecha(
            audiencia.fecha,
          )} a las ${
            audiencia.hora
          }.`,

        leida:
          false,

      });

    },
  );


  saveData(
    KEY_NOTIFICACIONES,
    notificaciones,
  );

}


// ============================================================
// RESTAR DÍAS A FECHA
// ============================================================

function restarDiasFecha(
  fecha,
  dias,
) {

  if (!fecha) {
    return "";
  }


  const date =
    new Date(
      `${fecha}T12:00:00`,
    );


  date.setDate(
    date.getDate() -
    dias,
  );


  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() +
      1,
    )
      .padStart(
        2,
        "0",
      );


  const day =
    String(
      date.getDate(),
    )
      .padStart(
        2,
        "0",
      );


  return (
    `${year}-` +
    `${month}-` +
    `${day}`
  );

}


// ============================================================
// ERROR DEL MODAL
// ============================================================

function mostrarErrorAcordar(
  mensaje,
) {

  const error =
    document.getElementById(
      "promocionAcordarError",
    );


  if (!error) {
    return;
  }


  error.textContent =
    mensaje;


  error.hidden =
    false;


  error.scrollIntoView({

    behavior:
      "smooth",

    block:
      "nearest",

  });

}