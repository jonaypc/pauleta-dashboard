import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendInvoiceEmailParams {
    to: string
    facturaNumero: string
    clienteNombre: string
    total: number
    fecha: string
    empresaNombre: string
    printUrl: string
}

export async function sendInvoiceEmail({
    to,
    facturaNumero,
    clienteNombre,
    total,
    fecha,
    empresaNombre,
    printUrl,
}: SendInvoiceEmailParams) {
    const formattedTotal = new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(total)

    const formattedFecha = new Date(fecha).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    })

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 12px 12px 0 0; padding: 32px;">
          <tr>
            <td align="center">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">${empresaNombre}</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Factura ${facturaNumero}</p>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: white; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <tr>
            <td>
              <p style="margin: 0 0 24px; color: #1e293b; font-size: 16px;">
                Hola <strong>${clienteNombre}</strong>,
              </p>
              <p style="margin: 0 0 24px; color: #64748b; font-size: 14px; line-height: 1.6;">
                Te enviamos la factura <strong>${facturaNumero}</strong> correspondiente a nuestros servicios.
              </p>
              
              <!-- Invoice Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Número de factura</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b; font-weight: 600; font-size: 13px;">${facturaNumero}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Fecha</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b; font-size: 13px;">${formattedFecha}</td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 0 8px; border-top: 1px solid #e2e8f0; color: #1e293b; font-size: 16px; font-weight: 600;">Total</td>
                        <td style="padding: 16px 0 8px; border-top: 1px solid #e2e8f0; text-align: right; color: #2563eb; font-size: 20px; font-weight: 700;">${formattedTotal}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${printUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      Ver factura completa
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                Si tienes alguna pregunta sobre esta factura, no dudes en contactarnos.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 24px;">
          <tr>
            <td align="center">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                ${empresaNombre} · Helados artesanales de fruta
              </p>
              <p style="margin: 8px 0 0; color: #cbd5e1; font-size: 11px;">
                Este email fue enviado automáticamente desde nuestro sistema de facturación.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

    const { data, error } = await resend.emails.send({
        from: `${empresaNombre} <noreply@resend.dev>`,
        to: [to],
        subject: `Factura ${facturaNumero} - ${empresaNombre}`,
        html,
    })

    if (error) {
        throw error
    }

    return data
}
