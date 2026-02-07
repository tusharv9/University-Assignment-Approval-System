"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAssignmentArray = exports.uploadAssignment = void 0;
exports.handleUploadError = handleUploadError;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Create uploads directory if it doesn't exist
const uploadsDir = path_1.default.join(process.cwd(), 'uploads', 'assignments');
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configure storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-studentId-random-originalname
        const studentId = req.user?.id || 'unknown';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9); // Add random string for uniqueness
        const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${timestamp}-${studentId}-${random}-${originalName}`;
        cb(null, filename);
    }
});
// File filter - only allow PDF files
const fileFilter = (req, file, cb) => {
    // Check file extension
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (ext === '.pdf') {
        cb(null, true);
    }
    else {
        cb(new Error('Only PDF files are allowed'));
    }
};
// Configure multer
exports.uploadAssignment = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    }
});
// Configure multer for array uploads (bulk upload)
// Note: maxCount is specified in the route handler, not here
exports.uploadAssignmentArray = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size per file
    }
});
// Middleware to handle multer errors
function handleUploadError(err, req, res, next) {
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size exceeds 10MB limit'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Too many files uploaded. Maximum 5 files allowed.'
            });
        }
        return res.status(400).json({
            success: false,
            message: `File upload error: ${err.message}`
        });
    }
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload failed'
        });
    }
    next();
}
//# sourceMappingURL=upload.js.map