import { ImageResponse } from 'next/og';

export const alt = 'ILENA INTERIOR — Desain Interior Virtual';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'linear-gradient(135deg, #fdf8f3 0%, #f8ede0 35%, #f5f5f4 100%)',
          padding: '80px',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: 28,
            fontWeight: 600,
            color: '#1c1917',
            letterSpacing: '0.05em',
          }}
        >
          <span>ILENA</span>
          <span style={{ color: '#c17b4e' }}>INTERIOR</span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginTop: 'auto',
            marginBottom: 'auto',
          }}
        >
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              color: '#1c1917',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Desain Interior
          </div>
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              color: '#c17b4e',
              fontStyle: 'italic',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Seindah Mimpimu
          </div>

          <div
            style={{
              fontSize: 30,
              color: '#57534e',
              marginTop: 32,
              maxWidth: 920,
              lineHeight: 1.4,
            }}
          >
            Rancang ruangan dengan furniture asli, lihat dalam 3D & walk-through,
            konsultasi langsung via WhatsApp.
          </div>
        </div>

        {/* Bottom row badges */}
        <div
          style={{
            display: 'flex',
            gap: '14px',
            marginTop: 'auto',
          }}
        >
          {['Gratis', '2D · 3D · Walk-through', 'Konsultasi WhatsApp'].map((t) => (
            <div
              key={t}
              style={{
                fontSize: 22,
                fontWeight: 500,
                color: '#44403c',
                background: '#ffffff',
                border: '1px solid #e7e5e4',
                borderRadius: 999,
                padding: '12px 22px',
              }}
            >
              {t}
            </div>
          ))}
        </div>

        {/* Decorative blob */}
        <div
          style={{
            position: 'absolute',
            right: -120,
            top: -120,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'rgba(193, 123, 78, 0.18)',
            filter: 'blur(20px)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
