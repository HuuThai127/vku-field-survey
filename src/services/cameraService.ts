import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export interface PhotoCaptureResult {
  dataUrl: string;
  source: 'native-camera' | 'web-file-picker';
}

class CameraService {
  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Captures or selects an inspection photo.
   * Uses native Capacitor Camera on Android/iOS; falls back cleanly to web file dialog on browser.
   */
  public async takePhoto(): Promise<PhotoCaptureResult> {
    if (this.isNative()) {
      try {
        console.log('[CameraService] Invoking native Capacitor Camera');
        const image = await Camera.getPhoto({
          quality: 80,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          width: 1200,
          height: 1200,
          correctOrientation: true
        });

        if (!image.dataUrl) {
          throw new Error('No dataUrl returned from native camera');
        }

        return {
          dataUrl: image.dataUrl,
          source: 'native-camera'
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        // User cancelled camera
        if (errorMsg.includes('User cancelled') || errorMsg.includes('cancelled')) {
          throw new Error('Camera capture cancelled');
        }
        console.warn('[CameraService] Native camera error, attempting web fallback:', err);
        return this.captureViaWebInput();
      }
    } else {
      return this.captureViaWebInput();
    }
  }

  /**
   * Browser fallback: dynamically creates an invisible <input type="file" accept="image/*" capture="environment">
   */
  public captureViaWebInput(): Promise<PhotoCaptureResult> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('Document is undefined in this environment'));
        return;
      }

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('capture', 'environment'); // Encourages mobile browsers to open rear camera
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = async () => {
        try {
          const file = input.files?.[0];
          if (!file) {
            reject(new Error('No file selected'));
            return;
          }

          // Read file and optionally downscale via canvas to conserve IndexedDB space
          const dataUrl = await this.readAndCompressImage(file);
          resolve({
            dataUrl,
            source: 'web-file-picker'
          });
        } catch (err) {
          reject(err);
        } finally {
          document.body.removeChild(input);
        }
      };

      input.oncancel = () => {
        document.body.removeChild(input);
        reject(new Error('File selection cancelled'));
      };

      input.click();
    });
  }

  /**
   * Compresses image to max 1200x1200 JPEG to avoid IndexedDB quota issues
   */
  private readAndCompressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let w = img.width;
          let h = img.height;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressed);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export const cameraService = new CameraService();
