import { fetchIGAData } from '../services/igaService.js';
import { geocodeAddress } from '../services/geocodingService.js';
import { findDistricts } from '../services/districtService.js';
import { houseRepresentatives, stateSenatorsData } from '../data/districts.js';

/**
 * Get legislators by address
 */
const getLegislatorsByAddress = async (req, res) => {
  try {
    const { year } = req.params;
    const { street, city, zip } = req.query;
    
    if (!street || !city) {
      return res.status(400).json({
        error: "Missing address information",
        details: "Street and city are required"
      });
    }
    
    console.log(`Finding legislators for address: ${street}, ${city}, Indiana ${zip || ''}`);
    
    // STEP 1: Fetch current legislators data from IGA API
    let legislatorsData;
    try {
      legislatorsData = await fetchIGAData(year, "legislators");
      console.log(`Fetched ${legislatorsData.itemCount} legislators from IGA API`);
    } catch (error) {
      console.error('Error fetching legislators data:', error);
      throw new Error(`Failed to fetch legislators data: ${error.message}`);
    }
    
    // STEP 2: Convert address to coordinates using Census Geocoder
    let geocodeResult;
    try {
      geocodeResult = await geocodeAddress(street, city, zip);
    } catch (error) {
      return res.status(404).json({
        error: "Address not found",
        details: "Could not locate the provided address"
      });
    }
    
    const { coordinates, matchedAddress } = geocodeResult;
    const { longitude, latitude } = coordinates;
    
    // STEP 3: Find the voting districts
    let districts;
    try {
      districts = await findDistricts(longitude, latitude);
    } catch (error) {
      console.error('Error finding districts:', error);
      return res.status(500).json({
        error: "Could not determine legislative districts",
        details: error.message
      });
    }
    
    const { houseDistrict, senateDistrict } = districts;

    // STEP 4: Look up the legislators from the API data
    // Function to extract legislator ID from link
    const extractLegislatorId = (link) => {
      // Parse the ID from links like "/2023/legislators/david_abbott_1"
      const parts = link.split('/');
      return parts[parts.length - 1];
    };

    // Add debug logging for districts
    console.log(`Looking for legislators in House district ${houseDistrict} and Senate district ${senateDistrict}`);
    
    // Find House representative and Senator from the API data
    const legislators = [];
    
    // Try to find legislators both in API data and local data
    let foundHouseRepFromAPI = false;
    let foundSenatorFromAPI = false;
    
    // First try to find legislators in the API data
    if (legislatorsData && legislatorsData.items && legislatorsData.items.length > 0) {
      console.log(`Searching through ${legislatorsData.items.length} legislators from API`);
      
      // Log a few sample legislators to debug format
      if (legislatorsData.items.length > 0) {
        console.log(`Sample legislator from API: ${JSON.stringify(legislatorsData.items[0])}`);
      }
      
      // Find House representative by district
      const houseRep = legislatorsData.items.find(item => {
        // Convert both to strings for comparison
        const itemDistrict = item.district !== undefined ? String(item.district) : null;
        const targetDistrict = String(houseDistrict);
        
        return item.position_title === "Representative" && itemDistrict === targetDistrict;
      });
      
      // Find Senator by district
      const senator = legislatorsData.items.find(item => {
        // Convert both to strings for comparison
        const itemDistrict = item.district !== undefined ? String(item.district) : null;
        const targetDistrict = String(senateDistrict);
        
        return item.position_title === "Senator" && itemDistrict === targetDistrict;
      });
      
      // Add house representative to results if found
      if (houseRep) {
        foundHouseRepFromAPI = true;
        console.log(`Found House representative in API: ${houseRep.firstname} ${houseRep.lastname}`);
        
        legislators.push({
          firstName: houseRep.firstname,
          lastName: houseRep.lastname,
          district: String(houseRep.district),
          chamber: 'H',
          party: houseRep.partyid, // Use party from API
          link: `/legislators/${extractLegislatorId(houseRep.link)}`
        });
      } else {
        console.log(`House representative for district ${houseDistrict} not found in API data`);
      }
      
      // Add senator to results if found
      if (senator) {
        foundSenatorFromAPI = true;
        console.log(`Found Senator in API: ${senator.firstname} ${senator.lastname}`);
        
        legislators.push({
          firstName: senator.firstname,
          lastName: senator.lastname,
          district: String(senator.district),
          chamber: 'S',
          party: senator.partyid, // Use party from API
          link: `/legislators/${extractLegislatorId(senator.link)}`
        });
      } else {
        console.log(`Senator for district ${senateDistrict} not found in API data`);
      }
    } else {
      console.log(`No API data available or empty items array`);
    }
    
    // Fallback to local data for any legislators not found in API, but try to get party info from API individually
    if (!foundHouseRepFromAPI) {
      console.log(`Looking for House district ${houseDistrict} in local data`);
      const houseRep = houseRepresentatives.find(rep => rep.district === houseDistrict);
      
      if (houseRep) {
        console.log(`Found House representative in local data: ${houseRep.name}`);
        
        // Try to find this rep in the API data by name to get party info
        let repParty = 'Unknown';
        if (legislatorsData && legislatorsData.items) {
          // Split the name to handle different formats
          const nameParts = houseRep.name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          
          // Look for a match by name
          const matchingRepInAPI = legislatorsData.items.find(item => 
            item.position_title === "Representative" && 
            item.firstname.toLowerCase() === firstName.toLowerCase() && 
            item.lastname.toLowerCase().includes(lastName.toLowerCase().split(',')[0])
          );
          
          if (matchingRepInAPI) {
            console.log(`Found matching representative in API by name: ${matchingRepInAPI.firstname} ${matchingRepInAPI.lastname}`);
            repParty = matchingRepInAPI.partyid;
          } else {
            console.log(`Could not find matching representative in API by name`);
          }
        }
        
        legislators.push({
          firstName: houseRep.name.split(' ')[0],
          lastName: houseRep.name.split(' ').slice(1).join(' '),
          district: String(houseRep.district),
          chamber: 'H',
          party: repParty,
          link: `/legislators/${houseRep.name.replace(/\s+/g, '_').toLowerCase()}`
        });
      } else {
        console.log(`House representative for district ${houseDistrict} not found in local data`);
      }
    }
    
    if (!foundSenatorFromAPI) {
      console.log(`Looking for Senate district ${senateDistrict} in local data`);
      const senator = stateSenatorsData.find(sen => sen.district === senateDistrict);
      
      if (senator) {
        console.log(`Found Senator in local data: ${senator.name}`);
        
        // Try to find this senator in the API data by name to get party info
        let senatorParty = 'Unknown';
        if (legislatorsData && legislatorsData.items) {
          // Split the name to handle different formats
          const nameParts = senator.name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          
          // Look for a match by name
          const matchingSenatorInAPI = legislatorsData.items.find(item => 
            item.position_title === "Senator" && 
            item.firstname.toLowerCase() === firstName.toLowerCase() && 
            item.lastname.toLowerCase().includes(lastName.toLowerCase().split(',')[0])
          );
          
          if (matchingSenatorInAPI) {
            console.log(`Found matching senator in API by name: ${matchingSenatorInAPI.firstname} ${matchingSenatorInAPI.lastname}`);
            senatorParty = matchingSenatorInAPI.partyid;
          } else {
            console.log(`Could not find matching senator in API by name`);
          }
        }
        
        legislators.push({
          firstName: senator.name.split(' ')[0],
          lastName: senator.name.split(' ').slice(1).join(' '),
          district: String(senator.district),
          chamber: 'S',
          party: senatorParty,
          link: `/legislators/${senator.name.replace(/\s+/g, '_').toLowerCase()}`
        });
      } else {
        console.log(`Senator for district ${senateDistrict} not found in local data`);
      }
    }
    
    console.log(`Found ${legislators.length} legislators`);
    
    // Return the results
    res.json({
      items: legislators,
      count: legislators.length,
      houseDistrict,
      senateDistrict,
      address: matchedAddress,
      coordinates: { longitude, latitude }
    });
  } catch (error) {
    console.error('Error finding legislators by address:', error);
    res.status(500).json({
      error: "Failed to find legislators",
      details: error.message
    });
  }
};

export { getLegislatorsByAddress };