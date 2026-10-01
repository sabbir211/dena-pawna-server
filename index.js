import dotenv from "dotenv";
import app from "./src/app.js";
import connectToDatabase from "./src/config/db.js";
dotenv.config("./.env");



const port=process.env.PORT || 5000;
app.listen(port,()=>{   
    console.log(`Server is running on port ${port}`);
}); 

connectToDatabase();
