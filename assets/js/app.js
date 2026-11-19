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
// LIMPIAR GRUPOS VACÍOS DEL SIDEBAR
// =====================================================

function cleanupEmptyNavGroups() {

  document
    .querySelectorAll(
      ".nav-group"
    )
    .forEach(group => {

      const hasItems =
        group.querySelector(
          ".nav-item[data-page]"
        );

      if (!hasItems) {
        group.remove();
      }

    });

}


// =====================================================
// CONTROL VISUAL SEGÚN USUARIO
// =====================================================

// ============================================================
// ADMINISTRADOR
// Solo ve su Panel, Usuarios y Catálogos.
// ============================================================

const PAGINAS_ADMIN = [
  "admin",
  "usuarios",
  "catalogos"
];


function applyAdminAccess() {

  document
    .querySelectorAll(
      ".nav-item[data-page]"
    )
    .forEach(button => {

      if (
        !PAGINAS_ADMIN.includes(
          button.dataset.page
        )
      ) {

        button.remove();

      }

    });


  document
    .querySelectorAll(
      ".sidebar-section-title, .nav-section-title"
    )
    .forEach(
      element =>
        element.remove()
    );


  cleanupEmptyNavGroups();

  removeConfiguration();

  removeGlobalSearch();

  removeNotifications();


  setUserInfo(
    currentSession.nombre ||
      "Administrador",

    currentSession.area ||
      "Administración del sistema",

    "AD"
  );


  setupLogout();

}


// ============================================================
// PERFIL DE USUARIO
// ============================================================

function setupPerfil() {

  window.irAPagina =
    page => {

      if (
        canAccessPage(
          page
        )
      ) {

        navigate(
          page
        );

      }

    };


  window.irAInicio =
    () => {

      navigate(
        getHomePage() ||
        "dashboard"
      );

    };


  document.addEventListener(
    "click",
    event => {

      if (
        event.target.closest(
          "[data-abrir-perfil]"
        )
      ) {

        navigate(
          "perfil"
        );

      }

    }
  );


  document.addEventListener(
    "click",

    async event => {

      const boton =
        event.target.closest(
          ".mesas-sidebar-item"
        );


      if (
        !boton ||
        document.getElementById(
          "mesasPage"
        )
      ) {

        return;

      }


      event.preventDefault();

      event.stopImmediatePropagation();


      const seccion =
        boton.dataset
          .mesasSeccion;


      await navigate(
        "mesas"
      );


      document
        .querySelector(
          `.mesas-sidebar-item[data-mesas-seccion="${seccion}"]`
        )
        ?.click();

    },

    true
  );

}


// ============================================================
// ROLES CON ACCESO LIMITADO
// ============================================================

const MESA_SCOPED_ROLES = {

  presidencia: {

    page:
      "mesas",

    nombre:
      "Magistrada",

    area:
      "Presidencia",

    iniciales:
      "MP"

  },


  "amparos-directos": {

    page:
      "mesas-amparos-directos",

    nombre:
      "Amparos Directos",

    area:
      "Mesa de Amparos Directos",

    iniciales:
      "AD"

  },


  "amparos-indirectos": {

    page:
      "mesas-amparos-indirectos",


    pages: [

      "mesas-amparos-indirectos",

      "mesas-amparos-indirectos-informes",

      "mesas-amparos-indirectos-cuadernillo"

    ],


    nombre:
      "Amparos Indirectos",

    area:
      "Mesa de Amparos Indirectos",

    iniciales:
      "AI"

  }

};


// ============================================================
// ACCESO LIMITADO DE MESA
// ============================================================

function applyMesaScopedAccess(
  config
) {

  const paginasPermitidas =
    config.pages ||
    [
      config.page
    ];


  document
    .querySelectorAll(
      ".nav-item[data-page]"
    )
    .forEach(button => {

      if (
        !paginasPermitidas.includes(
          button.dataset.page
        )
      ) {

        button.remove();

      }

    });


  document
    .querySelectorAll(
      ".sidebar-section-title, .nav-section-title"
    )
    .forEach(
      element =>
        element.remove()
    );


  cleanupEmptyNavGroups();

  removeConfiguration();

  removeGlobalSearch();

  removeNotifications();


  setUserInfo(
    config.nombre,
    config.area,
    config.iniciales
  );


  setupLogout();

}
// ============================================================
// CONTROL DE ACCESO
// ============================================================

function applyAccessControl() {

  // Administración solo para admin
  if (
    currentSession?.rol !==
    "admin"
  ) {

    document
      .querySelectorAll(
        '.nav-item[data-page="admin"], .nav-item[data-page="usuarios"]'
      )
      .forEach(
        button =>
          button.remove()
      );

  }


  if (
    currentSession?.rol ===
    "admin"
  ) {

    applyAdminAccess();

    return;

  }


  const scoped =
    currentSession &&
    MESA_SCOPED_ROLES[
      currentSession.rol
    ];


  if (scoped) {

    applyMesaScopedAccess(
      scoped
    );

    return;

  }


  // ==================================================
  // OFICIALÍA NO VE MESAS DE AMPAROS
  // ==================================================

  if (
    currentSession?.rol ===
    "oficialia"
  ) {

    document
      .querySelectorAll(
        '.nav-item[data-page^="mesas-amparos"]'
      )
      .forEach(
        button =>
          button.remove()
      );

  }


  if (!currentSession) {

    return;

  }


  // ==================================================
  // USUARIO DE MESA
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


    document
      .querySelectorAll(
        ".sidebar-section-title, .nav-section-title"
      )
      .forEach(
        element =>
          element.remove()
      );


    cleanupEmptyNavGroups();

    removeConfiguration();

    removeGlobalSearch();

    removeNotifications();


    setUserInfo(

      currentSession.nombre ||
        "Mesa",

      currentSession.area ||
        "Secretaría de Acuerdos",

      currentSession.mesa
        ? "M" +
          currentSession.mesa
        : "M"

    );

  }


  // ==================================================
  // USUARIO OFICIALÍA
  // ==================================================

  if (
    currentSession.rol ===
    "oficialia"
  ) {

    document
      .querySelectorAll(
        '.nav-item[data-page="mesas"]'
      )
      .forEach(
        button =>
          button.remove()
      );


    cleanupEmptyNavGroups();


    setUserInfo(
      "Oficialía",
      "Oficialía de Partes",
      "OP"
    );

  }


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


      if (
        canAccessPage(
          page
        )
      ) {

        return;

      }


      event.preventDefault();

      event.stopImmediatePropagation();


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

  // Administrador
  if (
    currentSession?.rol ===
    "admin"
  ) {

    return;

  }


  // Usuarios limitados a Mesas / Amparos
  if (
    MESA_SCOPED_ROLES[
      currentSession?.rol
    ]
  ) {

    initMesas();

    initMesasAmparos();

    return;

  }


  // ==================================================
  // MESA
  // ==================================================

  if (
    currentSession?.rol ===
    "mesa"
  ) {

    initMesas();

    return;

  }


  // ==================================================
  // OFICIALÍA Y USUARIOS NORMALES
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

  if (
    currentSession?.rol ===
    "admin"
  ) {

    return;

  }


  if (
    MESA_SCOPED_ROLES[
      currentSession?.rol
    ]
  ) {

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

    setupPerfil();


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