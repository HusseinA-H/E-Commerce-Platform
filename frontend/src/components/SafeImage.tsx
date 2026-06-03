'use client';

import React, { useState } from 'react';

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallback?: string;
  containerClassName?: string;
}

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">' +
    '<rect width="400" height="500" fill="#141414"/>' +
    '<text x="200" y="250" text-anchor="middle" dominant-baseline="central" fill="#3c3f40" font-family="sans-serif" font-size="48" font-weight="bold">APEX</text>' +
    '</svg>'
  );

export function getSafeUrl(src?: string | null): string {
  if (!src || typeof src !== 'string' || src.trim() === '') {
    return PLACEHOLDER;
  }
  return src;
}

export function SafeImage({ src, alt, className, containerClassName, fallback, ...rest }: SafeImageProps) {
  const [error, setError] = useState(false);
  const safeSrc = error ? (fallback || PLACEHOLDER) : getSafeUrl(src);

  return (
    <div className={containerClassName || ''}>
      <img
        src={safeSrc}
        alt={alt || ''}
        className={className}
        onError={() => setError(true)}
        {...rest}
      />
    </div>
  );
}

export { PLACEHOLDER as IMAGE_PLACEHOLDER };
