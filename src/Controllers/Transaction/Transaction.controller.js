import Transaction from "../../Models/Transaction.model.js";
import User from "../../Models/User.model.js";
import Contact from "../../Models/Contact.model.js";
import ReCalculatePairBalance from "../../Utils/ReCalculatePairBalance.js";
import PairRecordModel from "../../Models/PairRecord.model.js";

const createTransaction=async(req,res)=>{

    try{
        const createdBy=req.user._id;

        const {name,receiverEmail,amount,note,proofImage,dueDate,direction}=req.body;
        if(!name || !receiverEmail || !amount || !direction){
            return res.status(400).json({message:"Missing required fields"});
        }
        

        const sender=await Contact.findOne({linkedUserId:createdBy,isSelf:true});
        let receiver=await Contact.findOne({email:receiverEmail});


        if(!sender){
            return res.status(404).json({message:"Sender contact not found"});
        }
        if(!receiver){
            receiver=await Contact.create({
                name,
                email:receiverEmail,
                isSelf:false,
                addedBy:createdBy
            })
          
        }
        const from=direction==="give"?sender._id:receiver._id;
        const to=direction==="give"?receiver._id:sender._id;
        
        const newTransaction= await Transaction.create({
            from,
            to,
            amount,
            note,
            proofImage,
            dueDate,
            createdBy
        });

        //calculate pair
        await ReCalculatePairBalance(from,to);




        return res.status(201).json({ message: "Transaction created successfully", transaction: newTransaction });
    }
    catch(error){
        console.error("Error in createTransaction:", error);
        return res.status(500).json({ message: "Failed to create transaction" });
    }

}

const getMyDenaPawaList=async(req,res)=>{
    const myUserId=req.user._id;

    const myContact=await Contact.findOne({linkedUserId:myUserId,isSelf:true});
    if(!myContact){
        return res.status(404).json({message:"My contact not found"});
    }
try{

    const myContactId=myContact._id;

    const pairs=await PairRecordModel.find({
        $or:[
            {contactA:myContactId},
            {contactB:myContactId}
        ]
    }).populate("contactA contactB");

    return res.status(200).json({ message: "My pairs found successfully", pairs });
}
catch(error){
    
    return res.status(500).json({ message: "Failed to get my dena pawna list" });
}

}

export {createTransaction,getMyDenaPawaList};