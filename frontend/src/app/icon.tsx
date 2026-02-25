import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Image metadata
export const size = {
    width: 512,
    height: 512,
};
export const contentType = 'image/png';

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    fontSize: 256,
                    background: '#0f172a',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    borderRadius: '128px',
                }}
            >
                💎
            </div>
        ),
        { ...size }
    );
}
