const ANIMATED_IMAGE_EXTENSIONS = /\.(gif|apng|webp)$/i;

export function isAnimatedImage(src?: string | null): boolean {
  if (!src) return false;

  // Support absolute URLs and relative paths while ignoring query/hash.
  const normalizedPath = (() => {
    try {
      const parsedUrl = new URL(src, 'http://localhost');
      return parsedUrl.pathname;
    } catch {
      return src.split(/[?#]/, 1)[0];
    }
  })();

  return ANIMATED_IMAGE_EXTENSIONS.test(normalizedPath);
}
