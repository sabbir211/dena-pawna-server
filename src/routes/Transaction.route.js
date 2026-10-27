import express from "express";
import { createTransaction, getMyDenaPawaList, pairLedger } from "../Controllers/Transaction/Transaction.controller.js";
import AuthMiddleware from "../Middlewares/AuthMiddleware.js";




const router = express.Router();


router.post("/create",AuthMiddleware,createTransaction);
router.get("/my-dena-pawna-list",AuthMiddleware,getMyDenaPawaList);
router.get("/ledger/:contactId",AuthMiddleware,pairLedger);

export default router;

