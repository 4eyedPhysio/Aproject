const mongoose = require(`mongoose`);
const bcrypt = require (`bcrypt`);
const {isEmail, isLowercase} = require(`validator`);
const logger = require(`../middleware/logger`);

// now the schema, we create an instance of mongoose

const userSchema = new mongoose.Schema({
    First_name:{
        type:String,
        required:[true, "please enter a first name"]
    },
    Last_name:{
        type:String,
        required:[true,"please enter your last name"]
    },
    email:{
        type:String,
        required:[true, "please enter an email"],
        unique: true,
        lowercase:true,
        validate:[isEmail,"please enter a valid email"]
    },
    password:{
        type:String,
        required:[true,"please enter a password"],
        minLength:[6,"minimum password length is six characters"]
    },
    Date_registered:{
        type:Date,
        default: Date.now
    }
})

//now its time to hash and salt the password before saving it in our database

userSchema.pre(`save`, async function (next){
   if(!this.isModified(`password`)){
    return next()
    //this line checks if the password is already harshed so as not to re-harsh it....the return next skips the whole middleware if the password is already hashed
   }
   const salt = await bcrypt.genSalt(10)
   //so to fully add the salt , we must include it in the password and hash them together
   this.password = await bcrypt.hash(this.password, salt);
   next();
})


// time to set the login schema

userSchema.statics.login = async function (email, password){
    try {
        const user = await this.findOne({email});
        if(user){
            const compare= await bcrypt.compare(password, user.password);

            if(compare){
                logger.userLogger.log(`info`,`user logged in successfully`);
                return user;
                
            }
            logger.userLogger.log(`error`,`user has incorrect password`);
            throw new Error (`incorrect password`)
        }
        logger.userLogger.log(`error`,`user has incorrect email`);
        throw new Error (`incorrect email`)
    } catch (err) {
        throw err;
    }
}

// since the schema is create , its time to input it as the model using mongoose

const User = mongoose.model(`user`, userSchema);
//remember that in the database, mongodb pluralizes the name

module.exports = User;
