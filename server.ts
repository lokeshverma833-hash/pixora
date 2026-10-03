import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // CORS middleware for Capacitor Android APK and web clients
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Body parser with 30mb limit for image payloads
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // Initialize Gemini AI client safely
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      ai = new GoogleGenAI();
    } catch (e) {
      console.error('Failed to initialize GoogleGenAI client:', e);
    }
  }

  // Health & AI Configuration Status endpoint
  app.get('/api/ai/status', (req, res) => {
    res.json({
      isConfigured: !!process.env.GEMINI_API_KEY,
      provider: 'Google Gemini',
      model: 'gemini-3.8-flash',
      supportedTools: [
        'ai-enhancer',
        'background-remover',
        'object-remover',
        'image-upscaler',
        'background-blur',
        'image-unblur',
      ],
      timestamp: new Date().toISOString(),
    });
  });

  // Reusable helper to check AI configuration
  const requireAiConfigured = (res: express.Response): boolean => {
    if (!ai || !process.env.GEMINI_API_KEY) {
      res.status(503).json({
        error: 'API_KEY_NOT_CONFIGURED',
        message:
          'Gemini AI API key is not configured on the server. Please set GEMINI_API_KEY in your server environment secrets (Settings > Secrets).',
      });
      return false;
    }
    return true;
  };

  // Classify Gemini errors and sanitize messages
  const classifyGeminiError = (err: any): { status: number; code: string; message: string } => {
    const msg = String(err?.message || err || '');
    const errStr = typeof err === 'object' ? JSON.stringify(err) : String(err);
    const combined = (msg + ' ' + errStr).toLowerCase();
    const status = Number(err?.status || err?.statusCode || 0);

    if (
      status === 429 ||
      combined.includes('429') ||
      combined.includes('resource_exhausted') ||
      combined.includes('quota') ||
      combined.includes('rate limit')
    ) {
      return {
        status: 429,
        code: 'QUOTA_EXHAUSTED',
        message: 'Gemini AI rate limit or quota exceeded. Please try again shortly or use local processing.',
      };
    }

    if (
      status === 503 ||
      combined.includes('503') ||
      combined.includes('unavailable') ||
      combined.includes('high demand') ||
      combined.includes('overloaded')
    ) {
      return {
        status: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Gemini AI service is temporarily experiencing high demand. Please try again shortly.',
      };
    }

    return {
      status: status >= 400 && status < 600 ? status : 500,
      code: 'AI_PROCESSING_ERROR',
      message: 'AI processing service encountered a temporary error. Please try again.',
    };
  };

  // Helper to execute Gemini requests with fallback on temporary demand spikes
  const callGeminiWithRetry = async (contents: any[], responseMimeType?: string) => {
    const config = responseMimeType ? { responseMimeType } : undefined;
    try {
      return await ai!.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config,
      });
    } catch (err: any) {
      const errStr = String(err?.message || err || '') + ' ' + (typeof err === 'object' ? JSON.stringify(err) : '');
      const is429 =
        err?.status === 429 ||
        err?.statusCode === 429 ||
        errStr.includes('429') ||
        errStr.includes('RESOURCE_EXHAUSTED') ||
        errStr.toLowerCase().includes('quota');

      // Do NOT repeatedly retry 429 quota-exhausted requests
      if (is429) {
        throw err;
      }

      if (errStr.includes('503') || errStr.includes('high demand') || errStr.includes('UNAVAILABLE')) {
        console.warn('Model busy, retrying once with gemini-flash-latest...');
        return await ai!.models.generateContent({
          model: 'gemini-flash-latest',
          contents,
          config,
        });
      }
      throw err;
    }
  };

  // 1. AI Photo Enhancer Endpoint
  app.post('/api/ai/enhance', async (req, res) => {
    if (!requireAiConfigured(res)) return;

    try {
      const { imageBase64, mimeType = 'image/jpeg' } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image base64 data is required.' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await callGeminiWithRetry(
        [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType,
                },
              },
              {
                text: `You are an expert digital imaging specialist. Analyze this photo and output optimal image correction parameters in strict JSON format.
Only return valid JSON with these exact numeric keys:
{
  "brightness": number (range 0.85 to 1.3, 1.0 is default),
  "contrast": number (range 0.9 to 1.35, 1.0 is default),
  "saturation": number (range 0.9 to 1.3, 1.0 is default),
  "sharpness": number (range 1.0 to 1.8, 1.0 is default),
  "warmth": number (range -20 to 20, 0 is default),
  "vibrance": number (range 1.0 to 1.3, 1.0 is default),
  "highlights": number (range -30 to 30, 0 is default),
  "shadows": number (range -30 to 30, 0 is default),
  "analysis": "A concise 1-2 sentence description of defects detected (e.g. slight underexposure, cool color cast) and fixes applied."
}`,
              },
            ],
          },
        ],
        'application/json'
      );

      const text = response.text?.trim() || '{}';
      const parsed = JSON.parse(text);
      res.json({ ...parsed, success: true, isAiPowered: true });
    } catch (err: any) {
      console.error('AI enhance error:', err?.message || err);
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({ error: classified.code, message: classified.message });
    }
  });

  // 2. AI Background Remover Endpoint
  app.post('/api/ai/remove-background', async (req, res) => {
    if (!requireAiConfigured(res)) return;

    try {
      const { imageBase64, mimeType = 'image/jpeg', tolerance = 30 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image base64 data is required.' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await callGeminiWithRetry(
        [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType,
                },
              },
              {
                text: `Identify the main subject in this image and provide precise foreground segmentation parameters in strict JSON format:
{
  "subject": "Description of the identified main subject",
  "backgroundType": "Description of the background (e.g., solid studio backdrop, cluttered outdoor)",
  "recommendedEdgeFeathering": number (range 1 to 5),
  "detectedBoundingBox": {
    "topPercent": number,
    "bottomPercent": number,
    "leftPercent": number,
    "rightPercent": number
  },
  "summary": "1 sentence explaining the subject isolation strategy"
}`,
              },
            ],
          },
        ],
        'application/json'
      );

      const parsed = JSON.parse(response.text?.trim() || '{}');
      res.json({ ...parsed, success: true });
    } catch (err: any) {
      console.error('AI background removal error:', err?.message || err);
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({ error: classified.code, message: classified.message });
    }
  });

  // 3. AI Object Remover (Inpainting) Endpoint
  app.post('/api/ai/remove-object', async (req, res) => {
    if (!requireAiConfigured(res)) return;

    try {
      const { imageBase64, mimeType = 'image/jpeg', maskData } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image base64 data is required.' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await callGeminiWithRetry(
        [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType,
                },
              },
              {
                text: `Analyze this image for object removal and seamless generative inpainting.
Output strict JSON format:
{
  "contextAnalysis": "Analysis of surrounding patterns, lighting, and textures around the object",
  "texturePattern": "The dominant repeating texture to reconstruct (e.g., wood grain, sky gradient, brick wall)",
  "inpaintingFeather": number (range 2 to 10),
  "status": "Ready for neural patch synthesis"
}`,
              },
            ],
          },
        ],
        'application/json'
      );

      const parsed = JSON.parse(response.text?.trim() || '{}');
      res.json({ ...parsed, success: true });
    } catch (err: any) {
      console.error('AI object removal error:', err?.message || err);
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({ error: classified.code, message: classified.message });
    }
  });

  // 4. AI Image Upscaler Endpoint
  app.post('/api/ai/upscale', async (req, res) => {
    if (!requireAiConfigured(res)) return;

    try {
      const { imageBase64, mimeType = 'image/jpeg', factor = 2 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image base64 data is required.' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await callGeminiWithRetry(
        [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType,
                },
              },
              {
                text: `Analyze this image for ${factor}x super-resolution upscaling and detail reconstruction.
Output strict JSON format:
{
  "noiseLevel": "low" | "medium" | "high",
  "compressionArtifactsDetected": boolean,
  "edgeSharpeningCoefficient": number (range 1.0 to 2.5),
  "denoiseStrength": number (range 0.1 to 0.8),
  "resolutionAdvice": "1 sentence detailing high-frequency synthesis applied"
}`,
              },
            ],
          },
        ],
        'application/json'
      );

      const parsed = JSON.parse(response.text?.trim() || '{}');
      res.json({ ...parsed, success: true });
    } catch (err: any) {
      console.error('AI upscale error:', err?.message || err);
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({ error: classified.code, message: classified.message });
    }
  });

  // 5. AI Background Blur Endpoint
  app.post('/api/ai/blur-background', async (req, res) => {
    if (!requireAiConfigured(res)) return;

    try {
      const { imageBase64, mimeType = 'image/jpeg', blurRadius = 16 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image base64 data is required.' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await callGeminiWithRetry(
        [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType,
                },
              },
              {
                text: `Estimate the depth planes and subject separation for portrait bokeh simulation.
Output strict JSON format:
{
  "subjectDepthPlane": "foreground",
  "recommendedAperture": "f/1.8" | "f/2.8" | "f/4.0",
  "blurTransitionGradient": number (range 8 to 24),
  "bokehQuality": "Smooth circular bokeh with specular highlights",
  "focusSummary": "1 sentence describing subject isolation"
}`,
              },
            ],
          },
        ],
        'application/json'
      );

      const parsed = JSON.parse(response.text?.trim() || '{}');
      res.json({ ...parsed, success: true });
    } catch (err: any) {
      console.error('AI background blur error:', err?.message || err);
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({ error: classified.code, message: classified.message });
    }
  });

  // 6. AI Image Unblur Endpoint
  app.post('/api/ai/unblur', async (req, res) => {
    if (!requireAiConfigured(res)) return;

    try {
      const { imageBase64, mimeType = 'image/jpeg', intensity = 0.6 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image base64 data is required.' });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await callGeminiWithRetry(
        [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType,
                },
              },
              {
                text: `Analyze the blur defects in this image (motion blur, camera shake, or out-of-focus lens softness).
Output strict JSON format:
{
  "blurType": "motion" | "defocus" | "sensor_softness",
  "estimatedBlurAngle": number (degrees 0 to 180),
  "deconvolutionPasses": number (range 1 to 4),
  "edgeContrastBoost": number (range 1.1 to 1.8),
  "recoverySummary": "1 sentence describing deblurring restoration"
}`,
              },
            ],
          },
        ],
        'application/json'
      );

      const parsed = JSON.parse(response.text?.trim() || '{}');
      res.json({ ...parsed, success: true });
    } catch (err: any) {
      console.error('AI unblur error:', err?.message || err);
      const classified = classifyGeminiError(err);
      res.status(classified.status).json({ error: classified.code, message: classified.message });
    }
  });

  // AI OCR (Optical Character Recognition) Endpoint
  app.post('/api/ai/ocr', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg' } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image base64 data is required.' });
      }

      if (!ai) {
        return res.status(503).json({
          error: 'Gemini API is not configured on the server. Please use browser OCR.',
        });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType,
                },
              },
              {
                text: 'Extract all visible text from this image exactly as written. Preserve line breaks, tabular formatting, headings, and lists where possible. Do not include conversational filler or commentary; return only the extracted text.',
              },
            ],
          },
        ],
      });

      res.json({
        text: response.text?.trim() || '',
        success: true,
      });
    } catch (err: any) {
      console.error('OCR error:', err);
      res.status(500).json({ error: err.message || 'Failed to extract text from image.' });
    }
  });

  // Sitemap.xml endpoint
  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = process.env.APP_URL || 'https://pixora.tools';
    const tools = [
      'compress-image',
      'resize-image',
      'resize-image-kb',
      'resize-image-pixels',
      'resize-image-cm',
      'crop-image',
      'circle-crop',
      'square-crop',
      'aspect-ratio',
      'rotate-image',
      'flip-image',
      'round-corners',
      'jpg-to-png',
      'png-to-jpg',
      'webp-converter',
      'image-to-pdf',
      'passport-photo',
      'signature-resizer',
      'image-metadata',
      'remove-metadata',
      'color-picker',
      'image-to-text',
      'merge-pdf',
      'split-pdf',
      'compress-pdf',
      'jpg-to-pdf',
      'pdf-to-jpg',
      'extract-pdf-pages',
      'rotate-pdf',
      'pdf-watermark',
      'ai-enhancer',
      'background-remover',
      'object-remover',
      'image-upscaler',
      'background-blur',
      'image-unblur',
    ];

    const staticPages = ['', 'download', 'image-tools', 'pdf-tools', 'ai-tools', 'utilities', 'blog', 'about', 'privacy', 'terms'];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const page of staticPages) {
      const url = page ? `${baseUrl}/${page}` : baseUrl;
      xml += `  <url>\n    <loc>${url}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${page === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
    }

    for (const tool of tools) {
      xml += `  <url>\n    <loc>${baseUrl}/tools/${tool}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
    }

    xml += `</urlset>`;
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  });

  // Robots.txt endpoint
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || 'https://pixora.tools';
    const robots = `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`;
    res.header('Content-Type', 'text/plain');
    res.send(robots);
  });

  // Setup Vite middlewares or static files
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pixora Tools server running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
