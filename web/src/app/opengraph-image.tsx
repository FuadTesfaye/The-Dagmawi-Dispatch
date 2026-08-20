import { ImageResponse } from 'next/og';

export const alt = 'The Lurkening — Royal Broadsheet & Telegram Chronicle';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          backgroundColor: '#0c0d10',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          borderWidth: '12px',
          borderStyle: 'solid',
          borderColor: '#262936',
        }}
      >
        {/* Top Header Label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#241c10',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: '#785a28',
            padding: '8px 24px',
            color: '#f6d89b',
            fontSize: '18px',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            marginBottom: '32px',
          }}
        >
          <span>UNIVERSAL TELEGRAM CHRONICLE & GROQ AI INTELLIGENCE</span>
        </div>

        {/* Brand Mark & Title */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderWidth: '4px',
              borderStyle: 'solid',
              borderColor: '#f4f0e6',
              backgroundColor: '#f4f0e6',
              color: '#0c0d10',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '52px',
              fontWeight: 900,
              marginRight: '24px',
            }}
          >
            §
          </div>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 900,
              color: '#f4f0e6',
              textTransform: 'uppercase',
              letterSpacing: '-2px',
            }}
          >
            The Lurkening
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '22px',
            color: '#d6d0c2',
            textAlign: 'center',
            maxWidth: '900px',
            lineHeight: 1.4,
            textTransform: 'uppercase',
            marginBottom: '36px',
          }}
        >
          Real-time telegram channel monitoring · Groq Llama-3.3 AI synthesis · Autonomous multi-channel index
        </div>

        {/* Badges Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderTopWidth: '2px',
            borderTopStyle: 'solid',
            borderTopColor: '#3d4257',
            paddingTop: '24px',
            width: '100%',
            justifyContent: 'center',
            fontSize: '16px',
            color: '#a39e93',
          }}
        >
          <div style={{ color: '#d97706', fontWeight: 'bold', marginRight: '16px' }}>
            [ 01 LURKOMETER GAUGE ]
          </div>
          <div style={{ marginRight: '16px' }}>·</div>
          <div style={{ color: '#d97706', fontWeight: 'bold', marginRight: '16px' }}>
            [ 02 AI EDITORIAL BRIEFS ]
          </div>
          <div style={{ marginRight: '16px' }}>·</div>
          <div style={{ color: '#d97706', fontWeight: 'bold' }}>
            [ 03 TELEGRAPH GRAPH ]
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
