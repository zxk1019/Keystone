# Mi Estudio

App de estudio de escritorio (Electron + React + TypeScript). Más adelante habrá una versión móvil con Capacitor.

- La especificación completa está en `docs/especificacion.md`. Síguela y, si algo no encaja, pregúntame antes de cambiarla.
- Trabajamos por fases (sección 8 de la especificación). Al acabar cada fase:
  1. explica qué has hecho y cómo probarlo,
  2. actualiza la línea "Fase actual" de este archivo,
  3. espera a que te confirme antes de seguir.
- **Fase actual: 5 — Estudio** (hecha, pendiente de que la confirme). La siguiente es la 6 — 20-20-20.
- Para la fase 6: el descanso del temporizador reinicia el contador del 20-20-20, y si faltan menos de 2 min para el descanso el 20-20-20 no salta. Usa `StudyTimer` en main. La pantalla de Estudio tiene que mostrar «Próximo 20-20-20 en X min».
- Para la fase 7: el panel de Spotify va en la pantalla de Estudio, debajo del consejo, y la música se pausa en los descansos (escucha `onPhaseEvent`).
- Pendiente para la fase 8 (app instalada): el botón «Hecho» dentro del aviso (`toastXml` + protocolo `miestudio://`) y comprobar «Arrancar con Windows». En desarrollo no se registra nada en Windows a propósito.

## Comandos
- `npm run dev`: abre la app en modo desarrollo (F12 abre las DevTools).
- `npm test`: tests de Vitest (`*.test.ts` junto al código) para la lógica que no necesita Electron.
- `npm run typecheck`, `npm run lint` y `npm test`: pásalos antes de dar una fase por acabada.
- `npm run build:win`: genera el instalador de Windows.
- Para probar sin tocar los datos reales, lanza la app con otra carpeta de datos: `MI_ESTUDIO_DATA_DIR=<carpeta>`. Usa una ruta corta: si la ruta es larga, Windows no deja crear los archivos de Chromium y la app se cierra al arrancar.

## Dónde está cada cosa
- `src/shared/`: tipos de datos, canales IPC (`api.ts`), validación y traducciones (`locales/`). Lo usan tanto main como renderer.
- `src/main/`: ventana, bandeja y datos (`data/`: `dataStore.ts` guarda el JSON, los repos acceden a él y `backup.ts` exporta e importa).
- `src/shared/schedule.ts`: horas y solapes del horario, y la clase actual y la siguiente. Los repos de main lo usan para no guardar clases solapadas.
- `src/shared/items.ts`: qué va con retraso (solo deberes y trabajos; los exámenes y eventos pasados no), qué vence hoy o mañana y los próximos exámenes.
- Temporizador de estudio: la lógica pura está en `src/shared/studyTimer.ts` (con tests) y vive en main (`src/main/studyTimer.ts`), porque Chromium frena los relojes de las ventanas escondidas. La pantalla recibe el estado por IPC (`onStudyState`) y la campanita suena con `onStudyPhase` (`lib/chime.ts`, Web Audio, sin archivos de sonido). Mientras se estudia, `planNotifications` recibe `studying = true` y no envía nada.
- Contenido de Estudio: los consejos (`study.tips`, 20) y las técnicas (`study.techniques.items`) están en `src/shared/locales/`. Si cambias el número de consejos, actualiza `TIP_COUNT` en `store/studyStore.ts`.
- Avisos: `src/shared/notifications.ts` (`planNotifications`) decide qué toca enviar. Es una función pura con tests. `src/main/notifier.ts` la ejecuta cada minuto y muestra los avisos, `src/main/notificationText.ts` escribe sus textos y `src/main/navigation.ts` lleva a la pantalla correcta al hacer clic. Lo que ya se ha enviado se guarda en `%APPDATA%\Mi Estudio\mi-estudio-avisos.json`, fuera de las copias de seguridad.
- `src/preload/index.ts`: lo único que ve el renderer del proceso main (`window.api`).
- `src/renderer/src/`: React. Las pantallas van en `features/`, el estado en `store/` (zustand), la lógica pura en `lib/` y los componentes comunes (botón, diálogo, campo) en `components/`.
- Agenda: `features/agenda/WeekGrid.tsx` es la cuadrícula semanal que usan tanto la vista como el editor del horario. Los colores de las asignaturas están en `subjectStyles.ts`.
- Tareas: `features/tasks/ItemDialog.tsx` es el único formulario de elementos. Se abre desde cualquier pantalla con `useItemDialogStore` (`openNew` / `openEdit`).
- `docs/ejemplo-horario.json`: un horario de ejemplo para probar. Se carga con Ajustes → Importar copia, que reemplaza los datos.
- Los datos se guardan en `%APPDATA%\Mi Estudio\mi-estudio-data.json`.

## Convenciones
- Háblame en castellano.
- El código (variables, funciones, archivos) va en inglés.
- Los textos de la interfaz van siempre en los archivos de `src/shared/locales/` (`es`, `en` y `zh-CN`), nunca escritos directamente en los componentes. Si falta una clave en `en` o `zh-CN`, el typecheck falla.
- Todo lo que dependa de Electron va detrás de `src/renderer/src/platform/`, para poder pasar a Capacitor sin tocar la interfaz.
- Cualquier dato que llegue del renderer por IPC se valida en main antes de guardarlo.
- Los diálogos usan `components/Dialog.tsx`. El primer campo lleva `data-autofocus`, no `autoFocus`. Dale al diálogo una `key` que cambie en cada apertura, para que siempre empiece de cero.
- Los colores de los botones van en las variantes de `Button`. No los sobrescribas con `className`, porque las clases de Tailwind chocan.
