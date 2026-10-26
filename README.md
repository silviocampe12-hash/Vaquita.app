# Vaquita.app

Aplicación web para dividir gastos compartidos entre varias personas.

## Archivos

- `index.html`: estructura de la página.
- `css/style.css`: estilos y diseño adaptable.
- `js/app.js`: lógica de grupos, gastos, saldos, lectura de tickets y sincronización.

## Cómo probarla

Para probar las funciones básicas, abrí `index.html` en un navegador moderno. Para evitar limitaciones del navegador y probar mejor las funciones integradas, también podés servir la carpeta mediante un servidor web local.

La sincronización entre dispositivos requiere configurar Supabase en `js/app.js`, en las variables `SB_URL` y `SB_KEY`, y configurar correctamente las políticas de seguridad de la base de datos. No incluyas claves privadas ni credenciales secretas en el repositorio.

## Dependencias externas

- Tesseract.js se carga desde CDN cuando se usa el lector de tickets.
- Supabase se utiliza para la sincronización opcional.

## Estado

Proyecto en desarrollo.
