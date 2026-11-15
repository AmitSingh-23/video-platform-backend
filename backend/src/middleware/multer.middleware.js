import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const TEMP_DIR = './public/temp';
fs.mkdirSync(TEMP_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, TEMP_DIR);
    },
    filename: function (req, file, cb) {
        // Random name so two uploads with the same original name cannot
        // overwrite each other, and user-supplied names never reach the disk.
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    }
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per image
    fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
        const err = new Error('Only JPEG, PNG or WebP images are allowed');
        err.statusCode = 400;
        cb(err);
    }
});
