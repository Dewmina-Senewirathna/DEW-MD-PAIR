const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 7860;

require('events').EventEmitter.defaultMaxListeners = 500;

// middleware FIRST
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// routes
const server = require('./qr');
const code = require('./pair');

app.use('/server', server);
app.use('/code', code);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
