import "dotenv/config";
import app from "./src/app.js";
import connectToDatabase from "./src/config/db.js";

const port=process.env.PORT || 5000;
app.listen(port,()=>{   
    console.log(`Server is running on port ${port}`);
}); 

connectToDatabase();
