const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, 'src', 'assets', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const fonts = [
  { url: 'https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Regular.ttf', dest: 'Roboto-Regular.ttf' },
  { url: 'https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Bold.ttf', dest: 'Roboto-Bold.ttf' },
  { url: 'https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Italic.ttf', dest: 'Roboto-Italic.ttf' }
];

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(fontsDir, dest));
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
          res.pipe(file);
          file.on('finish', () => { file.close(resolve); });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => { file.close(resolve); });
      }
    }).on('error', reject);
  });
};

Promise.all(fonts.map(f => download(f.url, f.dest)))
  .then(() => console.log('Fonts downloaded successfully'))
  .catch(console.error);
