import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

// Image metadata
export const size = {
    width: 512,
    height: 512,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
    // Read the logo file from public directory
    // usage of process.cwd() assumes running in Node environment (default for this file without edge runtime config)
    const logoPath = join(process.cwd(), 'public', 'logo.png')
    const logoData = readFileSync(logoPath)
    const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`

    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    background: 'white', // White background
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={logoBase64}
                    alt="Pauleta Logo"
                    style={{
                        width: '80%',  // Padding to prevent touching edges
                        height: '80%',
                        objectFit: 'contain',
                    }}
                />
            </div>
        ),
        // ImageResponse options
        {
            ...size,
        }
    )
}
