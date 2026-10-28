import express from "express";
import { confirmTransaction, createTransaction, deleteTransaction, getMyDenaPawaList, pairLedger } from "../Controllers/Transaction/Transaction.controller.js";
import AuthMiddleware from "../Middlewares/AuthMiddleware.js";




const router = express.Router();


router.post("/create",AuthMiddleware,createTransaction);
router.get("/my-dena-pawna-list",AuthMiddleware,getMyDenaPawaList);
router.get("/ledger/:contactId",AuthMiddleware,pairLedger);
router.patch("/:transactionId/confirm",AuthMiddleware,confirmTransaction);
router.patch("/:transactionId/cancel",AuthMiddleware,deleteTransaction);
export default router;

