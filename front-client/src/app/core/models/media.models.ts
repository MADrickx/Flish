export type MediaCategory = 'video' | 'audio' | 'photo' | 'document' | 'other';

export type MediaItem = {
  id: string;
  relativePath: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
  mimeType: string;
  category: MediaCategory;
  shortCode: string;
  isPublic: boolean;
  lastWriteUtc: string;
  indexedAtUtc: string;
};

export type GroupedMediaItem = {
  baseName: string;
  relativeDirectory: string;
  variants: MediaItem[];
};

export type PagedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[i]}`;
}
