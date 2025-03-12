import fetch from 'node-fetch';

/**
 * Geocodes an address using Census Geocoder API
 */
const geocodeAddress = async (street, city, zip) => {
  const formattedAddress = `${street}, ${city}, Indiana ${zip || ''}`;
  const geocodeUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(formattedAddress)}&benchmark=Public_AR_Current&format=json`;
  
  console.log(`Geocoding URL: ${geocodeUrl}`);
  
  try {
    const geocodeResponse = await fetch(geocodeUrl);
    
    if (!geocodeResponse.ok) {
      throw new Error(`Geocoding API returned ${geocodeResponse.status}`);
    }
    
    const geocodeData = await geocodeResponse.json();
    console.log('Geocode response received');
    
    // Check if address was found
    if (!geocodeData.result || !geocodeData.result.addressMatches || geocodeData.result.addressMatches.length === 0) {
      console.log('No address matches found in geocoding response');
      throw new Error('Address not found');
    }
    
    // Get coordinates from the first match
    const match = geocodeData.result.addressMatches[0];
    const longitude = match.coordinates.x;
    const latitude = match.coordinates.y;
    
    console.log(`Coordinates found: lon ${longitude}, lat ${latitude}`);
    
    return {
      coordinates: { longitude, latitude },
      matchedAddress: match.matchedAddress
    };
  } catch (error) {
    console.error('Error in geocoding service:', error);
    throw error;
  }
};

export { geocodeAddress };