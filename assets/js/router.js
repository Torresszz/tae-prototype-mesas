// =====================================================
// ROUTER
// Sistema Tribunal
// =====================================================

import { renderExpedientes } from "./modules/expedientes.js";

import { renderDemandas } from "./modules/demandas.js";

// import {
//     renderAmparos
// } from "./modules/amparos.js";

import { initAmparosPage } from "./modules/amparos.js";

import { renderExhortos } from "./modules/exhortos.js";

import { renderPromociones } from "./modules/promociones.js";

import { renderOficios } from "./modules/oficios.js";

import { renderRegistral } from "./modules/registral.js";

// import { renderHistorico } from "./dashboard/historico.js";
import { initHistorico } from "./modules/historico.js";

import { renderCatalogos } from "./modules/catalogos.js";

import { renderMesas } from "./modules/mesas.js";
import { renderMesasAmparos } from "./modules/mesasAmparos.js";

// =====================================================
// RUTAS
// =====================================================

const routes = {
  dashboard: "components/dashboard.html",

  expedientes: "pages/expedientes.html",

  demandas: "pages/demandas.html",

  amparos: "pages/amparos.html",

  exhortos: "pages/exhortos.html",

  promociones: "pages/promociones.html",

  registral: "pages/registral.html",

  oficios: "pages/oficios.html",

  historico: "pages/historico.html",

  catalogos: "pages/catalogos.html",

    mesas: "pages/mesas.html",
  "mesas-amparos-directos": "pages/mesas-amparos-directos.html",
  "mesas-amparos-indirectos": "pages/mesas-amparos-indirectos.html",
};

// =====================================================
// NAVEGAR
// =====================================================

export async function navigate(page) {
  const container = document.getElementById("content-container");

  if (!container) {
    console.error("No existe el elemento #content-container");

    return;
  }

  const file = routes[page];

  if (!file) {
    console.error("Ruta no encontrada:", page);

    return;
  }

  try {
    // =============================================
    // CARGAR HTML
    // =============================================

    const response = await fetch(file);

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status} al cargar ${file}`);
    }

    const html = await response.text();

    container.innerHTML = html;

    // =============================================
    // ACTIVAR LA PAGINA
    // =============================================

    const pageElement = container.querySelector(".page");

    if (pageElement) {
      pageElement.classList.add("active");
    }

    // =============================================
    // MENU ACTIVO
    // =============================================

    setActiveMenu(page);

    // =============================================
    // INICIALIZAR PAGINA
    // =============================================

    initializePage(page);

    // =============================================
    // SCROLL ARRIBA
    // =============================================

    window.scrollTo(0, 0);
  } catch (error) {
    console.error("Error al cargar la página:", error);

    container.innerHTML = `

            <div class="page active">

                <div class="page-heading">

                    <span class="eyebrow">
                        ERROR
                    </span>

                    <h1>
                        No se pudo cargar la página
                    </h1>

                    <p>
                        Ocurrió un problema al cargar
                        <strong>${page}</strong>.
                    </p>

                </div>

            </div>

        `;
  }
}

// =====================================================
// INICIALIZAR PAGINA
// =====================================================

function initializePage(page) {
  switch (page) {
    // =============================================
    // DASHBOARD
    // =============================================

    case "dashboard":
      if (window.initDashboardPage) {
        window.initDashboardPage();
      }

      break;

    // =============================================
    // EXPEDIENTES
    // =============================================

    case "expedientes":
      renderExpedientes();

      break;

    // =============================================
    // DEMANDAS
    // =============================================

    case "demandas":
      renderDemandas();

      break;

    // =============================================
    // AMPAROS
    // =============================================

    case "amparos":
      initAmparosPage();

      break;

    // =============================================
    // EXHORTOS
    // =============================================

    case "exhortos":
      renderExhortos();

      break;

    // =============================================
    // PROMOCIONES
    // =============================================

    case "promociones":
      renderPromociones();

      break;

    // =============================================
    // REGISTRAL
    // =============================================

    case "registral":
      renderRegistral();

      break;

    // =============================================
    // OFICIOS
    // =============================================

    case "oficios":
      renderOficios();

      break;

    // =============================================
    // HISTORICO
    // =============================================

    case "historico":
      initHistorico();

      break;

    // =============================================
    // CATALOGOS
    // =============================================
    case "catalogos":
      renderCatalogos();

      break;
    case "mesas-amparos-directos":
    case "mesas-amparos-indirectos":
      renderMesasAmparos();
      break;

    case "mesas":
      renderMesas();

      break;
  }
}

// =====================================================
// MENU ACTIVO
// =====================================================

function setActiveMenu(page) {
  document.querySelectorAll(".nav-item[data-page]").forEach((item) => {
    item.classList.toggle(
      "active",

      item.dataset.page === page,
    );
  });
}

// =====================================================
// INICIALIZAR ROUTER
// =====================================================

export function initRouter() {
  document.addEventListener(
    "click",

    (event) => {
      const link = event.target.closest(".nav-item[data-page]");

      if (!link) {
        return;
      }

      event.preventDefault();

      const page = link.dataset.page;

      navigate(page);
    },
  );
}
