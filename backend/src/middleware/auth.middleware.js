import jwt from "jsonwebtoken";
import asyncHandler from "../utlis/asyncHandler.js";
import { User } from "../model/user.model.js";
import { ApiError } from "../utlis/ApiError.js";

const authenticateUser = asyncHandler(async (req, res, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "").trim();
    if (!token) {
        throw new ApiError(401, "Unauthorized: no access token");
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
        throw new ApiError(401, "Unauthorized: invalid or expired access token");
    }

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    if (!user) {
        throw new ApiError(401, "Unauthorized: user no longer exists");
    }
    req.user = user;
    next();
});

export { authenticateUser };
