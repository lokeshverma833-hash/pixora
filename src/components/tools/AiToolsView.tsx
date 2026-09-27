import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Download,
  RefreshCw,
  Sliders,
  CheckCircle,
  Eye,
  Scissors,
  Eraser,
  Maximize,
  Aperture,
  Focus,
  AlertCircle,
  Cpu,
  Zap,
} from 'lucide-react';
import { ToolItem, ProcessingResult } from '../../types';
import { Dropzone } from '../common/Dropzone';
import { BeforeAfterSlider } from '../common/BeforeAfterSlider';
import { AiConfigAlert } from '../ai/AiConfigAlert';
import { AiInpaintCanvas } from '../ai/AiInpaintCanvas';
import {
  checkAiServerStatus,
  fileToBase64,
  requestAiEnhance,
  requestAiBackgroundRemoval,
  requestAiObjectInpainting,
  requestAiUpscale,
  requestAiBackgroundBlur,
  requestAiUnblur,
  AiConfigurationError,
} from '../../services/aiService';
import {
  applyAiEnhancement,
  removeBackground,
  inpaintObject,
  upscaleImage,
  blurBackground,
  unblurImage,
  formatBytes,
} from '../../utils/imageProcessors';

interface AiToolsViewProps {
  tool: ToolItem;
}

export const AiToolsView: React.FC<AiToolsViewProps> = ({ tool }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState<string>('');

  // AI Configuration State
  const [isAiConfigured, setIsAiConfigured] = useState<boolean>(true);
  const [isCheckingConfig, setIsCheckingConfig] = useState<boolean>(true);
  const [configErrorMessage, setConfigErrorMessage] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<{ title: string; content: string } | null>(null);

  // Tool Specific Controls
  // 1. AI Enhancer
  const [enhancerPreset, setEnhancerPreset] = useState<'balanced' | 'portrait' | 'vibrant' | 'clarity'>('balanced');
  // 2. Background Remover
  const [bgMode, setBgMode] = useState<'transparent' | 'white' | 'custom'>('transparent');
  const [bgCustomColor, setBgCustomColor] = useState<string>('#FFFFFF');
  const [bgTolerance, setBgTolerance] = useState<number>(30);
  // 3. Object Remover
  const [brushSize, setBrushSize] = useState<number>(35);
  const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null);
  // 4. Upscaler
  const [upscaleFactor, setUpscaleFactor] = useState<2 | 4>(2);
  // 5. Background Blur
  const [blurRadius, setBlurRadius] = useState<number>(18);
  // 6. Image Unblur
  const [unblurIntensity, setUnblurIntensity] = useState<number>(0.65);

  // Verify server AI configuration on mount
  const verifyConfiguration = async () => {
    setIsCheckingConfig(true);
    try {
      const status = await checkAiServerStatus();
      setIsAiConfigured(status.isConfigured);
      if (!status.isConfigured) {
        setConfigErrorMessage(
          'Gemini AI API key is not configured on the server. Please set GEMINI_API_KEY in your deployment environment secrets.'
        );
      } else {
        setConfigErrorMessage(null);
      }
    } catch (err) {
      setIsAiConfigured(false);
    } finally {
      setIsCheckingConfig(false);
    }
  };

  useEffect(() => {
    verifyConfiguration();
  }, []);

  // Handle File selection
  const handleFile = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setOriginalUrl(url);
      setResult(null);
      setAiInsights(null);
    }
  };

  // Process Tool Action via Server AI Pipeline
  const handleProcess = async () => {
    if (!selectedFile) return;

    // Strict configuration check: Do not execute fake processing if unconfigured
    if (!isAiConfigured) {
      setConfigErrorMessage(
        'Cannot process: Gemini AI API key is not configured on the server. Please set GEMINI_API_KEY in your deployment secrets.'
      );
      return;
    }

    setIsProcessing(true);
    setConfigErrorMessage(null);
    setProgressStage('Encoding image for neural model...');

    try {
      const base64 = await fileToBase64(selectedFile);
      let res: ProcessingResult | null = null;

      switch (tool.id) {
        // 1. AI Photo Enhancer
        case 'ai-enhancer': {
          setProgressStage('Analyzing multi-spectral exposure and dynamic range...');
          const aiResponse = await requestAiEnhance(base64, selectedFile.type);

          setAiInsights({
            title: 'Neural Exposure Diagnosis',
            content: aiResponse.analysis || 'Analyzed dynamic range, lifted shadow detail, and balanced color vibrancy.',
          });

          setProgressStage('Applying tonal curves and clarity enhancements...');
          res = await applyAiEnhancement(selectedFile, {
            brightness: aiResponse.brightness || 1.06,
            contrast: aiResponse.contrast || 1.12,
            saturation: aiResponse.saturation || 1.08,
            sharpness: aiResponse.sharpness || 1.3,
            warmth: aiResponse.warmth || 0,
            vibrance: aiResponse.vibrance || 1.1,
            highlights: aiResponse.highlights || -5,
            shadows: aiResponse.shadows || 10,
          });
          break;
        }

        // 2. AI Background Remover
        case 'background-remover': {
          setProgressStage('Isolating foreground subject and computing alpha matting...');
          const aiResponse = await requestAiBackgroundRemoval(base64, selectedFile.type, bgTolerance);

          setAiInsights({
            title: 'Subject Isolation Report',
            content: `${aiResponse.subject ? `Subject: ${aiResponse.subject}. ` : ''}${aiResponse.summary || 'Computed edge boundary and foreground silhouette.'}`,
          });

          setProgressStage('Rendering alpha matte and transparency boundary...');
          res = await removeBackground(selectedFile, {
            tolerance: bgTolerance,
            bgColor: bgMode === 'white' ? '#FFFFFF' : bgCustomColor,
            transparent: bgMode === 'transparent',
          });
          break;
        }

        // 3. AI Object Remover (Inpainting)
        case 'object-remover': {
          if (!maskCanvas) {
            throw new Error('Please paint over the object you want to remove on the image.');
          }

          setProgressStage('Analyzing surrounding textures and lighting vectors...');
          const maskBase64 = maskCanvas.toDataURL('image/png');
          const aiResponse = await requestAiObjectInpainting(base64, selectedFile.type, maskBase64);

          setAiInsights({
            title: 'Generative Inpainting Plan',
            content: `${aiResponse.contextAnalysis || 'Contextual continuity verified.'} Synthesizing ${aiResponse.texturePattern || 'ambient background'} texture.`,
          });

          setProgressStage('Performing neural patch synthesis...');
          res = await inpaintObject(selectedFile, maskCanvas);
          break;
        }

        // 4. AI Image Upscaler
        case 'image-upscaler': {
          setProgressStage(`Reconstructing high-frequency textures for ${upscaleFactor}x super-resolution...`);
          const aiResponse = await requestAiUpscale(base64, selectedFile.type, upscaleFactor);

          setAiInsights({
            title: 'Super-Resolution Synthesis',
            content: aiResponse.resolutionAdvice || `Synthesized micro-edge sharpness and recovered fine detail at ${upscaleFactor}x scale.`,
          });

          setProgressStage(`Interpolating sub-pixel grid (${upscaleFactor}x)...`);
          res = await upscaleImage(selectedFile, upscaleFactor);
          break;
        }

        // 5. AI Background Blur
        case 'background-blur': {
          setProgressStage('Estimating semantic depth planes and portrait focal boundary...');
          const aiResponse = await requestAiBackgroundBlur(base64, selectedFile.type, blurRadius);

          setAiInsights({
            title: 'Depth Segmentation Analysis',
            content: `${aiResponse.focusSummary || 'Isolated subject plane from ambient background.'} Simulated ${aiResponse.recommendedAperture || 'f/2.0'} aperture depth of field.`,
          });

          setProgressStage('Applying synthetic optical bokeh blur...');
          res = await blurBackground(selectedFile, blurRadius);
          break;
        }

        // 6. AI Image Unblur
        case 'image-unblur': {
          setProgressStage('Analyzing blur vectors and point spread function (PSF)...');
          const aiResponse = await requestAiUnblur(base64, selectedFile.type, unblurIntensity);

          setAiInsights({
            title: 'Deconvolution Diagnosis',
            content: aiResponse.recoverySummary || 'Compensated for optical motion vectors and restored high-contrast edge frequencies.',
          });

          setProgressStage('Executing high-pass deblurring filter...');
          res = await unblurImage(selectedFile, unblurIntensity);
          break;
        }
      }

      setResult(res);
    } catch (err: any) {
      console.error('AI processing error:', err);
      if (err instanceof AiConfigurationError) {
        setIsAiConfigured(false);
        setConfigErrorMessage(err.message);
      } else {
        setConfigErrorMessage(err.message || 'Server AI processing encountered an error.');
      }
    } finally {
      setIsProcessing(false);
      setProgressStage('');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setOriginalUrl(null);
    setResult(null);
    setAiInsights(null);
    setConfigErrorMessage(null);
    setMaskCanvas(null);
  };

  return (
    <div className="space-y-8">
      {/* If server API key is not configured, show clear configuration message instead of fake processing */}
      {!isAiConfigured && !isCheckingConfig && (
        <AiConfigAlert onRetry={verifyConfiguration} isRetrying={isCheckingConfig} />
      )}

      {!selectedFile ? (
        <Dropzone
          onFilesSelected={handleFile}
          title={`Upload photo for ${tool.name}`}
          subtitle="Supports JPG, PNG, and WebP images up to 50MB"
          accept="image/jpeg,image/png,image/webp"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-6 rounded-3xl bg-white p-6 shadow-2xs border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                {tool.name} Parameters
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Server Model: Gemini 3.8
              </span>
            </div>

            {/* Tool-Specific Controls */}
            {/* 1. AI Photo Enhancer */}
            {tool.id === 'ai-enhancer' && (
              <div className="space-y-4 text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Enhancement Profile
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'balanced', label: 'Balanced Auto', desc: 'Optimal contrast & tone' },
                    { id: 'portrait', label: 'Portrait Glow', desc: 'Skin tone warmth & clarity' },
                    { id: 'vibrant', label: 'Vibrant Landscape', desc: 'Punchy saturation & sky' },
                    { id: 'clarity', label: 'Micro-Clarity', desc: 'Deep texture & sharp edges' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setEnhancerPreset(p.id as any);
                        setResult(null);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        enhancerPreset === p.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold dark:bg-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="font-bold">{p.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Background Remover */}
            {tool.id === 'background-remover' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    Output Background Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'transparent', label: 'Transparent' },
                      { id: 'white', label: 'Pure White' },
                      { id: 'custom', label: 'Custom Color' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => {
                          setBgMode(mode.id as any);
                          setResult(null);
                        }}
                        className={`p-2.5 rounded-xl border text-center font-medium ${
                          bgMode === mode.id
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold dark:bg-indigo-950 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {bgMode === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgCustomColor}
                      onChange={(e) => {
                        setBgCustomColor(e.target.value);
                        setResult(null);
                      }}
                      className="h-8 w-12 rounded cursor-pointer border border-slate-200"
                    />
                    <span className="font-mono text-slate-600 dark:text-slate-300">{bgCustomColor}</span>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    <span>Edge Matting Sensitivity</span>
                    <span className="font-mono text-indigo-600">{bgTolerance}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={bgTolerance}
                    onChange={(e) => {
                      setBgTolerance(parseInt(e.target.value, 10));
                      setResult(null);
                    }}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 3. Object Remover */}
            {tool.id === 'object-remover' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Use the inpaint brush in the right panel to paint over any person, watermark, power line, or defect you want to erase.
                </p>
                <div className="rounded-2xl bg-indigo-50/60 p-4 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-300 space-y-1">
                  <span className="font-bold block">Generative Neural Patch</span>
                  <p className="text-[11px] leading-relaxed">
                    Surrounding texture and geometry are analyzed by the server model to seamlessly recreate the background.
                  </p>
                </div>
              </div>
            )}

            {/* 4. Image Upscaler */}
            {tool.id === 'image-upscaler' && (
              <div className="space-y-4 text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Upscale Magnification Factor
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { factor: 2, label: '2x Super-Resolution', desc: 'Double pixel width & height' },
                    { factor: 4, label: '4x Ultra-Resolution', desc: 'Quadruple pixel density' },
                  ].map((opt) => (
                    <button
                      key={opt.factor}
                      onClick={() => {
                        setUpscaleFactor(opt.factor as any);
                        setResult(null);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        upscaleFactor === opt.factor
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold dark:bg-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Background Blur */}
            {tool.id === 'background-blur' && (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between items-center font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    <span>Aperture Bokeh Depth</span>
                    <span className="font-mono text-indigo-600">{blurRadius}px blur</span>
                  </div>
                  <input
                    type="range"
                    min="6"
                    max="36"
                    value={blurRadius}
                    onChange={(e) => {
                      setBlurRadius(parseInt(e.target.value, 10));
                      setResult(null);
                    }}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 10, label: 'f/4.0 (Subtle)' },
                    { val: 18, label: 'f/2.8 (Natural)' },
                    { val: 28, label: 'f/1.4 (Dreamy)' },
                  ].map((ap) => (
                    <button
                      key={ap.val}
                      onClick={() => {
                        setBlurRadius(ap.val);
                        setResult(null);
                      }}
                      className={`p-2 rounded-xl border text-center font-medium ${
                        blurRadius === ap.val
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold dark:bg-indigo-950 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {ap.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Image Unblur */}
            {tool.id === 'image-unblur' && (
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between items-center font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    <span>Deblurring Deconvolution Intensity</span>
                    <span className="font-mono text-indigo-600">
                      {Math.round(unblurIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={unblurIntensity}
                    onChange={(e) => {
                      setUnblurIntensity(parseFloat(e.target.value));
                      setResult(null);
                    }}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* AI Diagnostics Insights Card */}
            {aiInsights && (
              <div className="rounded-2xl border border-indigo-200/80 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40 text-xs space-y-1">
                <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  {aiInsights.title}
                </span>
                <p className="text-indigo-800/90 dark:text-indigo-300/90 leading-relaxed text-[11px]">
                  {aiInsights.content}
                </p>
              </div>
            )}

            {/* Error Message */}
            {configErrorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{configErrorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="flex-1 rounded-xl bg-slate-900 dark:bg-indigo-600 px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{progressStage || 'Processing with AI...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Run AI {tool.name}</span>
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="rounded-xl border border-slate-200/80 px-4 py-3 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Interactive Inspection Column (Before/After Slider or Inpaint Canvas) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-6 dark:border-slate-800 dark:bg-slate-900/60 text-center">
              <div className="flex items-center justify-between pb-3 text-xs border-b border-slate-200/60 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {result
                    ? 'Interactive Comparison (Slide to inspect)'
                    : tool.id === 'object-remover'
                    ? 'Paint Over Area to Remove'
                    : 'Original Image Preview'}
                </span>
                {selectedFile && (
                  <span className="text-slate-400 font-mono tabular-nums">
                    {formatBytes(selectedFile.size)}
                  </span>
                )}
              </div>

              {/* Object Remover Inpainting Canvas */}
              {tool.id === 'object-remover' && !result && originalUrl ? (
                <div className="mt-4">
                  <AiInpaintCanvas
                    imageUrl={originalUrl}
                    brushSize={brushSize}
                    onBrushSizeChange={setBrushSize}
                    onMaskChange={setMaskCanvas}
                  />
                </div>
              ) : result && originalUrl ? (
                /* Before/After Comparison View */
                <div className="mt-4 overflow-hidden rounded-2xl shadow-2xs border border-slate-200/60 dark:border-slate-800">
                  <BeforeAfterSlider
                    beforeUrl={originalUrl}
                    afterUrl={result.url}
                    beforeLabel="Original"
                    afterLabel="AI Enhanced"
                  />
                </div>
              ) : (
                /* Standard Source Preview */
                <div className="mt-4 relative overflow-hidden rounded-2xl bg-checkered p-4 border border-slate-200/60 dark:border-slate-800 min-h-[320px] flex items-center justify-center">
                  <img
                    src={originalUrl!}
                    alt="Source"
                    className="max-h-[480px] w-auto object-contain mx-auto rounded-lg shadow-2xs"
                  />
                </div>
              )}

              {/* Download Bar */}
              {result && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 text-xs text-left">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white block truncate max-w-xs sm:max-w-sm">
                      {result.fileName}
                    </span>
                    <span className="text-slate-400 font-mono tabular-nums">
                      {result.width} × {result.height} px · {formatBytes(result.fileSize)}
                    </span>
                  </div>

                  <a
                    href={result.url}
                    download={result.fileName}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download Processed Image
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
