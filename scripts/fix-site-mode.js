require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const r = await mongoose.connection.collection('sites').updateOne(
    { _id: 'lg-klimatech' },
    { $set: { siteMode: 'html_cloudflare', liveUrl: 'https://lg-klimatech.pages.dev', cloudflareProjectName: 'lg-klimatech' } }
  );
  console.log('updated:', r.modifiedCount);
  
  // Verify
  const site = await mongoose.connection.collection('sites').findOne(
    { _id: 'lg-klimatech' },
    { projection: { siteMode: 1, liveUrl: 1, cloudflareProjectName: 1 } }
  );
  console.log('verified:', JSON.stringify(site));
  await mongoose.disconnect();
}).catch(e => console.error(e.message));
