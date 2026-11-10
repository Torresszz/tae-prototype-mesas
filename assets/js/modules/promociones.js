// =====================================================
// MÓDULO PROMOCIONES
// Oficialía de Partes
// assets/js/modules/promociones.js
// =====================================================

import {
  getData,
  saveData,
} from "../storage.js";

import {
  createId,
  escapeHTML,
  escapeJS,
  formatDate,
} from "../utils.js";


// =====================================================
// ESTADO LOCAL
// =====================================================

let promociones = [];


// =====================================================
// INICIALIZAR
// =====================================================

export function initPromociones() {
  promociones =
    getData(
      "promociones",
      [],
    );


  if (!Array.isArray(promociones)) {
    promociones = [];
  }


  window.openPromocionForm =
    openPromocionForm;

  window.renderPromociones =
    renderPromociones;

  window.viewPromocion =
    viewPromocion;
}


// =====================================================
// RENDER TABLA
// =====================================================

export function renderPromociones() {
  // Recargar siempre desde localStorage.
  promociones =
    getData(
      "promociones",
      [],
    );


  if (!Array.isArray(promociones)) {
    promociones = [];
  }


  const table =
    document.getElementById(
      "promocionesTable",
    );


  if (!table) {
    return;
  }


  if (
    promociones.length === 0
  ) {
    table.innerHTML = `
      <tr>
        <td colspan="6">
          No existen promociones registradas.
        </td>
      </tr>
    `;

    return;
  }


  table.innerHTML =
    promociones
      .map(
        (item) => `
          <tr>

            <td>
              ${escapeHTML(
                item.expediente ||
                "-",
              )}
            </td>


            <td>
              ${escapeHTML(
                item.oficio ||
                "-",
              )}
            </td>


            <td>
              ${formatDate(
                item.fecha,
              )}
            </td>


            <td>
              ${escapeHTML(
                item.tipo ||
                "-",
              )}
            </td>


            <td>
              ${escapeHTML(
                item.descripcion ||
                "-",
              )}
            </td>


            <td>

              <button
                class="table-action"
                onclick="viewPromocion('${escapeJS(
                  item.id,
                )}')"
              >
                Ver
              </button>

            </td>

          </tr>
        `,
      )
      .join("");
}


// =====================================================
// FORMULARIO
// =====================================================

export function openPromocionForm() {
  const modal =
    document.getElementById(
      "modalContent",
    );


  if (!modal) {
    return;
  }


  modal.innerHTML = `

    <div class="form-header">

      <span>
        Promociones
      </span>

      <h2>
        Nueva promoción
      </h2>

    </div>


    <div class="form-body">

      <form id="promocionForm">

        <div class="form-grid">


          <div class="field">

            <label>
              Número promoción
            </label>

            <input
              id="numeroPromocion"
              required
            >

          </div>


          <div class="field">

            <label>
              Número expediente
            </label>

            <input
              id="expedientePromocion"
              required
            >

          </div>


          <div class="field">

            <label>
              Número oficio relacionado
            </label>

            <input
              id="oficioPromocion"
            >

          </div>


          <div class="field">

            <label>
              Fecha
            </label>

            <input
              type="date"
              id="fechaPromocion"
              required
            >

          </div>


          <div class="field">

            <label>
              Tipo de promoción
            </label>

            <select
              id="tipoPromocion"
            >

              <option value="Escrito">
                Escrito
              </option>

              <option value="Solicitud">
                Solicitud
              </option>

              <option value="Notificación">
                Notificación
              </option>

              <option value="Otro">
                Otro
              </option>

            </select>

          </div>


          <div class="field">

            <label>
              Estado
            </label>

            <select
              id="estadoPromocion"
            >

              <option value="Recibida">
                Recibida
              </option>

              <option value="En revisión">
                En revisión
              </option>

              <option value="Atendida">
                Atendida
              </option>

            </select>

          </div>


          <div class="field full">

            <label>
              Descripción
            </label>

            <textarea
              id="descripcionPromocion"
              rows="4"
            ></textarea>

          </div>

        </div>


        <div class="form-actions">

          <button
            type="button"
            class="secondary-btn"
            onclick="closeModal()"
          >
            Cancelar
          </button>


          <button
            type="submit"
            class="primary-btn"
          >
            Guardar promoción
          </button>

        </div>

      </form>

    </div>
  `;


  document
    .getElementById(
      "modal",
    )
    ?.classList.add(
      "show",
    );


  document
    .getElementById(
      "promocionForm",
    )
    ?.addEventListener(
      "submit",
      savePromocion,
    );
}


// =====================================================
// GUARDAR PROMOCIÓN
// =====================================================

function savePromocion(
  event,
) {
  event.preventDefault();


  const numeroPromocion =
    document
      .getElementById(
        "numeroPromocion",
      )
      ?.value
      .trim() ||
    "";


  const expedienteVal =
    document
      .getElementById(
        "expedientePromocion",
      )
      ?.value
      .trim() ||
    "";


  if (
    !numeroPromocion ||
    !expedienteVal
  ) {
    return;
  }


  const promocion = {

    id:
      createId(),


    // Número propio de la promoción.
    numeroPromocion,


    // Se conserva "numero" por compatibilidad
    // con partes antiguas del prototipo.
    numero:
      expedienteVal,


    expediente:
      expedienteVal,


    oficio:
      document
        .getElementById(
          "oficioPromocion",
        )
        ?.value
        .trim() ||
      "",


    fecha:
      document
        .getElementById(
          "fechaPromocion",
        )
        ?.value ||
      "",


    tipo:
      document
        .getElementById(
          "tipoPromocion",
        )
        ?.value ||
      "",


    descripcion:
      document
        .getElementById(
          "descripcionPromocion",
        )
        ?.value
        .trim() ||
      "",


    estado:
      document
        .getElementById(
          "estadoPromocion",
        )
        ?.value ||
      "",


    creadoEn:
      new Date()
        .toISOString(),


    // =================================================
    // RECEPCIÓN POR MESA
    // =================================================
    // Oficialía registra la promoción, pero Mesa
    // todavía no la ha recibido.
    // =================================================

    recibidaMesa:
      false,


    recibidaMesaEn:
      null,


    recibidaMesaPor:
      null,


    mesaRecepcion:
      null,
  };


  // ===================================================
  // GUARDAR
  // ===================================================

  const promocionesActuales =
    getData(
      "promociones",
      [],
    );


  const lista =
    Array.isArray(
      promocionesActuales,
    )
      ? promocionesActuales
      : [];


  lista.unshift(
    promocion,
  );


  saveData(
    "promociones",
    lista,
  );


  promociones =
    lista;


  // ===================================================
  // ACTUALIZAR
  // ===================================================

  renderPromociones();


  if (
    typeof window.closeModal ===
    "function"
  ) {
    window.closeModal();
  }
}


// =====================================================
// DETALLE
// =====================================================

export function viewPromocion(
  id,
) {
  promociones =
    getData(
      "promociones",
      [],
    );


  if (!Array.isArray(promociones)) {
    promociones = [];
  }


  const promocion =
    promociones.find(
      (item) =>
        item.id === id,
    );


  if (!promocion) {
    return;
  }


  const modal =
    document.getElementById(
      "modalContent",
    );


  if (!modal) {
    return;
  }


  modal.innerHTML = `

    <div class="form-header">

      <span>
        Detalle promoción
      </span>

      <h2>
        ${
          escapeHTML(
            promocion.numeroPromocion ||
            promocion.expediente ||
            "-",
          )
        }
      </h2>

    </div>


    <div class="form-body">

      <div class="detail-grid">


        <div class="detail-item">

          <span>
            Número promoción
          </span>

          <strong>
            ${escapeHTML(
              promocion.numeroPromocion ||
              "-",
            )}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Expediente
          </span>

          <strong>
            ${escapeHTML(
              promocion.expediente ||
              "-",
            )}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Oficio relacionado
          </span>

          <strong>
            ${escapeHTML(
              promocion.oficio ||
              "-",
            )}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Fecha
          </span>

          <strong>
            ${formatDate(
              promocion.fecha,
            )}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Tipo
          </span>

          <strong>
            ${escapeHTML(
              promocion.tipo ||
              "-",
            )}
          </strong>

        </div>


        <div class="detail-item">

          <span>
            Estado en Oficialía
          </span>

          <strong>
            ${escapeHTML(
              promocion.estado ||
              "-",
            )}
          </strong>

        </div>


        <div class="detail-item full">

          <span>
            Descripción
          </span>

          <strong>
            ${escapeHTML(
              promocion.descripcion ||
              "-",
            )}
          </strong>

        </div>


        <div class="detail-item full">

          <span>
            Recepción en Mesa
          </span>

          <strong>
            ${
              promocion.recibidaMesa ===
              true
                ? "Recibida por Mesa"
                : "Pendiente de recibir"
            }
          </strong>

        </div>


      </div>

    </div>
  `;


  document
    .getElementById(
      "modal",
    )
    ?.classList.add(
      "show",
    );
}