// ============================================================
// ADMINISTRADOR
// assets/js/modules/admin.js
//
// Páginas exclusivas del rol "admin":
//   - admin     Panel (dashboard) del Administrador
//   - usuarios  Ver usuarios, cambiar contraseñas y eliminarlos
// Los Catálogos se editan en la página "catalogos" que ya existía.
//
// Maqueta: los usuarios viven en localStorage (ver auth.js). Al
// migrar, estas funciones llaman al servidor.
// ============================================================

import { getData } from "../storage.js";
import { escapeHTML, formatDateTime } from "../utils.js";
import { showModal, closeForm } from "../forms/formHelper.js";
import {
  getSession,
  getUsuariosPublicos,
  cambiarPasswordUsuario,
  eliminarUsuario,
  restablecerUsuariosDemo,
} from "../auth.js";
import { cargarTodosLosDatosDemo } from "./demoGlobal.js";

export const ROLES = {
  admin: "Administrador",
  mesa: "Secretaría de Acuerdos",
  presidencia: "Presidencia (Magistrada)",
  "amparos-directos": "Mesa de Amparos Directos",
  "amparos-indirectos": "Mesa de Amparos Indirectos",
  oficialia: "Oficialía de Partes",
};

export function etiquetaRol(rol) {
  return ROLES[rol] || rol || "—";
}

function contar(clave) {
  const datos = getData(clave, []);

  return Array.isArray(datos) ? datos.length : 0;
}

// ------------------------------------------------------------
// PANEL (DASHBOARD)
// ------------------------------------------------------------
export function renderAdminDashboard() {
  const contenedor = document.getElementById("adminDashboard");

  if (!contenedor) return;

  const usuarios = getUsuariosPublicos();
  const entes = getData("entes", []);
  const actos = getData("actosDemandados", []);
  const activos = (lista) =>
    Array.isArray(lista)
      ? lista.filter((item) => item.activo !== false).length
      : 0;

  const tarjetas = [
    ["fa-users", "Usuarios", usuarios.length, "Cuentas registradas"],
    [
      "fa-building-columns",
      "Entes públicos",
      Array.isArray(entes) ? entes.length : 0,
      `${activos(entes)} activos`,
    ],
    [
      "fa-list",
      "Actos demandados",
      Array.isArray(actos) ? actos.length : 0,
      `${activos(actos)} activos`,
    ],
    [
      "fa-folder-open",
      "Expedientes",
      contar("expedientes"),
      "Registrados en el sistema",
    ],
    [
      "fa-file-lines",
      "Promociones",
      contar("promociones"),
      "Registradas en el sistema",
    ],
    [
      "fa-list-check",
      "Listas de acuerdos",
      contar("mesasListas"),
      "Generadas por las mesas",
    ],
  ];

  const porRol = Object.keys(ROLES)
    .map((rol) => [rol, usuarios.filter((u) => u.rol === rol).length])
    .filter(([, total]) => total > 0);

  const accesos = usuarios
    .filter((u) => u.ultimoAcceso)
    .sort((a, b) =>
      String(b.ultimoAcceso).localeCompare(String(a.ultimoAcceso)),
    )
    .slice(0, 6);

  contenedor.innerHTML = `
    <div class="admin-stats">
      ${tarjetas
        .map(
          ([icono, titulo, valor, detalle]) => `
        <div class="admin-stat" data-admin-stat="${escapeHTML(titulo)}">
          <div class="admin-stat-icon"><i class="fa-solid ${icono}"></i></div>
          <div>
            <span>${escapeHTML(titulo)}</span>
            <strong>${valor}</strong>
            <small>${escapeHTML(detalle)}</small>
          </div>
        </div>`,
        )
        .join("")}
    </div>

    <div class="admin-grid">
      <div class="catalog-card">
        <div class="catalog-card-header">
          <div>
            <h3>Funciones del Administrador</h3>
            <p class="section-subtitle">Accesos directos a lo que puedes administrar</p>
          </div>
        </div>
        <div class="admin-actions">
          <button type="button" class="admin-action nav-item-link" data-admin-ir="usuarios">
            <i class="fa-solid fa-users-gear"></i>
            <span><strong>Usuarios</strong>Ver usuarios, cambiar contraseñas y eliminar</span>
          </button>
          <button type="button" class="admin-action nav-item-link" data-admin-ir="catalogos">
            <i class="fa-solid fa-list"></i>
            <span><strong>Catálogos</strong>Ver y editar entes públicos y actos demandados</span>
          </button>
          <button type="button" class="admin-action nav-item-link" data-admin-ir="perfil">
            <i class="fa-solid fa-id-badge"></i>
            <span><strong>Mi perfil</strong>Datos de tu cuenta y de tu sesión</span>
          </button>
          <button type="button" class="admin-action" data-admin-demo>
            <i class="fa-solid fa-flask"></i>
            <span><strong>Cargar datos de prueba</strong>Genera datos de demostración para todas las secciones del sistema</span>
          </button>
        </div>
      </div>

      <div class="catalog-card">
        <div class="catalog-card-header">
          <div>
            <h3>Usuarios por rol</h3>
            <p class="section-subtitle">Distribución de las cuentas del sistema</p>
          </div>
        </div>
        <ul class="admin-roles">
          ${porRol
            .map(
              ([rol, total]) =>
                `<li><span>${escapeHTML(etiquetaRol(rol))}</span><strong>${total}</strong></li>`,
            )
            .join("")}
        </ul>
      </div>
    </div>

    <div class="catalog-card" style="margin-top: 24px;">
      <div class="catalog-card-header">
        <div>
          <h3>Últimos accesos</h3>
          <p class="section-subtitle">Inicios de sesión más recientes en este navegador</p>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Último acceso</th></tr></thead>
          <tbody>
            ${
              accesos.length
                ? accesos
                    .map(
                      (u) => `
                <tr>
                  <td><strong>${escapeHTML(u.nombre)}</strong></td>
                  <td>${escapeHTML(u.email)}</td>
                  <td>${escapeHTML(etiquetaRol(u.rol))}</td>
                  <td>${escapeHTML(formatDateTime(u.ultimoAcceso))}</td>
                </tr>`,
                    )
                    .join("")
                : `<tr><td colspan="4" style="text-align:center;color:#64748b;padding:24px;">Aún no hay accesos registrados.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  contenedor.onclick = (event) => {
    if (event.target.closest("[data-admin-demo]")) {
      abrirDatosDemo();

      return;
    }

    const boton = event.target.closest("[data-admin-ir]");

    if (boton) window.irAPagina?.(boton.dataset.adminIr);
  };
}

// ------------------------------------------------------------
// USUARIOS
// ------------------------------------------------------------
let avisoUsuarios = "";

export function renderUsuarios() {
  const contenedor = document.getElementById("usuariosContenido");

  if (!contenedor) return;

  const usuarios = getUsuariosPublicos();
  const actual = getSession()?.email;

  contenedor.innerHTML = `
    <div class="catalog-card">
      <div class="catalog-card-header">
        <div>
          <h3>Usuarios del sistema</h3>
          <p class="section-subtitle">${usuarios.length} cuentas. Las contraseñas no se muestran; solo se pueden reemplazar.</p>
        </div>
        <button type="button" class="secondary-btn" data-usuarios-action="restablecer"
          title="Solo para la maqueta: vuelve a los usuarios y contraseñas de demostración">
          Restablecer usuarios de demostración
        </button>
      </div>

      ${avisoUsuarios ? `<p class="admin-aviso" id="usuariosAviso">${escapeHTML(avisoUsuarios)}</p>` : ""}

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th><th>Correo</th><th>Rol</th><th>Área</th>
              <th>Último acceso</th><th>Acción</th>
            </tr>
          </thead>
          <tbody id="usuariosTable">
            ${usuarios
              .map(
                (u) => `
              <tr data-usuario="${escapeHTML(u.email)}">
                <td>
                  <strong>${escapeHTML(u.nombre)}</strong>
                  ${u.email === actual ? `<span class="status-badge status-recibido">Tú</span>` : ""}
                </td>
                <td>${escapeHTML(u.email)}</td>
                <td>${escapeHTML(etiquetaRol(u.rol))}</td>
                <td>${escapeHTML(u.area || "—")}</td>
                <td>${escapeHTML(u.ultimoAcceso ? formatDateTime(u.ultimoAcceso) : "Sin accesos")}</td>
                <td class="actions-cell">
                  <div class="action-buttons-group">
                    <button type="button" class="table-action" data-usuarios-action="password" data-email="${escapeHTML(u.email)}">
                      Cambiar contraseña
                    </button>
                    <button type="button" class="table-action text-danger" data-usuarios-action="eliminar" data-email="${escapeHTML(u.email)}"
                      ${u.email === actual ? 'disabled title="No puedes eliminar tu propio usuario"' : ""}>
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;

  avisoUsuarios = "";

  contenedor.onclick = (event) => {
    const boton = event.target.closest("[data-usuarios-action]");

    if (!boton || boton.disabled) return;

    const email = boton.dataset.email;

    switch (boton.dataset.usuariosAction) {
      case "password":
        abrirCambioPassword(email);
        break;

      case "eliminar":
        abrirEliminar(email);
        break;

      case "restablecer":
        abrirRestablecer();
        break;
    }
  };
}

function terminar(mensaje) {
  avisoUsuarios = mensaje;
  closeForm();
  renderUsuarios();
}

function mostrarError(id, mensaje) {
  const caja = document.getElementById(id);

  if (!caja) return;

  caja.textContent = mensaje;
  caja.hidden = false;
}

function abrirCambioPassword(email) {
  const usuario = getUsuariosPublicos().find((u) => u.email === email);

  if (!usuario) return;

  showModal(`
    <div class="form-header">
      <span>Usuarios</span>
      <h2>Cambiar contraseña</h2>
    </div>
    <div class="form-body">
      <form id="usuarioPasswordForm" autocomplete="off">
        <p class="section-subtitle" style="margin-bottom:16px;">
          ${escapeHTML(usuario.nombre)} · ${escapeHTML(usuario.email)}
        </p>
        <div class="form-grid columns-2">
          <div class="field">
            <label>Nueva contraseña *</label>
            <input id="usuarioPasswordNueva" type="password" required autocomplete="new-password">
          </div>
          <div class="field">
            <label>Confirmar contraseña *</label>
            <input id="usuarioPasswordConfirmar" type="password" required autocomplete="new-password">
          </div>
        </div>
        <p class="admin-error" id="usuarioPasswordError" hidden></p>
        <div class="form-actions" style="margin-top: 20px;">
          <button type="button" class="secondary-btn" id="usuarioPasswordCancelar">Cancelar</button>
          <button type="submit" class="primary-btn">Guardar contraseña</button>
        </div>
      </form>
    </div>
  `);

  document.getElementById("usuarioPasswordCancelar").onclick = closeForm;
  document.getElementById("usuarioPasswordForm").onsubmit = (event) => {
    event.preventDefault();

    const nueva = document.getElementById("usuarioPasswordNueva").value;
    const confirmar = document.getElementById("usuarioPasswordConfirmar").value;

    if (nueva !== confirmar) {
      mostrarError("usuarioPasswordError", "Las contraseñas no coinciden.");
      return;
    }

    const resultado = cambiarPasswordUsuario(email, nueva);

    if (!resultado.ok) {
      mostrarError("usuarioPasswordError", resultado.message);
      return;
    }

    terminar(`Se cambió la contraseña de ${usuario.nombre}.`);
  };
}

function abrirEliminar(email) {
  const usuario = getUsuariosPublicos().find((u) => u.email === email);

  if (!usuario) return;

  showModal(`
    <div class="form-header">
      <span>Usuarios</span>
      <h2>Eliminar usuario</h2>
    </div>
    <div class="form-body">
      <p>
        ¿Eliminar a <strong>${escapeHTML(usuario.nombre)}</strong> (${escapeHTML(usuario.email)})?
        Ya no podrá iniciar sesión. Los registros que capturó se conservan.
      </p>
      <p class="admin-error" id="usuarioEliminarError" hidden></p>
      <div class="form-actions" style="margin-top: 20px;">
        <button type="button" class="secondary-btn" id="usuarioEliminarCancelar">Cancelar</button>
        <button type="button" class="primary-btn admin-danger-btn" id="usuarioEliminarConfirmar">Eliminar usuario</button>
      </div>
    </div>
  `);

  document.getElementById("usuarioEliminarCancelar").onclick = closeForm;
  document.getElementById("usuarioEliminarConfirmar").onclick = () => {
    const resultado = eliminarUsuario(email);

    if (!resultado.ok) {
      mostrarError("usuarioEliminarError", resultado.message);
      return;
    }

    terminar(`Se eliminó el usuario ${usuario.nombre}.`);
  };
}

function abrirDatosDemo() {
  showModal(`
    <div class="form-header">
      <span>Datos de prueba</span>
      <h2>Cargar datos de prueba en todo el sistema</h2>
    </div>
    <div class="form-body" id="demoCuerpo">
      <p>
        Genera datos de demostración para Oficialía, Secretaría de Acuerdos y
        Amparos Directos e Indirectos, con documentos y plantillas de ejemplo.
        Está pensado para repetirse sin duplicar registros de demostración.
      </p>
      <div class="form-actions" style="margin-top: 20px;">
        <button type="button" class="secondary-btn" id="demoCancelar">Cancelar</button>
        <button type="button" class="primary-btn" id="demoConfirmar">Cargar datos</button>
      </div>
    </div>
  `);

  document.getElementById("demoCancelar").onclick = closeForm;

  document.getElementById("demoConfirmar").onclick = async (evento) => {
    evento.target.disabled = true;
    evento.target.textContent = "Cargando...";

    const resultados = await cargarTodosLosDatosDemo();

    document.getElementById("demoCuerpo").innerHTML = `
      <ul style="list-style:none;padding:0;margin:0 0 16px;">
        ${resultados
          .map(
            (r) => `<li style="margin-bottom:8px;">
              <i class="fa-solid ${r.ok ? "fa-circle-check" : "fa-circle-xmark"}"
                 style="color:${r.ok ? "#1f9d55" : "#c0392b"};"></i>
              ${escapeHTML(r.nombre)}
              ${r.ok ? "" : `<br><small>${escapeHTML(r.error)}</small>`}
            </li>`,
          )
          .join("")}
      </ul>
      <div class="form-actions">
        <button type="button" class="primary-btn" id="demoCerrar">Cerrar</button>
      </div>`;

    document.getElementById("demoCerrar").onclick = () => {
      closeForm();
      renderAdminDashboard();
    };
  };
}

function abrirRestablecer() {
  showModal(`
    <div class="form-header">
      <span>Usuarios</span>
      <h2>Restablecer usuarios de demostración</h2>
    </div>
    <div class="form-body">
      <p>
        Se recuperan los usuarios eliminados y todas las contraseñas vuelven a <strong>123</strong>.
        Es una ayuda de la maqueta; no afecta expedientes ni catálogos.
      </p>
      <div class="form-actions" style="margin-top: 20px;">
        <button type="button" class="secondary-btn" id="usuariosRestablecerCancelar">Cancelar</button>
        <button type="button" class="primary-btn" id="usuariosRestablecerConfirmar">Restablecer</button>
      </div>
    </div>
  `);

  document.getElementById("usuariosRestablecerCancelar").onclick = closeForm;
  document.getElementById("usuariosRestablecerConfirmar").onclick = () => {
    restablecerUsuariosDemo();
    terminar("Se restablecieron los usuarios de demostración.");
  };
}
