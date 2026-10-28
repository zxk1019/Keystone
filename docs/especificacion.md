# Prompt: app de estudio "Keystone"

Quiero que construyas conmigo una app de escritorio para estudiantes llamada **Keystone** (hasta la versión 1.3.0 se llamaba **Mi Estudio**). Primero será para **Windows**. Más adelante la pasaré al móvil con **Capacitor**, así que la arquitectura tiene que dejarlo preparado desde el principio.

La app tiene cuatro partes:
1. **Agenda**: mi horario del cole, deberes, exámenes, trabajos y eventos.
2. **Avisos**: notificaciones de lo que tengo pendiente y aún no he hecho.
3. **Hábitos**: marcar cada día si he cumplido un hábito, con la racha y el récord.
4. **Zona de estudio**: temporizador (20-20-20 con ordenador, 45 + 5 sin él o a mi gusto), música de Spotify, la regla 20-20-20 y técnicas para estudiar mejor.

Trabaja **por fases** (están al final). Al terminar cada fase, explícame brevemente qué has hecho y cómo lo pruebo, y espera a que te confirme antes de seguir. Si algo no está claro, pregúntame antes de decidirlo tú.

---

## 1. Tecnología y arquitectura

- **Electron + React + TypeScript + Vite**. Usa `electron-vite` o una plantilla equivalente.
- Estilos con **Tailwind CSS**, con modo claro y oscuro.
- Iconos con `lucide-react`, fechas con `date-fns`, estado con `zustand`.
- Idiomas con `react-i18next`.
- Calendario con **FullCalendar** (solo los plugins gratuitos `daygrid`, `timegrid` e `interaction`), o una cuadrícula propia si sale más simple.
- Instalador para Windows con **electron-builder** (NSIS).

**Seguridad de Electron:**
- `contextIsolation: true`, `nodeIntegration: false` y `sandbox: true`.
- El renderer solo habla con el proceso main a través de una API tipada expuesta en el `preload` (`window.api`).

**Estructura:**
```
src/
  main/          Electron: ventana, bandeja, datos, notificaciones,
                 20-20-20, login de Spotify
  preload/       puente seguro main <-> renderer
  shared/        lo que usan main y renderer: tipos, canales IPC,
                 validación y traducciones (locales/es, en, zh-CN)
  renderer/src/  React
    features/    today/, agenda/, tasks/, habits/, study/, settings/
    i18n/        configuración de react-i18next
    platform/    interfaz que abstrae lo específico de Electron
```

Las traducciones están en `shared/` y no en `renderer/` porque el proceso main también las necesita (menú de la bandeja, diálogos y avisos).

**Pensando en Capacitor:** todo lo que depende de la plataforma va detrás de una interfaz en `renderer/platform/`. Eso incluye guardar datos, notificaciones, abrir enlaces y la pantalla del 20-20-20. Así, en la versión móvil solo cambio la implementación y no la interfaz de React.

**Datos:**
- **En local**, en un archivo JSON gestionado desde el proceso main (`src/main/data/dataStore.ts`, sin dependencias externas). Tiene que estar en main porque los avisos tienen que funcionar con la ventana cerrada. La app funciona entera sin cuenta y sin internet.
- Accede a los datos a través de una capa de repositorio (`TasksRepo`, `ScheduleRepo`...).
- **Sincronización opcional** entre el PC y el móvil con una cuenta en el propio proyecto de Firebase del usuario (ver sección 9).
- Pon una opción de **exportar e importar** una copia de seguridad en JSON.

**Comportamiento como app de escritorio:**
- Una sola instancia (`requestSingleInstanceLock`).
- Al cerrar la ventana se esconde en la **bandeja del sistema** y la app sigue funcionando. Para salir del todo se usa "Salir" en el menú de la bandeja.
- Opción en Ajustes para **arrancar con Windows** (`app.setLoginItemSettings`).
- Llama a `app.setAppUserModelId(...)` para que las notificaciones de Windows funcionen.

---

## 2. Diseño general

- **Tema claro y oscuro**, con tres opciones en Ajustes: Claro, Oscuro y Seguir el sistema (por defecto).
- **Idiomas**: castellano (por defecto), inglés y chino simplificado (`zh-CN`), que se eligen en Ajustes. Fechas y horas con el formato del idioma elegido.
- **Nombre e icono**: Keystone, la piedra clave que cierra un arco, con una K. El icono es la piedra blanca con la K recortada sobre un cuadrado morado; en la barra lateral, la misma piedra en morado.
- **Barra lateral fija a la izquierda** con el icono y el nombre de la app arriba y estas secciones:
  `Hoy` · `Agenda` · `Tareas` · `Hábitos` · `Estudio` · y `Ajustes` abajo del todo.
- Cada **asignatura tiene un color**, y ese color se usa en el horario, las tareas y los exámenes.
- Diseño limpio y con espacio. Aunque es para PC, las vistas deben adaptarse a pantallas estrechas para que pasarlo al móvil sea fácil.

```
+------------+------------------------------+
| KEYSTONE   |                              |
|            |                              |
| > Hoy      |                              |
|   Agenda   |      contenido de la         |
|   Tareas   |      sección elegida         |
|   Hábitos  |                              |
|   Estudio  |                              |
|            |                              |
|   Ajustes  |                              |
+------------+------------------------------+
```

---

## 3. Modelo de datos (orientativo)

- **Asignatura**: id, nombre, color.
- **Clase del horario**: id, asignaturaId, día de la semana (1-7), hora de inicio y de fin, aula (opcional). **Se repite igual todas las semanas.** Además, franjas sin asignatura, como el patio o el comedor.
- **Elemento de agenda**: id, tipo, título, asignaturaId (opcional en eventos personales), fecha (y hora opcional), **prioridad** (alta, media o baja), hecho (sí/no), fecha en que se completó. Los tipos son:
  - `deberes`
  - `examen`, con un campo opcional "temas que entran"
  - `trabajo`, para trabajos y proyectos
  - `evento`, para eventos personales, con hora de inicio y de fin
- **Hábito**: id, nombre, color, días de la semana que toca (1-7, al menos uno) y el día en que se creó.
- **Marca de un hábito**: hábito, fecha y estado (`cumplido` o `no cumplido`). El id es `<hábitoId>/<fecha>`, así un mismo día siempre es el mismo registro. Los días sin marcar no tienen entrada.
- **Ajustes**: tema, idioma, configuración de avisos, tiempos del modo Personalizado, modo del temporizador (de cada dispositivo), 20-20-20, Spotify y el proyecto de Firebase para sincronizar.
- **Registro de cambios** (para sincronizar): cuándo cambió por última vez cada registro, también los borrados, y qué cambios faltan por subir a la nube.

---

## 4. Pantallas

### 4.1 Hoy (pantalla inicial)
- **Clases de hoy**, en orden, marcando la que está en curso y la siguiente. Los fines de semana, un mensaje de que no hay clase.
- **Pendientes urgentes**: lo que vence hoy o mañana y lo que **va con retraso** (deberes y trabajos con la fecha pasada y sin marcar; los exámenes y eventos pasados simplemente quedan atrás), ordenado por fecha y prioridad. Se pueden marcar como hechos desde aquí.
- **Próximos exámenes**, con una cuenta atrás ("faltan 5 días").

### 4.2 Agenda
- **Vista principal: horario semanal**, una cuadrícula de lunes a viernes por horas, con las clases en el color de su asignatura. Encima de cada día se ven los deberes, exámenes, trabajos y eventos de ese día.
- Un botón cambia a la **vista mensual**, que marca con un punto de color los días con exámenes o entregas.
- Para moverse: semana o mes anterior, siguiente y "Hoy".
- Al hacer clic en un día o en un hueco se puede crear un elemento con esa fecha.
- Hay un modo **"Editar horario"** para crear asignaturas (nombre y color) y montar el horario semanal fijo.

### 4.3 Tareas
- Una lista de todos los elementos con **filtros** por estado (pendientes, hechas o con retraso), tipo y asignatura.
- Se ordena por fecha y prioridad.
- Formulario para crear y editar: tipo, título, asignatura, fecha y hora, prioridad y, en los exámenes, temas.
- Marcar como hecho con un clic. Borrar pidiendo confirmación.

### 4.4 Hábitos
- **Crear un hábito**: nombre, color y qué días toca (por defecto todos). Se edita al hacer clic en su nombre y se borra pidiendo confirmación (se borran también sus marcas).
- **Vista semana** (la principal): una fila por hábito y una columna por día, de lunes a domingo. Cada clic en un día cambia la marca: vacío → **✓ verde** (cumplido) → **✗ roja** (no cumplido) → vacío.
- **Vista mes**: se elige un hábito y se ve el mes entero con su ✓ o ✗ en cada día, y cuántos de cada hay ese mes.
- Para moverse: semana o mes anterior, siguiente y "Hoy". Los días futuros y los que no toca salen apagados y no se pueden marcar.
- **Racha y récord** de cada hábito: la racha son los días que toca seguidos con ✓ hasta hoy; el récord, la racha más larga que ha tenido. Una ✗ o un día pasado sin marcar cortan la racha; hoy sin marcar no (hay tiempo hasta medianoche). Los días que no toca ni cuentan ni cortan. Se cuenta desde el día en que se creó el hábito, o desde el primer día marcado si se rellenan días de antes.
- No tiene avisos.

### 4.5 Estudio
- **Temporizador** con tres modos, que se eligen encima del temporizador y solo con él parado:
  - **Con ordenador (20-20-20)**: 20 minutos de estudio y 20 segundos mirando algo a 6 metros; después el siguiente bloque empieza solo. La música no se pausa en esos 20 segundos, y mientras va este modo no sale la pantalla oscura del 20-20-20.
  - **Sin ordenador**: 45 minutos de estudio y 5 de descanso.
  - **Personalizado**: los minutos de estudio y de descanso que yo ponga.
  Por defecto el PC usa «Con ordenador» y el móvil «Sin ordenador»; cada dispositivo recuerda su modo. Botones de empezar, pausa, saltar fase y reiniciar. Suena un sonido suave al cambiar de fase.
- **Spotify** (ver sección 6): conectar la cuenta, ver la canción que suena, play/pausa, anterior/siguiente, volumen y elegir la playlist de estudio. La música se pausa sola en el descanso y vuelve al estudiar; esto se puede desactivar.
- Una subsección **"Técnicas de estudio"** con fichas que explican, en breve, qué es cada técnica, cómo se hace y cuándo usarla: recuperación activa, repaso espaciado, técnica Feynman, práctica intercalada, autoexplicación, mapas mentales y Pomodoro. El texto está en los tres idiomas.
- Un indicador de cuánto falta para el próximo descanso 20-20-20.

### 4.6 Ajustes
- Tema e idioma.
- Asignaturas y horario (o un enlace al modo editar de la Agenda).
- Avisos y horas de silencio (ver sección 5).
- 20-20-20: activado o no, intervalo (20 min), duración (20 s) y pausa por inactividad.
- Spotify: conectar o desconectar y playlist por defecto.
- Arrancar con Windows.
- Sincronización: proyecto de Firebase, iniciar sesión o crear la cuenta, estado y «Sincronizar ahora» (ver sección 9).
- Exportar e importar datos.

---

## 5. Avisos (notificaciones de Windows)

Un **planificador en el proceso main** revisa cada minuto qué avisos tocan. Funciona aunque la ventana esté cerrada, siempre que la app esté en la bandeja.

- **Resumen diario** a una hora configurable (por defecto **17:00**) con lo que tengo pendiente para hoy y mañana y lo que va con retraso.
- **Tareas con retraso** (deberes y trabajos): si pasa la fecha y no está marcada como hecha, **avisa y repite cada 2 horas** (configurable) **hasta que la marque como hecha**.
- **Exámenes**: avisos **7, 3 y 1 días antes** (configurable) para empezar a estudiar con tiempo.
- **Silencio al estudiar**: durante el tiempo de estudio no sale ningún aviso de tareas. Se guardan y se muestran juntos en el siguiente descanso o al terminar la sesión.
- **Horas de silencio** configurables (por defecto de 22:00 a 8:00), en las que no se repite nada.
- Al hacer clic en la notificación se abre la app en ese elemento. Si en Windows es viable con `toastXml`, añade también un botón "Marcar como hecho". Solo funcionará en la app instalada, porque necesita registrar el protocolo `miestudio://`; se hace en la fase 8.
- Guarda qué avisos ya se han enviado para no repetirlos al reiniciar la app.

---

## 6. Spotify (tengo Premium)

La app **controla mi Spotify** a través de la **Web API** (Spotify Connect). La música suena en la app oficial de Spotify (escritorio o móvil). **No uses el Web Playback SDK**, porque en Electron necesita Widevine.

- Login con **Authorization Code + PKCE**, sin client secret. Yo crearé una app en el Spotify Developer Dashboard y te daré el **Client ID**. Dime exactamente qué tengo que configurar allí.
- La redirect URI tiene que ser de loopback con IP, por ejemplo `http://127.0.0.1:8888/callback` (Spotify no acepta `localhost`). El main abre un pequeño servidor temporal para recibir el código.
- Scopes: `user-read-playback-state`, `user-modify-playback-state`, `user-read-currently-playing`, `playlist-read-private`, `playlist-read-collaborative`.
- Guarda el refresh token cifrado con `safeStorage` de Electron y renueva el access token automáticamente.
- Funciones: canción actual con portada, play/pausa, anterior/siguiente, volumen, elegir una de mis playlists y pausar/reanudar con el temporizador.
- **Si no hay ningún dispositivo activo**, muestra la lista de dispositivos para elegir uno, o un botón que abre la app de Spotify (`spotify:`).
- Muestra los errores claramente (sesión caducada, sin dispositivo, sin Premium) y no rompas la pantalla de Estudio si Spotify falla.

---

## 7. Regla 20-20-20 (siempre que use el PC)

Cada 20 minutos de uso del ordenador hay que mirar algo a unos 6 metros durante 20 segundos. **Funciona siempre que la app está abierta o en la bandeja**, no solo durante las sesiones de estudio.

- Contador en el proceso main. Si el ordenador lleva más de 5 minutos inactivo (`powerMonitor.getSystemIdleTime()`) o se bloquea o suspende, el contador se reinicia porque ya he descansado la vista.
- Al llegar a los 20 minutos: **pantalla completa en todos los monitores**. Es una ventana sin marco y siempre encima (`alwaysOnTop` con nivel `screen-saver`) con fondo oscuro, el texto "Mira algo lejano (a unos 6 m)" y una **cuenta atrás de 20 segundos** grande. Tiene un botón **"Saltar"**. Al terminar suena un sonido suave y se cierra sola.

```
+-------------------------------------------+
|                                           |
|      Mira algo lejano (a unos 6 m)        |
|                                           |
|                   17                      |
|                                           |
|               [ Saltar ]                  |
|                                           |
+-------------------------------------------+
```

- **Con el temporizador de estudio**: el descanso del temporizador reinicia el contador del 20-20-20. Si faltan menos de 2 minutos para el descanso del temporizador, el 20-20-20 no salta. Con el temporizador en marcha en el modo «Con ordenador», la pantalla oscura no sale, porque el propio temporizador ya avisa cada 20 minutos.
- **Menú de la bandeja** para pausar el 20-20-20 durante 30 minutos, 1 hora o hasta reiniciar (para cuando juego, veo una peli o hago una presentación), y para reanudarlo.
- En Ajustes: activarlo o no, intervalo, duración y umbral de inactividad.

---

## 8. Fases de desarrollo

1. **Base**: proyecto Electron + React + TS + Tailwind, barra lateral con las 5 secciones vacías, tema claro y oscuro, i18n con los 3 idiomas, bandeja del sistema, instancia única y la capa de datos con exportar/importar.
2. **Horario y Agenda**: asignaturas con color, editor del horario semanal, vista semanal y vista mensual.
3. **Tareas y Hoy**: crear, editar, borrar y marcar elementos de los 4 tipos, la pantalla Tareas con filtros y la pantalla Hoy.
4. **Avisos**: planificador en main, resumen diario, retrasos que se repiten, avisos de examen, horas de silencio, clic que abre el elemento y arrancar con Windows.
5. **Estudio**: temporizador de 45 y 5 minutos, silenciar avisos durante el estudio, consejo al azar y guía de técnicas.
6. **20-20-20**: contador con inactividad, pantalla completa en todos los monitores, coordinación con el temporizador y pausa desde la bandeja.
7. **Spotify**: login PKCE, controles, playlists, dispositivos y pausa automática en los descansos.
8. **Pulido y paquete**: revisar las traducciones, los estados vacíos y los errores, y generar el instalador `.exe` con electron-builder.
9. **Sincronización**: datos con registro de cambios, cuenta de Firebase, subir y bajar cambios, Ajustes → Sincronización y pruebas con el emulador de Firebase (ver sección 9).
10. **App Android con Capacitor**: reutiliza el renderer de React y cambia las implementaciones de `platform/` (datos, avisos y sincronización en el móvil). Los servicios con estado (datos, sincronización, temporizador) pasan a `src/core/` para funcionar en los dos. Avisan los dos dispositivos. En el móvil no hay 20-20-20 ni bandeja, y Spotify solo se abre (con la playlist de estudio si se ha puesto su enlace).
11. **Hábitos y modos de estudio**: sección Hábitos (vista semana y mes, ✓ y ✗, racha y récord, sincronizada), modos del temporizador (20-20-20, 45 + 5 y personalizado) y quitar los consejos.
12. **Nuevo nombre: Keystone**: nombre e icono nuevos en el PC, el móvil, el instalador y los textos. Por dentro se quedan los nombres de antes (el id `com.miestudio.app`, la carpeta de datos `%APPDATA%\Mi Estudio`, el programa `mi-estudio.exe`, los archivos `mi-estudio-*` y los enlaces `miestudio://`), para que la versión nueva se instale encima y no se pierda nada.
13. **Publicar en GitHub**: README con cómo instalarla y configurar Firebase y Spotify, licencia, quitar datos personales del repositorio, actualizaciones automáticas y Releases con el instalador del PC y el APK.

---

## 9. Sincronización entre el PC y el móvil

- **Opcional.** Sin cuenta, la app funciona igual que antes. Sin internet también: los cambios se guardan y se suben al volver la conexión.
- **Dónde:** en el propio proyecto de Firebase del usuario (plan gratuito Spark), que no se pausa aunque no se use. Firebase Auth con **correo y contraseña** y una base de datos Firestore. La API key y el ID del proyecto se ponen en Ajustes; no son secretos.
- **Sin SDK:** la app habla con Firebase por su API REST con `fetch` (`src/shared/firebase.ts`), para que el mismo código sirva en el móvil.
- **Qué se sincroniza:** asignaturas, horario, tareas, exámenes, trabajos y eventos, hábitos y sus marcas, y los ajustes de idioma, avisos y tiempos del modo Personalizado. **No** se sincronizan el tema, el modo del temporizador, el 20-20-20, Spotify ni «Arrancar con Windows», que son de cada dispositivo.
- **Conflictos:** cada registro guarda cuándo cambió por última vez y gana el último cambio. Lo que se borra deja una marca de borrado para que no reaparezca. Si un dispositivo deja una clase o una tarea apuntando a una asignatura que el otro borró, se limpia igual que al borrar una asignatura; las marcas de un hábito borrado se borran.
- **Cuándo:** al abrir la app, unos segundos después de cada cambio, al volver a la ventana y cada 5 minutos. Sin conexión lo vuelve a intentar cada minuto.
- **Primera vez:** al iniciar sesión, la app une lo que tiene el dispositivo con lo que hay en la nube, sin borrar nada. Los ajustes que nunca se han tocado no pisan los de la nube.
- **Seguridad:** las reglas de Firestore (`firebase/firestore.rules`) solo dejan a cada usuario leer y escribir lo suyo, y no dejan que una versión más vieja pise a una más nueva. La contraseña no se guarda; la sesión se guarda cifrada en `mi-estudio-sync.bin`, fuera de las copias de seguridad.
- **Importar una copia** reemplaza los datos también en los otros dispositivos.
- **Datos versión 2:** el archivo de la versión 1 se convierte solo al abrir la app, y antes se guarda una copia en `mi-estudio-data.v1.json`.
- **Datos versión 3 (hábitos):** el archivo de la versión 2 se convierte solo y se guarda una copia en `mi-estudio-data.v2.json`. Al convertirlo, la siguiente sincronización vuelve a bajar todo, para recoger los hábitos que el otro dispositivo creó mientras este tenía la versión vieja (la versión vieja ignora los hábitos que le llegan).
