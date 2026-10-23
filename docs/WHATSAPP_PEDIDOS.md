# Solicitudes por WhatsApp — instalación y alcance

## Estado de esta entrega

Código preparado, integración apagada por defecto. No está conectada a Meta ni a una instancia n8n. No se han enviado mensajes, contratado alojamiento ni modificado ventas históricas.

Primera fase: recibir mensajes, proponer un pedido con IA, mostrar el original para revisión y avisar al propietario por WhatsApp. **No confirma pedidos al cliente ni pregunta automáticamente los datos que faltan.** Tampoco crea facturas, reserva stock o acepta una entrega. Una solicitud es un mensaje entrante: varios mensajes de una conversación pueden generar varias solicitudes. Se mantiene el número y el original para revisarlos juntos. La recogida conversacional con confirmación del cliente es una fase posterior; no activarla sin historial persistente y protección de concurrencia.

## Instalación técnica

1. Aplicar `supabase/migrations/20261023165933_whatsapp_solicitudes.sql` después de comprobar que la tabla no existe. La tabla tiene RLS, solo administradores activos pueden leerla/revisarla; la ingesta y los workers usan una credencial de servidor independiente de cookies. Las funciones de cola son `SECURITY INVOKER`, ejecutables solo por `service_role`.
2. Desplegar el CRM. La bandeja `/pedidos-whatsapp` mostrará que la conexión está pendiente.
3. Disponer de n8n en un servidor HTTPS con almacenamiento persistente, copias de seguridad y actualizaciones. No hay una instancia provisionada por este cambio. Su licencia permite el uso interno de Pauleta; no se incluye un servicio de alojamiento.
4. Completar el alta oficial de WhatsApp **con coexistencia**, comprobando la elegibilidad del número antes de cambiarlo. No usar el registro manual de API que desconecta la aplicación móvil. n8n no resuelve por sí solo el alta con coexistencia; debe haberse completado con un flujo/proveedor compatible.
5. Importar `integrations/n8n/pauleta-whatsapp.json` (inactivo). Configurar `PAULETA_CRM_URL` en las variables n8n (HTTPS, sin barra final). Si el plan instalado no admite variables, reemplazar esa expresión por la URL real en los tres nodos HTTP.
6. Seleccionar las credenciales de la aplicación Meta en **WhatsApp entrante**. El trigger verifica firmas de Meta; debe usarse una versión mantenida de n8n que conserve esa verificación. Solo puede haber un webhook por aplicación Meta: no sustituir una integración existente sin inventariarla.
7. Crear una credencial **HTTP Header Auth** de n8n: nombre `Authorization`, valor `Bearer <secreto aleatorio de al menos 32 caracteres>`. Seleccionarla en los tres nodos HTTP. Guardar el mismo secreto como `WHATSAPP_BRIDGE_SECRET` del servidor. No escribirlo en el workflow ni en Git.
8. Configurar las variables de `.env.whatsapp.example` en el servidor, usando el ID real del número de Pauleta, un token con permisos mínimos y una versión Graph vigente. Las claves no son `NEXT_PUBLIC_`. Seleccionar un modelo compatible con salida JSON en la cuenta OpenAI existente.
9. Registrar el consentimiento del propietario para avisos y aprobar en Meta una plantilla `pauleta_nueva_solicitud`, idioma `es`, con **tres parámetros de texto en el cuerpo**, en este orden: cliente, resumen y enlace. Texto propuesto: `Nueva solicitud de {{1}}. Resumen: {{2}}. Revisa los detalles en {{3}}.` La categoría y aprobación dependen de Meta. No se prometen tarifas ni aprobación.
10. Configurar el destinatario personal verificado en `WHATSAPP_OWNER_PHONE`, con prefijo de país. No incorporarlo a código o fixtures. Sus mensajes se excluyen de la ingesta para evitar bucles.
11. Activar `WHATSAPP_BRIDGE_ENABLED=true`, importar y activar el workflow con una credencial de prueba. Verificar el circuito de recepción y revisión. Activar `WHATSAPP_NOTIFICATIONS_ENABLED=true` solo cuando la plantilla y el destinatario estén listos, y enviar una prueba autorizada. Para pausar: desactivar el workflow y ambas variables.

## Operación y recuperación

- El webhook del CRM es **privado para n8n**, no el callback de Meta. Requiere Bearer, flag activo y coincidencia del ID del número empresarial.
- El mensaje se guarda antes de llamar a IA. Un ID WhatsApp repetido no crea otra fila; un reintento no puede volver a abrir una solicitud revisada.
- Cada minuto se procesa como máximo una solicitud y se envía como máximo un aviso. Ajustar la frecuencia/capacidad según volumen tras observar el piloto. La latencia inicial puede ser de dos minutos; no se promete tiempo real.
- Ante fallo de IA o contenido multimedia se solicita revisión manual y se genera aviso. No se descargan ni interpretan audios/fotos en esta fase; se abren en WhatsApp Business.
- Solo se adjunta un cliente cuando el teléfono normalizado coincide de forma única. Los nombres de perfil no acreditan identidad. La IA solo recibe el texto y el catálogo activo (sin precios ni otros clientes).
- Cantidades y productos son propuestas. Un ID de catálogo desconocido o una unidad que no coincide se deja para revisión; no se convierten cajas a unidades automáticamente.
- Un aviso `aceptado_meta` significa aceptación por la API, no entrega ni lectura. Todavía no se procesan recibos de entrega.
- Un timeout de envío es ambiguo: se marca `revisar_error` y **no se reenvía automáticamente**, para evitar duplicados. Verificar en Meta/WhatsApp antes de reponer manualmente el estado a `pendiente`. Un envío bloqueado más de tres minutos pasa a revisión cuando corre el siguiente worker de avisos.
- Revisar a diario todos los mensajes, incluidas las consultas, para detectar falsos negativos. Las interpretaciones por IA no garantizan detección perfecta.
- n8n conserva errores para diagnóstico: restringir acceso y configurar purga de ejecuciones y retención de mensajes de acuerdo con la operativa de Pauleta. No registrar tokens ni cuerpos completos en logs del servidor.

## Prueba de aceptación antes de activar clientes

- Credencial ausente/incorrecta y número empresarial distinto: rechazar.
- Mensaje duplicado: una fila y un aviso como máximo.
- Pedido con cantidades/formato claros: propuesta visible, estado pendiente y aviso personal.
- Cantidad o formato ambiguo: conservar original, señalar lo que falta, no confirmar al cliente.
- Cliente con teléfono duplicado: sin asignación automática.
- Consulta: conservar en bandeja; no crear venta.
- Imagen/audio y fallo de IA: revisión manual sin pérdida del mensaje.
- Error/timeout al avisar: incidencia visible, sin reenvío ciego.
- Administrador activo: revisar; usuario ajeno, empleado y anónimo: sin acceso.
- Marcar revisado no modifica inventario, facturas o históricos.

Validación local automatizada: `node --test tests/whatsapp.test.cjs` y `npx tsc --noEmit`. La prueba real Meta → n8n → CRM → WhatsApp personal requiere alta y credenciales; no se ha ejecutado sin ellas.
