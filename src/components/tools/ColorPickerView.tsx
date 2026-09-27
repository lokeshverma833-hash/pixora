import React, { useState, useRef, useEffect } from 'react';
import { Pipette, Copy, Check, Palette, Sparkles } from 'lucide-react';
import { Dropzone } from '../common/Dropzone';

export const ColorPickerView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pickedColor, setPickedColor] = useState<{
    hex: string;
    rgb: string;
    hsl: string;
  }>({
    hex: '#4F46E5',
    rgb: 'rgb(79, 70, 229)',
    hsl: 'hsl(243, 75%, 59%)',
  });
  const [hoverColor, setHoverColor] = useState<string>('#4F46E5');
  const [palette, setPalette] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>(['#4F46E5', '#06B6D4', '#10B981', '#F59E0B']);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const handleFile = (files: File[]) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        drawToCanvas(img);
        extractPalette(img);
      };
      img.src = URL.createObjectURL(files[0]);
    }
  };

  const drawToCanvas = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // Max display width 800px
    const maxW = 800;
    const scale = Math.min(1, maxW / img.naturalWidth);
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  const extractPalette = (img: HTMLImageElement) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 50;
    tempCanvas.height = 50;
    const ctx = tempCanvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, 50, 50);

    const imgData = ctx.getImageData(0, 0, 50, 50).data;
    const colorCounts: { [hex: string]: number } = {};

    for (let i = 0; i < imgData.length; i += 16) {
      const r = Math.round(imgData[i] / 24) * 24;
      const g = Math.round(imgData[i + 1] / 24) * 24;
      const b = Math.round(imgData[i + 2] / 24) * 24;
      const hex = rgbToHex(r, g, b);
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }

    const sorted = Object.keys(colorCounts)
      .sort((a, b) => colorCounts[b] - colorCounts[a])
      .slice(0, 8);

    setPalette(sorted);
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    const ctx = canvas.getContext('2d')!;
    try {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
      setHoverColor(hex);
      setLoupePos({ x, y, visible: true });
    } catch {}
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    const ctx = canvas.getContext('2d')!;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0], g = pixel[1], b = pixel[2];
    const hex = rgbToHex(r, g, b);
    const rgbStr = `rgb(${r}, ${g}, ${b})`;
    const hslStr = rgbToHsl(r, g, b);

    const colObj = { hex, rgb: rgbStr, hsl: hslStr };
    setPickedColor(colObj);

    setHistory((prev) => [hex, ...prev.filter((h) => h !== hex)].slice(0, 12));
    copyToClipboard(hex, 'hex');
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="space-y-8">
      {!selectedFile ? (
        <Dropzone
          onFilesSelected={handleFile}
          title="Upload image or screenshot to pick colors"
          subtitle="Pixel-magnifier loupe extracts exact HEX, RGB, and HSL codes"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Canvas Interactive Column */}
          <div className="lg:col-span-8 space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/5 p-4 dark:border-slate-800 dark:bg-slate-900/40 text-center select-none">
              <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setLoupePos((p) => ({ ...p, visible: false }))}
                onClick={handleClick}
                className="max-h-[550px] w-auto mx-auto rounded-xl shadow-sm cursor-crosshair object-contain"
              />

              {/* Real-time Magnifier Loupe badge floating over pointer */}
              {loupePos.visible && (
                <div
                  className="pointer-events-none absolute z-30 flex items-center gap-2 rounded-xl bg-slate-900/90 backdrop-blur-md px-3 py-1.5 text-xs text-white shadow-xl border border-white/20"
                  style={{
                    left: `${Math.min(loupePos.x + 25, 450)}px`,
                    top: `${Math.max(loupePos.y - 45, 10)}px`,
                  }}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-white shadow-xs"
                    style={{ backgroundColor: hoverColor }}
                  />
                  <span className="font-mono font-bold">{hoverColor}</span>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-slate-500">
              Hover over any pixel and click to lock & copy color codes.
            </p>
          </div>

          {/* Color Values & Palette Column */}
          <div className="lg:col-span-4 space-y-6">
            {/* Active Picked Color Card */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-14 w-14 rounded-2xl shadow-inner border border-slate-200/60 dark:border-slate-700"
                  style={{ backgroundColor: pickedColor.hex }}
                />
                <div>
                  <h3 className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                    {pickedColor.hex}
                  </h3>
                  <span className="text-xs text-slate-500">Picked Color</span>
                </div>
              </div>

              {/* Codes Copy List */}
              <div className="space-y-2 pt-2">
                {[
                  { label: 'HEX', val: pickedColor.hex, key: 'hex' },
                  { label: 'RGB', val: pickedColor.rgb, key: 'rgb' },
                  { label: 'HSL', val: pickedColor.hsl, key: 'hsl' },
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => copyToClipboard(item.val, item.key)}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                  >
                    <div>
                      <span className="text-slate-400 font-semibold mr-2">{item.label}</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">
                        {item.val}
                      </span>
                    </div>
                    {copiedKey === item.key ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Copied
                      </span>
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Extracted Image Palette */}
            {palette.length > 0 && (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5" /> Dominant Image Palette
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  {palette.map((hex) => (
                    <button
                      key={hex}
                      onClick={() => {
                        setPickedColor({ hex, rgb: hex, hsl: hex });
                        copyToClipboard(hex, 'hex');
                      }}
                      className="group flex flex-col items-center gap-1 p-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div
                        className="h-10 w-full rounded-lg border border-slate-200 shadow-xs transition-transform group-hover:scale-105"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="font-mono text-[10px] text-slate-500">{hex}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => {
                      const cssVars = `:root {\n${palette.map((h, i) => `  --color-${i + 1}: ${h};`).join('\n')}\n}`;
                      const blob = new Blob([cssVars], { type: 'text/css' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'palette.css';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex-1 rounded-lg border border-slate-200 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Download .CSS
                  </button>
                  <button
                    onClick={() => {
                      const jsonStr = JSON.stringify({ palette, active: pickedColor }, null, 2);
                      const blob = new Blob([jsonStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'palette.json';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex-1 rounded-lg border border-slate-200 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Download .JSON
                  </button>
                </div>
              </div>
            )}

            {/* Color History */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-800 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Picked History
              </h4>
              <div className="flex flex-wrap gap-2">
                {history.map((hex, i) => (
                  <button
                    key={`${hex}-${i}`}
                    onClick={() => {
                      setPickedColor({ hex, rgb: hex, hsl: hex });
                      copyToClipboard(hex, 'hex');
                    }}
                    className="h-8 w-8 rounded-lg border border-slate-200 shadow-xs hover:scale-110 transition-transform"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedFile(null)}
              className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Upload Another Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
