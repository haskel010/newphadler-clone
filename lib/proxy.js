const keys = require("./keys");

const proxies = keys.proxies;
let currentProxyIndex = 0;
// Function to get the next proxy in rotation
const getNextProxy = () => {
  const proxy = proxies[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
  return proxy;
};

module.exports = {getNextProxy}