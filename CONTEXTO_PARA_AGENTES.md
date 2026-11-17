# Contexto para agentes — Módulo Mesas / Secretaría de Acuerdos

Maqueta del Tribunal de Arbitraje y Escalafón: HTML + CSS + módulos ES, **sin backend**, datos en `localStorage`. Convenciones generales en `README.md`; historial de cambios en `CAMBIOS_MESAS.md`. Estado al 12 de noviembre de 2026.

## 1. Reglas del proyecto (respetar siempre)
- **No inventar reglas de negocio.** Lo no definido se marca `// PENDIENTE:` y se reporta. Las interpretaciones razonables se marcan ⚠️ y se dejan fáciles de cambiar.
- Mesas es **una sola página (`mesas`)** con secciones internas: sin rutas nuevas y sin tocar los permisos de `auth.js`.
- Solo el rol `mesa` sube, edita o borra plantillas. **Solo la Magistrada firma.**
- Crítico = **más de 10** promociones (`MESAS_CONFIG.PROMOS_CRITICO_MAYOR_A`).
- Los archivos del proyecto usan **CRLF**; los nuevos pueden ir en LF. Al editar con scripts, conservar el salto de línea original.
- La llave de oficios de Mesas es `registroOficios` (nunca `oficios`, que es del módulo general de Oficialía).
- Los datos demo llevan ids `demo-*` para ser idempotentes. Mantener esa convención.

## 2. Usuarios (contraseña `123`)
| Usuario | Rol | Ve |
|---|---|---|
| mesa1@example | Mesa 1 | Expedientes **pares** |
| mesa2@example | Mesa 2 | Expedientes **impares** |
| mesa3@example | Mesa 3 | **OJC** y expedientes de **2021 hacia atrás** |
| mesa@example | Mesa (todas) | Todas las mesas |
| magistrada@example | Presidencia | Todas las mesas; única que firma |
| directos@example / indirectos@example | Amparos | Solo su módulo de amparos |
| oficialia@example | Oficialía | Todo menos Mesas, Amparos Directos/Indirectos y las páginas del Administrador |
| admin@example | Administrador | Solo Panel, Usuarios y Catálogos |

Los usuarios viven en `localStorage` (llave `usuarios`, sembrada desde `USERS` de `auth.js`); el Administrador puede cambiar contraseñas y eliminar usuarios. Todos los roles ven su **Perfil** (ruta `perfil`).

Asignación de mesa (`mesaUtils.js`, `mesaDeExpediente`): OJC o año ≤ 2021 -> Mesa 3; consecutivo par -> Mesa 1; impar -> Mesa 2. Sin número legible -> Mesa 1.

## 3. Arquitectura de Mesas
- `assets/js/modules/mesas.js`: tabla general, alertas, flujo del acuerdo del expediente, demo base. Registra las secciones con `registrarSeccion(id, renderFn)`.
- `mesas/navegacion.js`: `SECCIONES` (13): mesas, demanda, promociones, calificacion, exhortos, agenda, audiencia, consultas, intersindicales, oficios, listas, estadistica, plantillas. Cada vista es `[data-mesas-vista="id"]` y **permanece oculta en el DOM** (al probar, acotar los selectores a la vista).
- `mesas/filtros.js`: barra de filtros global (expediente, fechas, estado). Estadística la oculta.
- `mesas/mesaUtils.js`: `getExpedientesMesaActual()` (solo expedientes **ya recibidos** y de la mesa del usuario), `mesaDeExpediente`, `expedienteRecibidoEnMesa`.
- `mesas/flujoEstados.js`: **única fuente de las reglas de estado** (tabla `ACCIONES_FLUJO`). Cada tabla guarda su estado en su propia llave.
- Formularios nuevos en **modal** (`showModal`/`closeForm`) para que un re-render por filtros no borre lo escrito. El modal vive fuera de `#mesasPage`.
- Plantillas por sección: `<div data-plantillas-slot></div>` + `plantillas.js` / `plantillasStore.js`.

| Archivo | Sección |
|---|---|
| `demanda.js`, `promociones.js`, `calificacion.js` | Demanda, Promociones, Calificación |
| `exhortos.js` | Exhortos (los registra Oficialía; Mesa los recibe) |
| `agenda.js`, `agendaCombinada.js`, `promocionAgenda.js` | Dos agendas (**Agenda Auxiliar** y **Agenda Titular**), cada una con promociones, calificaciones y exhortos; agenda de audiencias; agendar audiencia desde una promoción |
| `vistaPrevia.js` | Vista previa de plantillas: primera página tipo Google Docs (PDF con pdf.js vendorizado en `assets/vendor/pdfjs/`; DOCX con lector propio, sin imágenes ni encabezados/pies) |
| `audiencia.js` | Audiencia |
| `consultas.js` | Consultas: enviar/regresar, acumulados |
| `intersindicales.js` | Solo "1. Admisión" (pendiente de desarrollar) |
| `oficios.js` | Número de oficio consecutivo por año |
| `estadistica.js` | 5 tarjetas con rango propio |
| `listas.js`, `pdfLista.js` | Listas de acuerdos (una por día y mesa, consecutivo global, automática 15:00 L-V); generador de PDF propio, sin librerías |
| `recepcionPromociones.js`, `recepcionExpedientes.js` | Tarjetas "por recibir" de la barra lateral de Mesas |
| `notificaciones.js` | Avisos de agenda |
| `demo.js`, `demoArchivos.js` | Datos de demostración (archivos en base64, generados) |

## 4. Flujo de estados
```
Oficialía -> (Recibir en Mesa) -> En proceso -> [En revisión interna] -> En firma
   -> (Magistrada firma) -> En lista -> En Actuaría -> { Regresar a Mesa | En Archivo }
Archivo / Actuaría + promoción nueva -> En proceso (reactivación automática)
```
- Estados: En proceso, En revisión interna, En firma, En lista, En Actuaría, En Archivo (`estados.js`). El usuario ya no elige el estado: ejecuta acciones.
- Al firmar: promoción -> `acordado` (+ `acordadoEn`); demanda -> `radicado` (+ `radicadoEn`); calificación -> En lista (su **resultado `acordado` sigue siendo manual**).
- **Exhortos** siguen el mismo flujo, incluida la firma de la Magistrada.
- Actuaría y Archivo están **simulados** con botones dentro de Mesas.

## 5. Claves de localStorage
`expedientes` (campos `ubicacion`, `recibidoMesa`, `recibidoMesaEn/Por`, `mesaRecepcion`), `demandas`, `promociones` (`recibidaMesa`, `estadoAcuerdo`, `estadoPromocion`, `acordadoEn`, `historialAcuerdo`), `exhortos` (`recibidoMesa`, `mesa`, `estadoMesa`, `historialMesa`, `senalamiento`), `enviosMesas`, `mesasSeguimiento`, `mesasDemandas {[n]:{radicacion,categoria,radicadoEn?}}`, `mesasCalificaciones [{id,expediente,estado,resultado,concluidaEn?}]`, `mesasAgenda`, `mesasNotificaciones`, `mesasConsultas`, `mesasAcumulados`, `registroOficios`, `mesasPlantillas`.

## 6. Avisos (notificaciones)
| Evento | Destinatario | Anticipación |
|---|---|---|
| Audiencia | Actuaría | 7 días |
| Calificación | Auxiliar | 7 días |
| Promoción con fecha | Actuaría | **10 días** |
| Exhorto con fecha de señalamiento | Actuaría | **10 días** |
Se editan en `config.js` y `notificaciones.js`. Los eventos pasados no generan aviso.

## 7. Decisiones tomadas por el equipo
Promociones se crean a mano · avisos de 10 días a Actuaría · regla de mesa de exhortos correcta · la Magistrada firma exhortos · exhortos existentes conservan su número · regresar desde Consultas -> `Mesa N` · formato de oficio `TAE-SA-0006/2026` · selector de estado de Oficialía (exhortos) se queda · expedientes y demandas nuevas quedan **pendientes de recibir**.

## 7a. Agendas (12 nov 2026)
- Cada evento de `mesasAgenda` (no audiencias) lleva `agenda: "auxiliar" | "titular"`. Eventos sin el campo: `agendaDeEvento` (`catalogos.js`) asigna calificación -> auxiliar, el resto -> titular ⚠️.
- La pestaña elegida filtra el calendario; "Nuevo evento" crea en la agenda activa. Los exhortos eligen agenda en el modal de señalamiento (`#exhAgenda`).
- Crear eventos tipo exhorto a mano desde la agenda no se ofrece (se agendan desde Exhortos).

## 7b. Realizado en la última ronda
- Avisos a Actuaría a 10 días para promociones y exhortos con fecha (alta, edición y baja sincronizadas).
- Exhortos con firma de la Magistrada (flujo único para todos los asuntos).
- Tarjeta de Estadística **Acuerdos emitidos** (sello `acordadoEn` al firmar).
- Expedientes y demandas nuevas **pendientes de recibir** (`recepcionExpedientes.js`).
- Demo: exhortos, eventos con aviso, expedientes y promociones por recibir, plantilla de Audiencia; corregido el demo heredado cuyas promociones no estaban recibidas.
- Revisión integral con todos los roles y pruebas de las Partes 4 y 5 (ver sección 11).

## 7c. Ronda 17 nov 2026: Administrador, Perfil, Listas y Calificación
**Administrador (`rol: "admin"`)**
- `auth.js`: almacén de usuarios (`getUsuarios`, `getUsuariosPublicos`, `cambiarPasswordUsuario`, `eliminarUsuario`, `restablecerUsuariosDemo`), `ultimoAcceso` al iniciar sesión, `canAccessPage` (admin: `admin`, `usuarios`, `catalogos`, `perfil`). No puede eliminarse a sí mismo ni dejar el sistema sin administrador. Una sesión cuyo usuario fue eliminado se cierra al recargar.
- `modules/admin.js` + `pages/admin.html` (Panel) y `pages/usuarios.html`; `assets/css/admin.css`. Catálogos: la página `catalogos` que ya existía (entes y actos demandados).
- "Restablecer usuarios de demostración" es una ayuda de la maqueta (retirar al migrar). No hay alta de usuarios (no se pidió).
- ⚠️ El Administrador no ve los módulos operativos (Mesas, Oficialía, Amparos).

**Perfil** (`modules/perfil.js`, `pages/perfil.html`): se abre con el usuario del encabezado (`[data-abrir-perfil]` en `navbar.html`). Solo consulta; la contraseña la cambia el Administrador. Desde el perfil, un apartado de Mesas recarga la página `mesas` (`setupPerfil` en `app.js`).

**Listas de acuerdos** (`mesas/listas.js`, llave `mesasListas`)
- Registro: `{ id, numero, fecha, mesa, usuario, usuarioNombre, origen: "manual"|"automatica", generadaEn, filas:[{ expediente, anio, actor, demandado, acuerdos[] }] }`. El PDF se regenera a partir del registro (no se guarda el archivo).
- Consecutivo global (máximo + 1). Una lista por día y por mesa. Solo Mesa 1-3 crean; cada usuario ve las generadas con su usuario; Magistrada y `mesa@example` consultan todas ⚠️.
- Entra a la lista ⚠️: todo asunto de la mesa ya firmado por la Magistrada (`firmadoEn` o estado `en-lista`) sin `listaId`, de expedientes, demandas, promociones, calificaciones y exhortos. Columna ACUERDO = concepto "Acuerdo" capturado al enviar a firma. `flujoEstados.aplicarAccion` sella `firmadoEn` al firmar y limpia `listaId` al reenviar a firma.
- Automática: `revisarListaAutomatica` (15:00, lunes a viernes; `MESAS_CONFIG.LISTA_HORA_AUTOMATICA` / `LISTA_DIAS_AUTOMATICA`). Corre en el navegador de la mesa con sesión abierta (al abrir Mesas y cada minuto); se revisa una vez por día (`mesasListasRevisionAuto`). Sin acuerdos pendientes no genera lista ni consume número.
- PENDIENTE: confirmar si el consecutivo reinicia cada año y si un día sin acuerdos debe generar lista.

**Calificación**: una sola columna **Estado**. Catálogo: Por acordar (inicial, `ESTADO_POR_ACORDAR`) -> En proceso (botón "Pasar a En proceso", acción `iniciar`) -> En revisión interna -> En firma -> En lista -> En Actuaría. Se quitó "Marcar acordado"; al firmar la Magistrada se guarda `resultado: "acordado"` + `concluidaEn` (lo usa Estadística) ⚠️. Migración única por registro (`estadoUnificado`). El filtro global de Estado agrega "Por acordar" solo en Calificación (`filtros.estadosExtra`).

## 8. Pendientes de definición (no implementar sin confirmación)
1. **Desahogada** (audiencias): sigue como botón manual; falta definir qué evento la marca sola. (Calificación ya no tiene botón manual: ver sección 7c.)
2. `puedeAcumular()` (`consultas.js`) siempre devuelve verdadero (aviso visible "Regla de acumulación pendiente de definir").
3. Intersindicales -> Admisión: contenido sin definir (lo define el Lic. Martín).
4. Estadística: las definiciones de cada tarjeta y las fechas de respaldo son propuestas ⚠️.
5. Visibilidad de acumulados: se ve si cualquiera de los dos expedientes es de la mesa ⚠️.
6. "Expedientes por recibir" nace al registrar en Oficialía (no depende de "Mandar a mesas") ⚠️.

## 9. Diferido a la migración
Una sola fuente de verdad para los 5 campos de estado · mover los botones de Actuaría y Archivo a sus propias pantallas y a `auth.js` cuando existan esos módulos · pasar la tabla de transiciones y el consecutivo EXH-000/AAAA al servidor · reemplazar los datos en base64 por servicios/almacenamiento reales.

## 10. Limpieza pendiente antes de migrar (no hecha)
- Código sin uso: `ESTADOS_RADICACION` y `marcarComoRadicada` (`demanda.js`), `avanzarEstado` (`mesas.js`), CSS `mesas-fase4-state-select`.
- Retirar `demo.js` y `demoArchivos.js` al migrar.

## 11. Pruebas
Servir la carpeta (`python3 -m http.server 8099`). Con Playwright: inyectar `tribunalSession` en `sessionStorage` (email, nombre, rol, area, paginaInicial, mesa, iniciadoEn) desde `login.html`, abrir `index.html`, y cargar el demo con `#mesasLoadDemoBtn`.
Última corrida: fases 6, 7-8, ronda 3, revisión integral y flujo Oficialía -> Mesa -> Magistrada -> Actuaría, todas sin fallos y sin errores de consola.
Ronda 17 nov: `test_ronda5` (administrador, perfil, listas con reloj simulado y Calificación, 74). Además: `test_preview` (vista previa PDF/DOCX, 18) y `test_agendas` (10). **No probado:** la prueba manual en Live Server con datos reales y DOCX con imágenes/encabezados (no se dibujan).

## 12. Trampas conocidas
- Las listas automáticas dependen de la hora local del navegador; para probarlas usar el reloj simulado de Playwright (`page.clock.set_fixed_time`).
- Las pruebas que envían a firma deben adjuntar documento y concepto en el modal "Enviar a firma".
- Pulsar la pestaña de la sección ya activa **no** vuelve a renderizar: tras cambiar datos desde otra sesión, ir a otra sección y regresar.
- La Magistrada arranca con el filtro global "En firma"; el filtro persiste entre secciones.
- "Recibir" deja el modal abierto mientras queden pendientes (para recibir varios seguidos).
- Una promoción cuyo expediente no ha sido recibido no aparece por recibir hasta que se reciba el expediente.
