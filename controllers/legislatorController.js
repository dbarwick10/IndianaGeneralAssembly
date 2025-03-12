import { fetchIGAData } from '../services/igaService.js';
import { fetchLegislatorsByAddress, getPartyAbbreviation } from '../services/legislatorServices.js';
import { 
  calculateBillTiming, 
  getPartyBreakdown, 
  analyzeAmendments, 
  calculateAverageTiming 
} from '../services/analysisService.js';

/**
 * Find legislators by address
 */
const findLegislatorsByAddress = async (req, res) => {
  try {
    const { street, city, zip } = req.query;
    
    if (!street || !city) {
      return res.status(400).json({
        error: "Missing address information",
        details: "Street and city are required"
      });
    }
    
    // Get current year
    const year = new Date().getFullYear();
    
    // Fetch legislator data using the service
    const legislatorsData = await fetchLegislatorsByAddress(street, city, zip, year);
    
    // Format the data for client consumption
    const houseRep = legislatorsData.items?.find(leg => leg.chamber === 'H') || null;
    const senator = legislatorsData.items?.find(leg => leg.chamber === 'S') || null;
    
    // Format party information
    if (houseRep) {
      houseRep.partyAbbreviation = getPartyAbbreviation(houseRep.party);
    }
    
    if (senator) {
      senator.partyAbbreviation = getPartyAbbreviation(senator.party);
    }
    
    const result = {
      houseRepresentative: houseRep,
      senator: senator,
      districts: {
        houseDistrict: legislatorsData.houseDistrict,
        senateDistrict: legislatorsData.senateDistrict
      },
      address: legislatorsData.address,
      coordinates: legislatorsData.coordinates
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error finding legislators:', error);
    
    // Return appropriate error status and message
    if (error.message.includes('not found')) {
      res.status(404).json({
        error: "Address not found",
        details: "Could not locate the provided address"
      });
    } else {
      res.status(500).json({
        error: "Failed to find legislators",
        details: error.message
      });
    }
  }
};

/**
 * Get all legislators
 */
const getAllLegislators = async (req, res) => {
  try {
    const data = await fetchIGAData("2023", "legislators");
    res.json(data);
  } catch (error) {
    console.error('Error fetching legislators:', error);
    res.status(500).json({ 
      error: "Failed to fetch legislators",
      details: error.message
    });
  }
};

/**
 * Get all bills for a specific legislator
 */
const getLegislatorBills = async (req, res) => {
  try {
    const { year, userId } = req.params;
    const data = await fetchIGAData(year, `legislators/${userId}/bills`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching legislator bills:', error);
    res.status(500).json({ 
      error: "Failed to fetch legislator bills",
      details: error.message
    });
  }
};

/**
 * Get authored bills for a legislator
 */
const getAuthoredBills = async (req, res) => {
  try {
    const { year, userId } = req.params;
    const data = await fetchIGAData(year, `legislators/${userId}/bills/authored`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching authored bills:', error);
    res.status(500).json({ 
      error: "Failed to fetch authored bills",
      details: error.message
    });
  }
};

/**
 * Get coauthored bills for a legislator
 */
const getCoauthoredBills = async (req, res) => {
  try {
    const { year, userId } = req.params;
    const data = await fetchIGAData(year, `legislators/${userId}/bills/coauthored`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching coauthored bills:', error);
    res.status(500).json({ 
      error: "Failed to fetch coauthored bills",
      details: error.message
    });
  }
};

/**
 * Get sponsored bills for a legislator
 */
const getSponsoredBills = async (req, res) => {
  try {
    const { year, userId } = req.params;
    const data = await fetchIGAData(year, `legislators/${userId}/bills/sponsored`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching sponsored bills:', error);
    res.status(500).json({ 
      error: "Failed to fetch sponsored bills",
      details: error.message
    });
  }
};

/**
 * Get cosponsored bills for a legislator
 */
const getCosponsoredBills = async (req, res) => {
  try {
    const { year, userId } = req.params;
    const data = await fetchIGAData(year, `legislators/${userId}/bills/cosponsored`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching cosponsored bills:', error);
    res.status(500).json({ 
      error: "Failed to fetch cosponsored bills",
      details: error.message
    });
  }
};

/**
 * Get consolidated bills data with details and actions for a legislator
 */
const getCompleteBills = async (req, res) => {
  console.log(`=== COMPLETE BILLS REQUEST ===`);
  console.log(`Names param: ${req.query.names}`);
  
  try {
    const { year, userId } = req.params;
    const { names } = req.query; // Get legislator names for amendment analysis
    const legislatorNames = names ? names.split(',') : [];
    
    // Fetch all bill types in parallel
    const types = ['authored', 'coauthored', 'sponsored', 'cosponsored'];
    const billPromises = types.map(async (type) => {
      try {
        const data = await fetchIGAData(year, `legislators/${userId}/bills/${type}`);
        return { type, bills: data.items || [] };
      } catch (error) {
        console.error(`Error fetching ${type} bills for userId ${userId}:`, error);
        return { type, bills: [] };
      }
    });
    
    const billsByType = await Promise.all(billPromises);
    
    // Filter and normalize bills
    const simpleBills = billsByType.flatMap(({ type, bills }) => 
      (bills || [])
        .filter(bill => bill && (bill.billName?.startsWith('SB') || bill.billName?.startsWith('HB')))
        .map(bill => ({ ...bill, type }))
    );
    
    // Fetch details and actions for each bill in batches
    const batchSize = 5;
    const detailedBills = [];
    
    for (let i = 0; i < simpleBills.length; i += batchSize) {
      const batch = simpleBills.slice(i, i + batchSize);
      const batchPromises = batch.map(async (bill) => {
        try {
          const [details, actionsData] = await Promise.all([
            fetchIGAData(year, `bills/${bill.billName}`),
            fetchIGAData(year, `bills/${bill.billName}/actions`)
          ]);
          const actions = actionsData.items || [];
          
          // Process bill data
          const passedChamber = actions.some(action => 
            action.description?.toLowerCase().includes('referred to the'));
          
          const sentToChamber = actions.find(action => 
            action.description === 'Referred to the Senate' || 
            action.description === 'Referred to the House'
          );

          const returnedWithAmendments = actions.find(action => 
            action.description === 'Returned to the Senate with amendments' || 
            action.description === 'Returned to the House with amendments'
          );

          const becomeLaw = actions.some(action => 
            action.description?.toLowerCase().includes('public law'));

          // Calculate timing
          const timing = calculateBillTiming(actions);
          
          const processedBill = {
            ...bill,
            details,
            actions,
            passedChamber,
            sentToChamber,
            returnedWithAmendments,
            becomeLaw,
            timing
          };
          
          return processedBill;
        } catch (error) {
          console.error(`Error processing bill ${bill.billName}:`, error);
          return { ...bill, error: true, actions: [] };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      detailedBills.push(...batchResults);
    }
    
    // Generate stats for all bills
    const stats = {
      overall: {
        total: detailedBills.length,
        passed: detailedBills.filter(bill => bill.passedChamber).length,
        laws: detailedBills.filter(bill => bill.becomeLaw).length,
        passageRate: detailedBills.length > 0 ? 
          ((detailedBills.filter(bill => bill.passedChamber).length / detailedBills.length) * 100).toFixed(1) : '0.0',
        lawRate: detailedBills.length > 0 ? 
          ((detailedBills.filter(bill => bill.becomeLaw).length / detailedBills.length) * 100).toFixed(1) : '0.0',
        timing: calculateAverageTiming(detailedBills)
      }
    };
    
    // Generate stats for each bill type
    types.forEach(type => {
      const typeBills = detailedBills.filter(bill => bill.type === type);
      if (typeBills.length > 0) {
        stats[type] = {
          total: typeBills.length,
          passed: typeBills.filter(bill => bill.passedChamber).length,
          laws: typeBills.filter(bill => bill.becomeLaw).length,
          passageRate: ((typeBills.filter(bill => bill.passedChamber).length / typeBills.length) * 100).toFixed(1),
          lawRate: ((typeBills.filter(bill => bill.becomeLaw).length / typeBills.length) * 100).toFixed(1),
          timing: calculateAverageTiming(typeBills),
          authors: getPartyBreakdown(typeBills.flatMap(bill => bill.details?.authors || [])),
          coauthors: getPartyBreakdown(typeBills.flatMap(bill => bill.details?.coauthors || [])),
          sponsors: getPartyBreakdown(typeBills.flatMap(bill => bill.details?.sponsors || [])),
          cosponsors: getPartyBreakdown(typeBills.flatMap(bill => bill.details?.cosponsors || []))
        };
      } else {
        stats[type] = {
          total: 0,
          passed: 0,
          laws: 0,
          passageRate: '0.0',
          lawRate: '0.0',
          timing: { averageDaysToPassChamber: null, averageDaysToBecomeLaw: null },
          authors: { total: 0, democrat: 0, republican: 0 },
          coauthors: { total: 0, democrat: 0, republican: 0 },
          sponsors: { total: 0, democrat: 0, republican: 0 },
          cosponsors: { total: 0, democrat: 0, republican: 0 }
        };
      }
    });
    
    // Process amendment information if legislator names were provided
    if (legislatorNames && legislatorNames.length > 0) {
      // Overall amendments
      const overallAmendments = { passed: 0, failed: 0 };
      
      detailedBills.forEach(bill => {
        const amendments = analyzeAmendments(bill, legislatorNames);
        if (amendments) {
          overallAmendments.passed += amendments.passed;
          overallAmendments.failed += amendments.failed;
        }
      });
      
      const totalAmendments = overallAmendments.passed + overallAmendments.failed;
      stats.overall.amendments = {
        total: totalAmendments,
        passed: overallAmendments.passed,
        failed: overallAmendments.failed,
        passRate: totalAmendments > 0 ? ((overallAmendments.passed / totalAmendments) * 100).toFixed(1) : '0.0',
        failRate: totalAmendments > 0 ? ((overallAmendments.failed / totalAmendments) * 100).toFixed(1) : '0.0'
      };
      
      // By type amendments
      types.forEach(type => {
        if (stats[type]) {
          const typeAmendments = { passed: 0, failed: 0 };
          
          detailedBills.filter(bill => bill.type === type).forEach(bill => {
            const amendments = analyzeAmendments(bill, legislatorNames);
            if (amendments) {
              typeAmendments.passed += amendments.passed;
              typeAmendments.failed += amendments.failed;
            }
          });
          
          const totalTypeAmendments = typeAmendments.passed + typeAmendments.failed;
          stats[type].amendments = {
            total: totalTypeAmendments,
            passed: typeAmendments.passed,
            failed: typeAmendments.failed,
            passRate: totalTypeAmendments > 0 ? ((typeAmendments.passed / totalTypeAmendments) * 100).toFixed(1) : '0.0',
            failRate: totalTypeAmendments > 0 ? ((typeAmendments.failed / totalTypeAmendments) * 100).toFixed(1) : '0.0'
          };
        }
      });
    }
    
    // Return combined data
    res.json({
      bills: detailedBills,
      stats: stats
    });
    
  } catch (error) {
    console.error('Error fetching complete bills:', error);
    res.status(500).json({ 
      error: "Failed to fetch complete bills data",
      details: error.message
    });
  }
};

export {
  getAllLegislators,
  getLegislatorBills,
  getAuthoredBills,
  getCoauthoredBills,
  getSponsoredBills,
  getCosponsoredBills,
  getCompleteBills,
  findLegislatorsByAddress
};