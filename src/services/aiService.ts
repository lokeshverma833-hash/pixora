import { Capacitor } from '@capacitor/core';

/**
 * Service to interface with secure server-side AI processing endpoints
 */

export const RENDER_BACKEND_URL = 'https://pixora-api-1.onrender.com';

/**
 * Resolves the API base URL based on runtime environment:
 * - Native Capacitor app (Android/iOS): https://pixora-api-1.onrender.com
 * - Web app: Relative path ('')
 */
export function getApiBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return RENDER_BACKEND_URL;
  }
  return '';
}

export function resolveApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

export interface AiServerStatus {
  isConfigured: boolean;
  provider: string;
  model: string;
  supportedTools: string[];
}

export interface AiEnhanceResponse {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  warmth: number;
  vibrance: number;
  highlights: number;
  shadows: number;
  analysis: string;
  isAiPowered: boolean;
  success?: boolean;
}

export interface AiBackgroundResponse {
  subject: string;
  backgroundType: string;
  recommendedEdgeFeathering: number;
  detectedBoundingBox?: {
    topPercent: number;
    bottomPercent: number;
    leftPercent: number;
    rightPercent: number;
  };
  summary: string;
  success?: boolean;
}

export interface AiInpaintResponse {
  contextAnalysis: string;
  texturePattern: string;
  inpaintingFeather: number;
  status: string;
  success?: boolean;
}

export interface AiUpscaleResponse {
  noiseLevel: string;
  compressionArtifactsDetected: boolean;
  edgeSharpeningCoefficient: number;
  denoiseStrength: number;
  resolutionAdvice: string;
  success?: boolean;
}

export interface AiBokehResponse {
  subjectDepthPlane: string;
  recommendedAperture: string;
  blurTransitionGradient: number;
  bokehQuality: string;
  focusSummary: string;
  success?: boolean;
}

export interface AiUnblurResponse {
  blurType: string;
  estimatedBlurAngle: number;
  deconvolutionPasses: number;
  edgeContrastBoost: number;
  recoverySummary: string;
  success?: boolean;
}

export class AiConfigurationError extends Error {
  readonly status = 503;
  constructor(message: string) {
    super(message);
    this.name = 'AiConfigurationError';
  }
}

export class AiRateLimitError extends Error {
  readonly status = 429;
  constructor(message: string) {
    super(message);
    this.name = 'AiRateLimitError';
  }
}

export class AiServiceUnavailableError extends Error {
  readonly status = 503;
  constructor(message: string) {
    super(message);
    this.name = 'AiServiceUnavailableError';
  }
}

/**
 * Check if the server has AI API keys configured
 */
export async function checkAiServerStatus(): Promise<AiServerStatus> {
  try {
    const res = await fetch(resolveApiUrl('/api/ai/status'));
    if (!res.ok) {
      return {
        isConfigured: false,
        provider: 'Google Gemini',
        model: 'gemini-3.8-flash',
        supportedTools: [],
      };
    }
    return await res.json();
  } catch (err) {
    console.warn('Could not query AI status:', err);
    return {
      isConfigured: false,
      provider: 'Google Gemini',
      model: 'gemini-3.8-flash',
      supportedTools: [],
    };
  }
}

/**
 * Convert file to clean base64 data url
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/**
 * Generic post helper with error classification
 */
async function postAiEndpoint<T>(endpoint: string, payload: any): Promise<T> {
  let res: Response;
  const targetUrl = resolveApiUrl(endpoint);
  try {
    res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (netErr: any) {
    throw new AiServiceUnavailableError(
      'Unable to connect to the AI processing service. Please check your network connection or try again shortly.'
    );
  }

  const data = await res.json().catch(() => ({}));

  if (
    res.status === 429 ||
    data.error === 'QUOTA_EXHAUSTED' ||
    data.error === 'RESOURCE_EXHAUSTED' ||
    String(data.message || '').includes('429')
  ) {
    throw new AiRateLimitError(
      data.message || 'Gemini AI rate limit or quota exceeded (HTTP 429). Please wait a moment before retrying.'
    );
  }

  if (res.status === 503 || data.error === 'SERVICE_UNAVAILABLE') {
    if (data.error === 'API_KEY_NOT_CONFIGURED') {
      throw new AiConfigurationError(
        data.message ||
          'Gemini AI API key is not configured on the server. Please set GEMINI_API_KEY in your deployment environment secrets.'
      );
    }
    throw new AiServiceUnavailableError(
      data.message || 'Gemini AI service is temporarily experiencing high demand (HTTP 503). Please try again shortly.'
    );
  }

  if (!res.ok) {
    const rawMsg = data.message || data.error || `Server AI processing failed (${res.status})`;
    // Sanitize any API key or sensitive server patterns
    const sanitizedMsg = String(rawMsg).replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');
    throw new Error(sanitizedMsg);
  }

  return data as T;
}

export async function requestAiEnhance(
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<AiEnhanceResponse> {
  return postAiEndpoint<AiEnhanceResponse>('/api/ai/enhance', { imageBase64, mimeType });
}

export async function requestAiBackgroundRemoval(
  imageBase64: string,
  mimeType = 'image/jpeg',
  tolerance = 30
): Promise<AiBackgroundResponse> {
  return postAiEndpoint<AiBackgroundResponse>('/api/ai/remove-background', {
    imageBase64,
    mimeType,
    tolerance,
  });
}

export async function requestAiObjectInpainting(
  imageBase64: string,
  mimeType = 'image/jpeg',
  maskData?: string
): Promise<AiInpaintResponse> {
  return postAiEndpoint<AiInpaintResponse>('/api/ai/remove-object', {
    imageBase64,
    mimeType,
    maskData,
  });
}

export async function requestAiUpscale(
  imageBase64: string,
  mimeType = 'image/jpeg',
  factor = 2
): Promise<AiUpscaleResponse> {
  return postAiEndpoint<AiUpscaleResponse>('/api/ai/upscale', {
    imageBase64,
    mimeType,
    factor,
  });
}

export async function requestAiBackgroundBlur(
  imageBase64: string,
  mimeType = 'image/jpeg',
  blurRadius = 16
): Promise<AiBokehResponse> {
  return postAiEndpoint<AiBokehResponse>('/api/ai/blur-background', {
    imageBase64,
    mimeType,
    blurRadius,
  });
}

export async function requestAiUnblur(
  imageBase64: string,
  mimeType = 'image/jpeg',
  intensity = 0.6
): Promise<AiUnblurResponse> {
  return postAiEndpoint<AiUnblurResponse>('/api/ai/unblur', {
    imageBase64,
    mimeType,
    intensity,
  });
}
