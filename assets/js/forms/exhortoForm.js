// =====================================================
// FORMULARIO EXHORTO
// =====================================================

import { closeForm } from "./formHelper.js";

import {
  openStandardForm,
  inputField,
  selectField,
  textareaField,
  checkField,
  formSection,
} from "./formKit.js";

import { createId, escapeHTML, normalizeText } from "../utils.js";

import { getData, saveData } from "../storage.js";

export function initExhortoForm() {
  window.openExhortoForm = openExhortoForm;
}

// Busca un expediente por folio (ignora mayúsculas y acentos)
function findExpedienteByFolio(folio) {
  const objetivo = normalizeText(folio);

  if (!objetivo) return null;

  return (
    getData("expedientes", []).find(
      (item) => normalizeText(item.numero) === objetivo,
    ) || null
  );
}

// Al marcar "Exhorto interno" aparece el buscador de folio
function setupInternoListener() {
  const checkbox = document.getElementById("exhortoInterno");
  if (!checkbox) return;

  const anchor = checkbox.closest(".tf-option") || checkbox.parentElement;

  const container = document.createElement("div");
  container.id = "exhortoInternoContainer";
  container.className = "tf-field tf-full";
  container.hidden = true;
  container.innerHTML = `
    <label for="folioExpedienteExhorto">Folio de expediente</label>
    <input
      id="folioExpedienteExhorto"
      type="text"
      placeholder="Ej. EXP-2026-001"
      autocomplete="off"
    >
    <div id="folioExpedienteInfo" style="margin-top:8px;"></div>
  `;

  anchor.insertAdjacentElement("afterend", container);

  const input = container.querySelector("#folioExpedienteExhorto");
  const info = container.querySelector("#folioExpedienteInfo");

  const renderInfo = () => {
    const folio = input.value.trim();

    if (!folio) {
      info.innerHTML = "";
      return;
    }

    const expediente = findExpedienteByFolio(folio);

    if (expediente) {
      info.innerHTML = `
        <div style="padding:10px 12px;border:1px solid #dce3ea;border-radius:7px;background:#e8f1ff;color:#102b45;font-size:13px;">
          <i class="fa-solid fa-paperclip"></i>
          Este oficio se vinculará al expediente
          <strong>${escapeHTML(expediente.numero)}</strong>
        </div>
      `;
    } else {
      info.innerHTML = `
        <span style="color:#7d8fa0;font-size:12px;">
          No se encontró un expediente con ese folio.
        </span>
      `;
    }
  };

  checkbox.addEventListener("change", () => {
    container.hidden = !checkbox.checked;

    if (checkbox.checked) {
      input.focus();
    } else {
      input.value = "";
      info.innerHTML = "";
    }
  });

  input.addEventListener("input", renderInfo);
}

export function openExhortoForm() {
  openStandardForm({
    eyebrow: "EXHORTOS",
    title: "Registrar nuevo exhorto",
    description: "Captura la información del exhorto recibido.",
    formId: "newExhortoForm",
    cancelId: "cancelExhortoBtn",
    submitLabel: "Registrar exhorto",
    onSubmit: saveExhorto,

    sections: [
      formSection({
        number: 1,
        title: "Recepción",
        description: "Número, fecha de llegada y origen.",
        fields: [
          inputField({
            id: "numeroExhorto",
            label: "Número de exhorto",
            required: true,
          }),

          inputField({
            id: "fechaExhorto",
            label: "Fecha de llegada",
            type: "date",
            required: true,
          }),

          inputField({
            id: "origenExhorto",
            label: "Número exhorto de origen",
            full: true,
          }),

          checkField({
            id: "exhortoInterno",
            label: "Exhorto interno",
          }),
        ],
      }),

      formSection({
        number: 2,
        title: "Partes y autoridad",
        description: "Actor, demandado y autoridad exhortante.",
        fields: [
          inputField({
            id: "actorExhorto",
            label: "Actor",
          }),

          inputField({
            id: "demandadoExhorto",
            label: "Demandado",
          }),

          inputField({
            id: "autoridadExhortante",
            label: "Autoridad exhortante",
            full: true,
          }),
        ],
      }),

      formSection({
        number: 3,
        title: "Estado y ubicación",
        description: "Situación actual del exhorto.",
        fields: [
          selectField({
            id: "estadoExhorto",
            label: "Estado",
            options: ["Recibido", "En trámite", "Concluido"],
          }),

          inputField({
            id: "ubicacionExhorto",
            label: "Ubicación",
          }),
        ],
      }),

      formSection({
        number: 4,
        title: "Contenido",
        description: "Promoción y requerimiento del exhorto.",
        fields: [
          textareaField({
            id: "promocionExhorto",
            label: "Promoción",
            placeholder: "Número de expediente y número de oficio",
          }),

          textareaField({
            id: "requerimientoExhorto",
            label: "Requerimiento o solicitud",
          }),
        ],
      }),
    ],
  });

  setupInternoListener();
}

function saveExhorto(event) {
  event.preventDefault();

  const exhortos = getData("exhortos", []);

  const nuevoExhorto = {
    id: createId(),
    numero: numeroExhorto.value,
    fecha: fechaExhorto.value,
    origen: origenExhorto.value,
    actor: document.getElementById("actorExhorto")?.value || "",
    demandado: document.getElementById("demandadoExhorto")?.value || "",
    autoridad: autoridadExhortante.value,
    interno: exhortoInterno.checked,
    expedienteVinculado: exhortoInterno.checked
      ? findExpedienteByFolio(
          document.getElementById("folioExpedienteExhorto")?.value,
        )?.numero || ""
      : "",
    requerimiento: requerimientoExhorto.value,
    promocion: promocionExhorto.value,
    estado: estadoExhorto.value,
    ubicacion: ubicacionExhorto.value,
    creadoEn: new Date().toISOString(),
  };

  exhortos.unshift(nuevoExhorto);

  saveData("exhortos", exhortos);

  closeForm();

  if (window.renderExhortos) {
    window.renderExhortos();
  }
}
