require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const site = await mongoose.connection.collection('sites').findOne(
    { _id: 'lg-klimatech' },
    { projection: { siteMode: 1, liveUrl: 1, cloudflareProjectName: 1 } }
  );
  const tf = await mongoose.connection.collection('sites').findOne(
    { _id: 'lg-klimatech' },
    { projection: { templateFiles: 1 } }
  );
  const keys = tf.templateFiles ? [...Object.keys(tf.templateFiles)] : [];
  console.log('siteMode:', site.siteMode);
  console.log('liveUrl:', site.liveUrl);
  console.log('cloudflareProjectName:', site.cloudflareProjectName);
  console.log('templateFiles count:', keys.length);
  console.log('files:', keys.slice(0, 8));
  await mongoose.disconnect();
}).catch(e => console.error(e.message));
