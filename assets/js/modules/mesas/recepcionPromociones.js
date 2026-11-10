// ============================================================
// RECEPCIÓN DE PROMOCIONES EN MESAS
// assets/js/modules/mesas/recepcionPromociones.js
//
// PROTOTIPO:
// Oficialía guarda promociones en localStorage.promociones.
// Mesa no duplica registros; únicamente marca cada promoción
// como recibida cuando el usuario pulsa "Recibir".
// ============================================================

import { getData, saveData } from "../../storage.js";
import { escapeHTML } from "../../utils.js";
import { getSession } from "../../auth.js";
import { showModal, closeForm } from "../../forms/formHelper.js";

import {
  getNumeroExpediente,
  mesaDeExpediente,
  mesaUsuarioActual,
} from "./mesaUtils.js";


// ============================================================
// CONFIGURACIÓN
// ============================================================

const KEY_PROMOCIONES = "promociones";
const KEY_EXPEDIENTES = "expedientes";
const KEY_SEGUIMIENTO = "mesasSeguimiento";


// ============================================================
// RENDER DE LA TARJETA
// ============================================================

export function renderRecepcionPromociones() {
  const host = document.getElementById(
    "mesasRecepcionPromociones",
  );

  if (!host) {
    return;
  }

  const pendientes =
    getPromocionesPendientesMesa();


  host.innerHTML = `
    <section class="mesas-recepcion-card">

      <div class="mesas-recepcion-card-header">

        <div>

          <span class="mesas-mini-eyebrow">
            Oficialía de Partes
          </span>

          <h2>
            Promociones por recibir
          </h2>

        </div>


        <span class="mesas-recepcion-counter">
          ${pendientes.length}
        </span>

      </div>


      <div class="mesas-recepcion-card-body">

        <p>
          ${
            pendientes.length
              ? `${pendientes.length} ${
                  pendientes.length === 1
                    ? "promoción pendiente"
                    : "promociones pendientes"
                } para esta mesa.`
              : "No hay promociones pendientes de recibir."
          }
        </p>


        <button
          type="button"
          class="mesas-secondary-btn mesas-recepcion-open-btn"
          id="mesasVerPromocionesPendientes"
          ${pendientes.length ? "" : "disabled"}
        >

          <i class="fa-solid fa-inbox"></i>

          Ver promociones

        </button>

      </div>

    </section>
  `;


  const button =
    document.getElementById(
      "mesasVerPromocionesPendientes",
    );


  if (
    button &&
    pendientes.length
  ) {
    button.onclick =
      openPromocionesPendientesModal;
  }
}


// ============================================================
// PROMOCIONES PENDIENTES
// ============================================================

export function getPromocionesPendientesMesa() {
  const promocionesRaw =
    getData(
      KEY_PROMOCIONES,
      [],
    );


  const expedientesRaw =
    getData(
      KEY_EXPEDIENTES,
      [],
    );


  const promociones =
    Array.isArray(
      promocionesRaw,
    )
      ? promocionesRaw
      : [];


  const expedientes =
    Array.isArray(
      expedientesRaw,
    )
      ? expedientesRaw
      : [];


  const mesaActual =
    mesaUsuarioActual();


  return promociones

    // Si todavía no fue recibida,
    // debe aparecer en esta sección.
    .filter(
      (promocion) =>
        promocion?.recibidaMesa !== true,
    )


    .map(
      (promocion) => {

        const numero =
          String(
            promocion?.expediente ||
            promocion?.numero ||
            "",
          ).trim();


        const expediente =
          expedientes.find(
            (item) =>
              getNumeroExpediente(
                item,
              )
                .trim()
                .toLowerCase() ===
              numero.toLowerCase(),
          );


        // Si no existe expediente,
        // no se manda a ninguna mesa.
        if (!expediente) {
          return null;
        }


        const mesaDestino =
          mesaDeExpediente(
            expediente,
          );


        // Mesa 1 solo ve Mesa 1,
        // Mesa 2 solo Mesa 2, etc.
        if (
          mesaActual &&
          Number(
            mesaDestino,
          ) !==
            Number(
              mesaActual,
            )
        ) {
          return null;
        }


        return {
          promocion,

          expediente,

          numero,

          mesaDestino,

          actor:
            expediente.actor ||
            expediente.promovente ||
            "—",

          demandado:
            expediente.demandado ||
            "—",
        };
      },
    )


    .filter(Boolean)


    .sort(
      (a, b) => {

        const fechaA =
          String(
            a.promocion.fecha ||
            a.promocion.creadoEn ||
            "",
          );


        const fechaB =
          String(
            b.promocion.fecha ||
            b.promocion.creadoEn ||
            "",
          );


        return fechaB.localeCompare(
          fechaA,
        );
      },
    );
}


// ============================================================
// ABRIR MODAL
// ============================================================

export function openPromocionesPendientesModal() {
  const pendientes =
    getPromocionesPendientesMesa();


  showModal(`
    <div class="mesas-modal-shell mesas-recepcion-modal">

      <header class="mesas-modal-header">

        <div class="mesas-modal-step">

          <i class="fa-solid fa-inbox"></i>

        </div>


        <div class="mesas-modal-header-text">

          <h2>
            Promociones por recibir
          </h2>

          <p>
            Promociones enviadas por Oficialía de Partes a esta mesa.
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        ${
          pendientes.length
            ? renderPromocionesPendientes(
                pendientes,
              )
            : renderSinPendientes()
        }

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="mesasCerrarRecepcionPromociones"
        >
          Cerrar
        </button>

      </footer>

    </div>
  `);


  document
    .getElementById(
      "mesasCerrarRecepcionPromociones",
    )
    ?.addEventListener(
      "click",
      closeForm,
    );


  document
    .querySelectorAll(
      "[data-recibir-promocion]",
    )
    .forEach(
      (button) => {

        button.addEventListener(
          "click",
          () => {

            recibirPromocion(
              button.dataset
                .recibirPromocion,
            );

          },
        );

      },
    );
}


// ============================================================
// LISTA DEL MODAL
// ============================================================

function renderPromocionesPendientes(
  pendientes,
) {
  return `
    <div class="mesas-recepcion-list">

      ${pendientes

        .map(
          (item) => `

            <article class="mesas-recepcion-item">

              <div class="mesas-recepcion-item-main">

                <div class="mesas-recepcion-item-top">

                  <strong>
                    Expediente
                    ${escapeHTML(
                      item.numero,
                    )}
                  </strong>


                  <span class="mesas-recepcion-mesa-badge">
                    Mesa
                    ${escapeHTML(
                      item.mesaDestino,
                    )}
                  </span>

                </div>


                <div class="mesas-recepcion-item-grid">


                  <div>

                    <span>
                      Fecha
                    </span>

                    <strong>
                      ${escapeHTML(
                        formatFecha(
                          item.promocion.fecha ||
                          item.promocion.creadoEn,
                        ),
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Tipo
                    </span>

                    <strong>
                      ${escapeHTML(
                        item.promocion.tipo ||
                        "Promoción",
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Actor
                    </span>

                    <strong>
                      ${escapeHTML(
                        item.actor,
                      )}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Demandado
                    </span>

                    <strong>
                      ${escapeHTML(
                        item.demandado,
                      )}
                    </strong>

                  </div>


                </div>


                <div class="mesas-recepcion-descripcion">

                  <span>
                    Descripción
                  </span>

                  <p>
                    ${escapeHTML(
                      item.promocion.descripcion ||
                      "Sin descripción.",
                    )}
                  </p>

                </div>

              </div>


              <div class="mesas-recepcion-item-actions">

                <button
                  type="button"
                  class="mesas-primary-btn"
                  data-recibir-promocion="${escapeHTML(
                    item.promocion.id,
                  )}"
                >

                  <i class="fa-solid fa-check"></i>

                  Recibir

                </button>

              </div>

            </article>

          `,
        )

        .join("")}

    </div>
  `;
}


// ============================================================
// ESTADO VACÍO
// ============================================================

function renderSinPendientes() {
  return `
    <div class="mesas-empty-state mesas-recepcion-empty">

      <div class="mesas-empty-icon">

        <i class="fa-regular fa-circle-check"></i>

      </div>


      <strong>
        No hay promociones por recibir
      </strong>


      <span>
        Las promociones recibidas ya pasan al seguimiento de la mesa.
      </span>

    </div>
  `;
}


// ============================================================
// RECIBIR PROMOCIÓN
// ============================================================

function recibirPromocion(
  id,
) {
  if (!id) {
    return;
  }


  const promocionesRaw =
    getData(
      KEY_PROMOCIONES,
      [],
    );


  if (
    !Array.isArray(
      promocionesRaw,
    )
  ) {
    return;
  }


  const promociones =
    promocionesRaw;


  const promocion =
    promociones.find(
      (item) =>
        String(
          item?.id ||
          "",
        ) ===
        String(
          id,
        ),
    );


  if (!promocion) {
    return;
  }


  // Validar que realmente corresponda
  // a la mesa actual.
  const pendientes =
    getPromocionesPendientesMesa();


  const registro =
    pendientes.find(
      (item) =>
        String(
          item.promocion.id,
        ) ===
        String(
          id,
        ),
    );


  if (!registro) {
    return;
  }


  const ahora =
    new Date()
      .toISOString();


  const session =
    getSession();


  // ========================================================
  // MARCAR COMO RECIBIDA
  // ========================================================

  promocion.recibidaMesa =
    true;


  promocion.recibidaMesaEn =
    ahora;


  promocion.recibidaMesaPor =
    session?.nombre ||
    session?.email ||
    "Mesa";


  promocion.mesaRecepcion =
    registro.mesaDestino;


  // ========================================================
  // ESTADOS INICIALES PARA SECRETARÍA DE ACUERDOS
  // ========================================================

  if (
    !promocion.estadoPromocion
  ) {
    promocion.estadoPromocion =
      "por-acordar";
  }


  if (
    !promocion.estadoAcuerdo
  ) {
    promocion.estadoAcuerdo =
      "en-proceso";
  }


  saveData(
    KEY_PROMOCIONES,
    promociones,
  );


  registrarMovimientoExpediente(
    registro.numero,
    ahora,
  );


  // ========================================================
  // ACTUALIZAR PANTALLA
  // ========================================================

  if (
    typeof window.renderMesas ===
    "function"
  ) {
    window.renderMesas();
  }
  else {
    renderRecepcionPromociones();
  }


  // Deja abierto el modal para que
  // pueda recibir las restantes.
  openPromocionesPendientesModal();
}


// ============================================================
// HISTORIAL SIMULADO DEL EXPEDIENTE
// ============================================================

function registrarMovimientoExpediente(
  numero,
  fecha,
) {
  const seguimientoRaw =
    getData(
      KEY_SEGUIMIENTO,
      {},
    );


  const seguimiento =
    seguimientoRaw &&
    typeof seguimientoRaw ===
      "object" &&
    !Array.isArray(
      seguimientoRaw,
    )
      ? seguimientoRaw
      : {};


  const actual =
    seguimiento[numero] ||
    {};


  const historial =
    Array.isArray(
      actual.historial,
    )
      ? actual.historial
      : [];


  historial.push({
    fecha,

    movimiento:
      "Promoción recibida por Secretaría de Acuerdos",
  });


  seguimiento[numero] = {
    ...actual,

    historial,

    ultimoMovimiento:
      "Promoción recibida por Secretaría de Acuerdos",
  };


  saveData(
    KEY_SEGUIMIENTO,
    seguimiento,
  );
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


  const texto =
    String(
      value,
    );


  const fecha =
    texto.slice(
      0,
      10,
    );


  const partes =
    fecha.split(
      "-",
    );


  if (
    partes.length === 3
  ) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }


  return texto;
}