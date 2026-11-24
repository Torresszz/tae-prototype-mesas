// ============================================================
// CONSULTA GENERAL DE EXPEDIENTES
// assets/js/modules/mesas/expedientes.js
// ============================================================

import {
  escapeHTML,
} from "../../utils.js";

import {
  getExpedientesConsulta,
} from "./expedienteService.js";

import {
  etiquetaEstado,
} from "./estados.js";

import {
  renderEstadoBadge,
} from "./flujoEstados.js";

import {
  renderExpedienteDetalle,
} from "./expedienteDetalle.js";


// ============================================================
// ESTADO DE LA VISTA
// ============================================================

const filtros = {

  numero: "",

  persona: "",

  estado: "todos",

};


const ESTADOS_CONSULTA = [

  "en-proceso",

  "en-revision-interna",

  "en-firma",

  "en-lista",

  "en-actuaria",

  "en-archivo",

];


// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderExpedientes(
  vista,
  onOpen = null,
) {

  if (!vista) {
    return;
  }


  const registros =
    getExpedientesConsulta();


  vista.innerHTML = `

    <section class="expedientes-consulta">


      <!-- ENCABEZADO -->

      <header class="expedientes-consulta-header">

        <div>

          <span class="mesas-mini-eyebrow">
            Consulta judicial
          </span>

          <h2>
            Expedientes
          </h2>

          <p>
            Consulta y seguimiento de los expedientes asignados a tu mesa.
          </p>

        </div>

      </header>


      <!-- CONTADORES -->

      <div class="expedientes-consulta-stats">

        ${renderContadores(registros)}

      </div>


      <!-- FILTROS -->

      <section class="expedientes-filtros">

        <div class="expedientes-filtro-field">

          <label for="expedientesBuscarNumero">
            No. de expediente
          </label>

          <div class="expedientes-search">

            <i class="fa-solid fa-magnifying-glass"></i>

            <input
              type="search"
              id="expedientesBuscarNumero"
              placeholder="Ej. 200/2026"
              value="${escapeHTML(filtros.numero)}"
              autocomplete="off"
            >

          </div>

        </div>


        <div class="expedientes-filtro-field">

          <label for="expedientesBuscarPersona">
            Actor o demandado
          </label>

          <div class="expedientes-search">

            <i class="fa-solid fa-magnifying-glass"></i>

            <input
              type="search"
              id="expedientesBuscarPersona"
              placeholder="Buscar por nombre..."
              value="${escapeHTML(filtros.persona)}"
              autocomplete="off"
            >

          </div>

        </div>


        <div class="expedientes-filtro-field">

          <label for="expedientesFiltroEstado">
            Estado
          </label>

          <select id="expedientesFiltroEstado">

            <option value="todos">
              Todos los estados
            </option>

            ${renderOpcionesEstado()}

          </select>

        </div>


        <button
          type="button"
          class="mesas-secondary-btn expedientes-limpiar-btn"
          data-expediente-action="limpiar"
        >

          <i class="fa-solid fa-eraser"></i>

          Limpiar

        </button>

      </section>


      <!-- TABLA GENERAL -->

      <section class="expedientes-table-card">


        <header class="expedientes-table-header">

          <div>

            <h3>
              Listado de expedientes
            </h3>

            <p>
              Selecciona un expediente para consultar su información.
            </p>

          </div>

          <span id="expedientesTotalVisible">
            ${registros.length} registros
          </span>

        </header>


        <div class="expedientes-table-wrapper">

          <table class="expedientes-consulta-table">

            <thead>

              <tr>

                <th>Expediente</th>

                <th>Fecha</th>

                <th>Actor</th>

                <th>Demandado</th>

                <th>Mesa</th>

                <th>Estado</th>

                <th>Acciones</th>

              </tr>

            </thead>


            <tbody id="expedientesConsultaBody">

            </tbody>

          </table>

        </div>


        <!-- SIN RESULTADOS -->

        <div
          class="expedientes-empty"
          id="expedientesConsultaEmpty"
          hidden
        >

          <i class="fa-regular fa-folder-open"></i>

          <strong>
            No se encontraron expedientes
          </strong>

          <span>
            Intenta cambiar los filtros de búsqueda.
          </span>

        </div>


        <!-- FOOTER TABLA -->

        <footer class="expedientes-table-footer">

          <span id="expedientesConsultaResumen">

          </span>

        </footer>

      </section>


    </section>

  `;


  const select =
    vista.querySelector(
      "#expedientesFiltroEstado",
    );

  if (select) {

    select.value =
      filtros.estado;

  }


  actualizarListado(
    vista,
  );


  configurarEventos(
    vista,
    onOpen,
  );

}


// ============================================================
// CONTADORES
// ============================================================

function renderContadores(
  registros,
) {

  const enProceso =
    registros.filter(
      (item) =>
        item.estado === "en-proceso",
    ).length;


  const enFirma =
    registros.filter(
      (item) =>
        item.estado === "en-firma",
    ).length;


  return `

    ${renderStat(
      "Total de expedientes",
      registros.length,
      "fa-folder-open",
      "total",
    )}

    ${renderStat(
      "En proceso",
      enProceso,
      "fa-clock",
      "proceso",
    )}

    ${renderStat(
      "En firma",
      enFirma,
      "fa-signature",
      "firma",
    )}

  `;

}


// ============================================================
// TARJETA DE CONTADOR
// ============================================================

function renderStat(
  titulo,
  cantidad,
  icono,
  clase,
) {

  return `

    <article class="expedientes-stat ${clase}">

      <div class="expedientes-stat-icon">

        <i class="fa-solid ${icono}"></i>

      </div>


      <div class="expedientes-stat-info">

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
// OPCIONES DEL FILTRO DE ESTADO
// ============================================================

function renderOpcionesEstado() {

  return ESTADOS_CONSULTA

    .map(
      (estado) => `

        <option value="${escapeHTML(estado)}">

          ${escapeHTML(
            etiquetaEstado(estado),
          )}

        </option>

      `,
    )

    .join("");

}


// ============================================================
// APLICAR FILTROS
// ============================================================

function filtrarExpedientes(
  registros,
) {

  const numero =
    normalizarTexto(
      filtros.numero,
    );


  const persona =
    normalizarTexto(
      filtros.persona,
    );


  return registros.filter(
    (item) => {

      const coincideNumero =

        !numero ||

        normalizarTexto(
          item.numero,
        ).includes(numero);


      const coincidePersona =

        !persona ||

        normalizarTexto(
          `${item.actor} ${item.demandado}`,
        ).includes(persona);


      const coincideEstado =

        filtros.estado === "todos" ||

        item.estado === filtros.estado;


      return (

        coincideNumero &&

        coincidePersona &&

        coincideEstado

      );

    },
  );

}


// ============================================================
// RENDER DE FILAS
// ============================================================

function renderFilas(
  registros,
) {

  return registros

    .map(
      (item) => `

        <tr
          class="expedientes-consulta-row"
          data-expediente-row="${escapeHTML(item.numero)}"
        >


          <!-- EXPEDIENTE -->

          <td>

            <button
              type="button"
              class="expedientes-numero-link"
              data-expediente-action="abrir"
              data-numero="${escapeHTML(item.numero)}"
            >

              <i class="fa-regular fa-folder"></i>

              ${escapeHTML(item.numero)}

            </button>

          </td>


          <!-- FECHA -->

          <td>

            ${escapeHTML(
              formatFecha(item.fecha),
            )}

          </td>


          <!-- ACTOR -->

          <td>

            <span class="expedientes-persona">

              ${escapeHTML(item.actor)}

            </span>

          </td>


          <!-- DEMANDADO -->

          <td>

            <span class="expedientes-persona">

              ${escapeHTML(item.demandado)}

            </span>

          </td>


          <!-- MESA -->

          <td>

            <span class="expedientes-mesa-badge">

              ${escapeHTML(
                formatMesa(item.mesa),
              )}

            </span>

          </td>


          <!-- ESTADO -->

          <td>

            ${renderEstadoBadge(
              item.estado,
            )}

          </td>


          <!-- ACCIONES -->

          <td>

            <button
              type="button"
              class="mesas-primary-btn expedientes-abrir-btn"
              data-expediente-action="abrir"
              data-numero="${escapeHTML(item.numero)}"
            >

              Abrir expediente

              <i class="fa-solid fa-chevron-right"></i>

            </button>

          </td>


        </tr>

      `,
    )

    .join("");

}


// ============================================================
// ACTUALIZAR TABLA
// ============================================================

function actualizarListado(
  vista,
) {

  const registros =
    getExpedientesConsulta();


  const visibles =
    filtrarExpedientes(
      registros,
    );


  const tbody =
    vista.querySelector(
      "#expedientesConsultaBody",
    );


  const empty =
    vista.querySelector(
      "#expedientesConsultaEmpty",
    );


  const total =
    vista.querySelector(
      "#expedientesTotalVisible",
    );


  const resumen =
    vista.querySelector(
      "#expedientesConsultaResumen",
    );


  if (tbody) {

    tbody.innerHTML =
      renderFilas(visibles);

  }


  if (empty) {

    empty.hidden =
      visibles.length > 0;

  }


  if (total) {

    total.textContent =
      `${visibles.length} registros`;

  }


  if (resumen) {

    resumen.textContent =
      `Mostrando ${visibles.length} de ${registros.length} expedientes`;

  }

}


// ============================================================
// EVENTOS
// ============================================================

function configurarEventos(
  vista,
  onOpen,
) {

  const numeroInput =
    vista.querySelector(
      "#expedientesBuscarNumero",
    );


  const personaInput =
    vista.querySelector(
      "#expedientesBuscarPersona",
    );


  const estadoSelect =
    vista.querySelector(
      "#expedientesFiltroEstado",
    );


  if (numeroInput) {

    numeroInput.oninput =
      (event) => {

        filtros.numero =
          event.target.value;

        actualizarListado(vista);

      };

  }


  if (personaInput) {

    personaInput.oninput =
      (event) => {

        filtros.persona =
          event.target.value;

        actualizarListado(vista);

      };

  }


  if (estadoSelect) {

    estadoSelect.onchange =
      (event) => {

        filtros.estado =
          event.target.value;

        actualizarListado(vista);

      };

  }


  vista.onclick =
    (event) => {

      const button =
        event.target.closest(
          "[data-expediente-action]",
        );


      if (button) {

        const action =
          button.dataset.expedienteAction;


        switch (action) {


          case "abrir":

            abrirExpediente(
              button.dataset.numero,
              onOpen,
            );

            return;


          case "limpiar":

            limpiarFiltros(
              vista,
            );

            return;

        }

      }


      // También permite abrir el expediente
      // dando clic directamente sobre la fila.

      const fila =
        event.target.closest(
          "[data-expediente-row]",
        );


      if (fila) {

        abrirExpediente(
          fila.dataset.expedienteRow,
          onOpen,
        );

      }

    };

}


// ============================================================
// ABRIR EXPEDIENTE
// ============================================================

function abrirExpediente(
  numero,
  onOpen,
) {

  if (!numero) {
    return;
  }


  // El componente de detalle se conectará
  // mediante esta función.

  if (typeof onOpen === "function") {

    onOpen(numero);

  }

}


// ============================================================
// LIMPIAR FILTROS
// ============================================================

function limpiarFiltros(
  vista,
) {

  filtros.numero = "";

  filtros.persona = "";

  filtros.estado = "todos";


  const numero =
    vista.querySelector(
      "#expedientesBuscarNumero",
    );


  const persona =
    vista.querySelector(
      "#expedientesBuscarPersona",
    );


  const estado =
    vista.querySelector(
      "#expedientesFiltroEstado",
    );


  if (numero) {
    numero.value = "";
  }


  if (persona) {
    persona.value = "";
  }


  if (estado) {
    estado.value = "todos";
  }


  actualizarListado(
    vista,
  );

}


// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function normalizarTexto(
  value,
) {

  return String(value || "")

    .normalize("NFD")

    .replace(/[\u0300-\u036f]/g, "")

    .trim()

    .toLowerCase();

}


function formatFecha(
  value,
) {

  if (!value) {
    return "—";
  }


  const parts =
    String(value)

      .slice(0, 10)

      .split("-");


  if (parts.length === 3) {

    return `${parts[2]}/${parts[1]}/${parts[0]}`;

  }


  return String(value);

}


function formatMesa(
  mesa,
) {

  if (!mesa) {
    return "Sin asignar";
  }


  const texto =
    String(mesa);


  if (texto.toLowerCase().startsWith("mesa")) {

    return texto;

  }


  return `Mesa ${texto}`;

}
// ============================================================
// INTEGRACIÓN CON LA NAVEGACIÓN DE MESAS
// ============================================================

export function renderConsultaExpedientes() {

  const vista = document.querySelector(
    '[data-mesas-vista="expedientes"]',
  );

  if (!vista) {
    return;
  }


  function mostrarListado() {

    renderExpedientes(
      vista,
      mostrarDetalle,
    );

  }


  function mostrarDetalle(numero) {

    renderExpedienteDetalle(
      vista,
      numero,
      mostrarListado,
    );

  }


  mostrarListado();

}