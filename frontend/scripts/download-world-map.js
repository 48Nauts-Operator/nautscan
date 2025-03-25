const https = require('https');
const fs = require('fs');
const path = require('path');

const WORLD_MAP_URL = 'https://unpkg.com/world-atlas@2.0.2/countries-110m.json';
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'world-110m.json');

console.log('Downloading world map data...');

// Ensure the directory exists
fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

// Download the file
https.get(WORLD_MAP_URL, (response) => {
  if (response.statusCode !== 200) {
    console.error('Error downloading world map:', response.statusMessage);
    process.exit(1);
  }

  const file = fs.createWriteStream(OUTPUT_PATH);
  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('World map data downloaded successfully!');
    console.log('Location:', OUTPUT_PATH);
  });
}).on('error', (error) => {
  console.error('Error downloading world map:', error);
  process.exit(1);
}); 