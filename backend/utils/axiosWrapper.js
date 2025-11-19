const axios = require('axios');

const defaultOptions = {
  retries: 3,
  retryDelay: 500,
};

async function request(options = {}, opts = {}) {
  const { retries, retryDelay } = { ...defaultOptions, ...opts };
  let attempt = 0;

  while (true) {
    try {
      const res = await axios(options);
      return res;
    } catch (err) {
      attempt++;
      const shouldRetry = attempt <= retries && (!err.response || err.response.status >= 500);
      if (!shouldRetry) throw err;
      const wait = retryDelay * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

module.exports = { request };
