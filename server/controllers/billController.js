import { fetchIGAData } from '../services/igaService.js';
import { 
  calculateBillTiming, 
  getPartyBreakdown, 
  analyzeAmendments, 
  calculateAverageTiming
} from '../services/analysisService.js';

/**
 * Get all bills for a specific year
 */
const getAllBills = async (req, res) => {
  try {
    const { year } = req.params;
    const data = await fetchIGAData(year, "bills");
    
    if (!data || !data.items) {
      console.error('Invalid response format:', data);
      return res.status(500).json({ 
        error: "Invalid response format from IGA API",
        details: "Response missing items array"
      });
    }
    
    console.log(`Successfully fetched ${data.items.length} bills for ${year}`);
    
    res.json({
      items: data.items,
      count: data.items.length,
      year: year
    });
  } catch (error) {
    console.error('Error in getAllBills:', error);
    res.status(500).json({ 
      error: "Failed to fetch bills",
      details: error.message
    });
  }
};

/**
 * Get details for a specific bill
 */
const getBillDetails = async (req, res) => {
  try {
    const { year, name } = req.params;
    const data = await fetchIGAData(year, `bills/${name}`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching bill details:', error);
    res.status(500).json({ 
      error: "Failed to fetch bill details",
      details: error.message
    });
  }
};

/**
 * Get actions for a specific bill
 */
const getBillActions = async (req, res) => {
  try {
    const { year, name } = req.params;
    const data = await fetchIGAData(year, `bills/${name}/actions`);
    res.json(data);
  } catch (error) {
    console.error('Error fetching bill actions:', error);
    res.status(500).json({ 
      error: "Failed to fetch bill actions",
      details: error.message
    });
  }
};

/**
 * Generate statistics for a set of bills
 */
const generateBillStats = async (req, res) => {
  try {
    const { bills, legislatorNames } = req.body;
    
    if (!Array.isArray(bills) || bills.length === 0) {
      return res.status(400).json({
        error: "Invalid request",
        details: "Bills array is required"
      });
    }
    
    // Process bills and generate statistics
    const processedBills = bills.map(bill => {
      // Check if actions property exists and is an array
      const actions = Array.isArray(bill.actions) ? bill.actions : [];
      
      return {
        ...bill,
        // Direct implementation instead of using the helper functions
        passedChamber: actions.some(action => 
          action.description?.toLowerCase().includes('referred to the')),
        becomeLaw: actions.some(action => 
          action.description?.toLowerCase().includes('public law')),
        timing: calculateBillTiming(actions)
      };
    });
    
    // Generate overall statistics
    const totalBills = processedBills.length;
    const passedBills = processedBills.filter(bill => bill.passedChamber);
    const publicLaws = processedBills.filter(bill => bill.becomeLaw);
    const timing = calculateAverageTiming(processedBills);
    
    // Group bills by type
    const types = ['authored', 'coauthored', 'sponsored', 'cosponsored'];
    const statsByType = {};
    
    types.forEach(type => {
      const typeBills = processedBills.filter(bill => bill.type === type);
      if (typeBills.length > 0) {
        statsByType[type] = {
          total: typeBills.length,
          passed: typeBills.filter(bill => bill.passedChamber).length,
          laws: typeBills.filter(bill => bill.becomeLaw).length,
          passageRate: typeBills.length > 0 ? 
            (typeBills.filter(bill => bill.passedChamber).length / typeBills.length * 100).toFixed(1) : '0.0',
          lawRate: typeBills.length > 0 ? 
            (typeBills.filter(bill => bill.becomeLaw).length / typeBills.length * 100).toFixed(1) : '0.0',
          timing: calculateAverageTiming(typeBills),
          authors: getPartyBreakdown(typeBills.flatMap(bill => bill.details?.authors || [])),
          coauthors: getPartyBreakdown(typeBills.flatMap(bill => bill.details?.coauthors || [])),
          sponsors: getPartyBreakdown(typeBills.flatMap(bill => bill.details?.sponsors || [])),
          cosponsors: getPartyBreakdown(typeBills.flatMap(bill => bill.details?.cosponsors || []))
        };
        
        // Process amendments if legislatorNames provided
        if (Array.isArray(legislatorNames) && legislatorNames.length > 0) {
          const typeAmendments = { passed: 0, failed: 0 };
          
          typeBills.forEach(bill => {
            const amendmentResult = analyzeAmendments(bill, legislatorNames);
            if (amendmentResult) {
              typeAmendments.passed += amendmentResult.passed;
              typeAmendments.failed += amendmentResult.failed;
            }
          });
          
          const totalTypeAmendments = typeAmendments.passed + typeAmendments.failed;
          statsByType[type].amendments = {
            total: totalTypeAmendments,
            passed: typeAmendments.passed,
            failed: typeAmendments.failed,
            passRate: totalTypeAmendments > 0 ? 
              (typeAmendments.passed / totalTypeAmendments * 100).toFixed(1) : '0.0',
            failRate: totalTypeAmendments > 0 ? 
              (typeAmendments.failed / totalTypeAmendments * 100).toFixed(1) : '0.0'
          };
        }
      }
    });
    
    // Calculate overall amendment statistics if legislatorNames provided
    let amendmentStats = { passed: 0, failed: 0, total: 0, passRate: '0.0', failRate: '0.0' };
    
    if (Array.isArray(legislatorNames) && legislatorNames.length > 0) {
      // Calculate overall amendment stats from the type stats we already computed
      let totalPassed = 0;
      let totalFailed = 0;
      
      Object.values(statsByType).forEach(typeStat => {
        if (typeStat.amendments) {
          totalPassed += typeStat.amendments.passed;
          totalFailed += typeStat.amendments.failed;
        }
      });
      
      const totalAmendments = totalPassed + totalFailed;
      amendmentStats = {
        total: totalAmendments,
        passed: totalPassed,
        failed: totalFailed,
        passRate: totalAmendments > 0 ? 
          (totalPassed / totalAmendments * 100).toFixed(1) : '0.0',
        failRate: totalAmendments > 0 ? 
          (totalFailed / totalAmendments * 100).toFixed(1) : '0.0'
      };
    }
    
    const result = {
      overall: {
        total: totalBills,
        passed: passedBills.length,
        laws: publicLaws.length,
        passageRate: totalBills > 0 ? (passedBills.length / totalBills * 100).toFixed(1) : '0.0',
        lawRate: totalBills > 0 ? (publicLaws.length / totalBills * 100).toFixed(1) : '0.0',
        timing: timing,
        amendments: amendmentStats
      },
      byType: statsByType
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error generating bill statistics:', error);
    res.status(500).json({ 
      error: "Failed to generate statistics",
      details: error.message
    });
  }
};

export {
  getAllBills,
  getBillDetails,
  getBillActions,
  generateBillStats
};