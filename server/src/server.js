require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { autoSeedDrugCatalog } = require('./seeds/drugCatalog.seed');

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

// Connect to database then seed default data
connectDB().then(() => {
  autoSeedDrugCatalog();
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

