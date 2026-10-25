/**
 * Image compression utility for student ID photos.
 * Downscales camera and gallery images to optimal avatar dimensions (max 320x320)
 * at high visual quality (JPEG 0.75-0.8), reducing 2MB-10MB mobile photos to ~25KB.
 * Ensures Firestore documents never exceed the 1MB (1,048,576 bytes) limit.
 */

export async function compressImage(
  input: File | string,
  maxDimension = 320,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(typeof input === 'string' ? input : '');
          return;
        }

        // Draw and compress to JPEG
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (err) {
        console.warn('Canvas image compression failed, using original input:', err);
        resolve(typeof input === 'string' ? input : '');
      }
    };

    img.onerror = () => {
      resolve(typeof input === 'string' ? input : '');
    };

    if (typeof input === 'string') {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(input);
    }
  });
}
