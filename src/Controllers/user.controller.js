import User from "../Models/User.model.js";
import Contact from "../Models/Contact.model.js";

const createUser = async (req, res) => {
  const {  name, email, phone, photoUrl } = req.body;
  const  uid  = req.firebaseUid;
 
  if (  !name || !email ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const existingUser = await User.findOne({ firebaseUid:uid });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    

    const newUser = await User.create({
      firebaseUid: uid,
      name,
      email,
      phone,
      photoUrl,
    });

    const userId=newUser._id;

    const contactExists=await Contact.findOne({email:email, linkedUserId:null});
    
    
    if(contactExists){
    
      contactExists.name=name;
      contactExists.phone=phone;
      contactExists.photoURL=photoUrl;
      contactExists.linkedUserId=userId;
      contactExists.isSelf=true;
      contactExists.addedBy=userId;

      await contactExists.save();
     }

     else{
      await Contact.create({
      name,
      email,
      phone,
      photoURL:photoUrl,
      linkedUserId:userId,
      isSelf:true,
      addedBy:userId

     })
     }

    return res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (error) {
    return res.status(500).json({ message: "Error creating user", error: error.message });
  }
};

export {createUser};
