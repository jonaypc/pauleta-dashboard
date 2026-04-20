import { Resend } from 'resend'

// Lazy initialization to prevent build errors when API key is not set
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY no está configurada')
  }
  return new Resend(apiKey)
}

interface SendInvoiceEmailParams {
  to: string
  facturaNumero: string
  clienteNombre: string
  total: number
  fecha: string
  empresaNombre: string
  printUrl: string
  trackingId?: string
  pdfBuffer?: Buffer
}

export async function sendInvoiceEmail({
  to,
  facturaNumero,
  clienteNombre,
  total,
  fecha,
  empresaNombre,
  printUrl,
  trackingId,
  pdfBuffer,
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const trackingPixel = trackingId
    ? `<img src="${baseUrl}/api/track/${trackingId}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`
    : ''

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
                Te enviamos la factura <strong>${facturaNumero}</strong> correspondiente a nuestros servicios.${pdfBuffer ? ' Encontrarás el PDF adjunto a este email.' : ''}
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
  ${trackingPixel}
</body>
</html>
  `

  const resend = getResendClient()

  const emailOptions: Parameters<typeof resend.emails.send>[0] = {
    from: `${empresaNombre} <facturas@pauletacanaria.es>`,
    to: [to],
    reply_to: 'jonaypc@gmail.com',
    subject: `Factura ${facturaNumero} - ${empresaNombre}`,
    html,
  }

  // Adjuntar PDF si existe
  if (pdfBuffer) {
    emailOptions.attachments = [
      {
        filename: `Factura-${facturaNumero}.pdf`,
        content: pdfBuffer,
      },
    ]
  }

  const { data, error } = await resend.emails.send(emailOptions)

  if (error) {
    throw error
  }

  return data
}

// ===========================================
// EMAIL CONSOLIDADO DE FACTURAS
// ===========================================

interface FacturaResumen {
  numero: string
  fecha: string
  total: number
}

interface SendConsolidatedEmailParams {
  to: string
  clienteNombre: string
  empresaNombre: string
  facturas: FacturaResumen[]
  totalGlobal: number
  trackingId?: string
  pdfAttachments: { filename: string; content: Buffer }[]
}

export function generateConsolidatedEmailHTML({
  clienteNombre,
  empresaNombre,
  facturas,
  totalGlobal,
  trackingId,
}: {
  clienteNombre: string
  empresaNombre: string
  facturas: FacturaResumen[]
  totalGlobal: number
  trackingId?: string
}): { html: string; subject: string; periodoLabel: string } {
  const formattedTotal = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(totalGlobal)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const trackingPixel = trackingId
    ? `<img src="${baseUrl}/api/track/${trackingId}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`
    : ''

  // Determinar periodo desde las fechas de las facturas
  const fechas = facturas.map(f => new Date(f.fecha))
  const mesMin = fechas.reduce((min, d) => d < min ? d : min, fechas[0])
  const mesMax = fechas.reduce((max, d) => d > max ? d : max, fechas[0])

  const periodoLabel = mesMin.getMonth() === mesMax.getMonth() && mesMin.getFullYear() === mesMax.getFullYear()
    ? mesMin.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
    : `${mesMin.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} - ${mesMax.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}`

  // Generar filas de la tabla
  const tableRows = facturas.map(f => {
    const formattedFecha = new Date(f.fecha).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    const formattedImporte = new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(f.total)
    return `
      <tr>
        <td style="padding: 10px 12px; color: #1e293b; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${f.numero}</td>
        <td style="padding: 10px 12px; color: #64748b; font-size: 13px; border-bottom: 1px solid #f1f5f9;">${formattedFecha}</td>
        <td style="padding: 10px 12px; color: #1e293b; font-size: 13px; font-weight: 600; text-align: right; border-bottom: 1px solid #f1f5f9;">${formattedImporte}</td>
      </tr>`
  }).join('')

  const subject = `Resumen de facturas - ${periodoLabel.charAt(0).toUpperCase() + periodoLabel.slice(1)} - ${empresaNombre}`

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
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Resumen de facturas · ${periodoLabel}</p>
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
                Te enviamos el resumen de las <strong>${facturas.length} facturas</strong> correspondientes al periodo <strong>${periodoLabel}</strong>. Encontrarás los PDFs adjuntos a este email.
              </p>

              <!-- Invoice Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px; overflow: hidden;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr style="background-color: #e2e8f0;">
                        <td style="padding: 10px 12px; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase;">Factura</td>
                        <td style="padding: 10px 12px; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase;">Fecha</td>
                        <td style="padding: 10px 12px; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; text-align: right;">Importe</td>
                      </tr>
                      ${tableRows}
                      <tr style="background-color: #e2e8f0;">
                        <td colspan="2" style="padding: 12px; color: #1e293b; font-size: 14px; font-weight: 700;">TOTAL</td>
                        <td style="padding: 12px; text-align: right; color: #2563eb; font-size: 18px; font-weight: 700;">${formattedTotal}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                Si tienes alguna pregunta sobre estas facturas, no dudes en contactarnos.
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
  ${trackingPixel}
</body>
</html>
  `

  return { html, subject, periodoLabel }
}

export async function sendConsolidatedInvoiceEmail({
  to,
  clienteNombre,
  empresaNombre,
  facturas,
  totalGlobal,
  trackingId,
  pdfAttachments,
}: SendConsolidatedEmailParams) {
  const { html, subject } = generateConsolidatedEmailHTML({
    clienteNombre,
    empresaNombre,
    facturas,
    totalGlobal,
    trackingId,
  })

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY no está configurada')
  }

  // Call Resend API directly for better control over attachment encoding
  const payload = {
    from: `${empresaNombre} <facturas@pauletacanaria.es>`,
    to: [to],
    reply_to: 'jonaypc@gmail.com',
    subject,
    html,
    attachments: pdfAttachments.map(att => ({
      filename: att.filename,
      content: att.content.toString('base64'),
      content_type: 'application/pdf',
    })),
  }

  console.log('[CONSOLIDATED] Sending email with payload size:',
    Math.round(JSON.stringify(payload).length / 1024), 'KB')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()

  if (!response.ok) {
    console.error('[CONSOLIDATED] Resend API error:', response.status, result)
    throw new Error(`Error de Resend (${response.status}): ${result.message || JSON.stringify(result)}`)
  }

  return result
}

// ===========================================
// EMAIL DE PRESUPUESTO
// ===========================================

interface SendPresupuestoEmailParams {
  to: string
  presupuestoNumero: string
  clienteNombre: string
  total: number
  fecha: string
  fechaValidez?: string | null
  empresaNombre: string
  pdfBuffer?: Buffer
}

export async function sendPresupuestoEmail({
  to,
  presupuestoNumero,
  clienteNombre,
  total,
  fecha,
  fechaValidez,
  empresaNombre,
  pdfBuffer,
}: SendPresupuestoEmailParams) {
  const formattedTotal = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(total)

  const formattedFecha = new Date(fecha).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  const formattedValidez = fechaValidez
    ? new Date(fechaValidez).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null

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
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Presupuesto ${presupuestoNumero}</p>
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
                Te enviamos el presupuesto <strong>${presupuestoNumero}</strong> para tu consideración.${pdfBuffer ? ' Encontrarás el PDF adjunto a este email.' : ''}
              </p>

              <!-- Presupuesto Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Número de presupuesto</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b; font-weight: 600; font-size: 13px;">${presupuestoNumero}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Fecha</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b; font-size: 13px;">${formattedFecha}</td>
                      </tr>
                      ${formattedValidez ? `
                      <tr>
                        <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Válido hasta</td>
                        <td style="padding: 8px 0; text-align: right; color: #1e293b; font-size: 13px;">${formattedValidez}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 16px 0 8px; border-top: 1px solid #e2e8f0; color: #1e293b; font-size: 16px; font-weight: 600;">Total</td>
                        <td style="padding: 16px 0 8px; border-top: 1px solid #e2e8f0; text-align: right; color: #2563eb; font-size: 20px; font-weight: 700;">${formattedTotal}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                Si tienes alguna pregunta sobre este presupuesto o deseas aceptarlo, no dudes en contactarnos.
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
                Este email fue enviado automáticamente desde nuestro sistema.
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

  const resend = getResendClient()

  const emailOptions: Parameters<typeof resend.emails.send>[0] = {
    from: `${empresaNombre} <facturas@pauletacanaria.es>`,
    to: [to],
    reply_to: 'jonaypc@gmail.com',
    subject: `Presupuesto ${presupuestoNumero} - ${empresaNombre}`,
    html,
  }

  if (pdfBuffer) {
    emailOptions.attachments = [
      {
        filename: `Presupuesto-${presupuestoNumero}.pdf`,
        content: pdfBuffer,
      },
    ]
  }

  const { data, error } = await resend.emails.send(emailOptions)

  if (error) {
    throw error
  }

  return data
}
