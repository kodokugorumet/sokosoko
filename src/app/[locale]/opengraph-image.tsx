import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Static OG image generated at build time per locale.
// Composes the brand logo + wordmark + tagline on a soft pink card.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Sokosoko · 부산 살이 / 釜山暮らし';

export default async function OgImage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'Brand' });

  // Read the logo from disk and inline as a data URL — ImageResponse can't
  // fetch from /public during static generation.
  const logoPath = join(process.cwd(), 'public', 'brand', 'logo.png');
  const logoData = await readFile(logoPath);
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #fde7ec 0%, #fff7f9 60%, #ffe4d6 100%)',
        padding: 80,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 64,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="" width={360} height={360} style={{ objectFit: 'contain' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 96, color: '#2b2b2b', letterSpacing: -2 }}>{t('short')}</div>
          <div style={{ fontSize: 36, color: '#5a5a5a', maxWidth: 560, lineHeight: 1.35 }}>
            {t('tagline')}
          </div>
        </div>
      </div>
    </div>,
    { ...size },
  );
}
