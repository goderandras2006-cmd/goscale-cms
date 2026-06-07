require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// A process.env.MONGODB_URI-ból beolvasott URI
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  // Töröljük a rosszul importált lg-klimatech-t
  await mongoose.connection.collection('sites').deleteOne({ _id: 'lg-klimatech' });
  await mongoose.connection.collection('contents').deleteMany({ siteId: 'lg-klimatech' });
  console.log('Törölve. Most importáld újra a UI-ból az Agency Dashboardon!');
  await mongoose.disconnect();
}).catch(e => console.error(e.message));
