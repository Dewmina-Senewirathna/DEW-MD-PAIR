const express = require('express');
const cors = require('cors');   // 1. Require cors
const app = express();
__path = process.cwd();
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
let server = require('./qr'),
    code = require('./pair');

require('events').EventEmitter.defaultMaxListeners = 500;

// 2. Setup CORS - replace with your actual InfinityFree domain
const allowedOrigin = 'https://dew-md-pair.free.nf'; // <-- change this

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use('/qr', server);
app.use('/code', code);

app.use('/pair', async (req, res, next) => {
  res.sendFile(__path + '/pair.html');
});

app.use('/', async (req, res, next) => {
  res.sendFile(__path + '/main.html');
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:` + PORT);
});

module.exports = app;
