# Cambios de esta ronda (27 nov 2026)

Copiar la carpeta `tae-prototype-mesas/` de este zip **encima** del proyecto: solo trae los archivos que cambiaron (8 modificados + 1 nuevo). `cambios.diff` muestra línea por línea qué se cambió (sin contar saltos de línea).

## 1. Simulación real: demanda desde Oficialía hasta Actuaría

Se probó por la interfaz, con cada usuario, como sería con backend:
Oficialía registra la demanda → Mesa la recibe → Atender/Calificar → Enviar a firma (extracto) → la Magistrada firma → Lista del día (PDF) → Actuaría → Oficialía registra una promoción → Mesa la recibe y la acuerda con audiencia (agenda + aviso a Actuaría) → la Magistrada la firma → Calificación → lista automática del siguiente día hábil a las 15:00 → Actuaría → Archivo → consulta del expediente en Mesa y en Oficialía.

**Antes de corregir, la simulación NO se completaba.** Se corrigió:

| # | Problema | Archivo |
|---|---|---|
| 1 | Una promoción enviada a firma desde "Acordar" quedaba atorada: la Magistrada solo veía "En firma" (sin botón **Firmar**) y, ya firmada, no había **Pasar a Actuaría / Archivo / Regresar a Mesa**. Ahora usa los botones del flujo común y la Magistrada puede **Ver acuerdo** (texto generado) antes de firmar. | `assets/js/modules/mesas/promociones.js`, `assets/css/mesasFase4.css` |
| 2 | La lista de acuerdos ponía "Acuerdo" en la columna ACUERDO en lugar del **extracto** capturado al enviar a firma (Demanda lo guarda en `acuerdo.extracto`). Ahora usa el extracto; si no hay, el concepto escrito; si solo dice "Acuerdo", una frase según el tipo ("Radicación.", "Se acuerda promoción.", etc.) ⚠️ | `assets/js/modules/mesas/listas.js` |
| 3 | En la recepción unificada, la **Magistrada** tenía el botón "Recibir todo" (podía recibir lo de todas las mesas). Ahora ve "Ver pendientes" sin botón para recibir (con candado también en el código). | `assets/js/modules/mesas/recepcionPromociones.js` |

## 2. Amparos Directos: Posponer y Agendar con calendario

En "Pendiente de enviar al TCC" → panel **Notificaciones**, cada aviso trae ahora:
- **Calendario** (fecha y hora; no permite días pasados) y atajos 24 h / 48 h / 3 días / 1 semana que solo llenan la fecha.
- **Posponer**: aún no hay fecha asignada; el aviso se oculta hasta el día elegido. No entra a la agenda.
- **Agendar**: la fecha ya está confirmada; se crea el evento en la nueva **Agenda** y el aviso vuelve a aparecer el día del evento con la leyenda "Agendado".
- La fila del amparo indica "Agendado: fecha · hora" o "Aviso pospuesto hasta…".

Nuevo apartado **Agenda** (barra lateral de Amparos Directos): calendario mensual con los eventos agendados, lista de próximos, lista de pospuestos (sin fecha confirmada) y, al abrir un evento, "Ver amparo" y "Quitar de la agenda" (el aviso vuelve a Notificaciones).

Archivos: `amparosDirectos/agendaDirectos.js` (nuevo), `amparosDirectos/tcc.js`, `amparosDirectos/index.js`, `pages/mesas-amparos-directos.html`, `assets/css/mesasAmparosDirectos.css`.
Datos: llave nueva `amparosDirectosAgenda`; en el seguimiento, `seg.tcc.alerta.agenda = { eventoId, fecha, hora }` y `pospuestaFecha`.

## 3. Pruebas (todas sin fallos ni errores de consola)
Simulación real (52), Agenda de Amparos Directos (33), fases 6 (34), 7-8 (33), ronda 3 (15), flujo Oficialía (24), vista previa (18), agendas (10), ronda 5 (74), integral (77).
Algunas pruebas anteriores se actualizaron porque el equipo cambió el flujo (recepción unificada, "Atender / Calificar" en Demanda, "Acordar" en Promociones, la sección Expedientes sin barra de filtros); no fueron errores de la aplicación.
