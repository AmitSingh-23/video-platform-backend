import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const removeLocalFile = (filepath) => {
    try {
        if (filepath && fs.existsSync(filepath)) fs.unlinkSync(filepath);
    } catch (err) {
        console.error("Could not remove temp file:", filepath, err.message);
    }
};

const fileUpload = async (filepath) => {
    if (!filepath) return null;
    try {
        const response = await cloudinary.uploader.upload(filepath, {
            resource_type: "auto"
        });
        return response;
    } catch (error) {
        console.error("Cloudinary upload error:", error.message);
        return null;
    } finally {
        // The local copy is only a staging file; remove it either way.
        removeLocalFile(filepath);
    }
};

export { fileUpload };
