const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const routes = require('./Routes/routes');
const authentication = require('./middleware/auth_middleware').authentication;
require('dotenv').config();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const responseTime = require('./middleware/responseTime');
const redis = require('./integration/redis');
const cacheMiddleware = require(`./middleware/cache_middleware`);

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: 'draft-7', // Use `RateLimit` header
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

const app = express();

const URI = process.env.MONGODB_URI;

app.use(helmet());

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Middleware to add response time header
app.use(responseTime); 

//  custom format for Morgan
morgan.token('response-time-ms', function (req, res) {
  return res.getHeader('X-Response-Time'); 
});
app.use(morgan(':method :url :response-time-ms'));

//  routes and middleware
app.use(routes);
app.use(authentication);
app.use(limiter);

mongoose.connect(URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to database');
    const PORT = process.env.PORT;
    app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.log('Connection to database failed', err);
  });

redis.connect();

module.exports = app;
