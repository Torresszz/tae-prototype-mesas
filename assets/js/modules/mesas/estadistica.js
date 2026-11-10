// ============================================================
// ESTADÍSTICA
// assets/js/modules/mesas/estadistica.js
// FASE 7 - T-20
//
// Cuatro tarjetas, cada una con su propio rango desde / hasta y su
// contador. Cada mesa ve sus cifras; la Magistrada (sin mesa) ve el
// total y, debajo, el desglose por mesa.
//
// ⚠️ Definiciones propuestas (por confirmar con el equipo). Cada una
// vive en su propia función "items...": para cambiar una definición
// basta con editar esa función.
//
//   Demandas admitidas       categoría "radicado"       · fecha: radicadoEn
//   Promociones admitidas    promociones registradas    · fecha: fecha de la promoción
//   Audiencias desahogadas   estado "desahogada"        · fecha: fecha de la audiencia
//   Calificaciones concluidas resultado "acordado"      · fecha: concluidaEn
//
// Si un registro antiguo no trae su fecha propia (radicadoEn,
// concluidaEn), se usa una fecha de respaldo (ver cada función).
// ============================================================

import { getData } from "../../storage.js";
import { escapeHTML } from "../../utils.js";

import { normalizarDia } from "./filtros.js";
import {
  getExpedientesMesaActual,
  getNumeroExpediente,
  mesaDeExpediente,
  mesaUsuarioActual,
} from "./mesaUtils.js";

// ============================================================
// TARJETAS
// ============================================================

const TARJETAS = [
  {
    id: "demandas",
    titulo: "Demandas admitidas",
    icono: "fa-file-circle-check",
    criterio: "Demandas con categoría Radicado.",
    items: itemsDemandas,
  },
  {
    id: "promociones",
    titulo: "Promociones admitidas",
    icono: "fa-file-pen",
    criterio: "Promociones registradas en el rango.",
    items: itemsPromociones,
  },
  {
    id: "audiencias",
    titulo: "Audiencias desahogadas",
    icono: "fa-gavel",
    criterio: "Audiencias con estado Desahogada.",
    items: itemsAudiencias,
  },
  {
    id: "calificaciones",
    titulo: "Calificaciones concluidas",
    icono: "fa-scale-balanced",
    criterio: "Calificaciones con resultado Acordado.",
    items: itemsCalificaciones,
  },
];

// Rango de cada tarjeta (vacío = sin límite). Se conserva mientras la
// sesión del navegador siga abierta.
const rangos = Object.fromEntries(
  TARJETAS.map((tarjeta) => [tarjeta.id, { desde: "", hasta: "" }]),
);

// ============================================================
// ÁMBITO (EXPEDIENTES QUE EL USUARIO PUEDE VER)
// ============================================================

function getAmbito() {
  const mapa = new Map(
    getExpedientesMesaActual().map((expediente) => [
      getNumeroExpediente(expediente),
      expediente,
    ]),
  );

  return { mapa };
}

function fechaRecepcion(expediente) {
  return normalizarDia(
    expediente?.fechaRecepcion || expediente?.fecha || expediente?.creadoEn,
  );
}

function leerLista(clave) {
  const datos = getData(clave, []);

  return Array.isArray(datos) ? datos : [];
}

// ============================================================
// DEFINICIONES  → cada función devuelve [{ numero, fecha }]
// ============================================================

function itemsDemandas({ mapa }) {
  const demandas = getData("mesasDemandas", {}) || {};

  return [...mapa]
    .filter(([numero]) => demandas[numero]?.categoria === "radicado")
    .map(([numero, expediente]) => ({
      numero,
      // Respaldo: fecha de recepción si es un registro anterior a radicadoEn
      fecha:
        normalizarDia(demandas[numero].radicadoEn) || fechaRecepcion(expediente),
    }));
}

function itemsPromociones({ mapa }) {
  return leerLista("promociones")
    .map((promocion) => ({
      numero: String(promocion.expediente || promocion.numero || ""),
      fecha: normalizarDia(promocion.fecha || promocion.creadoEn),
    }))
    .filter((item) => mapa.has(item.numero));
}

function itemsAudiencias({ mapa }) {
  return leerLista("mesasAgenda")
    .filter(
      (evento) =>
        evento.tipo === "audiencia" &&
        evento.estadoAudiencia === "desahogada" &&
        mapa.has(String(evento.expediente)),
    )
    .map((evento) => ({
      numero: String(evento.expediente),
      fecha: normalizarDia(evento.fecha),
    }));
}

function itemsCalificaciones({ mapa }) {
  const agenda = leerLista("mesasAgenda").filter(
    (evento) => evento.tipo === "calificacion",
  );

  return leerLista("mesasCalificaciones")
    .filter(
      (calificacion) =>
        calificacion.resultado === "acordado" &&
        mapa.has(String(calificacion.expediente)),
    )
    .map((calificacion) => {
      const numero = String(calificacion.expediente);

      // Respaldo 1: fecha del evento de calificación en la agenda.
      // Respaldo 2: fecha de recepción del expediente.
      const evento = agenda
        .filter((item) => String(item.expediente) === numero)
        .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))[0];

      return {
        numero,
        fecha:
          normalizarDia(calificacion.concluidaEn) ||
          normalizarDia(evento?.fecha) ||
          fechaRecepcion(mapa.get(numero)),
      };
    });
}

// ============================================================
// RANGO
// ============================================================

function rangoInvalido(rango) {
  return Boolean(rango.desde && rango.hasta && rango.desde > rango.hasta);
}

// Inclusivo por día. Un registro sin fecha no cuenta si hay rango.
function enRango(fecha, rango) {
  if (!rango.desde && !rango.hasta) {
    return true;
  }

  return (
    Boolean(fecha) &&
    (!rango.desde || fecha >= rango.desde) &&
    (!rango.hasta || fecha <= rango.hasta)
  );
}

function textoPeriodo(rango) {
  if (!rango.desde && !rango.hasta) {
    return "Todo el historial";
  }

  const f = (valor) => {
    const [a, m, d] = String(valor).split("-");

    return `${d}/${m}/${a}`;
  };

  if (rango.desde && rango.hasta) {
    return `${f(rango.desde)} – ${f(rango.hasta)}`;
  }

  return rango.desde ? `Desde ${f(rango.desde)}` : `Hasta ${f(rango.hasta)}`;
}

// ============================================================
// CÁLCULO
// ============================================================

function calcular(tarjeta) {
  const rango = rangos[tarjeta.id];

  if (rangoInvalido(rango)) {
    return { invalido: true, total: 0, porMesa: null };
  }

  const ambito = getAmbito();

  const items = tarjeta
    .items(ambito)
    .filter((item) => enRango(item.fecha, rango));

  const porMesa = mesaUsuarioActual()
    ? null
    : [1, 2, 3].map((mesa) => ({
        mesa,
        cantidad: items.filter(
          (item) => mesaDeExpediente(ambito.mapa.get(item.numero)) === mesa,
        ).length,
      }));

  return { invalido: false, total: items.length, porMesa };
}

// ============================================================
// RENDER
// ============================================================

export function renderEstadistica() {
  const vista = document.querySelector('[data-mesas-vista="estadistica"]');

  if (!vista) {
    return;
  }

  const mesa = mesaUsuarioActual();

  vista.innerHTML = `
    <section class="mesas-fase6-section">

      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Fase 7 · T-20</span>
          <h2>Estadística</h2>
          <p>
            ${
              mesa
                ? `Cifras de la Mesa ${mesa}.`
                : "Total de todas las mesas, con el desglose por mesa."
            }
            Cada tarjeta tiene su propio rango de fechas.
          </p>
        </div>
      </div>

      <div class="mesas-estadistica-grid">
        ${TARJETAS.map(renderTarjeta).join("")}
      </div>

    </section>
  `;

  configurarEventos(vista);
}

function renderTarjeta(tarjeta) {
  const rango = rangos[tarjeta.id];

  return `
    <article class="mesas-estadistica-card" data-est-tarjeta="${tarjeta.id}">

      <header class="mesas-estadistica-head">
        <span class="mesas-estadistica-icon">
          <i class="fa-solid ${tarjeta.icono}"></i>
        </span>

        <div>
          <h3>${escapeHTML(tarjeta.titulo)}</h3>
          <p>${escapeHTML(tarjeta.criterio)}</p>
        </div>
      </header>

      <div class="mesas-estadistica-rango">
        <label class="mesas-fase6-field">
          <span>Desde</span>
          <input
            type="date"
            value="${escapeHTML(rango.desde)}"
            data-est-campo="desde"
            data-est-id="${tarjeta.id}"
            aria-label="${escapeHTML(tarjeta.titulo)}: fecha desde"
          >
        </label>

        <label class="mesas-fase6-field">
          <span>Hasta</span>
          <input
            type="date"
            value="${escapeHTML(rango.hasta)}"
            data-est-campo="hasta"
            data-est-id="${tarjeta.id}"
            aria-label="${escapeHTML(tarjeta.titulo)}: fecha hasta"
          >
        </label>

        <button
          type="button"
          class="mesas-fase6-link"
          data-est-limpiar="${tarjeta.id}"
        >
          Quitar rango
        </button>
      </div>

      <div class="mesas-estadistica-resultado" data-est-resultado="${tarjeta.id}">
        ${renderResultado(tarjeta)}
      </div>

    </article>
  `;
}

function renderResultado(tarjeta) {
  const rango = rangos[tarjeta.id];
  const datos = calcular(tarjeta);

  if (datos.invalido) {
    return `
      <p class="mesas-fase6-error">
        El rango no es válido: la fecha inicial es posterior a la final.
      </p>
    `;
  }

  return `
    <strong class="mesas-estadistica-numero">${datos.total}</strong>
    <span class="mesas-estadistica-periodo">${escapeHTML(textoPeriodo(rango))}</span>

    ${
      datos.porMesa
        ? `
          <ul class="mesas-estadistica-mesas">
            ${datos.porMesa
              .map(
                (item) =>
                  `<li><span>Mesa ${item.mesa}</span><strong>${item.cantidad}</strong></li>`,
              )
              .join("")}
          </ul>
        `
        : ""
    }
  `;
}

// Actualiza solo el resultado de una tarjeta (no pierde el foco del input).
function pintarTarjeta(id) {
  const tarjeta = TARJETAS.find((item) => item.id === id);
  const contenedor = document.querySelector(`[data-est-resultado="${id}"]`);

  if (tarjeta && contenedor) {
    contenedor.innerHTML = renderResultado(tarjeta);
  }
}

// ============================================================
// EVENTOS
// ============================================================

function configurarEventos(vista) {
  vista.onchange = (event) => {
    const campo = event.target.closest("[data-est-campo]");

    if (!campo) {
      return;
    }

    const id = campo.dataset.estId;

    if (!rangos[id]) {
      return;
    }

    rangos[id][campo.dataset.estCampo] = campo.value || "";

    pintarTarjeta(id);
  };

  vista.onclick = (event) => {
    const boton = event.target.closest("[data-est-limpiar]");

    if (!boton) {
      return;
    }

    const id = boton.dataset.estLimpiar;

    if (!rangos[id]) {
      return;
    }

    rangos[id] = { desde: "", hasta: "" };

    renderEstadistica();
  };
}
