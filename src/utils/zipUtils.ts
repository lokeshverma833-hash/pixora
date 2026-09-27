/**
 * Lightweight, zero-dependency ZIP archive generator running entirely in-browser.
 * Complies with the standard ZIP format (PK\x03\x04 Local File Header and PK\x01\x02 Central Directory).
 * Uses uncompressed (STORED / method 0) or standard blob chunks to ensure maximum speed and 100% client-side privacy.
 */

export interface ZipFileInput {
  name: string;
  data: Blob | ArrayBuffer | Uint8Array;
  lastModified?: Date;
}

// CRC32 table initialization
const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function computeCRC32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date = new Date()): { time: number; date: number } {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);
  const time = (hours << 11) | (minutes << 5) | seconds;

  const year = Math.max(1980, date.getFullYear()) - 1980;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const d = (year << 9) | (month << 5) | day;

  return { time, date: d };
}

/**
 * Creates a standard .zip Blob from an array of file inputs completely client-side.
 */
export async function createZipBlob(files: ZipFileInput[]): Promise<Blob> {
  if (files.length === 0) {
    throw new Error('No files provided to create ZIP.');
  }

  const fileEntries: {
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc32: number;
    dosTime: number;
    dosDate: number;
    offset: number;
  }[] = [];

  const textEncoder = new TextEncoder();
  const zipParts: any[] = [];
  let currentOffset = 0;

  for (const file of files) {
    let dataBytes: Uint8Array;
    if (file.data instanceof Uint8Array) {
      dataBytes = file.data;
    } else if (file.data instanceof ArrayBuffer) {
      dataBytes = new Uint8Array(file.data);
    } else if (file.data instanceof Blob) {
      const buffer = await file.data.arrayBuffer();
      dataBytes = new Uint8Array(buffer);
    } else {
      dataBytes = new Uint8Array(0);
    }

    // Clean filename (replace backslashes, forward slashes sanitize)
    const sanitizedName = file.name.replace(/\\/g, '/');
    const nameBytes = textEncoder.encode(sanitizedName);
    const crc = computeCRC32(dataBytes);
    const { time: dosTime, date: dosDate } = dosDateTime(file.lastModified || new Date());

    const entryOffset = currentOffset;

    // 1. Local File Header (30 bytes + name length)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);

    localView.setUint32(0, 0x04034b50, true); // Local file header signature (PK\x03\x04)
    localView.setUint16(4, 20, true);         // Version needed to extract (2.0)
    localView.setUint16(6, 0x0800, true);     // General purpose bit flag (UTF-8 filename)
    localView.setUint16(8, 0, true);          // Compression method: 0 = Stored / uncompressed
    localView.setUint16(10, dosTime, true);   // Last mod file time
    localView.setUint16(12, dosDate, true);   // Last mod file date
    localView.setUint32(14, crc, true);       // CRC-32
    localView.setUint32(18, dataBytes.length, true); // Compressed size
    localView.setUint32(22, dataBytes.length, true); // Uncompressed size
    localView.setUint16(26, nameBytes.length, true); // File name length
    localView.setUint16(28, 0, true);                // Extra field length
    localHeader.set(nameBytes, 30);

    zipParts.push(localHeader);
    zipParts.push(dataBytes);

    currentOffset += localHeader.length + dataBytes.length;

    fileEntries.push({
      nameBytes,
      dataBytes,
      crc32: crc,
      dosTime,
      dosDate,
      offset: entryOffset,
    });
  }

  // 2. Central Directory
  const centralDirStartOffset = currentOffset;
  let centralDirSize = 0;

  for (const entry of fileEntries) {
    const cdHeader = new Uint8Array(46 + entry.nameBytes.length);
    const cdView = new DataView(cdHeader.buffer);

    cdView.setUint32(0, 0x02014b50, true); // Central directory file header signature (PK\x01\x02)
    cdView.setUint16(4, 20, true);         // Version made by (2.0)
    cdView.setUint16(6, 20, true);         // Version needed to extract (2.0)
    cdView.setUint16(8, 0x0800, true);     // General purpose bit flag (UTF-8)
    cdView.setUint16(10, 0, true);         // Compression method: 0
    cdView.setUint16(12, entry.dosTime, true);
    cdView.setUint16(14, entry.dosDate, true);
    cdView.setUint32(16, entry.crc32, true);
    cdView.setUint32(20, entry.dataBytes.length, true);
    cdView.setUint32(24, entry.dataBytes.length, true);
    cdView.setUint16(28, entry.nameBytes.length, true);
    cdView.setUint16(30, 0, true);         // Extra field length
    cdView.setUint16(32, 0, true);         // File comment length
    cdView.setUint16(34, 0, true);         // Disk number start
    cdView.setUint16(36, 0, true);         // Internal file attributes
    cdView.setUint32(38, 0, true);         // External file attributes
    cdView.setUint32(42, entry.offset, true); // Relative offset of local header
    cdHeader.set(entry.nameBytes, 46);

    zipParts.push(cdHeader);
    centralDirSize += cdHeader.length;
    currentOffset += cdHeader.length;
  }

  // 3. End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, 0x06054b50, true); // End of central dir signature (PK\x05\x06)
  eocdView.setUint16(4, 0, true);          // Number of this disk
  eocdView.setUint16(6, 0, true);          // Disk with start of central directory
  eocdView.setUint16(8, fileEntries.length, true);  // Number of entries on this disk
  eocdView.setUint16(10, fileEntries.length, true); // Total number of entries
  eocdView.setUint32(12, centralDirSize, true);     // Size of central directory
  eocdView.setUint32(16, centralDirStartOffset, true); // Offset of start of central directory
  eocdView.setUint16(20, 0, true);         // ZIP comment length

  zipParts.push(eocd);

  return new Blob(zipParts, { type: 'application/zip' });
}

/**
 * Triggers a download of a given Blob with cleanup of the temporary object URL.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup temporary object URL and link node
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 1000);
}
