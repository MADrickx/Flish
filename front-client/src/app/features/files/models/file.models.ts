export type FileItem = {
  id: string;
  relativePath: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
  mimeType: string;
  lastWriteUtc: string;
  indexedAtUtc: string;
};

export type PagedFilesResponse = {
  items: FileItem[];
  page: number;
  pageSize: number;
  total: number;
};

