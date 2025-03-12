import NodeCache from 'node-cache';
import fs from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// API Cache configuration
const API_CACHE_TTL = 3600;
const apiCache = new NodeCache({ stdTTL: API_CACHE_TTL });

// District cache to avoid frequent calls to GIS service
const districtCache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours

// Path for storing call data (one level up from config directory)
const dataFilePath = join(dirname(__dirname), 'data', 'call-data.json');

// Global call counter
let globalCallCounter = 0;

// Load existing call data if available
try {
  // Ensure the data directory exists
  const dataDir = join(dirname(__dirname), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(dataFilePath)) {
    const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    globalCallCounter = data.globalCallCount || 0;
    console.log(`Loaded global call count: ${globalCallCounter}`);
  } else {
    // Create file with initial data
    fs.writeFileSync(dataFilePath, JSON.stringify({ globalCallCount: 0 }));
    console.log('Created new call data file');
  }
} catch (error) {
  console.error('Error loading call data:', error);
}

// Save call data function
const saveCallData = () => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify({ globalCallCount: globalCallCounter }));
    console.log(`Saved global call count: ${globalCallCounter}`);
  } catch (error) {
    console.error('Error saving call data:', error);
  }
};

export { 
  apiCache, 
  districtCache, 
  globalCallCounter, 
  saveCallData 
};