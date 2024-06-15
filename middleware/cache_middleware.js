const redisClient = require('../integration/redis').client;

const cacheMiddleware = async (req, res, next) => {
  const key = `__express__${req.originalUrl}` || req.url;

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  try {
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      let parsedData = JSON.parse(cachedData);
      if (!Array.isArray(parsedData)) {
        console.warn('Cached data is not an array, converting it to an array');
        parsedData = [parsedData];
        await redisClient.set(key, JSON.stringify(parsedData), { EX: 600 });
      }
      return res.render('blog', { posts: parsedData });
    } else {
      res.sendResponse = res.send;
      res.send = (body) => {
        const responseBody = JSON.parse(body);
        const postsArray = Array.isArray(responseBody) ? responseBody : [responseBody];
        redisClient.set(key, JSON.stringify(postsArray), { EX: 600 }); // Cache for 10 minutes
        res.sendResponse(body);
      };
      next();
    }
  } catch (err) {
    console.error('Redis error:', err);
    next();
  }
};

module.exports = cacheMiddleware;
