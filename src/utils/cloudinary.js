import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Load Cloudinary configuration from environment variables
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Upload the file on Cloudinary
        const cloudinaryResponse = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "image"
        });

        // File uploaded successfully!
        console.log("File has been uploaded successfully:", cloudinaryResponse.url);
        return cloudinaryResponse;
       
    } catch (error) {
        console.error("Error uploading file to Cloudinary:", error.message);
        fs.unlinkSync(localFilePath); // Remove the locally saved temporary file as the upload operation failed
        return null;
    }
}

export { uploadOnCloudinary };
