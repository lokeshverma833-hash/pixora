import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseFileDropOptions {
  onFileSelect?: (file: File, objectUrl: string) => void;
  maxSizeMB?: number; // Default 50MB to safeguard browser memory
  acceptedTypes?: string[]; // Allowed MIME types
  enableGlobalDrop?: boolean; // Support drag-and-drop over the entire viewport/landing page
}

export interface UseFileDropResult {
  isDragging: boolean;
  file: File | null;
  objectUrl: string | null;
  error: string | null;
  clear: () => void;
  dragProps: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'image/gif',
  'application/pdf',
];

/**
 * Lightweight Zero-Server File Drop Handler Hook
 * - In-memory local processing using URL.createObjectURL
 * - Automatic URL.revokeObjectURL cleanup to prevent browser memory leaks
 * - Strict type & max-size validation to prevent browser crashes
 * - Modular: use as container dragProps or global viewport listener
 */
export const useFileDrop = (options: UseFileDropOptions = {}): UseFileDropResult => {
  const {
    onFileSelect,
    maxSizeMB = 50,
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
    enableGlobalDrop = false,
  } = options;

  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep ref of active objectUrl for clean memory revocation
  const activeUrlRef = useRef<string | null>(null);

  // Revoke active object URL from browser memory
  const revokeActiveUrl = useCallback(() => {
    if (activeUrlRef.current) {
      URL.revokeObjectURL(activeUrlRef.current);
      activeUrlRef.current = null;
    }
  }, []);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      revokeActiveUrl();
    };
  }, [revokeActiveUrl]);

  // Validate file type and size
  const validateAndProcess = useCallback(
    (incomingFile: File): boolean => {
      setError(null);

      // 1. Validate File Size (prevent browser memory crash)
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (incomingFile.size > maxSizeBytes) {
        const fileMB = (incomingFile.size / (1024 * 1024)).toFixed(1);
        setError(`File size (${fileMB}MB) exceeds the safe browser limit of ${maxSizeMB}MB.`);
        return false;
      }

      // 2. Validate MIME Type or extension
      const mime = incomingFile.type.toLowerCase();
      const ext = incomingFile.name.split('.').pop()?.toLowerCase();
      const isValidType =
        acceptedTypes.some((type) => mime === type || mime.startsWith('image/')) ||
        ['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg', 'pdf'].includes(ext || '');

      if (!isValidType) {
        setError('Unsupported format. Please drop a valid Image (JPG, PNG, WebP) or PDF.');
        return false;
      }

      // 3. Revoke existing URL and create new in-memory Object URL
      revokeActiveUrl();
      const newUrl = URL.createObjectURL(incomingFile);
      activeUrlRef.current = newUrl;

      setFile(incomingFile);
      setObjectUrl(newUrl);

      if (onFileSelect) {
        onFileSelect(incomingFile, newUrl);
      }

      return true;
    },
    [maxSizeMB, acceptedTypes, onFileSelect, revokeActiveUrl]
  );

  const clear = useCallback(() => {
    revokeActiveUrl();
    setFile(null);
    setObjectUrl(null);
    setError(null);
    setIsDragging(false);
  }, [revokeActiveUrl]);

  // Container drag event handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = e.dataTransfer?.files;
      if (droppedFiles && droppedFiles.length > 0) {
        validateAndProcess(droppedFiles[0]);
      }
    },
    [validateAndProcess]
  );

  // Optional Global Window Drop listener (landing page wide support)
  useEffect(() => {
    if (!enableGlobalDrop) return;

    let dragCounter = 0;

    const onWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) setIsDragging(true);
    };

    const onWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const onWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDragging(false);
      }
    };

    const onWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDragging(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        validateAndProcess(e.dataTransfer.files[0]);
      }
    };

    window.addEventListener('dragenter', onWindowDragEnter);
    window.addEventListener('dragover', onWindowDragOver);
    window.addEventListener('dragleave', onWindowDragLeave);
    window.addEventListener('drop', onWindowDrop);

    return () => {
      window.removeEventListener('dragenter', onWindowDragEnter);
      window.removeEventListener('dragover', onWindowDragOver);
      window.removeEventListener('dragleave', onWindowDragLeave);
      window.removeEventListener('drop', onWindowDrop);
    };
  }, [enableGlobalDrop, validateAndProcess]);

  return {
    isDragging,
    file,
    objectUrl,
    error,
    clear,
    dragProps: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
};
