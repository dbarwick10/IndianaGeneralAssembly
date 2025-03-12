import { geocodeAddress } from './geocodingService.js';
import { findDistricts } from './districtService.js';
import { fetchIGAData } from './igaService.js';
import { houseRepresentatives, stateSenatorsData } from '../data/districts.js';

/**
 * Fetch legislators by address
 */
const fetchLegislatorsByAddress = async (street, city, zip, year) => {
  try {
    console.log(`Finding legislators for address: ${street}, ${city}, Indiana ${zip || ''}`);
    
    // STEP 1: Fetch legislators data
    const legislatorsData = await fetchIGAData(year, "legislators");
    console.log(`Fetched ${legislatorsData.itemCount} legislators from IGA API`);
    
    // STEP 2: Geocode the address
    const geocodeResult = await geocodeAddress(street, city, zip);
    const { coordinates, matchedAddress } = geocodeResult;
    
    // STEP 3: Find districts for the address
    const districts = await findDistricts(coordinates.longitude, coordinates.latitude);
    const { houseDistrict, senateDistrict } = districts;
    
    // STEP 4: Find legislators for these districts
    const legislators = [];
    let foundHouseRepFromAPI = false;
    let foundSenatorFromAPI = false;
    
    // Find in API data first
    if (legislatorsData && legislatorsData.items && legislatorsData.items.length > 0) {
      // Find House representative
      const houseRep = legislatorsData.items.find(item => {
        const itemDistrict = item.district !== undefined ? String(item.district) : null;
        const targetDistrict = String(houseDistrict);
        return item.position_title === "Representative" && itemDistrict === targetDistrict;
      });
      
      // Find Senator
      const senator = legislatorsData.items.find(item => {
        const itemDistrict = item.district !== undefined ? String(item.district) : null;
        const targetDistrict = String(senateDistrict);
        return item.position_title === "Senator" && itemDistrict === targetDistrict;
      });
      
      // Add house representative to results
      if (houseRep) {
        foundHouseRepFromAPI = true;
        legislators.push(formatLegislator(houseRep, 'H'));
      }
      
      // Add senator to results
      if (senator) {
        foundSenatorFromAPI = true;
        legislators.push(formatLegislator(senator, 'S'));
      }
    }
    
    // Fallback to local data if needed
    if (!foundHouseRepFromAPI) {
      const houseRep = houseRepresentatives.find(rep => rep.district === houseDistrict);
      if (houseRep) {
        legislators.push(formatLocalLegislator(houseRep, 'H', legislatorsData.items));
      }
    }
    
    if (!foundSenatorFromAPI) {
      const senator = stateSenatorsData.find(sen => sen.district === senateDistrict);
      if (senator) {
        legislators.push(formatLocalLegislator(senator, 'S', legislatorsData.items));
      }
    }
    
    return {
      items: legislators,
      houseDistrict,
      senateDistrict,
      address: matchedAddress,
      coordinates
    };
  } catch (error) {
    console.error('Error in legislator service:', error);
    throw error;
  }
};

/**
 * Format legislator from API data
 */
const formatLegislator = (legislator, chamber) => {
  const extractLegislatorId = (link) => {
    const parts = link.split('/');
    return parts[parts.length - 1];
  };
  
  return {
    firstName: legislator.firstname,
    lastName: legislator.lastname,
    district: String(legislator.district),
    chamber: chamber,
    party: legislator.partyid, 
    link: `/legislators/${extractLegislatorId(legislator.link)}`
  };
};

/**
 * Format legislator from local data
 */
const formatLocalLegislator = (legislator, chamber, apiLegislators) => {
  // Try to find party info from API
  let party = 'Unknown';
  if (apiLegislators) {
    const nameParts = legislator.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    const positionTitle = chamber === 'S' ? "Senator" : "Representative";
    
    const matchingLegislator = apiLegislators.find(item => 
      item.position_title === positionTitle && 
      item.firstname.toLowerCase() === firstName.toLowerCase() && 
      item.lastname.toLowerCase().includes(lastName.toLowerCase().split(',')[0])
    );
    
    if (matchingLegislator) {
      party = matchingLegislator.partyid;
    }
  }
  
  return {
    firstName: legislator.name.split(' ')[0],
    lastName: legislator.name.split(' ').slice(1).join(' '),
    district: String(legislator.district),
    chamber: chamber,
    party: party,
    link: `/legislators/${legislator.name.replace(/\s+/g, '_').toLowerCase()}`
  };
};

/**
 * Get party abbreviation
 */
const getPartyAbbreviation = (party) => {
  if (!party) return '';
  
  const partyLower = party.toLowerCase();
  if (partyLower.includes('democrat')) {
    return 'D';
  } else if (partyLower.includes('republican')) {
    return 'R';
  } else if (partyLower.includes('independent')) {
    return 'I';
  } else {
    return '';
  }
};

export { fetchLegislatorsByAddress, getPartyAbbreviation };