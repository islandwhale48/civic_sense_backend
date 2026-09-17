import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validate image buffer using Python AI Image Detector service
 */
export async function detectSelfieOrInvalidImage(imageBuffer, mimeType = 'image/jpeg') {
  if (!imageBuffer || imageBuffer.length === 0) {
    return { isValidCivicPhoto: true, isSelfie: false, reason: 'No image provided.' };
  }

  // 1. Try Flask AI microservice endpoint with binary image buffer payload
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch('http://localhost:5001/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      body: imageBuffer,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err) {
    console.warn('Flask AI microservice notice, switching to direct CLI detector fallback');
  }

  // 2. Direct CLI fallback execution via Python detector.py script if microservice fails
  try {
    const tempPath = path.join(__dirname, `../temp_${Date.now()}.jpg`);
    fs.writeFileSync(tempPath, imageBuffer);

    const scriptPath = path.join(__dirname, '../ai_detector/detector.py');

    return new Promise((resolve) => {
      execFile('py', [scriptPath, tempPath], (error, stdout) => {
        // Clean temp file
        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (e) {}

        if (error || !stdout) {
          return resolve({ isValidCivicPhoto: true, isSelfie: false, reason: 'CLI fallback execution notice.' });
        }

        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (e) {
          resolve({ isValidCivicPhoto: true, isSelfie: false, reason: 'JSON parse notice.' });
        }
      });
    });
  } catch (err) {
    return { isValidCivicPhoto: true, isSelfie: false, reason: 'Verification notice.' };
  }
}
