import fetch from 'node-fetch';
import { districtCache } from '../config/cache.js';

/**
 * Find legislative districts for given coordinates
 */
const findDistricts = async (longitude, latitude) => {
  // Try to get district info from cache first
  const cacheKey = `${longitude},${latitude}`;
  const cachedDistricts = districtCache.get(cacheKey);
  
  if (cachedDistricts) {
    console.log('Using cached district information');
    return cachedDistricts;
  }
  
  // Need to query the GIS service
  const gisUrl = `https://gisdata.in.gov/server/rest/services/Hosted/Voting_District_Boundaries_2023/FeatureServer/1/query?geometry=${longitude},${latitude}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=h,s&returnGeometry=false&f=json`;
  
  console.log(`GIS URL: ${gisUrl}`);
  
  try {
    const gisResponse = await fetch(gisUrl);
    
    if (!gisResponse.ok) {
      throw new Error(`GIS service returned ${gisResponse.status}`);
    }
    
    const gisData = await gisResponse.json();
    
    if (gisData.features && gisData.features.length > 0) {
      // Extract district numbers from the response
      const feature = gisData.features[0];
      const houseDistrict = parseInt(feature.attributes.h);
      const senateDistrict = parseInt(feature.attributes.s);
      
      // Create result object
      const districts = { houseDistrict, senateDistrict };
      
      // Cache the results
      districtCache.set(cacheKey, districts);
      
      console.log(`Districts found: House ${houseDistrict}, Senate ${senateDistrict}`);
      return districts;
    } else {
      console.log('No district found for these coordinates');
      throw new Error('No district found for these coordinates');
    }
  } catch (error) {
    console.error('Error querying GIS service:', error);
    throw error;
  }
};

export { findDistricts };