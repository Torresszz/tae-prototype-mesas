// ============================================================
// FILTROS GLOBALES DEL MÓDULO MESAS
// assets/js/modules/mesas/filtros.js
// Un solo estado de filtros compartido por todas las pestañas:
// No. de expediente, fecha desde/hasta y estado.
// ============================================================

import { ESTADOS } from "./estados.js";

const filtros = {
  expediente: "",
  desde: "",
  hasta: "",
  estado: "",
};

// ------------------------------------------------------------
// ESTADO
// ------------------------------------------------------------

export function getFiltros() {
  return { ...filtros };
}

export function setFiltro(campo, valor) {
  if (Object.prototype.hasOwnProperty.call(filtros, campo)) {
    filtros[campo] = valor ?? "";
  }
}

export function limpiarFiltros() {
  filtros.expediente = "";
  filtros.desde = "";
  filtros.hasta = "";
  filtros.estado = "";
}

// ------------------------------------------------------------
// COINCIDENCIAS (reutilizables por cada pestaña)
// ------------------------------------------------------------

// Acepta "2026-03-05" o "05/03/2026" y devuelve "YYYY-MM-DD" ("" si no es válida).
export function normalizarDia(valor) {
  if (!valor) return "";

  const texto = String(valor).trim();

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const local = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (local) return `${local[3]}-${local[2]}-${local[1]}`;

  return "";
}

export function coincideExpediente(numero) {
  const buscado = filtros.expediente.trim().toLowerCase();

  return !buscado || String(numero || "").toLowerCase().includes(buscado);
}

// Comparación inclusiva por día; una fecha inválida no coincide si hay rango.
export function coincideFecha(fecha) {
  if (!filtros.desde && !filtros.hasta) return true;

  const dia = normalizarDia(fecha);

  return (
    Boolean(dia) &&
    (!filtros.desde || dia >= filtros.desde) &&
    (!filtros.hasta || dia <= filtros.hasta)
  );
}

export function coincideEstado(estado) {
  return !filtros.estado || estado === filtros.estado;
}

// Aplica los filtros globales a cualquier lista.
// Solo se evalúa lo que el getter correspondiente entregue.
//   aplicarFiltrosGlobales(lista, { numero: (x) => x.expediente, fecha: (x) => x.fecha, estado: (x) => x.estado })
export function aplicarFiltrosGlobales(lista, getters = {}) {
  return lista.filter(
    (item) =>
      (!getters.numero || coincideExpediente(getters.numero(item))) &&
      (!getters.fecha || coincideFecha(getters.fecha(item))) &&
      (!getters.estado || coincideEstado(getters.estado(item))),
  );
}

// ------------------------------------------------------------
// BARRA GLOBAL (DOM)
// ------------------------------------------------------------

const $ = (id) => document.getElementById(id);

export function initBarraFiltros(onChange) {
  const expediente = $("mesasFiltroExpediente");
  const desde = $("mesasFechaDesde");
  const hasta = $("mesasFechaHasta");
  const estado = $("mesasFiltroEstado");
  const limpiar = $("mesasFiltroLimpiar");

  if (estado && !estado.options.length) {
    estado.innerHTML = [
      `<option value="">Todos los estados</option>`,
      ...ESTADOS.map(
        (e) => `<option value="${e.clave}">${e.etiqueta}</option>`,
      ),
    ].join("");
  }

  sincronizarBarraFiltros();

  if (expediente) {
    expediente.oninput = (event) => {
      setFiltro("expediente", event.target.value.trim());
      onChange();
    };
  }

  if (desde) {
    desde.onchange = (event) => {
      setFiltro("desde", event.target.value);
      onChange();
    };
  }

  if (hasta) {
    hasta.onchange = (event) => {
      setFiltro("hasta", event.target.value);
      onChange();
    };
  }

  if (estado) {
    estado.onchange = (event) => {
      setFiltro("estado", event.target.value);
      onChange();
    };
  }

  if (limpiar) {
    limpiar.onclick = () => {
      limpiarFiltros();
      sincronizarBarraFiltros();
      onChange();
    };
  }
}

// Refleja el estado interno en los controles (útil al cambiar de pestaña).
export function sincronizarBarraFiltros() {
  const valores = {
    mesasFiltroExpediente: filtros.expediente,
    mesasFechaDesde: filtros.desde,
    mesasFechaHasta: filtros.hasta,
    mesasFiltroEstado: filtros.estado,
  };

  Object.entries(valores).forEach(([id, valor]) => {
    const campo = $(id);

    if (campo && campo.value !== valor) {
      campo.value = valor;
    }
  });
}

// Muestra u oculta controles según la pestaña activa.
export function configurarBarraFiltros({
  visible = true,
  expediente = true,
  fechas = true,
  estado = true,
  etiquetaExpediente = "No. de expediente",
  placeholderExpediente = "Ej. 124/2026",
} = {}) {
  const barra = $("mesasGlobalBar");

  if (!barra) return;

  barra.hidden = !visible;

  const mostrar = (selector, activo) => {
    barra.querySelectorAll(selector).forEach((el) => {
      el.hidden = !activo;
    });
  };

  mostrar('[data-filtro="expediente"]', expediente);
  mostrar('[data-filtro="fechas"]', fechas);
  mostrar('[data-filtro="estado"]', estado);

  const etiqueta = barra.querySelector('[data-filtro="expediente"] > span');
  const entrada = $("mesasFiltroExpediente");

  if (etiqueta) etiqueta.textContent = etiquetaExpediente;
  if (entrada) entrada.placeholder = placeholderExpediente;
}
