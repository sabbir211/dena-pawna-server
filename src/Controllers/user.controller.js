import User from "../Models/User.model.js";

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
    return res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (error) {
    return res.status(500).json({ message: "Error creating user", error: error.message });
  }
};

export {createUser};
