# Vaquita.app

Aplicación web para dividir gastos compartidos entre varias personas.

## Archivos

- `index.html`: estructura de la página.
- `css/style.css`: estilos y diseño adaptable.
- `js/app.js`: lógica de grupos, gastos, saldos, lectura de tickets y sincronización.
- `supabase/migrations/`: esquema privado para los grupos compartidos.
- `supabase/functions/groups/`: API que valida los enlaces privados y opera la base de datos.

## Configurar Supabase

La sincronización comparte datos mediante un enlace privado, sin cuentas de usuario. El enlace contiene un token aleatorio de 256 bits y funciona como contraseña: cualquiera que lo reciba puede leer y editar el grupo. La base de datos guarda el hash del token, no el token. No compartas enlaces en sitios públicos ni incluyas información que no quieras compartir con todos sus destinatarios.

La tabla no permite acceso directo a `anon` ni a `authenticated`. El navegador llama a una Edge Function; solo esa función usa la clave `service_role`, que Supabase proporciona en el entorno del servidor. **Nunca copies `service_role` a `js/app.js`, al HTML ni al repositorio.**

### 1. Aplicar el esquema y publicar la función

Instalá la [Supabase CLI](https://supabase.com/docs/guides/cli), iniciá sesión y vinculá este directorio al proyecto:

```sh
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase db push
supabase functions deploy groups
```

`TU_PROJECT_REF` es la referencia que aparece al inicio de la URL del proyecto, antes de `.supabase.co`. La migración crea `public.vaquita_groups` con RLS habilitado y bloquea el acceso directo de los roles públicos. Si existe la tabla antigua `public.groups`, también le quita esos permisos; no elimina sus datos.

La función usa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del entorno seguro de Supabase. No hace falta copiar la clave de servicio a un archivo. En **Dashboard → Edge Functions → groups → Logs** podés revisar errores de ejecución.

### 2. Configurar la clave pública del navegador

En **Project Settings → API Keys**, copiá la clave pública `anon` del proyecto (nunca `service_role`) y configurá en la primera sección de `js/app.js`:

- `SB_URL`: URL del proyecto, por ejemplo `https://TU_PROJECT_REF.supabase.co`, sin `/rest/v1`.
- `SB_KEY`: clave pública `anon`.

La clave `anon` necesariamente será visible en el navegador; su seguridad depende de que no tenga permisos directos sobre la tabla. No pegues la clave `service_role` aquí. Si el valor de `SB_KEY` es literalmente `******` o el marcador de ejemplo, reemplazalo por la clave `anon` real.

### 3. Probar antes de usar

Publicá el sitio bajo HTTPS, creá un grupo y usá **Personas → Copiar link**. Abrí el enlace en una ventana privada o en otro dispositivo y agregá una persona. Verificá en **Supabase → Table Editor → vaquita_groups** que aparece el grupo y que `token_hash` no contiene el token del enlace.

La función debe responder correctamente a `POST /functions/v1/groups`. Si falla, revisá la consola del navegador y los logs de la Edge Function. No habilites políticas `USING (true)` ni `WITH CHECK (true)` para `anon` en tablas con datos de usuarios.

Como el modelo no requiere iniciar sesión, la Edge Function es pública y cualquiera puede intentar crear grupos. El token protege los grupos existentes, pero por sí solo no limita el abuso de creación o consumo de cuota. Antes de abrir el sitio al público, agregá protección contra abuso (por ejemplo, CAPTCHA y límites de creación/solicitudes) y monitoreá el uso y las cuotas del proyecto.

### Datos y enlaces antiguos

Los grupos siguen guardándose localmente en el navegador. Al sincronizar, se envían a Supabase el nombre del grupo, integrantes, alias, gastos y datos de reparto. Eliminar un grupo desde Vaquita elimina también su fila remota y revoca el enlace; si la eliminación remota falla, la app informa el error.

Los grupos que ya estaban guardados localmente recibirán un enlace nuevo cuando se abran y sincronicen con esta versión. Los enlaces antiguos que solo contienen el ID no son credenciales válidas para el nuevo endpoint. La migración conserva los datos de la tabla anterior `public.groups`, pero la deja sin acceso directo desde el navegador; exportá y respaldá esos datos antes de cambiar de versión. No borres la tabla anterior hasta confirmar que no necesitás recuperar sus grupos.

## Cómo probar la aplicación

Para probar las funciones locales, abrí `index.html` en un navegador moderno. Para probar cámara y sincronización, usá un servidor HTTPS (o `localhost`), ya que los navegadores restringen esas funciones en contextos no seguros.

## Dependencias externas

- Tesseract.js se carga desde CDN cuando se usa el lector de tickets.
- Supabase se usa para la sincronización opcional.

## Antes de publicar

La política de privacidad necesita un correo real de contacto en lugar del marcador pendiente. Si se agregan anuncios de Google, actualizá el aviso de privacidad y configurá el consentimiento que corresponda a las regiones donde se muestren.
