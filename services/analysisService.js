/**
 * Service for analyzing bill data
 */

/**
 * Check if a bill has passed its chamber of origin
 */
const hasBillPassedChamber = (bill) => {
    if (!bill.actions) return false;
    return bill.actions.some(action => 
      action.description.toLowerCase().includes('referred to the')
    );
  };
  
  /**
   * Check if a bill has become law
   */
  const hasBillBecomeLaw = (bill) => {
    if (!bill.actions) return false;
    return bill.actions.some(action => 
      action.description.toLowerCase().includes('public law')
    );
  };
  
  /**
   * Calculate timing metrics for a bill's progress
   */
  const calculateBillTiming = (actions) => {
    if (!actions || actions.length === 0) return null;
  
    const sortedActions = actions.sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstAction = new Date(sortedActions[0].date);
    
    let chamberPassage = null;
    let returnedWithAmendments = null;
    let lawPassage = null;
  
    for (const action of sortedActions) {
      const actionDate = new Date(action.date);
      const description = action.description.toLowerCase();
  
      if (!chamberPassage && description.includes('referred to the')) {
        chamberPassage = actionDate;
      }
  
      if (!returnedWithAmendments && description.includes('returned to the senate with amendments' || 'returned to the house with amendments')) {
        returnedWithAmendments = actionDate;
      }
  
      if (!lawPassage && description.includes('public law')) {
        lawPassage = actionDate;
      }
    }
  
    return {
      daysToPassChamber: chamberPassage ? 
        Math.ceil((chamberPassage - firstAction) / (1000 * 60 * 60 * 24)) : null,
      daysToReturnWithAmendments: returnedWithAmendments ?
        Math.ceil((returnedWithAmendments - chamberPassage) / (1000 * 60 * 60 * 24)) : null,
      daysToBecomeLaw: lawPassage ? 
        Math.ceil((lawPassage - firstAction) / (1000 * 60 * 60 * 24)) : null
    };
  };
  
  /**
   * Get party breakdown statistics
   */
  const getPartyBreakdown = (legislators) => {
    if (!legislators) return { total: 0, democrat: 0, republican: 0 };
    
    return legislators.reduce((acc, legislator) => {
      acc.total++;
      if (legislator.party?.toLowerCase().includes('democrat')) {
        acc.democrat++;
      } else if (legislator.party?.toLowerCase().includes('republican')) {
        acc.republican++;
      }
      return acc;
    }, { total: 0, democrat: 0, republican: 0 });
  };
  
  /**
   * Analyze amendment success rates for specific legislators
   */
  const analyzeAmendments = (bill, legislatorNames) => {
    if (!bill.actions || !Array.isArray(legislatorNames)) {
      return null;
    }
  
    // Clean up legislator names for matching
    const searchNames = legislatorNames.map(name => 
      name.replace(/^(Rep\.|Senator|Sen\.|Representative)\s+/, '')
        .toLowerCase()
        .trim()
    );
  
    // Find amendments related to the specified legislators
    const amendments = bill.actions.filter(action => {
      const desc = action.description.toLowerCase();
      const isAmendment = desc.includes('amendment');
      const hasRollCall = desc.includes('roll call');
      const hasLegislatorName = searchNames.some(name => desc.includes(name));
      
      return isAmendment && hasRollCall && hasLegislatorName;
    });
  
    // Count passed and failed amendments
    return amendments.reduce((acc, action) => {
      const desc = action.description.toLowerCase();
      if (desc.includes('prevailed') || desc.includes('passed')) {
        acc.passed++;
      } else if (desc.includes('failed') || desc.includes('defeated')) {
        acc.failed++;
      }
      return acc;
    }, { passed: 0, failed: 0 });
  };
  
  /**
   * Calculate average bill processing time metrics
   */
  const calculateAverageTiming = (bills) => {
    const timings = bills.map(bill => calculateBillTiming(bill.actions))
                        .filter(timing => timing !== null);
  
    const chamberTimes = timings.map(t => t.daysToPassChamber).filter(days => days !== null);
    const lawTimes = timings.map(t => t.daysToBecomeLaw).filter(days => days !== null);
  
    return {
      averageDaysToPassChamber: chamberTimes.length > 0 ? 
        Math.round(chamberTimes.reduce((a, b) => a + b, 0) / chamberTimes.length) : null,
      averageDaysToBecomeLaw: lawTimes.length > 0 ? 
        Math.round(lawTimes.reduce((a, b) => a + b, 0) / lawTimes.length) : null
    };
  };
  
  export {
    hasBillPassedChamber,
    hasBillBecomeLaw,
    calculateBillTiming,
    getPartyBreakdown,
    analyzeAmendments,
    calculateAverageTiming
  };