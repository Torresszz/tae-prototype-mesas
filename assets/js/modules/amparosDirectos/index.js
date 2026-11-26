// ============================================================
// APARTADOS DE LA PÁGINA DE AMPAROS DIRECTOS
// assets/js/modules/amparosDirectos/index.js
//
// Igual que Mesas, los apartados se muestran en la BARRA LATERAL (en el
// lugar del botón "Amparos Directos") pero siguen siendo vistas internas
// de la página "mesas-amparos-directos": no son rutas nuevas, así que
// los permisos de auth.js no cambian.
//   Pendientes de realizar · Amparos · Cuadernillos · Plantillas · Listas
// El apartado "Amparos" es la tabla de siempre (en mesasAmparos.js);
// los otros tres los dibujan los módulos de esta carpeta.
// ============================================================

import { renderCuadernillos } from "./cuadernillo.js";

import { renderPendientesDirectos } from "./pendientes.js";

import { renderTccDirectos, totalAlertasTcc } from "./tcc.js";

import { renderPlantillasDirectos } from "./plantillasDirectos.js";

import { renderListasDirectos, iniciarListasAutomaticas } from "./listas.js";

const PAGINA = "mesas-amparos-directos";

export const SECCIONES_DIRECTOS = [
  {
    id: "pendientes",
    etiqueta: "Amparos pendientes de realizar",
    icono: "fa-clipboard-list",
  },
  {
    id: "tcc",
    etiqueta: "Pendiente de enviar al TCC",
    icono: "fa-building-columns",
  },
  { id: "amparos", etiqueta: "Amparos", icono: "fa-scale-balanced" },
  { id: "cuadernillos", etiqueta: "Cuadernillos", icono: "fa-folder-open" },
  { id: "plantillas", etiqueta: "Plantillas", icono: "fa-file-lines" },
  { id: "listas", etiqueta: "Listas", icono: "fa-list-check" },
];

let seccionActiva = "pendientes";

// Últimas dependencias recibidas (para repintar desde la barra lateral)
let depsActuales = {};

// Pone los apartados en la barra lateral, en el lugar del botón de la
// página. Usan .nav-item pero SIN data-page: así el router no intenta
// cargar otra página. (No usan la clase .mesas-sidebar-item: esa la
// maneja el módulo de Mesas.)
function initSidebarDirectos() {
  const nav = document.querySelector(".sidebar .nav");

  if (!nav) return;

  if (!nav.querySelector(".mampd-sidebar-item")) {
    const html = SECCIONES_DIRECTOS.map(
      (seccion) => `
        <button
          type="button"
          class="nav-item mampd-sidebar-item"
          data-mampd-seccion="${seccion.id}"
        >
          <i class="fa-solid ${seccion.icono}"></i>
          <span>${seccion.etiqueta}</span>
        </button>
      `,
    ).join("");

    const botonPagina = nav.querySelector(`.nav-item[data-page="${PAGINA}"]`);

    if (botonPagina) {
      botonPagina.insertAdjacentHTML("beforebegin", html);

      botonPagina.remove();
    } else {
      nav.insertAdjacentHTML("afterbegin", html);
    }
  }

  nav.querySelectorAll(".mampd-sidebar-item").forEach((boton) => {
    boton.onclick = async () => {
      seccionActiva = boton.dataset.mampdSeccion;

      // Si se está en otra página (por ejemplo el administrador), primero
      // se navega; al cargar, la página pinta la sección elegida.
      if (!document.getElementById("mampPage")) {
        const { navigate } = await import("../../router.js");

        await navigate(PAGINA);

        return;
      }

      renderSeccionesDirectos(depsActuales);

      window.scrollTo(0, 0);
    };
  });
}

// Globo con las alertas de informe (3 días) sin atender en el botón del TCC.
function marcarAlertasTcc() {
  const total = totalAlertasTcc();

  document.querySelectorAll('[data-mampd-seccion="tcc"]').forEach((boton) => {
    let globo = boton.querySelector(".mampd-nav-badge");

    if (!total) {
      globo?.remove();

      return;
    }

    if (!globo) {
      globo = document.createElement("span");

      globo.className = "mampd-nav-badge";

      boton.appendChild(globo);
    }

    globo.textContent = String(total);
  });
}

function marcarSeccionActiva() {
  document.querySelectorAll("[data-mampd-seccion]").forEach((boton) => {
    const activa = boton.dataset.mampdSeccion === seccionActiva;

    boton.classList.toggle("active", activa);

    if (activa) {
      boton.setAttribute("aria-current", "page");
    } else {
      boton.removeAttribute("aria-current");
    }
  });
}

// deps: { nombreEtapa(seg), alCambiar(), deOficialia(), recibir(id, categoria),
//         abrirAmparo(id), regresarDeActuaria(id) }
export function renderSeccionesDirectos(deps = {}) {
  depsActuales = deps;

  initSidebarDirectos();

  marcarSeccionActiva();

  marcarAlertasTcc();

  document.querySelectorAll("[data-mamp-vista]").forEach((vista) => {
    vista.hidden = vista.dataset.mampVista !== seccionActiva;
  });

  // El encabezado indica dónde estás (las pestañas ya no están en la página)
  const etiqueta = SECCIONES_DIRECTOS.find((s) => s.id === seccionActiva)?.etiqueta;

  const eyebrow = document.querySelector("#mampPage .eyebrow");

  if (eyebrow && etiqueta) {
    eyebrow.textContent = `Mesa de Amparos Directos · ${etiqueta}`;
  }

  const host = (id) => document.getElementById(id);

  switch (seccionActiva) {
    case "pendientes":
      renderPendientesDirectos(host("mampdPendientesHost"), deps);

      break;

    case "tcc":
      renderTccDirectos(host("mampdTccHost"), deps);

      break;

    case "cuadernillos":
      renderCuadernillos(host("mampdCuadernillosHost"), deps);

      break;

    case "plantillas":
      renderPlantillasDirectos(host("mampdPlantillasHost"));

      break;

    case "listas":
      renderListasDirectos(host("mampdListasHost"), deps);

      break;
  }

  // Lista automática de las 15:00 (lunes a viernes), si no se creó a mano.
  iniciarListasAutomaticas(() => {
    if (seccionActiva === "listas") {
      renderListasDirectos(host("mampdListasHost"), deps);
    }
  });
}
