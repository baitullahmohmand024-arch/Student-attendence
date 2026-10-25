import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeViewProps {
  value: string;
  size?: number;
  className?: string;
  subLabel?: string;
}

/**
 * Real, ISO-compliant QR code renderer.
 * Produces standard decodable QR codes using the 'qrcode' library,
 * ensuring seamless real-time decoding with optical cameras and jsQR.
 */
export const QRCodeView: React.FC<QRCodeViewProps> = ({
  value,
  size = 140,
  className = '',
  subLabel,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    if (!value) {
      setDataUrl('');
      return;
    }

    QRCode.toDataURL(value, {
      width: size * 2, // 2x for sharp rendering on retina/displays
      margin: 1,
      color: {
        dark: '#0B192C',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
        }
      })
      .catch((err) => {
        console.error('QR code generation failed:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR code for ${value}`}
            className="w-full h-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="w-full h-full bg-slate-50 animate-pulse rounded" />
        )}
      </div>
      {subLabel && (
        <span className="mt-1.5 text-[11px] font-mono tabular-nums text-slate-500 tracking-wider">
          {subLabel}
        </span>
      )}
    </div>
  );
};
