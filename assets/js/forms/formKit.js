// =====================================================
// FORM KIT
// Genera formularios con el mismo formato que Demandas
// y Amparos: encabezado, secciones numeradas y pie fijo
// con "Cancelar" + botón principal.
//
// Estilos: assets/css/forms.css
// =====================================================

import { showModal, closeForm } from "./formHelper.js";

// -----------------------------------------------------
// CAMPOS
// -----------------------------------------------------

function fieldClass(full) {
  return full ? "tf-field tf-full" : "tf-field";
}

function labelHTML(id, label, required) {
  return `
    <label for="${id}">
      ${label}
      ${required ? "<span>*</span>" : ""}
    </label>
  `;
}

export function inputField({
  id,
  label,
  type = "text",
  required = false,
  placeholder = "",
  full = false,
}) {
  return `
    <div class="${fieldClass(full)}">
      ${labelHTML(id, label, required)}
      <input
        id="${id}"
        type="${type}"
        placeholder="${placeholder}"
        autocomplete="off"
        ${required ? "required" : ""}
      >
    </div>
  `;
}

export function selectField({
  id,
  label,
  options,
  required = false,
  full = false,
}) {
  return `
    <div class="${fieldClass(full)}">
      ${labelHTML(id, label, required)}
      <select id="${id}" ${required ? "required" : ""}>
        ${options.map((option) => `<option>${option}</option>`).join("")}
      </select>
    </div>
  `;
}

export function textareaField({
  id,
  label,
  rows = 3,
  required = false,
  placeholder = "",
  full = true,
}) {
  return `
    <div class="${fieldClass(full)}">
      ${labelHTML(id, label, required)}
      <textarea
        id="${id}"
        rows="${rows}"
        placeholder="${placeholder}"
        ${required ? "required" : ""}
      ></textarea>
    </div>
  `;
}

export function checkField({ id, label }) {
  return `
    <label class="tf-option tf-full">
      <input id="${id}" type="checkbox">
      <span class="tf-check">
        <i class="fa-solid fa-check"></i>
      </span>
      <span>${label}</span>
    </label>
  `;
}

// -----------------------------------------------------
// SECCIÓN NUMERADA
// columns: 2 (por defecto) o 3
// -----------------------------------------------------

export function formSection({
  number,
  title,
  description = "",
  columns = 2,
  fields,
}) {
  const gridClass = columns === 3 ? "tf-grid tf-grid-three" : "tf-grid";

  return `
    <section class="tf-section">

      <div class="tf-section-header">

        <span class="tf-section-number">${number}</span>

        <div>
          <h3>${title}</h3>
          ${description ? `<p>${description}</p>` : ""}
        </div>

      </div>

      <div class="${gridClass}">
        ${fields.join("")}
      </div>

    </section>
  `;
}

// -----------------------------------------------------
// FORMULARIO COMPLETO
// -----------------------------------------------------

export function openStandardForm({
  eyebrow,
  title,
  description,
  formId,
  cancelId,
  submitLabel,
  sections,
  onSubmit,
}) {
  showModal(`
    <div class="tf-shell">

      <header class="tf-header">
        <span class="tf-eyebrow">${eyebrow}</span>
        <h2>${title}</h2>
        <p>${description}</p>
      </header>

      <form id="${formId}" class="tf-form">

        <div class="tf-content">
          ${sections.join("")}
        </div>

        <footer class="tf-footer">

          <button
            id="${cancelId}"
            type="button"
            class="tf-btn-secondary"
          >
            Cancelar
          </button>

          <button
            type="submit"
            class="tf-btn-primary"
          >
            <i class="fa-solid fa-check"></i>
            ${submitLabel}
          </button>

        </footer>

      </form>

    </div>
  `);

  document.getElementById(cancelId)?.addEventListener("click", closeForm);

  document.getElementById(formId)?.addEventListener("submit", onSubmit);
}
