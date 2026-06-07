require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const SiteSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['landing', 'shop', 'hybrid'], default: 'landing' },
  siteMode: { type: String, enum: ['html_cloudflare', 'demo_template'], default: 'demo_template' },
  password: { type: String, required: true },
  liveUrl: { type: String },
  cloudflareProjectName: { type: String },
  templateFiles: { type: Map, of: String },
}, { timestamps: true, _id: false });

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Site = mongoose.model('Site', SiteSchema);
  
  // Test save
  const s = new Site({
    _id: 'test-temp-site',
    name: 'Test',
    password: 'test',
    siteMode: 'html_cloudflare',
    liveUrl: 'https://test.pages.dev',
    templateFiles: new Map([['index.html', '<html>test</html>']])
  });
  await s.save();
  
  const found = await mongoose.connection.collection('sites').findOne({ _id: 'test-temp-site' });
  console.log('siteMode:', found.siteMode);
  console.log('liveUrl:', found.liveUrl);
  console.log('templateFiles:', typeof found.templateFiles, found.templateFiles ? Object.keys(found.templateFiles) : 'null');
  
  await mongoose.connection.collection('sites').deleteOne({ _id: 'test-temp-site' });
  await mongoose.disconnect();
}).catch(e => console.error(e.message));
