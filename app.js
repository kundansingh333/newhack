if(process.env.NODE_ENV != "production"){
    require('dotenv').config();
};
console.log(process.env.CLOUD_NAME);



const express=require("express");
const app=express();
const mongoose=require("mongoose");
const path=require("path");
const methodOverride=require("method-override");
const ejsMate=require("ejs-mate");
const ExpressError=require("./utils/ExpressError.js");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
//authenticate
const passport = require('passport');
const LocatStrategy = require('passport-local');
const User = require("./models/user.js");

//routes
const listingRouter=require("./routes/listing.js");
const reviewRouter=require("./routes/review.js");
const userRouter = require("./routes/user.js");
// const MONGO_URL="mongodb://127.0.0.1:27017/wanderlust";
const dbUrl = process.env.ATLASDB_URL;

main()
.then(()=>{
    console.log("connected to DB");
}).catch((err)=>{
    console.log(err);
});


app.set("views",path.join(__dirname,"views"));
app.set("view engine","ejs");
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname,"public")));

const store = MongoStore.create({
    mongoUrl:dbUrl,
    crypto:{
        secret:process.env.SECRET,
    },
    touchAfter:24*3600,
});

store.on("error",()=>{
    console.log("ERROR in MONGO SESSION STORE");
})

const sessionOptions = {
    store,
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires: Date.now() + 7*24*60*60*1000,
        maxAge: 7*24*60*60*1000,
        httpOnly: true,
    }
}

// app.get("/",(req,res)=>{
//     res.send("hi i am on roots");

// });



app.use(session(sessionOptions));
app.use(flash());

//authenticate
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocatStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//locals
app.use((req,res,next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
})


// const dbUrl = process.env.ATLASDB_URL;




async function main(){
    await mongoose.connect(dbUrl);
};


//demo user

app.get("/demouser",async(req,res)=>{
    let fakeUser = new User({
        email:"student@gmail.com",
        username:"delta-student"
    });
    let registeredUser = await User.register(fakeUser,"helloworld");
    res.send(registeredUser);
})

app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewRouter);
app.use("/",userRouter);


// app.get("/testlisting",async(req,res)=>{
//     let sampleListing=new Listing({
//         title:"My new Villa",
//         description:"By the beach",
//         price:1200,
//         location:"Goa,Puducherry",
//         country:"India",

//     });
//     await sampleListing.save()
//     console.log("successfully data saved");
//     res.send("successfully testing");
// });


//EXPRESS ERRO.JS
app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"Page not found!"));
})

app.use((err,req,res,next)=>{
    let{statusCode=505,message="something went wrong"}=err;
    // res.status(statusCode).send(message);
    res.status(statusCode).render("error.ejs",{message});
})
////
app.listen(8080,()=>{
    console.log("app is listening on 8080");
});