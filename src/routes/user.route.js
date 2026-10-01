import express from "express";
import { createUser } from "../Controllers/user.controller.js";
import  verifyFirebaseToken  from "../Middlewares/verifyFirebaseToken.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({ message: "User route is working" });
});

router.post("/create",verifyFirebaseToken,createUser);

export default router;