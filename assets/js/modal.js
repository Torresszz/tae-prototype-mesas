// =====================================================
// MODAL SYSTEM
// Manejo de ventanas emergentes
// =====================================================

export function openModal(content) {
  const modal = document.getElementById("modal");

  const modalContent = document.getElementById("modalContent");

  if (!modal || !modalContent) {
    console.error("Modal no encontrado");

    return;
  }

  modalContent.innerHTML = content;

  modal.classList.add("show");

  document.body.style.overflow = "hidden";
}

export function closeModal() {
  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modalContent");

  if (!modal) {
    return;
  }

  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  document.body.style.overflow = "";

  if (modalContent) {
    modalContent.innerHTML = "";
  }
}

export function setupModal() {
  const modal = document.getElementById("modal");

  if (!modal) {
    return;
  }

  // Algunos modales usan onclick="closeModal()" en línea.
  window.closeModal = closeModal;

  // El modal NO se cierra al hacer clic fuera (README §10).
  // Solo se cierra con el botón X, delegado para que funcione
  // también en los modales "Ver" que no pasan por showModal().
  modal.addEventListener("click", (event) => {
    if (event.target.closest("#modalCloseBtn")) {
      closeModal();
    }
  });

  // La tecla ESC ya la maneja formHelper.js.
}
