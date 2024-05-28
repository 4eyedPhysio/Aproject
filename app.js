const express = require(`express`);
const mongoose = require(`mongoose`);
const path = require(`path`);
const cookieParser= require(`cookie-parser`);
const routes = require(`./Routes/routes`);
const authentication = require(`./middleware/auth_middleware`).authentication;
require (`dotenv`).config();





const app = express();

const URI = process.env.MONGODB_URI

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

app.set(`view engine`, `ejs`);
app.set(`views`, path.join(__dirname, `views`));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(routes);
app.use(authentication);



mongoose.connect(URI, {useNewUrlParser:true},{useUnifiedTopology:true}).then(()=>{
    console.log(`connected to database`);
    //include the port 
    const PORT = process.env.PORT;
    app.listen(PORT, ()=>{
        console.log(`server is running on port:${PORT}`)
    })
}).catch((err)=>{
    console.log(`connection to database failed`, err)
})
// since we will be using it in our test, so we have to export it
module.exports= app;