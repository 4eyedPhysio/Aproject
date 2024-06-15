const joi = require(`joi`);

//we define a function here that takes the created signin schema and also a payload from the schema and runs it 

const validator= (schema)=>(payload)=>schema.validate(payload, {abortEarly: false});

const signInSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(3).max(10).required()
 })



 const registrationSchema= joi.object({
    First_name: joi.string().min(3).required(), 
    Last_name: joi.string().min(3).required(),
    email:joi.string().email().required(),
    password: joi.string().min(3).max(10).required(),
    Date_registered:joi.date().default(()=>{new Date(), `current date`})
 })

 //then we can use this as a middleware to validate the route
 module.exports.validateSignIn= validator(signInSchema);
 module.exports.validateRegistration= validator(registrationSchema);

 