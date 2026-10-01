// import User from "../Models/User.model.js";
// import admin from "../config/firebase.js";


// const AuthMiddleware = async (req, res, next) => {

//    try{
//      const authHeader = req.headers.authorization;
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//         return res.status(401).json({ message: "Unauthorized" });
//     }
//     next();

//     const token=authHeader.split(" ")[1];
//     const decodedToken=await admin.auth().verifyIdToken(token);


//     const user=await User.findOne({firebaseUid:decodedToken.uid});

//     if (!user) {
//         return res.status(401).json({ message: "User not found" });
//     }

//     req.user=user;
//     next();

//    }
//    catch(error){
//     console.error("Error in AuthMiddleware:", error);
//     return res.status(500).json({ message: "Authentication failed" });
//    }
// };

// export default AuthMiddleware;