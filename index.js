const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require("body-parser");

const PORT = process.env.PORT || 8000;

// Define base path
const basePath = process.cwd();

// Increase max event listeners to avoid memory leaks
require('events').EventEmitter.defaultMaxListeners = 100;

// Load route modules
const qrRoute = require('./qr');
const pairCodeRoute = require('./pair');

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Route APIs
app.use('/qr', qrRoute);
app.use('/code', pairCodeRoute);

// Serve static HTML pages
app.get('/pair', (req, res) => {
    res.sendFile(path.join(basePath, 'pair.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(basePath, 'main.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});

module.exports = app;
