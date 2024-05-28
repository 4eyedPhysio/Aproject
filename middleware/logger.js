const {createLogger, transports, format}= require(`winston`);

//time to create a function for logging

const userLogger = createLogger({
    transports:[
        new transports.File({
            filename: `User.log`,
            level:`info`,
            format: format.combine(format.timestamp(),format.json())
        }),
        //for errors now, we create a new transport file
        new transports.File({
            filename:`User-error.log`,
            level: `error`,
            format: format.combine(format.timestamp(),format.json())
        })
    ]
})

//now we export the function
module.exports= {userLogger}