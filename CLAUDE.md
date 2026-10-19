# Mi Estudio

App de estudio de escritorio (Electron + React + TypeScript). Más adelante habrá una versión móvil con Capacitor.

- La especificación completa está en `docs/especificacion.md`. Síguela y, si algo no encaja, pregúntame antes de cambiarla.
- Trabajamos por fases (sección 8 de la especificación). Al acabar cada fase:
  1. explica qué has hecho y cómo probarlo,
  2. actualiza la línea "Fase actual" de este archivo,
  3. espera a que te confirme antes de seguir.
- **Fase actual: 1 — Base** (hecha, pendiente de que la confirme). La siguiente es la 2 — Horario y Agenda.

## Comandos
- `npm run dev`: abre la app en modo desarrollo (F12 abre las DevTools).
- `npm run typecheck` y `npm run lint`: comprobar tipos y estilo. Pásalos antes de dar una fase por acabada.
- `npm run build:win`: genera el instalador de Windows.

## Dónde está cada cosa
- `src/shared/`: tipos de datos, canales IPC (`api.ts`), validación y traducciones (`locales/`). Lo usan tanto main como renderer.
- `src/main/`: ventana, bandeja y datos (`data/`: `dataStore.ts` guarda el JSON, los repos acceden a él y `backup.ts` exporta e importa).
- `src/preload/index.ts`: lo único que ve el renderer del proceso main (`window.api`).
- `src/renderer/src/`: React. Las pantallas van en `features/` y el estado en `store/` (zustand).
- Los datos se guardan en `%APPDATA%\Mi Estudio\mi-estudio-data.json`.

## Convenciones
- Háblame en castellano.
- El código (variables, funciones, archivos) va en inglés.
- Los textos de la interfaz van siempre en los archivos de `src/shared/locales/` (`es`, `en` y `zh-CN`), nunca escritos directamente en los componentes. Si falta una clave en `en` o `zh-CN`, el typecheck falla.
- Todo lo que dependa de Electron va detrás de `src/renderer/src/platform/`, para poder pasar a Capacitor sin tocar la interfaz.
- Cualquier dato que llegue del renderer por IPC se valida en main antes de guardarlo.
