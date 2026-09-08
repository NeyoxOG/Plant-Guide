export const MAX_IMAGE_BYTES = 1024 * 1024;
export function imageType(bytes) {
  const starts = (...s) => s.every((v, i) => bytes[i] === v);
  const text = (a, b) => String.fromCharCode(...bytes.slice(a, b));
  if (starts(0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10)) return 'image/png';
  if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (text(0, 4) === 'RIFF' && text(8, 12) === 'WEBP') return 'image/webp';
  if (['GIF87a', 'GIF89a'].includes(text(0, 6))) return 'image/gif';
  if (text(4, 8) === 'ftyp' && ['avif', 'avis'].includes(text(8, 12))) return 'image/avif';
  return null;
}
