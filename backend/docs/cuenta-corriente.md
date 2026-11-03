# Cuenta corriente y ajustes manuales

Las ventas nuevas tienen **Cuenta corriente** seleccionada. Para dejar deuda se
debe seleccionar un cliente. Al registrar la venta se descuenta stock como antes;
el cobro puede registrarse después. Los borradores guardados conservan su forma
de pago y las ventas históricas no se convierten automáticamente.

En **Cobranzas → cliente**:

- **Ajustar saldo** permite aumentar o reducir la deuda, con importe y motivo
  obligatorio. Muestra el saldo resultante antes de guardar. Una reducción mayor
  a la deuda deja saldo a favor. El historial conserva fecha, motivo y, cuando
  hay una sesión válida, usuario.
- **Registrar cobro** registra dinero recibido y lo aplica primero a las ventas
  más antiguas; el resto se aplica a la deuda de ajustes. También se puede seguir
  cobrando una venta específica, hasta el saldo neto disponible del cliente.
- Los ajustes no cambian productos, stock ni cobros. Si cambió la mercadería,
  corresponde editar la venta. Si se recibió dinero, corresponde registrar un
  cobro para que figure en las cobranzas del día.

El saldo de cuenta es el saldo pendiente de las ventas, más los ajustes firmados,
menos los cobros sin venta asociada. Un saldo negativo indica crédito del cliente.
Los saldos individuales de ventas no incorporan los ajustes; por eso pueden
seguir pendientes aunque la cuenta esté compensada. Los ajustes se corrigen con
otro movimiento de signo contrario y su motivo, conservando el historial.

Un cobro general puede crear varias asignaciones de cobro. El listado diario
muestra esas asignaciones y su suma coincide con el dinero recibido.

Los cobros y ajustes no requieren rol de administrador ni una sesión vigente,
igual que el cobro por venta existente. En este sistema de uso individual, una
sesión vencida no bloquea estos movimientos. Si el token es válido, el ajuste
conserva su autor; si falta o no se puede verificar, se registra sin usuario
asociado. El autor nunca se toma de los datos enviados en el formulario.

## Activación en el servidor

Aplicar la migración `20261102100000_add_ajustes_cuenta_corriente` antes de arrancar
el backend actualizado y generar el cliente Prisma con el nuevo esquema. Desde
el directorio `backend`, usando la base de datos del entorno a desplegar:

```sh
npx prisma migrate deploy
npx prisma generate
```

Luego desplegar el backend y el frontend compilado. La migración crea la tabla de
ajustes y cambia el valor predeterminado de la forma de pago; no modifica ventas
ni saldos existentes. La sesión se usa de forma opcional para identificar al
autor de los ajustes.

## Verificación local

`npm test` en `backend` cubre ventas predeterminadas, ajustes, créditos, límites de
cobro, distribución de pagos y reversión de transacciones fallidas con dobles en
memoria, sin abrir la base real. En `frontend`, ejecutar `npm test` y `npm run build`.
