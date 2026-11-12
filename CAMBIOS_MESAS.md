# Cambios: firma de la Magistrada, Mesa 3 y Amparos Directos / Indirectos

## Usuarios de prueba (contraseña `123`)
| Usuario | Rol | Ve |
|---|---|---|
| mesa1@example | Secretaría de Acuerdos, Mesa 1 | Solo expedientes **pares** |
| mesa2@example | Secretaría de Acuerdos, Mesa 2 | Solo expedientes **impares** |
| mesa3@example | Secretaría de Acuerdos, Mesa 3 | **OJC** y expedientes de **2021 y anteriores** |
| mesa@example | (anterior) | Todas las mesas |
| magistrada@example | Presidencia | Mesas (todas); única que firma |
| directos@example | Amparos Directos | Solo Amparos Directos |
| indirectos@example | Amparos Indirectos | Solo Amparos Indirectos |
| oficialia@example | Oficialía | Todo menos Mesas y Amparos Directos/Indirectos |

## Asignación de mesa (`mesas.js`, `mesaDeExpediente`)
1. Texto con `OJC` o año <= 2021 -> Mesa 3. 2. Consecutivo par -> Mesa 1. 3. Impar -> Mesa 2.
Acepta `124/2026` y `EXP-2026-001`. Si no se puede leer el número, cae en Mesa 1.

## Amparos
Dos páginas (`mesas-amparos-directos`, `mesas-amparos-indirectos`) con un mismo módulo (`mesasAmparos.js`); el tipo sale de `#mampPage[data-tipo]`.
"Turnar a amparos indirectos/directos" reclasifica y el amparo pasa al otro usuario.


# Fases 6, 7 y 8 (Consultas, Intersindicales, Oficios, Estadística, datos demo)

## Archivos nuevos
`assets/js/modules/mesas/`: `consultas.js` (T-17), `intersindicales.js` (T-18), `oficios.js` (T-19), `estadistica.js` (T-20), `demo.js` + `demoArchivos.js` (T-21). CSS: `assets/css/mesasFase6.css` (enlazado en `index.html`).

## Archivos editados
- `mesas.js`: registra las 4 secciones con `registrarSeccion` y llama `sembrarDemoFases()` al cargar el demo.
- `catalogos.js`: `ACCIONES_CONSULTA`, `DESTINOS_CONSULTA`.
- `demanda.js`: al marcar radicada guarda `radicadoEn` (fecha para Estadística).
- `calificacion.js`: al acordar guarda `concluidaEn`; al revertir lo elimina.

## Claves nuevas de localStorage
`mesasConsultas`, `mesasAcumulados`, `registroOficios` (nunca reutilizar `oficios`).

## Decisiones ⚠️ (implementadas, fáciles de cambiar)
- Consultas: al "regresar" con destino Mesas, la ubicación pasa a `Mesa N` según la asignación del expediente.
- `puedeAcumular()` devuelve siempre true (`// PENDIENTE`); el modal muestra "Regla de acumulación pendiente de definir".
- Acumulado visible para una mesa si cualquiera de sus dos expedientes es suyo; ambos deben existir.
- Oficios: formato `TAE-SA-0006/2026` (`PREFIJO_OFICIO`); consecutivo por año, asignado al guardar; repositorio compartido por todas las mesas.
- Estadística: demandas = categoría Radicado; promociones = registradas; audiencias = Desahogada; calificaciones = Acordado. Fechas con respaldo si falta `radicadoEn`/`concluidaEn`.
- Intersindicales: solo "1. Admisión" con aviso "Pendiente de desarrollar".

## Verificación (T-22)
Pruebas Playwright: 34 + 33 + 22 comprobaciones, 0 fallos, sin errores de consola. No hay estados antiguos en el código.

# Ronda de decisiones confirmadas + revisión integral (noviembre 2026)

## Decisiones confirmadas por el equipo (ya implementadas)
| Tema | Decisión | Dónde |
|---|---|---|
| Promociones en la agenda | Se siguen creando a mano | sin cambios |
| Avisos de promoción y exhorto | Notificación a **Actuaría 10 días antes** de la fecha señalada | `config.js` (`DIAS_ALERTA_ACTUARIA_PROMOCION_EXHORTO`), `notificaciones.js` (`destinatariosDeTipo`, `diasAnticipacionDeTipo`), `exhortos.js` (`sincronizarAgenda`) |
| Mesa que atiende un exhorto | Regla actual correcta (la del expediente vinculado; si no, paridad del consecutivo) | `exhortos.js` |
| Firma de exhortos | La Magistrada **sí** los firma: En proceso -> Enviar a firma -> Firmar -> En lista -> Actuaría | `flujoEstados.js` (se quitaron las excepciones por tipo) |
| Exhortos ya registrados | Conservan el número capturado a mano | sin cambios |
| Regresar desde Consultas | La ubicación pasa a `Mesa N` | `consultas.js` |
| Formato de oficio | `TAE-SA-0006/2026` es correcto | `oficios.js` |
| Desahogada / Acordado | Siguen manuales (pendiente de definir) | sin cambios |
| Selector de estado de Oficialía (exhortos) | Se queda | sin cambios |
| Estadística | Nueva tarjeta **Acuerdos emitidos** | `estadistica.js` |
| Expedientes y demandas nuevas | Quedan **Pendientes de recibir** en Mesas | `recepcionExpedientes.js` (nuevo), `demandaForm.js`, `mesaUtils.js` |

## Estadística: "Acuerdos emitidos" (⚠️ definición propuesta)
Promociones cuyo acuerdo ya fue **firmado por la Magistrada** (`estadoPromocion = "acordado"`). Fecha: `acordadoEn` (se guarda al firmar en `promociones.js`); respaldo: movimiento "Firmado" del `historialAcuerdo`; último respaldo: fecha de la promoción. Cada mesa ve lo suyo; la Magistrada ve el total y el desglose por mesa.

## Expedientes por recibir (⚠️ interpretación)
- Al registrar una demanda en Oficialía, su expediente nace con `recibidoMesa: false` y ubicación "Oficialía de Partes · pendiente de recibir en Mesas".
- Mesas no lo ve (tablas, Demanda, Consultas, Agenda, Oficios) hasta pulsar **Recibir** en la tarjeta "Expedientes por recibir" (misma barra lateral que "Promociones por recibir").
- Al recibirlo: `recibidoMesa = true`, ubicación = `Mesa N`, se crea su seguimiento "En proceso" con historial. Solo recibe la mesa que le corresponde; la Magistrada ve la lista pero no recibe.
- Registros anteriores sin el campo se consideran recibidos (`expedienteRecibidoEnMesa()` en `mesaUtils.js`).
- Una promoción cuyo expediente aún no fue recibido no aparece en "Promociones por recibir" hasta que se reciba el expediente.
- El pendiente nace al registrar en Oficialía (igual que promociones y exhortos); no depende del botón "Mandar a mesas" del Histórico.

## Datos de demostración añadidos
6 exhortos (por recibir, en proceso, en firma, con fecha, en Actuaría), 2 eventos de promoción y 1 de exhorto con aviso de 10 días, 2 expedientes y 2 promociones por recibir, y plantilla de Audiencia. Además se corrigió el demo heredado: las promociones demo no estaban marcadas como recibidas y Promociones/Mesas salían vacías.

## Verificación
5 suites Playwright (182 comprobaciones, 0 fallos): fases 6, 7-8, ronda 3, integral y Oficialía -> Mesa -> Magistrada -> Actuaría. (La vista previa de Word ya no usa mammoth.js; ver ronda siguiente.)


## Ronda 12 nov 2026: Agendas y vista previa
- **Dos agendas**: "Agenda Auxiliar" (la que estaba en Promociones) y "Agenda Titular" (la que estaba en Calificaciones); ambas reúnen promociones, calificaciones y exhortos. Campo `agenda` por evento; eventos antiguos sin campo: calificación -> auxiliar, resto -> titular. Exhortos eligen agenda en el señalamiento.
- **Vista previa de plantillas**: muestra la primera página del documento centrada, estilo Google Docs (PDF con pdf.js incluido en `assets/vendor/pdfjs/`, DOCX con lector propio; ya no depende de mammoth.js ni de internet). Limitación: DOCX sin imágenes, encabezados ni pies.
- Pruebas: fases 6 (34), 7-8 (33), ronda 3 (15), flujo Oficialía (24), vista previa (18), agendas (10) e integral, sin fallos.
