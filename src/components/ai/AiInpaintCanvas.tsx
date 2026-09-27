import React, { useRef, useEffect, useState } from 'react';
import { Eraser, RotateCcw, Paintbrush } from 'lucide-react';

interface AiInpaintCanvasProps {
  imageUrl: string;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onMaskChange: (maskCanvas: HTMLCanvasElement | null) => void;
}

export const AiInpaintCanvas: React.FC<AiInpaintCanvasProps> = ({
  imageUrl,
  brushSize,
  onBrushSizeChange,
  onMaskChange,
}) => {
  const visibleCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
      const vCanvas = visibleCanvasRef.current;
      if (!vCanvas) return;

      vCanvas.width = img.naturalWidth;
      vCanvas.height = img.naturalHeight;
      const vCtx = vCanvas.getContext('2d')!;
      vCtx.drawImage(img, 0, 0);

      // Create separate binary mask canvas
      const mCanvas = document.createElement('canvas');
      mCanvas.width = img.naturalWidth;
      mCanvas.height = img.naturalHeight;
      const mCtx = mCanvas.getContext('2d')!;
      mCtx.fillStyle = '#000000';
      mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
      maskCanvasRef.current = mCanvas;
      onMaskChange(mCanvas);
      setHasDrawn(false);
    };
    img.src = imageUrl;
  }, [imageUrl, onMaskChange]);

  const drawPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const vCanvas = visibleCanvasRef.current;
    const mCanvas = maskCanvasRef.current;
    if (!vCanvas || !mCanvas) return;

    const rect = vCanvas.getBoundingClientRect();
    const scaleX = vCanvas.width / rect.width;
    const scaleY = vCanvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const radius = (brushSize * scaleX) / 2;

    // Draw visible red mask on display canvas
    const vCtx = vCanvas.getContext('2d')!;
    vCtx.fillStyle = 'rgba(239, 68, 68, 0.45)';
    vCtx.beginPath();
    vCtx.arc(x, y, radius, 0, Math.PI * 2);
    vCtx.fill();

    // Draw white mask on binary mask canvas
    const mCtx = mCanvas.getContext('2d')!;
    mCtx.fillStyle = '#FFFFFF';
    mCtx.beginPath();
    mCtx.arc(x, y, radius, 0, Math.PI * 2);
    mCtx.fill();

    setHasDrawn(true);
    onMaskChange(mCanvas);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    drawPoint(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    drawPoint(e);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleClearMask = () => {
    const vCanvas = visibleCanvasRef.current;
    const mCanvas = maskCanvasRef.current;
    const img = imageObjRef.current;
    if (!vCanvas || !mCanvas || !img) return;

    const vCtx = vCanvas.getContext('2d')!;
    vCtx.clearRect(0, 0, vCanvas.width, vCanvas.height);
    vCtx.drawImage(img, 0, 0);

    const mCtx = mCanvas.getContext('2d')!;
    mCtx.fillStyle = '#000000';
    mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);

    setHasDrawn(false);
    onMaskChange(mCanvas);
  };

  return (
    <div className="space-y-3">
      {/* Brush Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Paintbrush className="h-4 w-4 text-indigo-600" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Brush Size ({brushSize}px)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="10"
            max="120"
            value={brushSize}
            onChange={(e) => onBrushSizeChange(parseInt(e.target.value, 10))}
            className="w-32 sm:w-48 accent-indigo-600 cursor-pointer"
          />
          <button
            onClick={handleClearMask}
            disabled={!hasDrawn}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3 w-3" /> Clear Mask
          </button>
        </div>
      </div>

      {/* Drawing Canvas */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-950/5 p-2 border border-slate-200/80 dark:border-slate-800 text-center">
        <canvas
          ref={visibleCanvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="max-h-[460px] w-auto mx-auto rounded-xl shadow-xs cursor-crosshair object-contain select-none"
        />
        <p className="mt-2 text-[11px] text-slate-400">
          Paint over the unwanted subject or watermark with your mouse/touch.
        </p>
      </div>
    </div>
  );
};
