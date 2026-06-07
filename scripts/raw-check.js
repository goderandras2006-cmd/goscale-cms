require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

MongoClient.connect(process.env.MONGODB_URI).then(async (client) => {
  const db = client.db();
  const site = await db.collection('sites').findOne({ _id: 'lg-klimatech' });
  console.log('All keys:', Object.keys(site || {}));
  console.log('siteMode:', site?.siteMode);
  console.log('templateFiles type:', typeof site?.templateFiles);
  if (site?.templateFiles) {
    const keys = Object.keys(site.templateFiles);
    console.log('templateFiles keys count:', keys.length);
    console.log('first 5:', keys.slice(0, 5));
  }
  await client.close();
}).catch(e => console.error(e.message));
