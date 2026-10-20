# Mi Estudio

App de estudio de escritorio (Electron + React + TypeScript). Más adelante habrá una versión móvil con Capacitor.

El proyecto vive en esta carpeta (`Mi Estudio`, con el repositorio git). Al lado, en `..\exe`, se guarda el instalador para el usuario.

- La especificación completa está en `docs/especificacion.md`. Síguela y, si algo no encaja, pregúntame antes de cambiarla.
- Trabajamos por fases (sección 8 de la especificación). Al acabar cada fase:
  1. explica qué has hecho y cómo probarlo,
  2. actualiza la línea "Fase actual" de este archivo,
  3. espera a que te confirme antes de seguir.
- **Fase actual: 8 — Pulido y paquete** (hecha, pendiente de que la confirme). Es la última fase de la especificación.
- Pendiente de probar con la app instalada (solo ella se registra en Windows), juntos:
  - el botón «Hecho» de un aviso de tarea con retraso;
  - «Arrancar con Windows» (arranca escondida en la bandeja);
  - Spotify con la cuenta real: el usuario crea su app en el panel de desarrollador (Web API, Redirect URI `http://127.0.0.1:43821/callback`), pone el Client ID en Ajustes y conecta. Hasta ahora solo se ha probado contra un Spotify falso.

## Comandos
- `npm run dev`: abre la app en modo desarrollo (F12 abre las DevTools).
- `npm test`: tests de Vitest (`*.test.ts` junto al código) para la lógica que no necesita Electron.
- `npm run typecheck`, `npm run lint` y `npm test`: pásalos antes de dar una fase por acabada.
- `npm run build:win`: genera el instalador de Windows en `dist/mi-estudio-<versión>-setup.exe` y la app sin instalar en `dist/win-unpacked/mi-estudio.exe`. No está firmado, así que SmartScreen avisa al instalarlo. Después, copia el instalador nuevo a `..\exe` (y borra el de la versión anterior si cambia el número).
- `npm run icons`: vuelve a dibujar los iconos (`build/` y `resources/`) a partir del SVG de `scripts/make-icons.cjs`.
- Para probar sin tocar los datos reales, lanza la app con otra carpeta de datos: `MI_ESTUDIO_DATA_DIR=<carpeta>`. Usa una ruta corta: si la ruta es larga, Windows no deja crear los archivos de Chromium y la app se cierra al arrancar. Una ejecución con esta variable cuenta como prueba (`isTestRun`) y no registra nada en Windows, ni siquiera desde `dist/win-unpacked`.
- Para probar Spotify sin una cuenta real: `MI_ESTUDIO_SPOTIFY_ACCOUNTS` y `MI_ESTUDIO_SPOTIFY_API` apuntan la app a un Spotify falso. Solo funcionan en desarrollo; la app instalada los ignora.

## Dónde está cada cosa
- `src/shared/`: tipos de datos, canales IPC (`api.ts`), validación y traducciones (`locales/`). Lo usan tanto main como renderer.
- `src/main/`: ventana, bandeja y datos (`data/`: `dataStore.ts` guarda el JSON, los repos acceden a él y `backup.ts` exporta e importa).
- `src/shared/schedule.ts`: horas y solapes del horario, y la clase actual y la siguiente. Los repos de main lo usan para no guardar clases solapadas.
- `src/shared/items.ts`: qué va con retraso (solo deberes y trabajos; los exámenes y eventos pasados no), qué vence hoy o mañana y los próximos exámenes.
- Temporizador de estudio: la lógica pura está en `src/shared/studyTimer.ts` (con tests) y vive en main (`src/main/studyTimer.ts`), porque Chromium frena los relojes de las ventanas escondidas. La pantalla recibe el estado por IPC (`onStudyState`) y la campanita suena con `onStudyPhase` (`lib/chime.ts`, Web Audio, sin archivos de sonido). Mientras se estudia, `planNotifications` recibe `studying = true` y no envía nada.
- 20-20-20: la lógica pura está en `src/shared/eyeBreak.ts` (con tests): suma el tiempo de uso, lo reinicia por inactividad o en un descanso de estudio, y gestiona las pausas. `src/main/eyeBreak.ts` la ejecuta cada 10 s y abre una ventana oscura por monitor, que carga la misma app React con `#eye-break` (`features/eyeBreak/EyeBreakOverlay.tsx`). `src/main/fullscreen.ts` pregunta a Windows con PowerShell (`SHQueryUserNotificationState`) si hay un juego o una presentación a pantalla completa; si la hay, lo intenta a los 2 min.
- Spotify: la app controla el Spotify oficial con la Web API (Spotify Connect); no reproduce nada. El login es PKCE con un servidor temporal en `127.0.0.1:43821/callback`, que tiene que coincidir con la Redirect URI del panel de Spotify. Los tokens viven solo en main (`src/main/spotify/`) y la sesión se guarda cifrada con `safeStorage` en `mi-estudio-spotify.bin`, fuera de las copias de seguridad. Las respuestas de la API se leen en `src/shared/spotify.ts` (con tests), junto con la decisión de pausar o reanudar la música con el temporizador (`studyMusicAction`). El panel está en `features/study/SpotifyPanel.tsx`.
- Contenido de Estudio: los consejos (`study.tips`, 20) y las técnicas (`study.techniques.items`) están en `src/shared/locales/`. Si cambias el número de consejos, actualiza `TIP_COUNT` en `store/studyStore.ts`.
- Avisos: `src/shared/notifications.ts` (`planNotifications`) decide qué toca enviar. Es una función pura con tests. `src/main/notifier.ts` la ejecuta cada minuto y muestra los avisos, `src/main/notificationText.ts` escribe sus textos y `src/main/navigation.ts` lleva a la pantalla correcta al hacer clic. Lo que ya se ha enviado se guarda en `%APPDATA%\Mi Estudio\mi-estudio-avisos.json`, fuera de las copias de seguridad.
- Avisos con botón «Hecho»: en la app instalada, `src/main/toastXml.ts` escribe el aviso de Windows con enlaces `miestudio://` (`src/shared/appUrl.ts` los crea y los lee). Windows abre el enlace con la app: si ya está abierta, llega por `second-instance`; si no, por `process.argv`. `src/main/startup.ts` decide si se puede registrar algo en Windows (`mayRegister`: app instalada y no es prueba). En desarrollo los avisos son los simples (título y texto) y el clic navega con `navigation.ts`.
- Instalador: `electron-builder.yml` (NSIS de un clic, solo para el usuario, sin permisos de administrador). Al desinstalar se conservan los datos y `build/installer.nsh` borra el protocolo y el arranque con Windows.
- `src/preload/index.ts`: lo único que ve el renderer del proceso main (`window.api`).
- `src/renderer/src/`: React. Las pantallas van en `features/`, el estado en `store/` (zustand), la lógica pura en `lib/` y los componentes comunes (botón, diálogo, campo) en `components/`.
- Agenda: `features/agenda/WeekGrid.tsx` es la cuadrícula semanal que usan tanto la vista como el editor del horario. Los colores de las asignaturas están en `subjectStyles.ts`.
- Tareas: `features/tasks/ItemDialog.tsx` es el único formulario de elementos. Se abre desde cualquier pantalla con `useItemDialogStore` (`openNew` / `openEdit`).
- `docs/ejemplo-horario.json`: un horario de ejemplo para probar. Se carga con Ajustes → Importar copia, que reemplaza los datos.
- Los datos se guardan en `%APPDATA%\Mi Estudio\mi-estudio-data.json`.

## Convenciones
- Háblame en castellano.
- El código (variables, funciones, archivos) va en inglés.
- Los textos de la interfaz van siempre en los archivos de `src/shared/locales/` (`es`, `en` y `zh-CN`), nunca escritos directamente en los componentes. Si falta una clave en `en` o `zh-CN`, el typecheck falla, y `locales/keys.test.ts` comprueba que cada `t('...')` del código existe. En desarrollo, una clave que falta sale como aviso en la consola.
- Todo lo que dependa de Electron va detrás de `src/renderer/src/platform/`, para poder pasar a Capacitor sin tocar la interfaz.
- Cualquier dato que llegue del renderer por IPC se valida en main antes de guardarlo.
- Los diálogos usan `components/Dialog.tsx`. El primer campo lleva `data-autofocus`, no `autoFocus`. Dale al diálogo una `key` que cambie en cada apertura, para que siempre empiece de cero.
- Los colores de los botones van en las variantes de `Button`. No los sobrescribas con `className`, porque las clases de Tailwind chocan.
