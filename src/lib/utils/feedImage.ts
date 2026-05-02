export const FEED_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const FEED_IMAGE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const FEED_IMAGE_MIN_EDGE = 720;
const FEED_IMAGE_WIDE_RATIO = 1.4;
const FEED_IMAGE_TALL_RATIO = 0.75;

export interface FeedImageAsset {
  previewUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width: number;
  height: number;
  aspectRatio: number;
  warnings: string[];
}

export interface FeedImageCrop {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('이미지를 미리보기로 불러오지 못했어요.'));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(new Error('이미지를 읽는 중 문제가 발생했어요.'));
    };

    reader.readAsDataURL(file);
  });
}

function measureImage(previewUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      resolve({
        width: image.width,
        height: image.height,
      });
    };

    image.onerror = () => {
      reject(new Error('이미지 정보를 확인하지 못했어요.'));
    };

    image.src = previewUrl;
  });
}

function loadImageElement(previewUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지를 편집 화면으로 불러오지 못했어요.'));

    image.src = previewUrl;
  });
}

function getRenderedImageMetrics(asset: FeedImageAsset, frameSize: number, zoom: number) {
  const baseScale = Math.max(frameSize / asset.width, frameSize / asset.height);
  const scale = baseScale * zoom;
  const renderedWidth = asset.width * scale;
  const renderedHeight = asset.height * scale;

  return {
    scale,
    renderedWidth,
    renderedHeight,
    maxOffsetX: Math.max(0, (renderedWidth - frameSize) / 2),
    maxOffsetY: Math.max(0, (renderedHeight - frameSize) / 2),
  };
}

export function clampFeedImageCrop(asset: FeedImageAsset, crop: FeedImageCrop, frameSize: number): FeedImageCrop {
  const metrics = getRenderedImageMetrics(asset, frameSize, crop.zoom);

  return {
    zoom: crop.zoom,
    offsetX: Math.min(metrics.maxOffsetX, Math.max(-metrics.maxOffsetX, crop.offsetX)),
    offsetY: Math.min(metrics.maxOffsetY, Math.max(-metrics.maxOffsetY, crop.offsetY)),
  };
}

export async function analyzeFeedImage(file: File): Promise<FeedImageAsset> {
  if (!FEED_IMAGE_ALLOWED_TYPES.includes(file.type)) {
    throw new Error('JPG, PNG, GIF 파일만 업로드할 수 있어요.');
  }

  if (file.size > FEED_IMAGE_MAX_BYTES) {
    throw new Error('이미지는 5MB 이하로 올려주세요.');
  }

  const previewUrl = await readFileAsDataUrl(file);
  const { width, height } = await measureImage(previewUrl);
  const aspectRatio = width / height;
  const warnings: string[] = [];

  if (Math.min(width, height) < FEED_IMAGE_MIN_EDGE) {
    warnings.push('해상도가 낮아 상세 화면에서 흐리게 보일 수 있어요.');
  }

  if (aspectRatio > FEED_IMAGE_WIDE_RATIO) {
    warnings.push('가로가 긴 이미지는 1:1 카드에 맞추며 좌우가 잘려 보일 수 있어요.');
  }

  if (aspectRatio < FEED_IMAGE_TALL_RATIO) {
    warnings.push('세로가 긴 이미지는 1:1 카드에 맞추며 상하가 잘려 보일 수 있어요.');
  }

  return {
    previewUrl,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    width,
    height,
    aspectRatio,
    warnings,
  };
}

export async function cropFeedImageToSquare(
  asset: FeedImageAsset,
  crop: FeedImageCrop,
  frameSize: number,
  outputSize = 1080,
): Promise<FeedImageAsset> {
  const clampedCrop = clampFeedImageCrop(asset, crop, frameSize);
  const image = await loadImageElement(asset.previewUrl);
  const metrics = getRenderedImageMetrics(asset, frameSize, clampedCrop.zoom);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('이미지 편집을 완료하지 못했어요. 다시 시도해주세요.');
  }

  canvas.width = outputSize;
  canvas.height = outputSize;

  const imageLeft = (frameSize - metrics.renderedWidth) / 2 + clampedCrop.offsetX;
  const imageTop = (frameSize - metrics.renderedHeight) / 2 + clampedCrop.offsetY;
  const sourceX = Math.max(0, (-imageLeft) / metrics.scale);
  const sourceY = Math.max(0, (-imageTop) / metrics.scale);
  const sourceSize = frameSize / metrics.scale;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    Math.min(asset.width - sourceX, sourceSize),
    Math.min(asset.height - sourceY, sourceSize),
    0,
    0,
    outputSize,
    outputSize,
  );

  return {
    ...asset,
    previewUrl: canvas.toDataURL('image/png'),
    fileName: asset.fileName.replace(/\.[^/.]+$/, '') + '-square.png',
    mimeType: 'image/png',
    width: outputSize,
    height: outputSize,
    aspectRatio: 1,
  };
}

export function formatImageFileSize(fileSize: number): string {
  if (fileSize < 1024 * 1024) {
    return `${(fileSize / 1024).toFixed(1)}KB`;
  }

  return `${(fileSize / (1024 * 1024)).toFixed(1)}MB`;
}
