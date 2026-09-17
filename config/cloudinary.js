import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const isConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_CLOUD_NAME !== 'demo' && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Upload buffer to Cloudinary or return Data URI fallback
 */
export async function uploadImageToCloudinary(fileBuffer, mimeType = 'image/jpeg') {
  if (isConfigured) {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'civic_sense_issues' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );
        uploadStream.end(fileBuffer);
      });
    } catch (err) {
      console.warn('Cloudinary upload error, using fallback:', err.message);
    }
  }

  // Fallback Data URI encoding for instant local preview without API keys required
  const base64Data = fileBuffer.toString('base64');
  return `data:${mimeType};base64,${base64Data}`;
}

export default cloudinary;
