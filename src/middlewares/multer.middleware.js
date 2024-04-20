import multer from "multer";

const storage = multer.diskStorage({
    // issue in code below
    // destination: function (req, file, cb) {  
    //     cb(null, "/uploads");
    // },
    filename: function (req, file, cb) {
        // Example: Append a timestamp to the filename to ensure uniqueness
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, file.originalname);
    }
});

export const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB limit (adjust as needed)
    },
});
