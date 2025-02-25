import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import 'dotenv/config';
import NodeCache from 'node-cache';

const app = express();
const PORT = process.env.PORT || 3000;
const API_CACHE_TTL = 3600; // Cache API responses for 1 hour
const apiCache = new NodeCache({ stdTTL: API_CACHE_TTL });

// Enable CORS and JSON parsing
app.use(cors({
    origin: function(origin, callback) {
        console.log('Incoming origin:', origin);
        const allowedOrigins = [
            'http://127.0.0.1:5500',        
            'http://localhost:5500',
            'https://dbarwick10.github.io',
            'https://dbarwick10.github.io/IndianaGeneralAssembly',
            'https://indianageneralassembly-production.up.railway.app',
            'https://legisalert.netlify.app',
            null 
        ];
        
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('Origin not allowed:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Origin', 
        'Access-Control-Allow-Origin', 
        'Accept'
    ]
}));

app.use(express.json());

// Enhanced fetch function with caching
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

// Helper functions for data analysis moved from client to server
const hasBillPassedChamber = (bill) => {
    if (!bill.actions) return false;
    return bill.actions.some(action => 
        action.description.toLowerCase().includes('referred to the')
    );
};

const hasBillBecomeLaw = (bill) => {
    if (!bill.actions) return false;
    return bill.actions.some(action => 
        action.description.toLowerCase().includes('public law')
    );
};

const calculateBillTiming = (actions) => {
    if (!actions || actions.length === 0) return null;

    const sortedActions = actions.sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstAction = new Date(sortedActions[0].date);
    
    let chamberPassage = null;
    let lawPassage = null;

    for (const action of sortedActions) {
        const actionDate = new Date(action.date);
        const description = action.description.toLowerCase();

        if (!chamberPassage && description.includes('referred to the')) {
            chamberPassage = actionDate;
        }

        if (!lawPassage && description.includes('public law')) {
            lawPassage = actionDate;
        }
    }

    return {
        daysToPassChamber: chamberPassage ? 
            Math.ceil((chamberPassage - firstAction) / (1000 * 60 * 60 * 24)) : null,
        daysToBecomeLaw: lawPassage ? 
            Math.ceil((lawPassage - firstAction) / (1000 * 60 * 60 * 24)) : null
    };
};

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

// Route to fetch all bills for a specific year
app.get("/:year/bills", async (req, res) => {
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
        console.error('Error in /:year/bills endpoint:', error);
        res.status(500).json({ 
            error: "Failed to fetch bills",
            details: error.message
        });
    }
});

// Route to fetch details for a specific bill
app.get("/:year/bills/:name", async (req, res) => {
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
});

// Route to fetch actions for a specific bill
app.get("/:year/bills/:name/actions", async (req, res) => {
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
});

// Route to fetch all legislators
app.get("/legislators", async (req, res) => {
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
});

// Regular routes for individual bill types
app.get("/:year/legislators/:userId/bills", async (req, res) => {
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
});

app.get("/:year/legislators/:userId/bills/authored", async (req, res) => {
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
});

app.get("/:year/legislators/:userId/bills/coauthored", async (req, res) => {
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
});

app.get("/:year/legislators/:userId/bills/sponsored", async (req, res) => {
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
});

app.get("/:year/legislators/:userId/bills/cosponsored", async (req, res) => {
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
});

// NEW ENDPOINT: Consolidated bills data with details and actions
app.get("/:year/legislators/:userId/complete-bills", async (req, res) => {
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
                    
                    // Process bill data - fixed function calls
                    const passedChamber = actions.some(action => 
                        action.description?.toLowerCase().includes('referred to the'));
                    
                    const becomeLaw = actions.some(action => 
                        action.description?.toLowerCase().includes('public law'));

                    // Properly calculate timing
                    const timing = calculateBillTiming(actions);
                    
                    const processedBill = {
                        ...bill,
                        details,
                        actions,
                        passedChamber,
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
});

// Fixed stats endpoint
app.post("/:year/bills/stats", async (req, res) => {
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
                        // Check if bill has actions
                        if (!Array.isArray(bill.actions)) return;
                        
                        // Clean legislator names
                        const searchNames = legislatorNames.map(name => 
                            name.replace(/^(Rep\.|Senator|Sen\.|Representative)\s+/, '')
                                .toLowerCase()
                                .trim()
                        );
                        
                        // Find relevant amendments
                        const amendments = bill.actions.filter(action => {
                            const desc = action.description?.toLowerCase() || '';
                            const isAmendment = desc.includes('amendment');
                            const hasRollCall = desc.includes('roll call');
                            const hasLegislatorName = searchNames.some(name => desc.includes(name));
                            return isAmendment && hasRollCall && hasLegislatorName;
                        });
                        
                        // Count passed and failed amendments
                        amendments.forEach(action => {
                            const desc = action.description?.toLowerCase() || '';
                            if (desc.includes('prevailed') || desc.includes('passed')) {
                                typeAmendments.passed++;
                            } else if (desc.includes('failed') || desc.includes('defeated')) {
                                typeAmendments.failed++;
                            }
                        });
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
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: "Internal server error",
        details: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
