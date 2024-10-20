const {Router}=require("express");
const userrouter=Router();
const {z}=require("zod");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const {auth}=require("../middleware/user");
const {JWT_SECRET}=require("../config");
const {userModel,coursesModel,purchasesModel}=require("../db");
userrouter.post('/signup',async(req,res)=>{
    const {email,username,password}=req.body;
    if(!email || !username || !password){
        return res.status(400).json({
            message:"incomplete credentials"
        });
    }
    const requireBody=z.object({
        email:z.string().email().max(100).min(5),
        username:z.string().min(5).max(15),
        password:z.string().min(5).max(15)
    });
    const pasrseddata=requireBody.safeParse(req.body);
    if(!pasrseddata.success){
        return res.status(400).json({
            message:"incorrect format",
            error:pasrseddata.error
        });
    }
    try{
        const user=await userModel.findOne({username,email});
        if(user){
            return res.status(400).json({
                message:"username or email already in use"
            });
        }
        const hashedpassword=await bcrypt.hash(password,10);
        await userModel.create({
            username:username,
            email:email,
            password:hashedpassword
        })
        return res.status(200).json({
            message:"user added successfully"
        });
    }catch(error){
        console.log(error);
        return res.status(500).json({
            message:"internal server error"
        });
    }
});
userrouter.post('/signin',async(req,res)=>{
    const {email,password}=req.body;
    if(!email||!password){
        return res.status(400).json({
            message:"incomplete credentials"
        });
    }
    const requireBody=z.object({
        email:z.string().email().max(100).min(5),
        password:z.string().min(5).max(15)
    });
    const pasrseddata=requireBody.safeParse(req.body);
    if(!pasrseddata.success){
        return res.status(400).json({
            message:"incorrect format",
            error:pasrseddata.error
        });
    }
    try{
        const user=await userModel.findOne({email});
        if(!user){
            return res.status(400).json({
                message:"invalid credentials"
            })
        }
        const compare=await bcrypt.compare(password,user.password);
        if(!compare){
            return res.status(400).json({
                message:"invalid credentials"
            })
        }const token=jwt.sign({
            id:user._id.toString()
        },JWT_SECRET);
        return res.status(200).json({
            message:"login successfull",
            authorization:token
        });
    }catch(error){
        console.log(error);
        return res.status(500).json({
            message:"internal server error"
        })
    }
});
userrouter.get('/my/courses',auth,async(req,res)=>{
    try{
        const courses=await purchasesModel.find({userId:req.userId});
        if(courses.length===0){
            return res.status(400).json({
                message:"no course found"
            });
        }
        const courseids=courses.map((course)=>course.courseId);
        const coursedata=await coursesModel.find({
            _id:{$in:courseids}
        });
        if(!coursedata){
            return res.status(400).json({
                message:"course data not found"
            });
        }
        return res.status(200).json({
            coursedata:coursedata
        });
    }catch(error){
        console.log(error);
        return res.status(500).json({
            message:"internal server error"
        });
    }
});
userrouter.post('/purchase/course',auth,async(req,res)=>{
    try{
        const {courseid}=req.body;
        if(!courseid){
            return res.status(400).json({
                message:"course not found"
            });
        }await purchasesModel.create({
            userId:req.userId,
            courseId:courseid
        });
        return res.status(200).json({
            message:"course purchased successfully"
        });
    }catch(error){
        console.log(error);
        return res.status(500).json({
            message:"internal server error"
        });
    }
});
module.exports={
    userrouter:userrouter
}