import { 
    calculateBillTiming, 
    getPartyBreakdown, 
    analyzeAmendments, 
    calculateAverageTiming 
  } from '../services/analysisService.js';
  
  /**
   * Generate a word cloud data from bill content
   * @param {Array} bills - Array of bill objects
   * @returns {Array} Array of [word, frequency] pairs
   */
  const generateWordCloud = (bills) => {
    // Common stop words to filter out
    const stopWords = new Set([
      'a', 'act', 'an', 'and', 'amend', 'indiana', 'concerning', 'code', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
      'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
      'will', 'with', 'the', 'concerning', 'regarding', 'various', 'matters',
      'provides', 'requires', 'establishes', 'amends', 'repeals', 'relating', 'state',
      'county', 'prior', 'bill', 'bills', 'act', 'acts', 'law', 'laws', 'public', 'code',
      'amend', 'certain', 'make', 'makes', 'relating', 'relates', 'relating', 'relates',
      'town'
    ]);
  
    const text = bills
      .map(bill => `${bill.description || ''} ${bill.details?.title || ''}`)
      .join(' ')
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
      .replace(/\d+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  
    const words = text.split(' ')
      .filter(word => word.length > 3 && !stopWords.has(word))
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});
  
    return Object.entries(words)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100)
      .map(([word, freq]) => [word, Math.sqrt(freq) * 50]);
  };
  
  /**
   * Analyze bills to generate statistics and processed data
   */
  const analyzeBills = async (req, res) => {
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
          passedChamber: actions.some(action => 
            action.description?.toLowerCase().includes('referred to the')),
          becomeLaw: actions.some(action => 
            action.description?.toLowerCase().includes('public law')),
          timing: calculateBillTiming(actions)
        };
      });
  
      // Generate word cloud data
      const wordCloudData = generateWordCloud(processedBills);
  
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
      
      // Calculate overall stats
      const totalBills = processedBills.length;
      const passedBills = processedBills.filter(bill => bill.passedChamber).length;
      const publicLaws = processedBills.filter(bill => bill.becomeLaw).length;
      const timing = calculateAverageTiming(processedBills);
      
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
      
      // Generate final results object
      const result = {
        wordCloudData,
        stats: {
          overall: {
            total: totalBills,
            passed: passedBills,
            laws: publicLaws,
            passageRate: totalBills > 0 ? (passedBills / totalBills * 100).toFixed(1) : '0.0',
            lawRate: totalBills > 0 ? (publicLaws / totalBills * 100).toFixed(1) : '0.0',
            timing: timing,
            amendments: amendmentStats
          },
          ...statsByType
        }
      };
      
      res.json(result);
    } catch (error) {
      console.error('Error analyzing bills:', error);
      res.status(500).json({ 
        error: "Failed to analyze bills",
        details: error.message
      });
    }
  };
  
  export { analyzeBills };