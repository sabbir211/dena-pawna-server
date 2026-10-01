
import mongoose from "mongoose";



const connectToDatabase=async()=>{
    
    try{
        await mongoose.connect(process.env.MONGODB_URI,{dbName:process.env.DB_NAME});
        console.log("Connected to database");
    }
    catch(error){
        console.error("Error connecting to database:", error);
        process.exit(1); 
    }
}
export default connectToDatabase;