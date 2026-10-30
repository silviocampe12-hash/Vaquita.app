# Vaquita.app

Vaquita.app es una aplicación web para crear grupos de gastos compartidos, registrar movimientos, calcular saldos y compartir un grupo con otras personas mediante un enlace privado.

El proyecto actual está orientado a un flujo de uso muy simple: el usuario crea un grupo en el navegador, agrega miembros, registra gastos y obtiene automáticamente un resumen de quién debe a quién. La sincronización con Supabase es opcional y se activa cuando el grupo tiene un enlace compartido.

## Estado del proyecto

Este repositorio contiene una implementación funcional en HTML, CSS y JavaScript puro, con un backend mínimo basado en Supabase Edge Functions para manejar grupos privados y enlaces temporales. La documentación de este README refleja la implementación que existe en el código actual, no una arquitectura hipotética.

## Objetivo

La app facilita la división de gastos en grupos pequeños, por ejemplo:

- cenas o reuniones compartidas
- gastos del hogar
- viajes con varios participantes
- compras grupales con reparto de costos

La aplicación no procesa pagos ni integra transferencias reales; solo calcula saldos orientativos para que cada integrante conozca cuánto debe le queda a quién.

## Características implementadas

- creación de grupos y edición de nombre
- agregado y eliminación de miembros
- carga de gastos con método manual o por ítems
- cálculo automático de balances y deudas
- copia de resumen para WhatsApp o alias de transferencia
- almacenamiento local del grupo en localStorage
- sincronización con Supabase usando enlaces privados
- validación y hash del token compartido
- OCR de tickets mediante Tesseract.js
- selección de zona del ticket y lectura de nombres y precios
- acceso a cámara y selección de fotos desde galería
- modo PWA con manifest, iconos y favicon
- páginas legales de privacidad y términos

## Tecnologías utilizadas

- HTML5
- CSS3 con diseño responsive
- JavaScript vanilla
- Supabase
- Supabase Edge Functions con Deno
- Tesseract.js para OCR
- PWA manifest
- Netlify para publicación estática

## Estructura del proyecto

```text
.
├── README.md
├── index.html
├── privacidad.html
├── terminos.html
├── manifest.json
├── css/
│   └── style.css
├── img/
│   ├── logo.png
│   ├── camara-de-fotos.png
│   ├── subir.png
│   ├── imgfavicon.png
│   ├── imgapple-touch-icon.png
│   ├── imgicon-192.png
│   ├── imgicon-512.png
├── js/
│   └── app.js
├── supabase/
│   ├── config.toml
│   ├── .temp/
│   ├── functions/
│   │   └── groups/
│   │       └── index.ts
│   └── migrations/
│       └── 20261029000000_private_link_groups.sql
└── main[200~Delta
```

### Función de cada archivo importante

- [index.html](index.html): página principal de la app. Carga CSS, manifest, favicon, iconos y termina con el contenedor principal donde se renderiza la UI desde JavaScript.
- [privacidad.html](privacidad.html): página legal de privacidad. Incluye texto de uso de Supabase, OCR y la advertencia de que no hay consentimiento de anuncios todavía.
- [terminos.html](terminos.html): términos básicos del servicio.
- [manifest.json](manifest.json): configuración de PWA. Define nombre, color, start_url, display y iconos.
- [css/style.css](css/style.css): estilos principales, tema claro/oscuro, adaptabilidad y componentes UI de la aplicación.
- [js/app.js](js/app.js): lógica principal de la app: estado local, grupos, gastos, balances, enlace compartido, OCR, cámara, lectura de tickets, sincronización y UI.
- [supabase/config.toml](supabase/config.toml): configuración del proyecto local para la CLI de Supabase.
- [supabase/functions/groups/index.ts](supabase/functions/groups/index.ts): Edge Function que toma la acción del navegador, valida el token y opera sobre la tabla privada.
- [supabase/migrations/20261029000000_private_link_groups.sql](supabase/migrations/20261029000000_private_link_groups.sql): crea la tabla `public.vaquita_groups`, activa RLS y revoca permisos de los roles públicos.
- [img](img): activos visuales de la app: logo, iconos, botones de cámara y de subida.

> Nota: hay un archivo extraño en la raíz llamado `main[200~Delta` con tamaño 0 y sin función aparente. No forma parte de la lógica de la app ni de la documentación funcional; no se le asigna comportamiento ni se recomienda usarlo.

## Requisitos

Para correr el proyecto localmente solo necesitas:

- un navegador moderno
- acceso a `localhost` o HTTPS para probar cámara y algunas APIs del navegador
- una cuenta de Supabase y la CLI de Supabase si querés usar la sincronización remota
- conexión a Internet para cargar Tesseract.js desde CDN y la app de Supabase

## Instalación y ejecución local

1. Cloná el repositorio.
2. Entrá a la carpeta del proyecto.
3. Abrí `index.html` en un navegador o levantá un servidor local simple si necesitás HTTPS.

Ejemplo mínimo de servidor local:

```bash
cd /ruta/al/proyecto
python3 -m http.server 8000
```

Luego abrí:

```text
http://localhost:8000/
```

> La app usa `localStorage` y funciones del navegador que pueden requerir un contexto seguro para cámara, acceso a archivo y OCR. En algunos navegadores, la cámara y algunas APIs funcionan mejor en `localhost` o en HTTPS.

## Configuración de Supabase

La versión actual de la app usa Supabase para sincronizar grupos privados por enlace. El flujo esencial es:

- el navegador crea un token aleatorio de seguridad
- el navegador envía ese token a la Edge Function
- la función guarda el hash del token en la base de datos
- la app nunca guarda el token original en texto plano en la tabla
- el grupo se recupera por `token_hash` y no por un identificador público

### Variables del navegador

En [js/app.js](js/app.js) se configuran estas variables:

- `SB_URL`: URL del proyecto de Supabase, por ejemplo `https://deyeykygcdlaljfxdsqq.supabase.co`
- `SB_KEY`: clave pública `anon` del proyecto

Estas son variables del cliente y deben ser visibles en el navegador. Su seguridad depende de que la tabla privada no tenga permisos directos para `anon` o `authenticated`.

### Variables del servidor

La Edge Function usa estas variables de entorno en Supabase:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Estas variables deben quedar solo en el entorno seguro de Supabase y nunca en archivos públicos del frontend ni en el repositorio.

### Comandos reales recomendados

Ejecutá estos comandos desde la raíz del proyecto:

```bash
supabase login
```

- inicia sesión en la CLI de Supabase. Se usa antes de vincular el proyecto local con el proyecto remoto.

```bash
supabase link --project-ref deyeykygcdlaljfxdsqq
```

- vincula este repositorio con el proyecto de Supabase exacto. El valor `deyeykygcdlaljfxdsqq` coincide con el proyecto real configurado en [supabase/.temp/linked-project.json](supabase/.temp/linked-project.json).

```bash
supabase db push
```

- aplica las migraciones locales a la base de datos remota. Sirve para crear o actualizar el esquema de Supabase.

```bash
supabase functions deploy groups
```

- publica la Edge Function `groups` en Supabase. Debe ejecutarse después de configurar el proyecto y la base de datos.

> Antes de aplicar migraciones que alteren permisos, columnas o acciones de escritura, conviene hacer un backup y verificar los cambios en un entorno controlado.

## Migraciones y esquema

La migración principal es:

- [supabase/migrations/20261029000000_private_link_groups.sql](supabase/migrations/20261029000000_private_link_groups.sql)

Crea la tabla:

```sql
public.vaquita_groups
```

con estas columnas:

- `id` como clave primaria
- `token_hash` como texto único
- `data` como JSONB
- `created_at`
- `updated_at`

El script además hace esto:

- habilita Row Level Security (RLS)
- revoca todos los permisos para `public`, `anon` y `authenticated`
- otorga permisos a `service_role`
- elimina acceso directo a la tabla legacy `public.groups` si existe
- mantiene la estructura anterior sin borrarla físicamente

## Edge Function `groups`

La función está en:

- [supabase/functions/groups/index.ts](supabase/functions/groups/index.ts)

### Acciones soportadas

La función acepta estas acciones desde el navegador:

- `load`: devuelve el estado del grupo si el hash del token coincide
- `save`: crea o actualiza el registro del grupo asociado al hash
- `delete`: borra la fila del grupo asociado al token

### Validaciones implementadas

- tamaño máximo de payload
- patrones de ID y token
- validación de estructura del grupo
- límites de miembros y gastos
- validación de `id`, `name`, `members`, `expenses`, `del`
- bloqueo de datos inválidos
- validación de token con SHA-256

### Comportamiento de seguridad

La Edge Function no exige JWT ni sesión del usuario. La firma `verify_jwt = false` en [supabase/config.toml](supabase/config.toml) indica que la función se puede invocar sin autenticación. Esto es consistente con un esquema de enlace compartido, pero también implica que cualquier actor con acceso a la función puede intentar crear, cargar o borrar grupos si conoce un token válido.

## Arquitectura de grupos privados

La aplicación usa un modelo de enlace compartido, no una autenticación tradicional por cuenta.

### Cómo funciona

1. se crea un grupo localmente
2. se genera un token aleatorio seguro
3. el navegador guarda el token localmente como `shareToken`
4. la app calcula un hash SHA-256 del token
5. el hash se guarda en la columna `token_hash`
6. la app no persiste el token original en la base de datos
7. quien recibe el enlace puede abrirlo si el token coincide

### Ventajas

- no requiere autenticación de usuario
- funciona bien para grupos pequeños y temporales
- evita guardar el token en texto plano

### Limitaciones

- cualquier persona que reciba el enlace puede acceder al grupo
- la función no tiene CAPTCHA ni límite de creación por IP o usuario
- el abuse control es muy básico
- no hay auditoría de permisos por individuo

## Persistencia local y sincronización

La app usa `localStorage` con la clave `vq` para guardar grupos, integrantes, gastos y datos de sincronización. La operación se hace desde las funciones `local()`, `save()` y `push()`.

### Qué se guarda localmente

- nombre del grupo
- integrantes y alias
- gastos
- datos de división
- token compartido del grupo
- bandera `remote` cuando el grupo ya existe en Supabase

### Qué se sincroniza con Supabase

- `id`
- `name`
- `members`
- `expenses`
- `del`
- `updated_at` generado por la función

### Qué no se guarda en la base de datos

- el token original compartido
- información sensible que no forme parte del grupo

## Funcionamiento del OCR

La lectura de tickets se implementa en [js/app.js](js/app.js) con Tesseract.js cargado desde CDN:

- `loadT()` carga la librería
- `getW()` reutiliza un worker único de Tesseract
- `prep()` prepara la imagen para mejorar contraste y legibilidad
- `leerZonaTicket()` reconoce texto de una zona marcada por el usuario
- `extraerNombresTicket()` filtra nombres de productos
- `extraerPreciosTicket()` limpia y normaliza precios
- `combinar()` empareja nombre y precio por altura o orden

### Flujo del OCR

1. el usuario escoge una foto o usa la cámara
2. la app permite marcar la zona del ticket con nombres
3. marca la zona de precios
4. procesa ambas zonas por separado
5. combina nombre y precio por posición vertical
6. el usuario revisa los ítems y puede corregirlos antes de guardar

### Limitaciones conocidas

- la OCR depende de la legibilidad del ticket y del ángulo de la foto
- no hay aprendizaje ni validación semántica de productos
- la lógica intenta descartar el total del ticket cuando aparece en la lista
- la combinación final requiere revisión manual

## Cámara y procesamiento de tickets

La app incluye:

- acceso a cámara con `getUserMedia`
- foto desde galería
- zoom, desplazamiento y recorte de zona del ticket
- lectura de texto local en el navegador
- selección con dos pasos para productos y precios

No hay envío de fotos a Supabase ni almacenamiento por parte del servidor. La privacidad de la imagen queda en el navegador.

## PWA e instalación

La app cuenta con una configuración de PWA en [manifest.json](manifest.json):

- nombre: `Vaquita.app`
- short_name: `Vaquita`
- start_url: `/`
- scope: `/`
- display: `standalone`
- background_color: `#74ACDF`
- theme_color: `#74ACDF`
- iconos para 192 y 512 px

### Lo que sí existe

- manifest.json
- iconos para installable
- favicon y icono para iOS

### Lo que no existe en este repositorio

- service worker
- cache offline manual
- estrategia de caché estática
- registro de PWA con installability avanzada

Esto significa que la app es una PWA básica en términos de manifest, pero no una aplicación con cache offline ni "offline first" implementada.

## Iconos y recursos gráficos

La carpeta [img](img) contiene:

- `logo.png`
- `camara-de-fotos.png`
- `subir.png`
- `imgfavicon.png`
- `imgapple-touch-icon.png`
- `imgicon-192.png`
- `imgicon-512.png`

Estos activos se usan en la UI, PWA, Android/iOS y favicon de la web.

## Publicación en Netlify

No hay archivos de configuración de Netlify en el repositorio, como `netlify.toml`, `_redirects` ni políticas de caché. En la práctica, la app es un sitio estático y puede publicarse en Netlify simplemente subiendo la carpeta raíz del proyecto o conectando el repositorio.

Recomendaciones de despliegue:

- usar HTTPS forzado
- verificar que el manifest y los iconos carguen con rutas correctas
- revisar que `index.html` siga cargando CSS y JS desde rutas relativas
- confirmar que las rutas del favicon e iconos no rompan en producción

## Google AdSense

Hay script de Google AdSense insertado en:

- [index.html](index.html)
- [privacidad.html](privacidad.html)
- [terminos.html](terminos.html)

El código actual es:

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6028312102974841"
     crossorigin="anonymous"></script>
```

### Qué está y qué no está implementado

- Sí está el script del proveedor.
- No hay unidades de anuncio visibles en el código.
- No hay consentimiento específico para anuncios.
- No hay política de cookies o consentimiento de usuarios completamente aplicada.
- No hay evidencia de aprobación por parte de Google ni de configuración de anuncios activos.

> Esto debe tratarse como una integración de script presente, no como un sitio con anuncios aprobados ni publicitados.

## Seguridad y privacidad

### Correctamente protegido

- la tabla de grupos privados tiene RLS habilitado
- `anon` y `authenticated` quedan sin permisos
- `service_role` tiene acceso exclusivo en servidor
- el token no se almacena en texto plano
- la función calcula el hash del token y lo compara en la base de datos

### Parcialmente protegido

- la API es pública porque `verify_jwt = false`
- no está implementado un control de abuso por IP, usuario o rate limiting
- no hay CAPTCHA ni límites de creación de grupos
- el link compartido funciona como contraseña, por lo que es sensible a difusión accidental

### Riesgos reales identificados

- cualquier persona con el enlace puede ver y editar el grupo
- el script del navegador expone la `anon` key en el cliente
- la app no tiene bloqueo por sesión ni por identidad de usuario
- la creación de grupos y el acceso a la función no tienen control antifraude

### Recomendaciones de seguridad futuras

- incorporar CAPTCHA o validación anti-bot
- limitar creación de grupos por periodo de tiempo
- agregar throttling en la Edge Function
- considerar autenticación por sesión para usuarios reales si se necesita más control
- revisar la política de privacidad y consentimiento antes de anuncios públicos

## Tareas pendientes y estado

### Implementado

- creación de grupos
- edición de integrantes
- edición de gastos manuales e ítems
- cálculo de balances y deudas
- guardado en localStorage
- sincronización por enlace privado con Supabase
- OCR de ticket con cámara o fotos
- manifest y recursos PWA
- páginas de privacidad y términos

### Parcialmente implementado

- sincronización remota: funciona con la estructura actual, pero depende de la configuración correcta de Supabase y del enlace compartido
- OCR: funciona con tickets legibles, pero requiere revisión manual sobre nombres y precios
- PWA: la app tiene manifest y iconos, pero no tiene service worker ni caché offline
- Google AdSense: el script existe, pero no hay validación ni activación real del programa

### Pendiente

- autenticación de usuarios real
- protección anti-abuso más robusta
- control de rate limiting y límites por IP/usuario
- servicio worker para caché offline
- flujo de anuncios y consentimiento completo
- pruebas automatizadas
- build tooling y CI/CD formal

## Dependencias externas

- [Tesseract.js](https://github.com/naptha/tesseract.js): OCR del ticket, cargado desde CDN
- [Supabase](https://supabase.com): sincronización y almacenamiento del grupo compartido
- Google AdSense script: presente en HTML, pero sin activación real verificable

## Limitaciones conocidas

- La app está construida en JavaScript vanilla sin módulo ni build system.
- La sincronización depende de Supabase y de un enlace válido.
- La función del OCR no sustituye la revisión humana.
- No hay pruebas automatizadas ni validación continua.
- No hay un sistema de usuarios ni permisos granulares.
- La interfaz es útil para uso personal, pero no reemplaza una plataforma multiusuario con cuentas reales.

## Recomendaciones antes de publicar

1. revisar y completar un correo real de contacto en [privacidad.html](privacidad.html)
2. validar que `SB_URL` y `SB_KEY` correspondan al proyecto real
3. confirmar que `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` viven solo en Supabase
4. revisar si el proyecto se publicará bajo HTTPS forzado en Netlify
5. decidir si se desea activar anuncios o no; si se activan, completar consentimiento y política
6. agregar protección anti-abuso y límites antes de abrir la app a usuarios reales
7. documentar procedimientos de backup y restauración antes de cambiar producciones

## Troubleshooting

### El navegador no puede abrir el grupo compartido

- verificá que el enlace esté completo
- revisá que el `token` no haya sido cortado al copiar
- confirmá que `SB_URL` y `SB_KEY` estén bien configurados
- revisá la consola del navegador y los logs de la Edge Function

### La sincronización no funciona

- revisá que la Edge Function esté desplegada con `supabase functions deploy groups`
- revisá que el proyecto de Supabase coincida con el `project-ref`
- confirmá que la tabla `public.vaquita_groups` exista
- revisá que la función tenga acceso a `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`

### La cámara no funciona

- usá `localhost` o HTTPS
- comprobá permisos del navegador
- probá con una foto local si la cámara no está disponible

### El OCR lee mal el ticket

- usa una foto más nítida
- marca solo la zona de nombres y la zona de precios
- revisá nombres y precios antes de guardar

## Notas de mantenimiento

- El proyecto está muy bien orientado a uso de grupos pequeños y pruebas locales.
- La lógica principal está concentrada en un único archivo [js/app.js](js/app.js), por lo que los cambios futuros conviene organizarlos en módulos si crece la complejidad.
- Si la app se vuelve multiusuario, será necesario replantear la autenticación, permisos y control de acceso.

## Conclusión

Vaquita.app es una aplicación funcional y de propósito claro para dividir gastos compartidos. Su arquitectura actual es simple, local-first y orientada a grupos pequeños con enlaces privados. La documentación de este proyecto debe mantener un enfoque honesto: hay funciones implementadas y útiles, pero también existen limitaciones importantes de seguridad, abuso y escalabilidad que conviene resolver antes de abrir la app públicamente a usuarios reales.

## Verificación de acceso para Supabase

Durante la auditoría del código, se comprobó que:

- el proyecto ref real es `deyeykygcdlaljfxdsqq`
- la tabla usada es `public.vaquita_groups`
- el hash del token se almacena en `token_hash`
- la función usa `service_role` solo en el entorno del servidor
- `anon` no tiene acceso directo a la tabla
- el frontend expone la `anon` key como `SB_KEY`

No se encontró una implementación de service worker ni una estrategia de caché offline en el repositorio. No se encontró configuración de Netlify ni build pipeline propio. El proyecto actual es un sitio estático con lógica en cámara y OCR ejecutada en el navegador.
