import asyncHandler from '../utlis/asyncHandler.js';
import { ApiError } from '../utlis/ApiError.js';
import { User } from '../model/user.model.js';
import { fileUpload } from '../utlis/cloudinary.js';
import { ApiResponse } from '../utlis/apiResponse.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';

const cookieOptions = {
    httpOnly: true,
    secure: true,
};

const generateRefreshAndAccessToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (err) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
};

// Multer has already written the uploads to public/temp; remove them when the
// request is rejected before they are sent to Cloudinary.
const discardUploads = (req) => {
    const files = Object.values(req.files || {}).flat();
    for (const file of files) {
        fs.rm(file.path, { force: true }, () => {});
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;
    const hasEmpty = [fullName, email, username, password].some(
        (field) => typeof field !== "string" || field.trim() === ""
    );
    if (hasEmpty) {
        discardUploads(req);
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({
        $or: [{ email }, { username }]
    });
    if (existingUser) {
        discardUploads(req);
        throw new ApiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await fileUpload(avatarLocalPath);
    const coverImage = await fileUpload(coverImageLocalPath);
    if (!avatar) {
        throw new ApiError(500, "Avatar upload failed");
    }

    const user = await User.create({
        fullName,
        email,
        username,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, "User not created");
    }
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User created successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;
    if (!(email || username)) {
        throw new ApiError(400, "Email or username is required");
    }
    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }]
    });
    // Same message for an unknown user and a wrong password, so the response
    // does not reveal which accounts exist.
    if (!user || !(await user.isPassword(password))) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateRefreshAndAccessToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, loggedInUser, "User logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { new: true }
    );
    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is missing");
    }

    let decoded;
    try {
        decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await User.findById(decoded?._id);
    if (!user || incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "Refresh token is invalid or has been used");
    }

    const { accessToken, refreshToken } = await generateRefreshAndAccessToken(user._id);
    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "All fields are required");
    }
    const user = await User.findById(req.user?._id);
    const isValidPassword = await user.isPassword(oldPassword);
    if (!isValidPassword) {
        throw new ApiError(401, "Old password is incorrect");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, req.user, "Current user fetched")
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }
    const emailTaken = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (emailTaken) {
        throw new ApiError(409, "Email is already in use");
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { fullName, email } },
        { new: true }
    ).select("-password -refreshToken");
    return res.status(200).json(
        new ApiResponse(200, user, "Account details updated successfully")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarPath = req.file?.path;
    if (!avatarPath) {
        throw new ApiError(400, "Avatar file is missing");
    }
    const avatar = await fileUpload(avatarPath);
    if (!avatar?.url) {
        throw new ApiError(500, "Avatar upload failed");
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password -refreshToken");
    return res.status(200).json(
        new ApiResponse(200, user, "Avatar updated successfully")
    );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImagePath = req.file?.path;
    if (!coverImagePath) {
        throw new ApiError(400, "Cover image file is missing");
    }
    const coverImage = await fileUpload(coverImagePath);
    if (!coverImage?.url) {
        throw new ApiError(500, "Cover image upload failed");
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { coverImage: coverImage.url } },
        { new: true }
    ).select("-password -refreshToken");
    return res.status(200).json(
        new ApiResponse(200, user, "Cover image updated successfully")
    );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};
