import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
} from "../controller/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { authenticateUser } from "../middleware/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]),
    registerUser
);
router.route("/login").post(loginUser);
router.route("/refreshtoken").post(refreshAccessToken);

// Routes below require a valid access token
router.route("/logout").post(authenticateUser, logoutUser);
router.route("/change-password").post(authenticateUser, changeCurrentPassword);
router.route("/current-user").get(authenticateUser, getCurrentUser);
router.route("/update-account").patch(authenticateUser, updateAccountDetails);
router.route("/avatar").patch(authenticateUser, upload.single("avatar"), updateUserAvatar);
router.route("/cover-image").patch(authenticateUser, upload.single("coverImage"), updateUserCoverImage);

export default router;
