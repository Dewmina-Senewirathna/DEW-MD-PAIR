const mega = require("megajs");

const auth = {
    email: 'hansadewmina2008@gmail.com',
    password: 'hansa2008122@',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
};

const upload = (data, name) => {
    return new Promise((resolve, reject) => {
        if (!auth.email || !auth.password || !auth.userAgent) {
            return reject(new Error("❌ Missing required authentication fields"));
        }

        console.log("✅ Mega auth loaded:", auth.email);

        const storage = new mega.Storage(auth);

        // Wait until the storage is fully ready
        storage.on('ready', () => {
            const uploadStream = storage.upload({ name, allowUploadBuffering: true });

            data.pipe(uploadStream);

            storage.on('add', (file) => {
                file.link((err, url) => {
                    if (err) {
                        return reject(err);
                    }

                    storage.close();
                    console.log("✅ File uploaded:", url);
                    return resolve(url);
                });
            });
        });

        // Handle storage errors
        storage.on('error', (err) => {
            return reject(err);
        });
    });
};

module.exports = { upload };
