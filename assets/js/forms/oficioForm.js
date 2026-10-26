// =====================================================
// FORMULARIO OFICIO
// =====================================================

import { closeForm } from "./formHelper.js";

import {
  openStandardForm,
  inputField,
  selectField,
  textareaField,
  formSection,
} from "./formKit.js";

import { createId, escapeHTML } from "../utils.js";

import { getData, saveData } from "../storage.js";

// Contexto con el que se abrió el formulario (p. ej. "Anexar oficio"
// desde Amparos). null = oficio normal.
let oficioContext = null;

export function initOficioForm() {
  window.openOficioForm = openOficioForm;
}

// Muestra el input manual solo cuando la procedencia es "Otro"
function setupProcedenciaListener() {
  const select = document.getElementById("procedenciaOficio");
  const wrapper = document.getElementById("procedenciaOtroWrapper");
  const otroInput = document.getElementById("procedenciaOtroOficio");

  if (!select || !wrapper || !otroInput) return;

  select.addEventListener("change", () => {
    const esOtro = select.value === "Otro";

    wrapper.hidden = !esOtro;
    otroInput.required = esOtro;

    if (esOtro) {
      otroInput.focus();
    } else {
      otroInput.value = "";
    }
  });
}

export function openOficioForm(context = null) {
  oficioContext = context && context.amparoId ? context : null;

  openStandardForm({
    eyebrow: "OFICIOS",
    title: "Registrar nuevo oficio",
    description: "Captura la información del oficio recibido.",
    formId: "newOficioForm",
    cancelId: "cancelOficioBtn",
    submitLabel: "Registrar oficio",
    onSubmit: saveOficio,

    sections: [
      formSection({
        number: 1,
        title: "Identificación",
        description: "Número de oficio, expediente y fecha.",
        columns: 3,
        fields: [
          inputField({
            id: "numeroOficio",
            label: "Número de oficio",
            required: true,
          }),

          inputField({
            id: "expedienteOficio",
            label: "Número expediente",
            placeholder: "Ej. 124/2026",
          }),

          inputField({
            id: "fechaOficio",
            label: "Fecha",
            type: "date",
            required: true,
          }),
        ],
      }),

      formSection({
        number: 2,
        title: "Procedencia y estado",
        description: "De dónde proviene y su situación actual.",
        fields: [
          selectField({
            id: "procedenciaOficio",
            label: "Procedencia",
            options: [
              "Tribunal Colegiado de Distrito",
              "Juzgado Primero de Distrito",
              "Juzgado Segundo de Distrito",
              "Juzgado Tercero de Distrito",
              "Otro",
            ],
          }),

          `<div id="procedenciaOtroWrapper" class="tf-full" hidden>
            ${inputField({
              id: "procedenciaOtroOficio",
              label: "Especifica la procedencia",
              placeholder: "Escribe la procedencia",
            })}
          </div>`,

          selectField({
            id: "estadoOficio",
            label: "Estado",
            options: ["Pendiente", "Recibido", "En revisión", "Atendido"],
          }),
        ],
      }),

      formSection({
        number: 3,
        title: "Asunto",
        description: "Descripción del asunto del oficio.",
        fields: [
          textareaField({
            id: "asuntoOficio",
            label: "Asunto",
            rows: 4,
          }),
        ],
      }),
    ],
  });

  // Se ejecuta DESPUÉS de que el formulario ya existe en el DOM.
  applyOficioContext();
  setupEstadoListener();
  setupProcedenciaListener();
}

// Escucha el cambio de selección del estado e inyecta la leyenda tenue
function setupEstadoListener() {
  const selectEstado = document.getElementById("estadoOficio");
  if (!selectEstado) return;

  // Insertar contenedor dinámico debajo del select si no existe
  let infoContainer = document.getElementById("recibidoInfoContainer");
  if (!infoContainer) {
    const parentField =
      selectEstado.closest(".field") || selectEstado.parentElement;
    infoContainer = document.createElement("div");
    infoContainer.id = "recibidoInfoContainer";
    infoContainer.style.marginTop = "6px";
    parentField.appendChild(infoContainer);
  }

  const renderInfo = () => {
    const valorActual =
      document.getElementById("recibidoPorOficio")?.value || "";

    if (selectEstado.value === "Recibido") {
      infoContainer.innerHTML = `
        <label for="recibidoPorOficio" style="display:block;margin-bottom:6px;font-weight:600;">Recibido por</label>
        <input
          id="recibidoPorOficio"
          type="text"
          required
          value="${escapeHTML(valorActual)}"
          placeholder="Escribe el nombre de quien recibe"
          autocomplete="off"
        >
      `;
    } else {
      infoContainer.innerHTML = "";
    }
  };

  selectEstado.addEventListener("change", renderInfo);
  renderInfo(); // Ejecutar al abrir por si el valor inicial es "Recibido"
}

// Precarga los datos del amparo sin pisar lo que ya haya escrito
// y muestra a qué amparo quedará vinculado el oficio.
function applyOficioContext() {
  if (!oficioContext) {
    return;
  }

  const form = document.getElementById("newOficioForm");

  if (!form) {
    return;
  }

  const setIfEmpty = (id, value) => {
    const input = document.getElementById(id);

    if (input && !input.value && value) {
      input.value = value;
    }
  };

  setIfEmpty("expedienteOficio", oficioContext.expediente);

  const asunto = [
    "Amparo",
    oficioContext.juzgado || "",
    oficioContext.promovente ? `promovido por ${oficioContext.promovente}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  setIfEmpty("asuntoOficio", asunto);

  const detalle = [oficioContext.expediente, oficioContext.promovente]
    .filter(Boolean)
    .join(" · ");

  form.insertAdjacentHTML(
    "afterbegin",
    `<div style="margin-bottom:12px;padding:10px 12px;border:1px solid #dce3ea;border-radius:7px;background:#e8f1ff;color:#102b45;font-size:13px;">
      <i class="fa-solid fa-paperclip"></i>
      Este oficio se vinculará al amparo
      <strong>${escapeHTML(detalle || "seleccionado")}</strong>
    </div>`,
  );
}

function saveOficio(event) {
  event.preventDefault();

  const procedenciaSel =
    document.getElementById("procedenciaOficio")?.value || "";
  const procedencia =
    procedenciaSel === "Otro"
      ? document.getElementById("procedenciaOtroOficio")?.value.trim() || "Otro"
      : procedenciaSel;
  const oficios = getData("oficios", []);
  const estadoVal =
    document.getElementById("estadoOficio")?.value || "Pendiente";
  const esRecibido = estadoVal === "Recibido";
  const recibidoPor =
    document.getElementById("recibidoPorOficio")?.value.trim() || "";

  if (esRecibido && !recibidoPor) {
    document.getElementById("recibidoPorOficio")?.focus();
    return;
  }

  const nuevoOficio = {
    id: createId(),

    numero: document.getElementById("numeroOficio")?.value || "",

    expediente: document.getElementById("expedienteOficio")?.value || "",

    fecha: document.getElementById("fechaOficio")?.value || "",

    procedencia: procedencia,

    asunto: document.getElementById("asuntoOficio")?.value || "",

    estado: estadoVal,

    recibidoPor: esRecibido ? recibidoPor : "",

    fechaRecepcion: esRecibido ? new Date().toISOString() : null,

    creadoEn: new Date().toISOString(),
  };

  // Vínculo con el amparo (si se abrió con "Anexar oficio")
  if (oficioContext) {
    nuevoOficio.origen = "amparo";

    nuevoOficio.amparoId = oficioContext.amparoId;
  }

  oficios.unshift(nuevoOficio);

  saveData("oficios", oficios);

  linkOficioToAmparo(nuevoOficio);

  oficioContext = null;

  closeForm();

  if (window.renderOficios) {
    window.renderOficios();
  }

  if (window.renderAmparos) {
    window.renderAmparos();
  }
}

// Si el amparo aún no tiene número de oficio, se le asigna el nuevo.
function linkOficioToAmparo(oficio) {
  if (!oficio.amparoId) {
    return;
  }

  const amparos = getData("amparos", []);

  const amparo = amparos.find(
    (item) => String(item.id) === String(oficio.amparoId),
  );

  if (amparo && !amparo.oficio && oficio.numero) {
    amparo.oficio = oficio.numero;

    saveData("amparos", amparos);
  }
}
