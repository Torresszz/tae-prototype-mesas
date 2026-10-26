// ============================================================
// FORM HELPER
// ============================================================

// ============================================================
// MOSTRAR MODAL
// ============================================================

export function showModal(content) {
  const modal = document.getElementById("modal");

  const modalContent = document.getElementById("modalContent");

  if (!modal || !modalContent) {
    console.error("No se encontró el modal global.");

    return;
  }

  modalContent.innerHTML = content;

  modal.classList.add("show");

  modal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

  setupCloseButton();
}

// ============================================================
// CERRAR
// ============================================================

export function closeForm() {
  const modal = document.getElementById("modal");

  const modalContent = document.getElementById("modalContent");

  if (!modal) {
    return;
  }

  modal.classList.remove("show");

  modal.setAttribute("aria-hidden", "true");

  document.body.classList.remove("modal-open");

  if (modalContent) {
    modalContent.innerHTML = "";
  }
}

// Los botones "Cancelar" usan onclick="closeForm()" en línea,
// y eso requiere una función global.
window.closeForm = closeForm;

// ============================================================
// BOTÓN CERRAR
// ============================================================

function setupCloseButton() {
  const button = document.getElementById("modalCloseBtn");

  if (!button) {
    return;
  }

  button.onclick = closeForm;
}

// ============================================================
// IMPORTANTE
//
// El modal solo se cierra con el botón de cerrar (X) o con el botón
// "Cancelar" / "Aceptar" del propio formulario.
//
// No existe listener para:
//   - click sobre #modal (fuera de la tarjeta)
//   - tecla ESC
//
// Por lo tanto, ninguno de los dos cierra el modal.
// ============================================================
