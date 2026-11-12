// ============================================================
// NAVEGACIÓN INTERNA DEL MÓDULO MESAS
// assets/js/modules/mesas/navegacion.js
// Los apartados se muestran en la BARRA LATERAL (como en Oficialía),
// pero siguen siendo vistas internas de la página "mesas": no son
// rutas nuevas, así que los permisos de auth.js no cambian.
// ============================================================

import { configurarBarraFiltros } from "./filtros.js";

import { montarPlantillasEn } from "./plantillas.js";

export const SECCIONES = [
  {
    id: "mesas",
    etiqueta: "Mesas",
    icono: "fa-table-list",
    resumen: "Estado general de los expedientes.",
    // El panel de Alertas solo se muestra aquí (inicio del módulo)
    alertas: true,
    filtros: {},
  },
  {
    id: "demanda",
    etiqueta: "Demanda",
    icono: "fa-file-lines",
    fase: 4,
    resumen: "Radicación de demandas, por radicar / radicado y plantillas.",
    plantillas: "demanda",
    filtros: {},
  },
  {
    id: "promociones",
    etiqueta: "Promociones",
    icono: "fa-file-pen",
    fase: 4,
    resumen: "Acuerdos y promociones por acordar / acordadas.",
    plantillas: "promociones",
    filtros: {},
  },
  {
    id: "calificacion",
    etiqueta: "Calificación",
    icono: "fa-scale-balanced",
    fase: 4,
    resumen: "Calificación de la demanda.",
    plantillas: "calificacion",
    filtros: {},
  },
    {
    id: "exhortos",
    etiqueta: "Exhortos",
    icono: "fa-file-import",
    fase: 9,
    resumen: "Exhortos recibidos de Oficialía, fecha por señalar y envío a Actuaría.",
    filtros: {},
  },
  {
    id: "agenda",
    etiqueta: "Agenda",
    icono: "fa-calendar-days",
    fase: 9,
    resumen: "Agenda Auxiliar y Agenda Titular (promociones, calificaciones y exhortos).",
    filtros: { estado: false },
  },
  {
    id: "audiencia",
    etiqueta: "Audiencia",
    icono: "fa-gavel",
    fase: 5,
    resumen: "Agenda de audiencias, tipo, estado de la audiencia y del expediente.",
    plantillas: "audiencia",
    filtros: {},
  },
  {
    id: "consultas",
    etiqueta: "Consultas",
    icono: "fa-right-left",
    fase: 6,
    resumen: "Enviar o regresar expedientes, acumulados y plantillas.",
    plantillas: "consultas",
    filtros: {},
  },
  {
    id: "intersindicales",
    etiqueta: "Intersindicales",
    icono: "fa-people-group",
    fase: 6,
    resumen: "Admisión: pendiente de desarrollar.",
    filtros: { estado: false },
  },
  {
    id: "oficios",
    etiqueta: "Oficios",
    icono: "fa-envelope-open-text",
    fase: 6,
    resumen: "Registro de números de oficio por año y plantillas.",
    plantillas: "oficios",
    filtros: { estado: false },
  },
  {
    id: "estadistica",
    etiqueta: "Estadística",
    icono: "fa-chart-column",
    fase: 7,
    resumen: "Demandas, promociones, audiencias, calificaciones y acuerdos emitidos por rango de fechas.",
    // Cada tarjeta de estadística tendrá su propio rango desde/hasta.
    filtros: { visible: false },
  },
  {
    id: "plantillas",
    etiqueta: "Plantillas",
    icono: "fa-folder-open",
    fase: 2,
    resumen: "Archivos .docx y .pdf por categoría, para subir y descargar.",
    filtros: {
      estado: false,
      etiquetaExpediente: "Nombre de la plantilla",
      placeholderExpediente: "Buscar plantilla...",
    },
  },
];

let seccionActiva = "mesas";

// Las fases siguientes registran aquí su función de render.
//   registrarSeccion("demanda", renderDemanda);
//
// Apartado "Plantillas" de cada sección (T-08): la vista de la sección
// solo necesita incluir un contenedor vacío
//   <div data-plantillas-slot></div>
// y este módulo lo llena con las plantillas de su categoría
// (la que indica `plantillas` en SECCIONES).
const renderers = {};

export function registrarSeccion(id, renderFn) {
  renderers[id] = renderFn;
}

export function getSeccionActiva() {
  return seccionActiva;
}

export function renderSeccionActiva() {
  if (seccionActiva === "mesas") return;

  renderers[seccionActiva]?.();

  montarSlotsPlantillas();
}

// Llena el apartado de plantillas de la sección activa (categoría fija).
function montarSlotsPlantillas() {
  const seccion = SECCIONES.find((s) => s.id === seccionActiva);

  if (!seccion?.plantillas) return;

  document
    .querySelectorAll(
      `[data-mesas-vista="${seccion.id}"] [data-plantillas-slot]`,
    )
    .forEach((slot) =>
      montarPlantillasEn(slot, { categoria: seccion.plantillas }),
    );
}

// ------------------------------------------------------------
// INICIALIZACIÓN (se llama en cada render; es idempotente)
// ------------------------------------------------------------

export function initNavegacionMesas(onChange) {
  const contenedor = document.getElementById("mesasVistas");

  if (!contenedor) return;

  initSidebarMesas(onChange);

  asegurarVistas(contenedor);

  mostrarSeccion();
}

// Pone los apartados en la barra lateral, en el lugar del botón "Mesas".
// Usan la misma clase .nav-item que el resto del menú, pero SIN data-page:
// así el router no intenta cargar otra página.
function initSidebarMesas(onChange) {
  const nav = document.querySelector(".sidebar .nav");

  if (!nav) return;

  if (!nav.querySelector(".mesas-sidebar-item")) {
    const html = SECCIONES.map(
      (seccion) => `
        <button
          type="button"
          class="nav-item mesas-sidebar-item"
          data-mesas-seccion="${seccion.id}"
        >
          <i class="fa-solid ${seccion.icono}"></i>
          <span>${seccion.etiqueta}</span>
        </button>
      `,
    ).join("");

    const botonPagina = nav.querySelector('.nav-item[data-page="mesas"]');

    if (botonPagina) {
      botonPagina.insertAdjacentHTML("beforebegin", html);

      botonPagina.remove();
    } else {
      nav.insertAdjacentHTML("afterbegin", html);
    }
  }

  nav.querySelectorAll(".mesas-sidebar-item").forEach((boton) => {
    boton.onclick = () => {
      if (boton.dataset.mesasSeccion === seccionActiva) return;

      seccionActiva = boton.dataset.mesasSeccion;

      mostrarSeccion();

      onChange();

      window.scrollTo(0, 0);
    };
  });
}

// Crea un panel provisional para cada sección que aún no tiene su vista.
function asegurarVistas(contenedor) {
  SECCIONES.forEach((seccion) => {
    if (contenedor.querySelector(`[data-mesas-vista="${seccion.id}"]`)) return;

    const panel = document.createElement("section");

    panel.className = "mesas-vista";
    panel.dataset.mesasVista = seccion.id;
    panel.hidden = true;

    panel.innerHTML = `
      <div class="mesas-vista-placeholder">
        <i class="fa-solid ${seccion.icono}"></i>
        <h2>${seccion.etiqueta}</h2>
        <p>${seccion.resumen}</p>
        <span>Se implementa en la Fase ${seccion.fase}</span>
      </div>
      ${seccion.plantillas ? `<div data-plantillas-slot></div>` : ""}
    `;

    contenedor.appendChild(panel);
  });
}

function mostrarSeccion() {
  document.querySelectorAll("[data-mesas-seccion]").forEach((boton) => {
    const activa = boton.dataset.mesasSeccion === seccionActiva;

    boton.classList.toggle("active", activa);

    if (activa) {
      boton.setAttribute("aria-current", "page");
    } else {
      boton.removeAttribute("aria-current");
    }
  });

  document.querySelectorAll("[data-mesas-vista]").forEach((vista) => {
    vista.hidden = vista.dataset.mesasVista !== seccionActiva;
  });

  const seccion = SECCIONES.find((s) => s.id === seccionActiva);

  // Como las pestañas ya no están en la página, el encabezado indica dónde estás
  const eyebrow = document.querySelector("#mesasPage .mesas-page-header .eyebrow");

  if (eyebrow && seccion) {
    eyebrow.textContent = `Mesas y Secretaría de Acuerdos · ${seccion.etiqueta}`;
  }

  mostrarPanelAlertas(seccion?.alertas === true);

  configurarBarraFiltros(seccion?.filtros || {});
}

// El panel de Alertas (notificaciones) vive solo en el apartado Mesas para
// no meter ruido visual en el resto. En los demás, el contenido ocupa todo el ancho.
function mostrarPanelAlertas(visible) {
  const layout = document.querySelector("#mesasPage .mesas-secretaria-layout");

  const panel = document.querySelector("#mesasPage .mesas-secretaria-sidebar");

  if (panel) panel.hidden = !visible;

  if (layout) layout.classList.toggle("sin-alertas", !visible);
}
