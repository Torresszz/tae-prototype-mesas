// ============================================================
// RECEPCIÓN UNIFICADA EN MESAS
// Demandas + Promociones
//
// assets/js/modules/mesas/recepcionPromociones.js
// ============================================================
//
// PROTOTIPO:
// - Oficialía manda demandas/expedientes y promociones.
// - Mesa muestra TODO en una sola bandeja "Por recibir".
// - El botón "Recibir todo" abre un modal.
// - Al confirmar:
//      Demanda   -> entra a Mesas / Demanda
//      Promoción -> entra a Mesas / Promociones
//
// Además guarda:
// - quién recibió
// - fecha y hora
// - mesa que recibió
//
// ============================================================

import { getData, saveData } from "../../storage.js";

import { escapeHTML, createId } from "../../utils.js";

import { getSession, canSign } from "../../auth.js";

import { showModal, closeForm } from "../../forms/formHelper.js";

import { reactivarPorPromocionNueva } from "./flujoEstados.js";

import {
  getNumeroExpediente,
  mesaDeExpediente,
  mesaUsuarioActual,
} from "./mesaUtils.js";

// ============================================================
// LLAVES
// ============================================================

const KEY_EXPEDIENTES = "expedientes";

const KEY_PROMOCIONES = "promociones";

const KEY_SEGUIMIENTO = "mesasSeguimiento";

const KEY_DEMANDAS = "mesasDemandas";

// La Magistrada consulta lo pendiente, pero solo la Mesa lo recibe.
const puedeRecibir = () => !canSign();

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export function renderRecepcionPromociones() {
  const host = document.getElementById("mesasRecepcionPromociones");

  if (!host) {
    return;
  }

  const pendientes = getPendientesRecepcion();

  const demandas = pendientes.filter((item) => item.tipo === "demanda");

  const promociones = pendientes.filter((item) => item.tipo === "promocion");

  host.innerHTML = `
    <section class="mesas-recepcion-card">

      <div class="mesas-recepcion-card-header">

        <div>

          <span class="mesas-mini-eyebrow">
            Oficialía de Partes
          </span>

          <h2>
            Por recibir
          </h2>

        </div>


        <span class="mesas-recepcion-counter">
          ${pendientes.length}
        </span>

      </div>


      <div class="mesas-recepcion-card-body">

        ${
          pendientes.length
            ? `
              <p>
                ${renderResumenPendientes(demandas.length, promociones.length)}
              </p>


              <button
                type="button"
                class="mesas-secondary-btn mesas-recepcion-open-btn"
                id="mesasAbrirRecepcionTodo"
              >

                <i class="fa-solid fa-inbox"></i>

                ${puedeRecibir() ? "Recibir todo" : "Ver pendientes"}

              </button>
            `
            : `
              <p>
                No hay documentos pendientes de recibir.
              </p>


              <button
                type="button"
                class="mesas-secondary-btn mesas-recepcion-open-btn"
                id="mesasCargarDemoRecepcion"
              >

                <i class="fa-solid fa-flask"></i>

                Cargar datos de prueba

              </button>
            `
        }

      </div>

    </section>
  `;

  document
    .getElementById("mesasAbrirRecepcionTodo")
    ?.addEventListener("click", openRecepcionTodoModal);

  document
    .getElementById("mesasCargarDemoRecepcion")
    ?.addEventListener("click", cargarDatosDemoRecepcion);
}

// ============================================================
// RESUMEN
// ============================================================

function renderResumenPendientes(demandas, promociones) {
  const partes = [];

  if (demandas) {
    partes.push(`${demandas} ${demandas === 1 ? "demanda" : "demandas"}`);
  }

  if (promociones) {
    partes.push(
      `${promociones} ${promociones === 1 ? "promoción" : "promociones"}`,
    );
  }

  return partes.join(" · ") || "Sin pendientes";
}

// ============================================================
// OBTENER TODO LO PENDIENTE
// ============================================================

export function getPendientesRecepcion() {
  const expedientesRaw = getData(KEY_EXPEDIENTES, []);

  const promocionesRaw = getData(KEY_PROMOCIONES, []);

  const expedientes = Array.isArray(expedientesRaw) ? expedientesRaw : [];

  const promociones = Array.isArray(promocionesRaw) ? promocionesRaw : [];

  const mesaActual = mesaUsuarioActual();

  const resultado = [];

  // ==========================================================
  // DEMANDAS / EXPEDIENTES NUEVOS
  // ==========================================================

  expedientes
    .filter((expediente) => expediente?.recibidoMesa === false)
    .forEach((expediente) => {
      const numero = getNumeroExpediente(expediente);

      if (!numero) {
        return;
      }

      const mesaDestino = mesaDeExpediente(expediente);

      if (mesaActual && Number(mesaDestino) !== Number(mesaActual)) {
        return;
      }

      resultado.push({
        id: expediente.id || numero,

        tipo: "demanda",

        numero,

        mesaDestino,

        expediente,

        fecha:
          expediente.fechaRecepcion ||
          expediente.fecha ||
          expediente.creadoEn ||
          "",

        hora: obtenerHora(expediente),

        actor: expediente.actor || expediente.promovente || "—",

        demandado: expediente.demandado || "—",

        terceros:
          expediente.terceros ||
          expediente.tercerosInteresados ||
          expediente.codemandado ||
          "—",

        archivo: obtenerNombreArchivo(expediente),
      });
    });

  // ==========================================================
  // PROMOCIONES
  // ==========================================================

  promociones
    .filter((promocion) => promocion?.recibidaMesa !== true)
    .forEach((promocion) => {
      const numero = String(
        promocion.expediente || promocion.numero || "",
      ).trim();

      if (!numero) {
        return;
      }

      const expediente = expedientes.find(
        (item) =>
          getNumeroExpediente(item).trim().toLowerCase() ===
          numero.toLowerCase(),
      );

      // Una promoción debe estar relacionada
      // con un expediente existente.
      if (!expediente) {
        return;
      }

      const mesaDestino = mesaDeExpediente(expediente);

      if (mesaActual && Number(mesaDestino) !== Number(mesaActual)) {
        return;
      }

      resultado.push({
        id: promocion.id,

        tipo: "promocion",

        numero,

        mesaDestino,

        promocion,

        expediente,

        fecha:
          promocion.fecha ||
          promocion.fechaRecepcion ||
          promocion.creadoEn ||
          "",

        hora: obtenerHora(promocion),

        actor: expediente.actor || expediente.promovente || "—",

        demandado: expediente.demandado || "—",

        tipoPromocion: promocion.tipo || promocion.tipoPromocion || "Promoción",

        descripcion:
          promocion.descripcion ||
          promocion.observacion ||
          promocion.observaciones ||
          "Sin observaciones.",

        archivo: obtenerNombreArchivo(promocion),
      });
    });

  // ==========================================================
  // ORDEN
  // ==========================================================

  return resultado.sort((a, b) => {
    const fechaA = obtenerFechaOrden(a);

    const fechaB = obtenerFechaOrden(b);

    return fechaA - fechaB;
  });
}

// ============================================================
// ABRIR MODAL
// ============================================================

export function openRecepcionTodoModal() {
  const pendientes = getPendientesRecepcion();

  showModal(`
    <div class="mesas-modal-shell mesas-recepcion-modal">

      <header class="mesas-modal-header">

        <div class="mesas-modal-step">

          <i class="fa-solid fa-inbox"></i>

        </div>


        <div class="mesas-modal-header-text">

          <h2>
            Por recibir
          </h2>

          <p>
            Revisa lo enviado por Oficialía de Partes
            antes de recibirlo en la mesa.
          </p>

        </div>

      </header>


      <div class="mesas-modal-body">

        ${
          pendientes.length
            ? renderPendientes(pendientes)
            : renderSinPendientes()
        }

      </div>


      <footer class="mesas-modal-footer">

        <button
          type="button"
          class="mesas-modal-cancel"
          id="mesasCerrarRecepcionTodo"
        >
          Cancelar
        </button>


        ${
          pendientes.length && puedeRecibir()
            ? `
              <button
                type="button"
                class="mesas-modal-confirm"
                id="mesasConfirmarRecepcionTodo"
              >

                <i class="fa-solid fa-check-double"></i>

                Recibir todo

              </button>
            `
            : ""
        }

      </footer>

    </div>
  `);

  document
    .getElementById("mesasCerrarRecepcionTodo")
    ?.addEventListener("click", closeForm);

  document
    .getElementById("mesasConfirmarRecepcionTodo")
    ?.addEventListener("click", recibirTodo);
}

// ============================================================
// RENDER LISTA
// ============================================================

function renderPendientes(pendientes) {
  return `
    <div class="mesas-recepcion-list">

      ${pendientes
        .map((item) => {
          if (item.tipo === "demanda") {
            return renderDemanda(item);
          }

          return renderPromocion(item);
        })
        .join("")}

    </div>
  `;
}

// ============================================================
// DEMANDA
// ============================================================

function renderDemanda(item) {
  return `
    <article class="mesas-recepcion-item">

      <div class="mesas-recepcion-item-main">


        <div class="mesas-recepcion-item-top">

          <div>

            <span class="mesas-recepcion-mesa-badge">
              Demanda
            </span>

            <strong>
              Expediente
              ${escapeHTML(item.numero)}
            </strong>

          </div>


          <span class="mesas-recepcion-mesa-badge">
            Mesa
            ${escapeHTML(String(item.mesaDestino))}
          </span>

        </div>


        <div class="mesas-recepcion-item-grid">


          <div>

            <span>
              Fecha de llegada
            </span>

            <strong>
              ${escapeHTML(formatFecha(item.fecha))}
            </strong>

          </div>


          <div>

            <span>
              Hora
            </span>

            <strong>
              ${escapeHTML(item.hora || "—")}
            </strong>

          </div>


          <div>

            <span>
              Actor
            </span>

            <strong>
              ${escapeHTML(item.actor)}
            </strong>

          </div>


          <div>

            <span>
              Demandado
            </span>

            <strong>
              ${escapeHTML(item.demandado)}
            </strong>

          </div>


          <div>

            <span>
              Terceros
            </span>

            <strong>
              ${escapeHTML(item.terceros)}
            </strong>

          </div>


          <div>

            <span>
              Archivo adjunto
            </span>

            <strong>
              ${escapeHTML(item.archivo || "Sin archivo")}
            </strong>

          </div>


        </div>

      </div>

    </article>
  `;
}

// ============================================================
// PROMOCIÓN
// ============================================================

function renderPromocion(item) {
  return `
    <article class="mesas-recepcion-item">

      <div class="mesas-recepcion-item-main">


        <div class="mesas-recepcion-item-top">

          <div>

            <span class="mesas-recepcion-mesa-badge">
              Promoción
            </span>

            <strong>
              Expediente
              ${escapeHTML(item.numero)}
            </strong>

          </div>


          <span class="mesas-recepcion-mesa-badge">
            Mesa
            ${escapeHTML(String(item.mesaDestino))}
          </span>

        </div>


        <div class="mesas-recepcion-item-grid">


          <div>

            <span>
              Fecha de llegada
            </span>

            <strong>
              ${escapeHTML(formatFecha(item.fecha))}
            </strong>

          </div>


          <div>

            <span>
              Hora
            </span>

            <strong>
              ${escapeHTML(item.hora || "—")}
            </strong>

          </div>


          <div>

            <span>
              Tipo de promoción
            </span>

            <strong>
              ${escapeHTML(item.tipoPromocion)}
            </strong>

          </div>


          <div>

            <span>
              Actor
            </span>

            <strong>
              ${escapeHTML(item.actor)}
            </strong>

          </div>


          <div>

            <span>
              Demandado
            </span>

            <strong>
              ${escapeHTML(item.demandado)}
            </strong>

          </div>


          <div>

            <span>
              Archivo adjunto
            </span>

            <strong>
              ${escapeHTML(item.archivo || "Sin archivo")}
            </strong>

          </div>


        </div>


        <div class="mesas-recepcion-descripcion">

          <span>
            Observación
          </span>

          <p>
            ${escapeHTML(item.descripcion)}
          </p>

        </div>


      </div>

    </article>
  `;
}

// ============================================================
// VACÍO
// ============================================================

function renderSinPendientes() {
  return `
    <div class="mesas-empty-state mesas-recepcion-empty">

      <div class="mesas-empty-icon">

        <i class="fa-regular fa-circle-check"></i>

      </div>


      <strong>
        No hay documentos por recibir
      </strong>


      <span>
        Todo lo enviado por Oficialía ya fue recibido.
      </span>

    </div>
  `;
}

// ============================================================
// RECIBIR TODO
// ============================================================

function recibirTodo() {
  // Candado real (no solo el botón): la Magistrada no recibe.
  if (!puedeRecibir()) {
    return;
  }

  const pendientes = getPendientesRecepcion();

  if (!pendientes.length) {
    return;
  }

  const expedientes = getData(KEY_EXPEDIENTES, []);

  const promociones = getData(KEY_PROMOCIONES, []);

  const seguimiento = getData(KEY_SEGUIMIENTO, {});

  const demandas = getData(KEY_DEMANDAS, {});

  const ahora = new Date().toISOString();

  const session = getSession();

  const usuario = session?.nombre || session?.email || "Mesa";

  const promocionesRecibidas = [];

  // ==========================================================
  // PRIMERO DEMANDAS
  // ==========================================================

  pendientes
    .filter((item) => item.tipo === "demanda")
    .forEach((item) => {
      const expediente = expedientes.find(
        (registro) => getNumeroExpediente(registro) === item.numero,
      );

      if (!expediente) {
        return;
      }

      expediente.recibidoMesa = true;

      expediente.recibidoMesaEn = ahora;

      expediente.recibidoMesaPor = usuario;

      expediente.mesaRecepcion = item.mesaDestino;

      expediente.ubicacion = `Mesa ${item.mesaDestino}`;

      // ====================================================
      // SEGUIMIENTO
      // ====================================================

      const actual = seguimiento[item.numero] || {};

      const historial = Array.isArray(actual.historial) ? actual.historial : [];

      historial.push({
        fecha: ahora,

        movimiento: "Demanda recibida por Secretaría de Acuerdos",

        usuario,
      });

      seguimiento[item.numero] = {
        ...actual,

        estado: "en-proceso",

        recibidoEn: ahora,

        recibidoPor: usuario,

        ubicacion: `Mesa ${item.mesaDestino}`,

        ultimoMovimiento: "Demanda recibida por Secretaría de Acuerdos",

        historial,
      };

      // ====================================================
      // DEMANDA
      // ====================================================

      if (!demandas[item.numero]) {
        demandas[item.numero] = {
          expediente: item.numero,

          radicacion: "en-proceso",

          categoria: "por-radicar",

          recibidoEn: ahora,

          recibidoPor: usuario,
        };
      }
    });

  // ==========================================================
  // DESPUÉS PROMOCIONES
  // ==========================================================

  pendientes
    .filter((item) => item.tipo === "promocion")
    .forEach((item) => {
      const promocion = promociones.find(
        (registro) => String(registro.id) === String(item.id),
      );

      if (!promocion) {
        return;
      }

      promocion.recibidaMesa = true;

      promocion.recibidaMesaEn = ahora;

      promocion.recibidaMesaPor = usuario;

      promocion.mesaRecepcion = item.mesaDestino;

      if (!promocion.estadoPromocion) {
        promocion.estadoPromocion = "por-acordar";
      }

      if (!promocion.estadoAcuerdo) {
        promocion.estadoAcuerdo = "en-proceso";
      }

      promocion.historialAcuerdo = [
        ...(Array.isArray(promocion.historialAcuerdo)
          ? promocion.historialAcuerdo
          : []),

        {
          fecha: ahora,

          movimiento: "Promoción recibida en Mesa; pasa a En proceso",

          usuario,
        },
      ];

      // ====================================================
      // HISTORIAL DEL EXPEDIENTE
      // ====================================================

      const actual = seguimiento[item.numero] || {};

      const historial = Array.isArray(actual.historial) ? actual.historial : [];

      historial.push({
        fecha: ahora,

        movimiento: "Promoción recibida por Secretaría de Acuerdos",

        usuario,
      });

      seguimiento[item.numero] = {
        ...actual,

        historial,

        ultimoMovimiento: "Promoción recibida por Secretaría de Acuerdos",
      };

      promocionesRecibidas.push(item.numero);
    });

  // ==========================================================
  // GUARDAR
  // ==========================================================

  saveData(KEY_EXPEDIENTES, expedientes);

  saveData(KEY_PROMOCIONES, promociones);

  saveData(KEY_SEGUIMIENTO, seguimiento);

  saveData(KEY_DEMANDAS, demandas);

  // ==========================================================
  // REACTIVAR EXPEDIENTES POR PROMOCIÓN NUEVA
  // ==========================================================

  [...new Set(promocionesRecibidas)].forEach((numero) => {
    reactivarPorPromocionNueva(numero);
  });

  closeForm();

  if (typeof window.renderMesas === "function") {
    window.renderMesas();
  } else {
    renderRecepcionPromociones();
  }
}

// ============================================================
// DATOS DEMO
// ============================================================

export function cargarDatosDemoRecepcion() {
  const expedientes = getData(KEY_EXPEDIENTES, []);

  const promociones = getData(KEY_PROMOCIONES, []);

  const seguimiento = getData(KEY_SEGUIMIENTO, {});

  const mesa = Number(mesaUsuarioActual()) || 1;

  const numeros = getNumerosDemo(mesa);

  const ahora = new Date();

  const fecha = ahora.toISOString().slice(0, 10);

  const hora = ahora.toTimeString().slice(0, 5);

  // ==========================================================
  // DEMANDA NUEVA PENDIENTE
  // ==========================================================

  if (!expedientes.some((item) => item.demoRecepcionUnificada === "demanda")) {
    expedientes.push({
      id: createId(),

      numero: numeros.demanda,

      expediente: numeros.demanda,

      origen: "demanda",

      actor: "ANA MARTÍNEZ LÓPEZ",

      demandado: "AYUNTAMIENTO DE COLIMA",

      terceros: "SINDICATO DE TRABAJADORES",

      actoDemandado: "Demanda laboral de nulidad",

      fecha,

      fechaRecepcion: fecha,

      hora,

      creadoEn: ahora.toISOString(),

      archivoAdjunto: {
        nombre: "demanda_ana_martinez.pdf",
      },

      recibidoMesa: false,

      demoRecepcionUnificada: "demanda",
    });
  }

  // ==========================================================
  // EXPEDIENTE EXISTENTE PARA PROMOCIÓN
  // ==========================================================

  let expedientePromocion = expedientes.find(
    (item) => getNumeroExpediente(item) === numeros.promocion,
  );

  if (!expedientePromocion) {
    expedientePromocion = {
      id: createId(),

      numero: numeros.promocion,

      expediente: numeros.promocion,

      origen: "demanda",

      actor: "CARLOS RAMÍREZ GÓMEZ",

      demandado: "SECRETARÍA DE EDUCACIÓN",

      terceros: "Sin terceros registrados",

      actoDemandado: "Reclamación laboral",

      fecha,

      fechaRecepcion: fecha,

      hora: "09:15",

      creadoEn: ahora.toISOString(),

      recibidoMesa: true,

      recibidoMesaEn: ahora.toISOString(),

      recibidoMesaPor: "Datos demo",

      ubicacion: `Mesa ${mesa}`,

      demoRecepcionUnificada: "expediente-promocion",
    };

    expedientes.push(expedientePromocion);
  }

  // ==========================================================
  // SEGUIMIENTO DEL EXPEDIENTE EXISTENTE
  // ==========================================================

  if (!seguimiento[numeros.promocion]) {
    seguimiento[numeros.promocion] = {
      estado: "en-proceso",

      recibidoEn: ahora.toISOString(),

      recibidoPor: "Datos demo",

      ubicacion: `Mesa ${mesa}`,

      ultimoMovimiento: "Expediente disponible en Mesa",

      historial: [
        {
          fecha: ahora.toISOString(),

          movimiento: "Expediente disponible en Mesa",

          usuario: "Datos demo",
        },
      ],
    };
  }

  // ==========================================================
  // PROMOCIÓN PENDIENTE
  // ==========================================================

  if (!promociones.some((item) => item.demoRecepcionUnificada === true)) {
    promociones.push({
      id: createId(),

      numeroPromocion: "PROM-DEMO-001",

      numero: numeros.promocion,

      expediente: numeros.promocion,

      fecha,

      hora: "10:40",

      creadoEn: ahora.toISOString(),

      tipo: "Promoción de trámite",

      descripcion:
        "Se solicita agregar documentación y acordar la promoción presentada.",

      observacion: "Promoción relacionada con expediente ya existente.",

      archivoAdjunto: {
        nombre: "promocion_demo.pdf",
      },

      recibidaMesa: false,

      recibidaMesaEn: null,

      recibidaMesaPor: null,

      demoRecepcionUnificada: true,
    });
  }

  // ==========================================================
  // GUARDAR
  // ==========================================================

  saveData(KEY_EXPEDIENTES, expedientes);

  saveData(KEY_PROMOCIONES, promociones);

  saveData(KEY_SEGUIMIENTO, seguimiento);

  if (typeof window.renderMesas === "function") {
    window.renderMesas();
  } else {
    renderRecepcionPromociones();
  }
}

// ============================================================
// NÚMEROS DEMO POR MESA
// ============================================================

function getNumerosDemo(mesa) {
  if (mesa === 2) {
    return {
      demanda: "201/2026",

      promocion: "203/2026",
    };
  }

  if (mesa === 3) {
    return {
      demanda: "OJC-200/2026",

      promocion: "OJC-202/2026",
    };
  }

  return {
    demanda: "200/2026",

    promocion: "202/2026",
  };
}

// ============================================================
// ARCHIVO
// ============================================================

function obtenerNombreArchivo(registro) {
  if (!registro) {
    return "";
  }

  return (
    registro.archivoAdjunto?.nombre ||
    registro.archivoAdjunto?.name ||
    registro.archivo?.nombre ||
    registro.archivo?.name ||
    registro.nombreArchivo ||
    registro.archivoNombre ||
    registro.documento?.nombre ||
    registro.documento?.nombreArchivo ||
    ""
  );
}

// ============================================================
// HORA
// ============================================================

function obtenerHora(registro) {
  if (!registro) {
    return "—";
  }

  if (registro.hora) {
    return String(registro.hora).slice(0, 5);
  }

  const fecha = registro.creadoEn || registro.fechaRecepcion;

  if (fecha && String(fecha).includes("T")) {
    const date = new Date(fecha);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString("es-MX", {
        hour: "2-digit",

        minute: "2-digit",
      });
    }
  }

  return "—";
}

// ============================================================
// ORDEN
// ============================================================

function obtenerFechaOrden(item) {
  const value = item.fecha || "";

  const hora = item.hora || "00:00";

  const fecha = new Date(`${String(value).slice(0, 10)}T${hora}`);

  if (Number.isNaN(fecha.getTime())) {
    return 0;
  }

  return fecha.getTime();
}

// ============================================================
// FORMATO FECHA
// ============================================================

function formatFecha(value) {
  if (!value) {
    return "—";
  }

  const texto = String(value);

  const fecha = texto.slice(0, 10);

  const partes = fecha.split("-");

  if (partes.length === 3) {
    return `${partes[2]}/` + `${partes[1]}/` + `${partes[0]}`;
  }

  return texto;
}

// ============================================================
// COMPATIBILIDAD
// ============================================================
// Dejamos estos exports para evitar romper algún import viejo.
// ============================================================

export function getPromocionesPendientesMesa() {
  return getPendientesRecepcion().filter((item) => item.tipo === "promocion");
}

export function openPromocionesPendientesModal() {
  openRecepcionTodoModal();
}
