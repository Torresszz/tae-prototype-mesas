// ============================================================
// INTERSINDICALES
// assets/js/modules/mesas/intersindicales.js
// FASE 6 - T-18
//
// Solo estructura. La lógica de "1. Admisión" está pendiente de
// desarrollar por el equipo. El buscador por expediente es la barra
// global del módulo.
//
// PENDIENTE: cuando se defina la Admisión, guardar sus registros en
// una llave nueva de localStorage con "expediente" en cada registro y
// filtrarlos con aplicarFiltrosGlobales() + getExpedientesMesaActual().
// ============================================================

export function renderIntersindicales() {
  const vista = document.querySelector('[data-mesas-vista="intersindicales"]');

  if (!vista) {
    return;
  }

  vista.innerHTML = `
    <section class="mesas-fase6-section">

      <div class="mesas-fase4-header">
        <div>
          <span class="mesas-mini-eyebrow">Fase 6 · T-18</span>
          <h2>Intersindicales</h2>
          <p>
            Busca por número de expediente con la barra superior.
          </p>
        </div>
      </div>

      <section class="mesas-fase6-card">
        <div class="mesas-fase6-card-header">
          <h3>1. Admisión</h3>

          <span class="mesas-fase6-badge pendiente">
            Pendiente de desarrollar
          </span>
        </div>

        <div class="mesas-empty-state">
          <div class="mesas-empty-icon">
            <i class="fa-solid fa-people-group"></i>
          </div>
          <strong>Pendiente de desarrollar</strong>
          <span>Este apartado se activará cuando se defina el proceso de admisión.</span>
        </div>
      </section>

    </section>
  `;
}
