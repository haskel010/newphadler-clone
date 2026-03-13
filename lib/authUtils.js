const keys = require("./keys");

const authenticate = (req, res, next) => {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey || apiKey !== keys.API_KEY) {
      return res.status(403).json({ error: "Access denied. Invalid API key." });
    }
    next();
  };

  module.exports = authenticate