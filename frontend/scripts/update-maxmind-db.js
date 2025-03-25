const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const DB_PATH = path.join(process.cwd(), 'public', 'data', 'GeoLite2-City.mmdb');
const LICENSE_KEY = process.env.MAXMIND_LICENSE_KEY;
const ACCOUNT_ID = process.env.MAXMIND_ACCOUNT_ID;
const TAR_FILE = 'GeoLite2-City.tar.gz';

if (!LICENSE_KEY || !ACCOUNT_ID) {
  console.error('Error: MaxMind credentials not found in .env.local');
  process.exit(1);
}

const DOWNLOAD_URL = `https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${LICENSE_KEY}&suffix=tar.gz`;
console.log('Download URL:', DOWNLOAD_URL);

console.log('Downloading MaxMind GeoLite2 City database...');

// Ensure the target directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Download the database
const file = fs.createWriteStream(TAR_FILE);
https.get(DOWNLOAD_URL, (response) => {
  console.log('Response status:', response.statusCode);
  console.log('Response headers:', response.headers);

  if (response.statusCode === 302) {
    // Handle redirect
    https.get(response.headers.location, (redirectResponse) => {
      if (redirectResponse.statusCode !== 200) {
        console.error('Error downloading database:', redirectResponse.statusMessage);
        process.exit(1);
      }
      redirectResponse.pipe(file);
      file.on('finish', handleExtraction);
    }).on('error', handleError);
  } else if (response.statusCode === 200) {
    response.pipe(file);
    file.on('finish', handleExtraction);
  } else {
    console.error('Error downloading database:', response.statusMessage);
    process.exit(1);
  }
}).on('error', handleError);

function handleExtraction() {
  file.close();
  console.log('Download completed. Extracting...');
  
  try {
    // Extract the database file
    execSync(`tar -xzf ${TAR_FILE}`);
    
    // Find and move the .mmdb file to the correct location
    const mmdbFile = execSync('find . -name "*.mmdb"').toString().trim();
    if (!mmdbFile) {
      throw new Error('Could not find .mmdb file in the extracted contents');
    }

    fs.renameSync(mmdbFile, DB_PATH);
    
    // Clean up
    execSync(`rm -rf ${TAR_FILE} GeoLite2-City_*`);
    
    console.log('MaxMind database updated successfully!');
    console.log('Database location:', DB_PATH);
  } catch (error) {
    console.error('Error processing the downloaded file:', error);
    process.exit(1);
  }
}

function handleError(error) {
  fs.unlink(TAR_FILE, () => {});
  console.error('Error downloading the database:', error);
  process.exit(1);
} 