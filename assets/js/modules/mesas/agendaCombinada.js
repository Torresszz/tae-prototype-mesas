// ============================================================
// AGENDAS: AUXILIAR Y TITULAR
// assets/js/modules/mesas/agendaCombinada.js
//
// Dos agendas, y cada una engloba los tres tipos de evento
// (promociones, calificaciones y exhortos con fecha):
//   - Agenda Auxiliar
//   - Agenda Titular
// La agenda de Audiencias vive en el apartado Audiencia.
// Cada evento guarda su agenda en el campo `agenda`.
// ============================================================

import { montarAgendaEn } from "./agenda.js";
import { AGENDAS, TIPOS_AGENDA_PROMOCIONES } from "./catalogos.js";

let agendaActiva = "auxiliar";

export function renderAgendaCombinada() {
  const vista = document.querySelector('[data-mesas-vista="agenda"]');

  if (!vista) return;

  vista.innerHTML = `
    <section class="mesas-fase4-section">
      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Agenda</span>
          <h2>Agendas de Promociones / Calificaciones / Exhortos</h2>
          <p>
            Cada agenda reúne promociones, calificaciones y exhortos con
            fecha señalada. Las audiencias están en el apartado Audiencia.
          </p>
        </div>
      </div>

      <div class="mesas-fase4-counters" role="tablist">
        ${AGENDAS.map(
          (agenda) => `
          <button type="button" role="tab"
            class="mesas-fase4-counter ${agendaActiva === agenda.clave ? "active" : ""}"
            data-agenda-tab="${agenda.clave}">
            <span>${agenda.etiqueta}</span>
          </button>`,
        ).join("")}
      </div>

      ${AGENDAS.map(
        (agenda) => `
        <div data-agenda-panel="${agenda.clave}" ${agendaActiva === agenda.clave ? "" : "hidden"}></div>`,
      ).join("")}
    </section>
  `;

  AGENDAS.forEach((agenda) => {
    montarAgendaEn(vista.querySelector(`[data-agenda-panel="${agenda.clave}"]`), {
      tipos: TIPOS_AGENDA_PROMOCIONES,
      tipoInicial: "promocion",
      filtroInicial: "ambas",
      titulo: agenda.etiqueta,
      agenda: agenda.clave,
    });
  });

  vista.querySelectorAll("[data-agenda-tab]").forEach((boton) => {
    boton.onclick = () => {
      agendaActiva = boton.dataset.agendaTab;

      vista.querySelectorAll("[data-agenda-tab]").forEach((otro) => {
        otro.classList.toggle("active", otro === boton);
      });

      vista.querySelectorAll("[data-agenda-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.agendaPanel !== agendaActiva;
      });
    };
  });
}
