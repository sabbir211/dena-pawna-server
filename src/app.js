import express from "express";
const app=express();
import cors from "cors";


import userRoutes from "./routes/user.route.js";
import TransactionRoutes from "./routes/Transaction.route.js"


app.use(cors())
app.use(express.json());
app.get('/',(req,res)=>{
    res.status(200).json({message:'Welcome to Dena Pawna Server'});
});

app.get('/health',(req,res)=>{
    res.status(200).json({status:'server is healthy and running'});
});

app.use('/api/user', userRoutes);
app.use("/api/transactions",TransactionRoutes)



export default app;


