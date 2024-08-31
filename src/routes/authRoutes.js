import { Router } from "express";
import { signup,login } from "../controllers/authController.js";
import { validateLogin,validateRegister } from "../validators/authVAlidators.js";

const router=Router();
router.post("/register",validateRegister,signup);
router.post("/login",validateLogin,login);

export default router
