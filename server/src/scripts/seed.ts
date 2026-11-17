/** Seeds demo data into the database in MONGODB_URI. Run: npm run seed */
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from '../services/seedData.js';

connectDB()
  .then(seedDatabase)
  .then(disconnectDB)
  .catch(async (e) => {
    console.error(e);
    await disconnectDB();
    process.exit(1);
  });
