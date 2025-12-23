export interface BoundingBox {
  width: number;
  height: number;
}

export interface ScreenshotMetadata {
  fileHash: string;
  lastGenerated: string;
  sourcePath: string;
  screenshots: {
    light: string;
    dark: string;
  };
  boundingBox?: BoundingBox;
}

export interface Manifest {
  stories: Record<string, ScreenshotMetadata>;
}
