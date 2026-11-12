// ============================================================
// AGENDA 2: PROMOCIONES / CALIFICACIONES (+ exhortos con fecha)
// assets/js/modules/mesas/agendaCombinada.js
// La agenda 1 (Audiencias) vive en el apartado Audiencia.
// ============================================================

import { montarAgendaEn } from "./agenda.js";
import { TIPOS_AGENDA_PROMOCIONES } from "./catalogos.js";

export function renderAgendaCombinada() {
  const vista = document.querySelector('[data-mesas-vista="agenda"]');

  if (!vista) return;

  vista.innerHTML = `
    <section class="mesas-fase4-section">
      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Agenda</span>
          <h2>Agenda de Promociones / Calificaciones</h2>
          <p>
            Calificaciones, promociones y exhortos con fecha señalada.
            Las audiencias están en el apartado Audiencia.
          </p>
        </div>
      </div>
      <div data-agenda-combinada></div>
    </section>
  `;

  montarAgendaEn(vista.querySelector("[data-agenda-combinada]"), {
    tipos: TIPOS_AGENDA_PROMOCIONES,
    tipoInicial: "calificacion",
    filtroInicial: "ambas",
    titulo: "Promociones / Calificaciones",
  });
}
