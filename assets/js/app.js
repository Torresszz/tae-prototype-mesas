// =====================================================
// APP PRINCIPAL
// Sistema Tribunal
// =====================================================


// =====================================================
// AUTENTICACIÓN
// =====================================================

import {
  requireSession,
  logout,
  canAccessPage,
  getHomePage
} from "./auth.js";


// =====================================================
// COMPONENTES BASE
// =====================================================

import {
  setupModal
} from "./modal.js";


import {
  initRouter,
  navigate
} from "./router.js";


// =====================================================
// DASHBOARD
// =====================================================

import {
  initDashboard
} from "./dashboard/home.js";


import {
  initResumen
} from "./dashboard/resumen.js";


// =====================================================
// MÓDULOS
// =====================================================

import {
  initHistorico
} from "./modules/historico.js";


import {
  initExpedientes
} from "./modules/expedientes.js";


import {
  initDemandas
} from "./modules/demandas.js";


import {
  initAmparosPage
} from "./modules/amparos.js";


import {
  initExhortos
} from "./modules/exhortos.js";


import {
  initPromociones
} from "./modules/promociones.js";


import {
  initOficios
} from "./modules/oficios.js";


import {
  initRegistral
} from "./modules/registral.js";


import {
  initMesas
} from "./modules/mesas.js";

import {
  initMesasAmparos
} from "./modules/mesasAmparos.js";


// =====================================================
// FORMULARIOS
// =====================================================

import {
  initDemandaForm
} from "./forms/demandaForm.js";


import {
  initAmparoForm
} from "./forms/amparoForm.js";


import {
  initExhortoForm
} from "./forms/exhortoForm.js";


import {
  initPromocionForm
} from "./forms/promocionForm.js";


import {
  initOficioForm
} from "./forms/oficioForm.js";


import {
  initRegistralForm
} from "./forms/registralForm.js";


// =====================================================
// SESIÓN ACTUAL
// =====================================================

let currentSession =
  null;


// =====================================================
// CARGAR COMPONENTE HTML
// =====================================================

async function loadComponent(
  id,
  file
) {

  const container =
    document.getElementById(
      id
    );


  if (!container) {
    return;
  }


  const response =
    await fetch(
      file
    );


  if (!response.ok) {

    throw new Error(
      `No se pudo cargar ${file}`
    );

  }


  const html =
    await response.text();


  container.innerHTML =
    html;

}


// =====================================================
// CARGAR LAYOUT
// =====================================================

async function loadLayout() {

  await loadComponent(
    "sidebar-container",
    "components/sidebar.html"
  );


  await loadComponent(
    "navbar-container",
    "components/navbar.html"
  );


  await loadComponent(
    "modal-container",
    "components/modal.html"
  );

}


// =====================================================
// INFORMACIÓN DEL USUARIO
// =====================================================

function setUserInfo(
  nombre,
  area,
  iniciales
) {

  const userName =
    document.querySelector(
      ".user-info strong"
    );


  const userRole =
    document.querySelector(
      ".user-info span"
    );


  const avatar =
    document.querySelector(
      ".avatar"
    );


  if (userName) {

    userName.textContent =
      nombre;

  }


  if (userRole) {

    userRole.textContent =
      area;

  }


  if (avatar) {

    avatar.textContent =
      iniciales;

  }

}


// =====================================================
// QUITAR CONFIGURACIÓN
// =====================================================

function removeConfiguration() {

  document
    .querySelectorAll(
      ".sidebar-bottom .nav-item"
    )
    .forEach(button => {

      const text =
        button.textContent
          .trim()
          .toLowerCase();


      if (
        text.includes(
          "configuración"
        )
      ) {

        button.remove();

      }

    });

}


// =====================================================
// OCULTAR BUSCADOR GLOBAL
// =====================================================

function removeGlobalSearch() {

  const globalSearch =
    document.getElementById(
      "globalSearch"
    );


  if (!globalSearch) {
    return;
  }


  const wrapper =
    globalSearch.closest(
      ".global-search"
    );


  if (wrapper) {

    wrapper.remove();

  }

}


// =====================================================
// OCULTAR CAMPANA
// =====================================================

function removeNotifications() {

  document
    .querySelectorAll(
      ".topbar .icon-button"
    )
    .forEach(button => {

      button.remove();

    });

}


// =====================================================
// CONTROL VISUAL SEGÚN USUARIO
// =====================================================

// Roles que solo operan dentro de su módulo de mesas
const MESA_SCOPED_ROLES = {
  presidencia: {
    page: "mesas",
    nombre: "Magistrada",
    area: "Presidencia",
    iniciales: "MP"
  },
  "amparos-directos": {
    page: "mesas-amparos-directos",
    nombre: "Amparos Directos",
    area: "Mesa de Amparos Directos",
    iniciales: "AD"
  },
  "amparos-indirectos": {
    page: "mesas-amparos-indirectos",
    nombre: "Amparos Indirectos",
    area: "Mesa de Amparos Indirectos",
    iniciales: "AI"
  }
};

function applyMesaScopedAccess(config) {
  document
    .querySelectorAll(".nav-item[data-page]")
    .forEach(button => {
      if (button.dataset.page !== config.page) {
        button.remove();
      }
    });

  document
    .querySelectorAll(".sidebar-section-title, .nav-section-title")
    .forEach(element => element.remove());

  removeConfiguration();
  removeGlobalSearch();
  removeNotifications();

  setUserInfo(config.nombre, config.area, config.iniciales);

  setupLogout();
}

function applyAccessControl() {
  const scoped = currentSession && MESA_SCOPED_ROLES[currentSession.rol];

  if (scoped) {
    applyMesaScopedAccess(scoped);
    return;
  }

  // Oficialía no ve Mesa de amparos
  if (currentSession?.rol === "oficialia") {
    document
      .querySelectorAll('.nav-item[data-page^="mesas-amparos"]')
      .forEach(button => button.remove());
  }


  if (!currentSession) {
    return;
  }


  // ==================================================
  // USUARIO DE MESA
  //
  // SOLO VE:
  // - Mesas
  // - Cerrar sesión
  // ==================================================

  if (
    currentSession.rol ===
    "mesa"
  ) {

    document
      .querySelectorAll(
        ".nav-item[data-page]"
      )
      .forEach(button => {

        const page =
          button.dataset.page;


        if (
          page !==
          "mesas"
        ) {

          button.remove();

        }

      });


    // Quitar posibles encabezados/separadores
    document
      .querySelectorAll(
        ".sidebar-section-title, .nav-section-title"
      )
      .forEach(element => {

        element.remove();

      });


    removeConfiguration();

    removeGlobalSearch();

    removeNotifications();


    setUserInfo(
      currentSession.nombre || "Mesa",
      currentSession.area || "Secretaría de Acuerdos",
      currentSession.mesa ? "M" + currentSession.mesa : "M"
    );

  }


  // ==================================================
  // USUARIO OFICIALÍA
  //
  // VE TODO LO NORMAL
  // EXCEPTO MESAS
  // ==================================================

  if (
    currentSession.rol ===
    "oficialia"
  ) {

    document
      .querySelectorAll(
        '.nav-item[data-page="mesas"]'
      )
      .forEach(button => {

        button.remove();

      });


    setUserInfo(
      "Oficialía",
      "Oficialía de Partes",
      "OP"
    );

  }


  // ==================================================
  // CERRAR SESIÓN
  // ==================================================

  setupLogout();

}


// =====================================================
// CERRAR SESIÓN
// =====================================================

function setupLogout() {

  document
    .querySelectorAll(
      ".sidebar-bottom .nav-item"
    )
    .forEach(button => {

      const text =
        button.textContent
          .trim()
          .toLowerCase();


      if (
        !text.includes(
          "cerrar sesión"
        )
      ) {

        return;

      }


      button.onclick =
        () => {

          logout();

        };

    });

}


// =====================================================
// BLOQUEAR NAVEGACIÓN NO AUTORIZADA
// =====================================================

function setupNavigationGuard() {

  document.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          ".nav-item[data-page]"
        );


      if (!button) {
        return;
      }


      const page =
        button.dataset.page;


      // Si tiene permiso, continúa normalmente
      if (
        canAccessPage(
          page
        )
      ) {

        return;

      }


      // Evitar navegación
      event.preventDefault();

      event.stopImmediatePropagation();


      // Mandarlo a su página permitida
      const homePage =
        getHomePage();


      if (homePage) {

        navigate(
          homePage
        );

      }

    },
    true
  );

}


// =====================================================
// INICIALIZAR MÓDULOS
// =====================================================

function initModules() {
  if (MESA_SCOPED_ROLES[currentSession?.rol]) {
    initMesas();
    initMesasAmparos();
    return;
  }


  // ==================================================
  // MESA
  // Solo necesita módulo Mesas
  // ==================================================

  if (
    currentSession?.rol ===
    "mesa"
  ) {

    initMesas();

    return;

  }


  // ==================================================
  // OFICIALÍA
  // Módulos normales
  // ==================================================

  initDashboard();

  initResumen();

  initExpedientes();

  initDemandas();

  initAmparosPage();

  initExhortos();

  initPromociones();

  initOficios();

  initRegistral();


  // ==================================================
  // FORMULARIOS
  // ==================================================

  initDemandaForm();

  initAmparoForm();

  initExhortoForm();

  initPromocionForm();

  initOficioForm();

  initRegistralForm();

}


// =====================================================
// EVENTOS GENERALES
// =====================================================

function setupEvents() {
  if (MESA_SCOPED_ROLES[currentSession?.rol]) {
    return;
  }


  // ==================================================
  // MESA NO NECESITA ESTOS EVENTOS
  // ==================================================

  if (
    currentSession?.rol ===
    "mesa"
  ) {

    return;

  }


  document.addEventListener(
    "click",
    event => {

      const button =
        event.target.closest(
          "[data-action]"
        );


      if (!button) {
        return;
      }


      const action =
        button.dataset.action;


      switch (action) {

        // =============================================
        // NUEVA DEMANDA
        // =============================================

        case "new-demanda":

          window
            .openDemandaForm
            ?.();

          break;


        // =============================================
        // NUEVO AMPARO
        // =============================================

        case "new-amparo":

          window
            .openAmparoForm
            ?.();

          break;


        // =============================================
        // NUEVO EXHORTO
        // =============================================

        case "new-exhorto":

          window
            .openExhortoForm
            ?.();

          break;


        // =============================================
        // NUEVA PROMOCIÓN
        // =============================================

        case "new-promocion":

          window
            .openPromocionForm
            ?.();

          break;


        // =============================================
        // NUEVO REGISTRAL
        // =============================================

        case "new-registral":

          window
            .openRegistralForm
            ?.();

          break;


        // =============================================
        // NUEVO OFICIO
        // =============================================

        case "new-oficio":

          window
            .openOficioForm
            ?.();

          break;

      }

    }
  );

}


// =====================================================
// HISTÓRICO
// =====================================================

window.initHistorico =
  initHistorico;


// =====================================================
// INICIAR APLICACIÓN
// =====================================================

async function init() {

  // ==================================================
  // VALIDAR SESIÓN
  // ==================================================

  currentSession =
    requireSession();


  if (!currentSession) {

    return;

  }


  try {

    // ==================================================
    // CARGAR SIDEBAR, NAVBAR Y MODAL
    // ==================================================

    await loadLayout();


    // ==================================================
    // MODAL GLOBAL
    // ==================================================

    setupModal();


    // ==================================================
    // APLICAR PERMISOS VISUALES
    // ==================================================

    applyAccessControl();


    // ==================================================
    // BLOQUEAR RUTAS NO PERMITIDAS
    // ==================================================

    setupNavigationGuard();


    // ==================================================
    // INICIALIZAR MÓDULOS
    // ==================================================

    initModules();


    // ==================================================
    // EVENTOS
    // ==================================================

    setupEvents();


    // ==================================================
    // ROUTER
    // ==================================================

    initRouter();


    // ==================================================
    // PÁGINA INICIAL SEGÚN USUARIO
    // ==================================================

    const homePage =
      getHomePage();


    navigate(
      homePage ||
      "dashboard"
    );

  }
  catch (error) {

    console.error(
      "Error al iniciar la aplicación:",
      error
    );

  }

}


// =====================================================
// EJECUTAR
// =====================================================

init();