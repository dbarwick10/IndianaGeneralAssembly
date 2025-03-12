import fetch from 'node-fetch';
import { apiCache } from '../config/cache.js';
import 'dotenv/config';

/**
 * Fetches data from the Indiana General Assembly API with caching
 */
const fetchIGAData = async (year, endpoint) => {
  const cacheKey = `${year}-${endpoint}`;
  const cachedData = apiCache.get(cacheKey);
  
  if (cachedData) {
    // console.log(`Cache hit for ${cacheKey}`);
    return cachedData;
  }
  
  const url = `https://api.iga.in.gov/${year}/${endpoint}`;
  
  try {
    // console.log(`Fetching from IGA API: ${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "x-api-key": process.env.MYIGA_API_KEY,
        "User-Agent": `iga-api-client-${process.env.MYIGA_API_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    apiCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    throw error;
  }
};

export { fetchIGAData };