import {asyncHandler} from "../utils/ayncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
 

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const getUser = await User.findById(userId)

        const accessToken = await getUser.generateAccessToken()
        const refreshToken = await getUser.generateRefreshToken()

        getUser.refreshToken = refreshToken
        await getUser.save({validateBeforeSave: false})
        
        return{accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}


const registerUser = asyncHandler(async (req, res) => {
    const { fullName, userName, email, password } = req.body;

    if ([fullName, userName, email, password].some((field) => field.trim() === "")) {
        throw new ApiError(400, "All fields are required!");
    }

    const existedUser = await User.findOne({ $or: [{ userName }, { email }] });

    if (existedUser) {
        throw new ApiError(409, "User with email or userName already exists");
    }



    const avatarLocalPath = req.files?.avatar?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required!");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(500, "Error uploading avatar file to Cloudinary");
    }

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files?.coverImage) && req.files?.coverImage?.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
        // Uncomment the following lines if you want to upload the cover image to Cloudinary
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        if (!coverImage) {
            throw new ApiError(500, "Error uploading cover image file to Cloudinary");
        }
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImageLocalPath ? "URL of cover image" : "", // Update with the actual URL or remove if not uploading
        email,
        password,
        userName: userName.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Error while registering the user");
    }

    return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully!"));
});

// username or email
// find the user
// password
// Access or refresh token
// send cookies

const loginUser = asyncHandler( async (req, res) => {

    const {userName, email, password} = req.body ;

    if(!userName && !email) {
        // console.log("User Name:" , req.body.userName);
        // console.log("Email", req.body.email);
        throw new ApiError(400, "Username or Passoword required !")
    } 



    const getUser = await User.findOne({
        $or: [{userName}, {email}]
    })

    if (!getUser) {
        throw new ApiError(404, `User does'nt exist !`)
    }

    


    const isPasswordValid = await bcrypt.compare(req.body.password, getUser.password)
    // const isPasswordValid = await getUser.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid Password !")
    }

    const {accessToken, refreshToken} =  await generateAccessAndRefreshTokens(getUser._id)

    const loggedInUser = await User.findById(getUser._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, "User logged In Successfully")
    )
})

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndDelete(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
        
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken
    
        if (incomingRefreshToken) {
            throw new ApiError(401, "Unatuthorized request")
        }
    
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used !")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
        
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, {accessToken, newRefreshToken}
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

export { registerUser , loginUser, logoutUser, refreshAccessToken};
