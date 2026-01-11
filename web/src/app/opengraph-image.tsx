import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export const alt = 'Gaze - Next.js Development Monitor'
export const size = {
  width: 1200,
  height: 630,
}
 
export const contentType = 'image/png'
 
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          color: 'white',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}
        >
          {/* Simple Terminal Icon simulation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              backgroundColor: '#083344', // cyan-950
              color: '#22d3ee', // cyan-400
              marginRight: '20px',
              fontSize: '40px',
              fontWeight: 'bold',
            }}
          >
            {'>_'}
          </div>
          <div style={{ fontSize: '100px', fontWeight: 'bold', letterSpacing: '-0.05em' }}>GAZE</div>
        </div>
        <div style={{ fontSize: '32px', color: '#a3a3a3', maxWidth: '800px', textAlign: 'center' }}>
          Monitor Next.js with Superpowers
        </div>
        <div
            style={{
              display: 'flex',
              marginTop: '40px',
              padding: '10px 30px',
              backgroundColor: '#171717',
              borderRadius: '50px',
              border: '1px solid #333',
              color: '#22d3ee',
              fontSize: '24px',
              fontFamily: 'monospace',
            }}
          >
            bunx @10xdevs/gaze
          </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
