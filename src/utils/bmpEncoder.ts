/**
 * Simple BMP Encoder for Oxion
 * Converts a pixel array [[color, color], ...] to a Base64 BMP image
 */

export function pixelsToBMPBase64(pixels: string[][]): string {
  const height = pixels.length;
  const width = pixels[0]?.length || 0;
  if (width === 0 || height === 0) return '';

  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;

  const buffer = new Uint8Array(fileSize);
  const view = new DataView(buffer.buffer);

  // File Header
  buffer[0] = 0x42; // B
  buffer[1] = 0x4D; // M
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true); // Offset to pixel data

  // DIB Header
  view.setUint32(14, 40, true); // Header size
  view.setUint32(18, width, true);
  view.setUint32(22, height, true);
  view.setUint16(26, 1, true); // Planes
  view.setUint16(28, 24, true); // Bits per pixel
  view.setUint32(34, pixelDataSize, true);

  // Pixel Data (Bottom-up)
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const color = pixels[y][x];
      let r = 0, g = 0, b = 0;
      
      if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        }
      } else if (color === 'transparent') {
        // BMP 24-bit doesn't support transparency easily, 
        // using magic pink or just black for now
        r = 0; g = 0; b = 0;
      }

      buffer[offset++] = b;
      buffer[offset++] = g;
      buffer[offset++] = r;
    }
    // Padding
    for (let p = 0; p < (rowSize - width * 3); p++) {
      buffer[offset++] = 0;
    }
  }

  // Convert to base64 robustly for React Native/Browser environments
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  
  // Custom btoa polyfill for environments without it
  const b64encode = (input: string) => {
    const str = input;
    let output = '';
    for (let block = 0, charCode = 0, idx = 0, map = chars;
      str.charAt(idx | 0) || (map = '=', idx % 1);
      output += map.charAt(63 & block >> 8 - idx % 1 * 8)
    ) {
      charCode = str.charCodeAt(idx += 3 / 4);
      if (isNaN(charCode)) charCode = 0; // Handle end of string
      if (charCode > 0xFF) {
        throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = (block << 8) | charCode;
    }
    return output;
  };

  return b64encode(binary);
}
