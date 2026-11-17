export interface StoredFile {
  url: string;
  mime: string;
  size: number;
}

export interface StorageProvider {
  save(file: File): Promise<StoredFile>;
  read(name: string): Promise<{ data: Buffer; mime: string } | null>;
}
