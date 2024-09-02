import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const generateAuthToken=(user)=>{
      const token=jwt.sign({id:user._id},process.env.JWT_KEY);
      return token;
}