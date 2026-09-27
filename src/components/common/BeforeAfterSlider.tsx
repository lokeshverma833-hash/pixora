import React, { useState, useRef, useCallback } from 'react';

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Original',
  afterLabel = 'Processed',
  className = '',
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  }, []);

  const onMouseDown = () => setIsDragging(true);
  const onMouseUp = () => setIsDragging(false);

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onMouseUp}
      className={`relative select-none overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-xl dark:border-slate-800 ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Background (After / Enhanced Image) */}
      <img
        src={afterUrl}
        alt={afterLabel}
        className="block h-auto w-full max-h-[600px] object-contain mx-auto"
        draggable={false}
      />

      {/* Foreground (Before / Original Image Clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="absolute inset-0 block h-full w-full object-contain mx-auto pointer-events-none"
          style={{ width: containerRef.current?.clientWidth || '100%', maxWidth: 'none' }}
          draggable={false}
        />
      </div>

      {/* Divider Bar & Handle */}
      <div
        className="absolute top-0 bottom-0 z-20 w-0.5 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg border border-slate-200 transition-transform active:scale-95">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 9l-4 3 4 3m8-6l4 3-4 3" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 z-10 rounded-md bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-white shadow-sm pointer-events-none">
        {beforeLabel}
      </div>
      <div className="absolute top-3 right-3 z-10 rounded-md bg-indigo-600/80 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-white shadow-sm pointer-events-none">
        {afterLabel}
      </div>
    </div>
  );
};
