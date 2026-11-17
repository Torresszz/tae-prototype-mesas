// ============================================================
// PERFIL DE USUARIO
// assets/js/modules/perfil.js
//
// Se abre desde el ícono del usuario (arriba a la derecha). Lo ve
// cualquier usuario con sesión. Solo muestra datos: la contraseña la
// cambia el Administrador desde "Usuarios".
// ============================================================

import { escapeHTML, formatDateTime } from "../utils.js";
import { getSession, getUsuarioActual, logout } from "../auth.js";
import { etiquetaRol } from "./admin.js";

function iniciales(nombre) {
  return String(nombre || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

export function renderPerfil() {
  const contenedor = document.getElementById("perfilContenido");
  const sesion = getSession();

  if (!contenedor || !sesion) return;

  const usuario = getUsuarioActual() || sesion;
  const avatar =
    document.querySelector(".topbar .avatar")?.textContent.trim() ||
    iniciales(usuario.nombre);

  const datos = [
    ["Nombre", usuario.nombre],
    ["Correo / usuario", usuario.email],
    ["Rol", etiquetaRol(usuario.rol)],
    ["Área", usuario.area || "—"],
    ...(usuario.mesa ? [["Mesa asignada", `Mesa ${usuario.mesa}`]] : []),
    ["Inicio de esta sesión", formatDateTime(sesion.iniciadoEn)],
    ["Último acceso registrado", usuario.ultimoAcceso ? formatDateTime(usuario.ultimoAcceso) : "—"],
  ];

  contenedor.innerHTML = `
    <div class="catalog-card perfil-card">
      <div class="perfil-head">
        <div class="perfil-avatar">${escapeHTML(avatar)}</div>
        <div>
          <h3 id="perfilNombre">${escapeHTML(usuario.nombre)}</h3>
          <p class="section-subtitle">${escapeHTML(usuario.area || etiquetaRol(usuario.rol))}</p>
        </div>
      </div>

      <dl class="perfil-datos">
        ${datos
          .map(
            ([etiqueta, valor]) => `
          <div>
            <dt>${escapeHTML(etiqueta)}</dt>
            <dd>${escapeHTML(valor)}</dd>
          </div>`,
          )
          .join("")}
      </dl>

      <p class="section-subtitle perfil-nota">
        Para cambiar tu contraseña, solicítalo al Administrador del sistema.
      </p>

      <div class="form-actions">
        <button type="button" class="secondary-btn" id="perfilVolver">Volver al inicio</button>
        <button type="button" class="primary-btn" id="perfilCerrarSesion">Cerrar sesión</button>
      </div>
    </div>
  `;

  document.getElementById("perfilVolver").onclick = () => window.irAInicio?.();
  document.getElementById("perfilCerrarSesion").onclick = logout;
}
