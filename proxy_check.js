// This is a simple utility to verify that the CORS proxy is working
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/health',
  method: 'GET',
  headers: {
    'User-Agent': 'NodeJS-Test-Client'
  }
};

console.log('Sending test request to backend...');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:');
    console.log(data);
    console.log('\nTest complete!');
    
    if (res.statusCode === 200) {
      console.log('✅ Backend health endpoint is responding correctly');
    } else {
      console.log('❌ Backend health endpoint returned unexpected status code');
    }
    
    // Check if CORS headers are present
    if (res.headers['access-control-allow-origin']) {
      console.log('✅ CORS headers are properly configured');
    } else {
      console.log('⚠️ CORS headers might not be properly configured');
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.end();
