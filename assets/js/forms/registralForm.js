// =====================================================
// FORMULARIO REGISTRAL
// Mismos datos que Promociones; el expediente es el número
// propio del sindicato de donde proviene el documento.
// =====================================================

import { closeForm } from "./formHelper.js";

import {
  openStandardForm,
  inputField,
  selectField,
  textareaField,
  formSection,
} from "./formKit.js";

import { createId } from "../utils.js";

import { getData, saveData } from "../storage.js";

export function initRegistralForm() {
  window.openRegistralForm = openRegistralForm;
}

export function openRegistralForm() {
  openStandardForm({
    eyebrow: "REGISTRAL",
    title: "Registrar nuevo documento registral",
    description:
      "Captura la información del documento. Se enviará a Presidencia desde el Resumen histórico.",
    formId: "newRegistralForm",
    cancelId: "cancelRegistralBtn",
    submitLabel: "Registrar registral",
    onSubmit: saveRegistral,

    sections: [
      formSection({
        number: 1,
        title: "Identificación",
        description: "Expediente del sindicato, sindicato de origen y fecha.",
        columns: 3,
        fields: [
          inputField({
            id: "expedienteRegistral",
            label: "Número de expediente (sindicato)",
            placeholder: "Número que le asignó el sindicato",
            required: true,
          }),

          inputField({
            id: "sindicatoRegistral",
            label: "Sindicato de procedencia",
            placeholder: "Nombre del sindicato",
            required: true,
          }),

          inputField({
            id: "fechaRegistral",
            label: "Fecha",
            type: "date",
            required: true,
          }),
        ],
      }),

      formSection({
        number: 2,
        title: "Clasificación",
        description: "Oficio relacionado, tipo y estado.",
        columns: 3,
        fields: [
          inputField({
            id: "oficioRegistral",
            label: "Número oficio relacionado",
          }),

          selectField({
            id: "tipoRegistral",
            label: "Tipo de documento",
            options: ["Escrito", "Solicitud", "Notificación", "Otro"],
          }),

          selectField({
            id: "estadoRegistral",
            label: "Estado",
            options: ["Recibida", "En revisión", "Atendida"],
          }),
        ],
      }),

      formSection({
        number: 3,
        title: "Descripción",
        description: "Detalle del documento.",
        fields: [
          textareaField({
            id: "descripcionRegistral",
            label: "Descripción",
            rows: 4,
          }),
        ],
      }),
    ],
  });
}

function saveRegistral(event) {
  event.preventDefault();

  const value = (id) => document.getElementById(id)?.value.trim() || "";

  const registrales = getData("registrales", []);

  registrales.unshift({
    id: createId(),
    expediente: value("expedienteRegistral"),
    sindicato: value("sindicatoRegistral"),
    fecha: value("fechaRegistral"),
    oficio: value("oficioRegistral"),
    tipo: value("tipoRegistral"),
    estado: value("estadoRegistral"),
    descripcion: value("descripcionRegistral"),
    destino: "Presidencia",
    creadoEn: new Date().toISOString(),
  });

  saveData("registrales", registrales);

  closeForm();

  if (window.renderRegistral) {
    window.renderRegistral();
  }

  if (window.initDashboardPage) {
    window.initDashboardPage();
  }
}
