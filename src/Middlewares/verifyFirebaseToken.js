
import { getAuth } from "firebase-admin/auth";
import "../config/firebase.js"; 
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const idToken = authHeader.split(" ")[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
   

    req.firebaseUid = decodedToken.uid;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default verifyFirebaseToken;