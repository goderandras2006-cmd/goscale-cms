require('dotenv').config({ path: '.env.local' });
const http = require('http');

const boundary = 'FormBoundary' + Math.random().toString(36).substr(2);
const CRLF = '\r\n';

function addField(name, value) {
  return [
    '--' + boundary,
    'Content-Disposition: form-data; name="' + name + '"',
    '',
    value,
    ''
  ].join(CRLF);
}

const bodyParts = [
  addField('siteId', 'lg-klimatech'),
  addField('name', 'L&G Klimatech Kft.'),
  addField('password', 'klima2024'),
  addField('liveUrl', 'https://lg-klimatech.pages.dev'),
  addField('cloudflareProjectName', 'lg-klimatech'),
  addField('localPath', 'c:/Users/K/Projects/lg-hvac-website'),
  '--' + boundary + '--' + CRLF
];

const body = bodyParts.join('');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/sites/import',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Cookie': 'agency_auth=' + process.env.AGENCY_PASSWORD,
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data.substring(0, 500));
  });
});
req.on('error', e => console.error(e.message));
req.write(body);
req.end();
