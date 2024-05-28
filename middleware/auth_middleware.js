require(`dotenv`).config();
const User = require(`../model/users`);
//since its jwt we are using, so we will have to call it and make sure your secret key is also created too
const jwt = require(`jsonwebtoken`);
const logger = require(`./logger`); //we import the logger function here if we want to use it to log when a user is authenticated or authorized

// now to create the jwt function for authorization
const authorization = async function(req,res,next){
    //so for this we need the token and the secret
    const token = req.cookies.jwt;
    const secret = process.env.SECRET_KEY;

    //since we've gotten the both, now is to use our trycatch
    
    try {
        if(token){
            const decodedToken = jwt.verify(token, secret);
            const user = await User.findById(decodedToken.id);
            if(user){
                req.user = user;
                logger.userLogger.log(`info`,`user successfully authorized`);
                console.log(user);
                next();
            }else{
                logger.userLogger.log(`error`,`error finding user`);
                throw new Error ("user not found");
            }
        }else{
            logger.userLogger.log(`error`,`user not authorized`);
            throw new Error( "Token not present");
        }
    } catch (err) {
        logger.userLogger.log(`error`,`user not authorized`);
        console.error(err.message);
        res.locals.user= null;
        res.status(404).json({message:`please log in`});
    }
};


//now to create the main one for authentication

const authentication = (req, res, next)=>{
    const token = req.cookies.jwt;
    const secret = process.env.SECRET_KEY;
    if(token){
        jwt.verify(token,secret, async(err, decodedToken)=>{
            if(err){
                logger.userLogger.log(`error`,`user not authenticated`);
                console.log(err.message);
                res.locals.user= null;
                next();
            }else{
                let user = await User.findById(decodedToken.id);
                logger.userLogger.log(`info`,`user successfully authenticated`);
                console.log(user);
                req.user = user;
                res.locals.user= user;
                next();
            }
        })
    }else{
        logger.userLogger.log(`error`,`user not found`);
        res.locals.user= null;
        next();
    }
}

module.exports ={authentication, authorization};
