// =====================================================
// FORMULARIO PROMOCION
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

export function initPromocionForm() {
  window.openPromocionForm = openPromocionForm;
}

export function openPromocionForm() {
  openStandardForm({
    eyebrow: "PROMOCIONES",
    title: "Registrar nueva promoción",
    description: "Captura la información de la promoción recibida.",
    formId: "newPromocionForm",
    cancelId: "cancelPromocionBtn",
    submitLabel: "Registrar promoción",
    onSubmit: savePromocion,

    sections: [
      formSection({
        number: 1,
        title: "Identificación",
        description: "Número de expediente y fecha.",
        columns: 2,
        fields: [
          inputField({
            id: "expedientePromocion",
            label: "Número expediente",
            placeholder: "Ej. 124/2026",
            required: true,
          }),

          inputField({
            id: "fechaPromocion",
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
            id: "oficioPromocion",
            label: "Número oficio relacionado",
          }),

          selectField({
            id: "tipoPromocion",
            label: "Tipo de promoción",
            options: ["Escrito", "Solicitud", "Notificación", "Otro"],
          }),

          selectField({
            id: "estadoPromocion",
            label: "Estado",
            options: ["Recibida", "En revisión", "Atendida"],
          }),
        ],
      }),

      formSection({
        number: 3,
        title: "Descripción",
        description: "Detalle de la promoción.",
        fields: [
          textareaField({
            id: "descripcionPromocion",
            label: "Descripción",
            rows: 4,
          }),
        ],
      }),
    ],
  });
}

function savePromocion(event) {
  event.preventDefault();

  const expedienteVal = document.getElementById("expedientePromocion")?.value.trim() || "";
  const fechaVal = document.getElementById("fechaPromocion")?.value || "";
  const oficioVal = document.getElementById("oficioPromocion")?.value || "";
  const tipoVal = document.getElementById("tipoPromocion")?.value || "";
  const descripcionVal = document.getElementById("descripcionPromocion")?.value || "";
  const estadoVal = document.getElementById("estadoPromocion")?.value || "";

  const promociones = getData("promociones", []);

  const nuevaPromocion = {
    id: createId(),
    numero: expedienteVal, // O autogenerado si se requiere un folio interno
    expediente: expedienteVal,
    oficio: oficioVal,
    fecha: fechaVal,
    tipo: tipoVal,
    descripcion: descripcionVal,
    estado: estadoVal,
    creadoEn: new Date().toISOString(),
  };

  promociones.unshift(nuevaPromocion);

  saveData("promociones", promociones);

  closeForm();

  if (window.renderPromociones) {
    window.renderPromociones();
  }
}
