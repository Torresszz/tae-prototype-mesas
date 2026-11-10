# Contexto para agentes — Módulo Mesas / Secretaría de Acuerdos

Proyecto: maqueta del Tribunal (HTML + CSS + módulos ES, sin backend, datos en `localStorage`). Ver `README.md` para convenciones generales y `CAMBIOS_MESAS.md` para el historial.

## Arquitectura de Mesas
- Página `mesas` con secciones internas. `navegacion.js`: `SECCIONES`, `registrarSeccion(id, renderFn)`, `renderSeccionActiva()`. Cada vista es `[data-mesas-vista="id"]` y permanece oculta en el DOM (cuidado al contar selectores: acotar a la vista).
- Secciones: mesas, demanda, promociones, calificacion, audiencia, consultas, intersindicales, oficios, estadistica, plantillas.
- Barra de filtros global: `filtros.js` (`aplicarFiltrosGlobales`, `configurarBarraFiltros`). Estadística la oculta (`filtros:{visible:false}`).
- Plantillas se montan con `<div data-plantillas-slot></div>`.
- Formularios nuevos van en modal (`showModal`/`closeForm`) para que un re-render por filtros no borre lo escrito. El modal está fuera de `#mesasPage`: el CSS de formularios (`.mesas-fase6-form/field/help/error/notice`) no está acotado.
- Archivos del proyecto usan CRLF (los nuevos, LF). Respetar al editar.

## Asignación de mesa (`mesaUtils.js`, `mesaDeExpediente`)
OJC o año ≤ 2021 → Mesa 3; consecutivo par → Mesa 1; impar → Mesa 2. `getExpedientesMesaActual()` filtra por `getSession().mesa` (null = todas: Magistrada y `mesa@example`).

## Claves de localStorage (Mesas)
`expedientes` (campo `ubicacion`), `promociones`, `mesasSeguimiento[numero].estado`, `mesasDemandas {[n]:{radicacion,categoria,radicadoEn?}}`, `mesasCalificaciones [{id,expediente,estado,resultado,notas,concluidaEn?}]`, `mesasAgenda`, `mesasNotificaciones`, `mesasConsultas`, `mesasAcumulados`, `registroOficios` (nunca `oficios`), `mesasPlantillas`.
Avisos: audiencia → 2 (actuaría + archivo); calificación → 1 (auxiliar); recordatorio 7 días antes.

## Estado por fase
- Fases 1–5: heredadas (tabla de mesas, demanda, promociones, calificación, audiencia/agenda, plantillas). **Pendiente de revisión** por el usuario; no refactorizar sin pedirlo.
- Fase 6: `consultas.js` (enviar/regresar, acumulados), `intersindicales.js` (solo Admisión, pendiente), `oficios.js` (consecutivo anual).
- Fase 7: `estadistica.js` (4 tarjetas, cada una con su rango; mesa ve lo suyo, Magistrada ve total + desglose por mesa).
- Fase 8: `demo.js` (`sembrarDemoFases`, idempotente, ids `demo-*`), `demoArchivos.js` (generado: 4 docx + 1 pdf en base64).

## Reglas del usuario / spec
- No inventar reglas de negocio: usar `// PENDIENTE:` y reportar.
- Sin rutas nuevas ni cambios en permisos de `auth.js`. Solo rol `mesa` sube/borra plantillas. Crítico = más de 10 promociones.
- Firma solo la Magistrada (Presidencia).

## Decisiones ⚠️ abiertas (confirmar con el usuario)
1. "Regresar" a Mesas fija `ubicacion = Mesa N`.
2. `puedeAcumular()` siempre true + aviso visible.
3. Visibilidad de acumulados: si cualquiera de los dos expedientes es de la mesa.
4. Formato de oficio `TAE-SA-0006/2026` (`PREFIJO_OFICIO` en `oficios.js`).
5. Definiciones y fechas de Estadística (fallbacks a fecha de recepción / fecha del evento).
6. Intersindicales: contenido de Admisión sin definir.

## Usuarios (contraseña `123`)
mesa1@example, mesa2@example, mesa3@example, mesa@example (todas), magistrada@example, directos@example, indirectos@example, oficialia@example.

## Cómo probar
Servir la carpeta con `python3 -m http.server 8099`; Playwright: inyectar `tribunalSession` en `sessionStorage` (email, nombre, rol, area, paginaInicial, mesa, iniciadoEn) en `login.html` y abrir `index.html`. Cargar demo con el botón `#mesasLoadDemoBtn`. Resultado actual: 89 comprobaciones, 0 fallos, sin errores de consola.
