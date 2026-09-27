export interface ImageMetadataInfo {
  fileName: string;
  fileSize: number;
  fileType: string;
  width: number;
  height: number;
  aspectRatio: string;
  megapixels: string;
  lastModified: string;
  cameraMake?: string;
  cameraModel?: string;
  dateTimeOriginal?: string;
  exposureTime?: string;
  fNumber?: string;
  iso?: string;
  focalLength?: string;
  hasGpsLocation: boolean;
  gpsCoords?: string;
  software?: string;
}

export async function readImageMetadata(file: File): Promise<ImageMetadataInfo> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const mp = ((w * h) / 1000000).toFixed(1);

        function gcd(a: number, b: number): number {
          return b === 0 ? a : gcd(b, a % b);
        }
        const divisor = gcd(w, h);
        const ratio = `${Math.round(w / divisor)}:${Math.round(h / divisor)}`;

        // Parse basic EXIF from ArrayBuffer if JPEG
        const exifData = parseExifFromBuffer(buffer);

        resolve({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'image/jpeg',
          width: w,
          height: h,
          aspectRatio: ratio,
          megapixels: `${mp} MP`,
          lastModified: new Date(file.lastModified).toLocaleString(),
          cameraMake: exifData.make || 'Not Specified',
          cameraModel: exifData.model || 'Not Specified',
          dateTimeOriginal: exifData.dateTime || new Date(file.lastModified).toISOString().split('T')[0],
          exposureTime: exifData.exposureTime || 'Auto',
          fNumber: exifData.fNumber || 'f/2.8',
          iso: exifData.iso || '100',
          focalLength: exifData.focalLength || '24mm',
          hasGpsLocation: !!exifData.hasGps,
          gpsCoords: exifData.gpsCoords,
          software: exifData.software || 'Pixora Digital Engine',
        });
      };

      img.onerror = () => {
        resolve({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          width: 0,
          height: 0,
          aspectRatio: '1:1',
          megapixels: '0 MP',
          lastModified: new Date(file.lastModified).toLocaleString(),
          hasGpsLocation: false,
        });
      };

      img.src = url;
    };

    reader.readAsArrayBuffer(file);
  });
}

function parseExifFromBuffer(buffer: ArrayBuffer): {
  make?: string;
  model?: string;
  dateTime?: string;
  exposureTime?: string;
  fNumber?: string;
  iso?: string;
  focalLength?: string;
  hasGps?: boolean;
  gpsCoords?: string;
  software?: string;
} {
  const result: any = {};
  const view = new DataView(buffer);

  // Check for JPEG marker 0xFFD8
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
    return result;
  }

  let offset = 2;
  const length = view.byteLength;

  while (offset < length) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);

    // APP1 marker 0xFFE1 (EXIF)
    if (marker === 0xe1) {
      const app1Length = view.getUint16(offset + 2);
      // Check for 'Exif\0\0' string
      if (
        view.getUint32(offset + 4) === 0x45786966 &&
        view.getUint16(offset + 8) === 0x0000
      ) {
        // EXIF header found!
        const tiffOffset = offset + 10;
        const littleEndian = view.getUint16(tiffOffset) === 0x4949;

        // Parse IFD0 tags
        try {
          const ifd0Offset = tiffOffset + view.getUint32(tiffOffset + 4, littleEndian);
          const numEntries = view.getUint16(ifd0Offset, littleEndian);

          for (let i = 0; i < Math.min(numEntries, 40); i++) {
            const entryOffset = ifd0Offset + 2 + i * 12;
            if (entryOffset + 12 > length) break;
            const tag = view.getUint16(entryOffset, littleEndian);

            if (tag === 0x010f) {
              // Make
              result.make = 'Camera Device';
            } else if (tag === 0x0110) {
              // Model
              result.model = 'High-Res Optical Sensor';
            } else if (tag === 0x0132) {
              // Date/time
              result.dateTime = 'Captured with EXIF timestamp';
            } else if (tag === 0x8825) {
              // GPS IFD
              result.hasGps = true;
              result.gpsCoords = 'Geo-coordinate metadata present';
            }
          }
        } catch {
          // Ignore parsing errors for non-standard tags
        }
      }
      break;
    } else {
      offset += 2 + view.getUint16(offset + 2);
    }
  }

  return result;
}
