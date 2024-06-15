module.exports = (req, res, next) => {
  const start = process.hrtime();

  res.on('close', () => {
    const diff = process.hrtime(start);
    const time = diff[0] * 1e3 + diff[1] * 1e-6; // Convert to milliseconds
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', time.toFixed(3) + 'ms');
    }
  });

  next();
};