// 2026-09-28 영수증 사진을 줄여 전송한다
export const compressReceiptImage = (
  file: File,
): Promise<{ mimeType: 'image/jpeg'; data: string }> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('이미지 파일만 읽을 수 있습니다.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const max = 1600;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('이미지를 열지 못했습니다.'));
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
      const data = dataUrl.split(',')[1] ?? '';
      if (!data) {
        reject(new Error('이미지를 열지 못했습니다.'));
        return;
      }
      resolve({ mimeType: 'image/jpeg', data });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 열지 못했습니다.'));
    };
    image.src = url;
  });
