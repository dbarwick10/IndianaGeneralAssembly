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
            'https://legisalert.org/'.
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

// Add this to your server.js file

// Local district data
const houseRepresentatives = [
    {district: 1, name: "Carolyn Jackson"},
    {district: 2, name: "Earl Harris, Jr."},
    {district: 3, name: "Ragen Hatcher"},
    {district: 4, name: "Edmond Soliday"},
    {district: 5, name: "Dale DeVon"},
    {district: 6, name: "Maureen Bauer"},
    {district: 7, name: "Jake Teshka"},
    {district: 8, name: "Ryan Dvorak"},
    {district: 9, name: "Patricia Boy"},
    {district: 10, name: "Charles Moseley"},
    {district: 11, name: "Michael J. Aylesworth"},
    {district: 12, name: "Mike Andrade"},
    {district: 13, name: "Matt Commons"},
    {district: 14, name: "Vernon Smith"},
    {district: 15, name: "Harold Slager"},
    {district: 16, name: "Kendell Culp"},
    {district: 17, name: "Jack Jordan"},
    {district: 18, name: "David Abbott"},
    {district: 19, name: "Julie Olthoff"},
    {district: 20, name: "Jim Pressel"},
    {district: 21, name: "Timothy Wesco"},
    {district: 22, name: "Craig Snow"},
    {district: 23, name: "Ethan Manning"},
    {district: 24, name: "Hunter Smith"},
    {district: 25, name: "Becky Cash"},
    {district: 26, name: "Chris Campbell"},
    {district: 27, name: "Sheila Ann Klinker"},
    {district: 28, name: "Jeffrey Thompson"},
    {district: 29, name: "Alaina Shonkwiler"},
    {district: 30, name: "Michael Karickhoff"},
    {district: 31, name: "Lori Goss-Reaves"},
    {district: 32, name: "Victoria Garcia Wilburn"},
    {district: 33, name: "John Prescott"},
    {district: 34, name: "Sue Errington"},
    {district: 35, name: "Elizabeth Rowray"},
    {district: 36, name: "Kyle Pierce"},
    {district: 37, name: "Todd Huston"},
    {district: 38, name: "Heath VanNatter"},
    {district: 39, name: "Daniel Lopez"},
    {district: 40, name: "Gregory Steuerwald"},
    {district: 41, name: "Mark Genda"},
    {district: 42, name: "Tim Yocum"},
    {district: 43, name: "Tonya Pfaff"},
    {district: 44, name: "Beau Baird"},
    {district: 45, name: "Bruce Borders"},
    {district: 46, name: "Bob Heaton"},
    {district: 47, name: "Robb Greene"},
    {district: 48, name: "Doug Miller"},
    {district: 49, name: "Joanna King"},
    {district: 50, name: "Lorissa Sweet"},
    {district: 51, name: "Tony Isa"},
    {district: 52, name: "Ben Smaltz"},
    {district: 53, name: "Ethan Lawson"},
    {district: 54, name: "Cory Criswell"},
    {district: 55, name: "Lindsay Patterson"},
    {district: 56, name: "Bradford Barrett"},
    {district: 57, name: "Craig Haggard"},
    {district: 58, name: "Michelle Davis"},
    {district: 59, name: "Ryan Lauer"},
    {district: 60, name: "Peggy Mayfield"},
    {district: 61, name: "Matt Pierce"},
    {district: 62, name: "Dave Hall"},
    {district: 63, name: "Shane Lindauer"},
    {district: 64, name: "Matt Hostettler"},
    {district: 65, name: "Christopher May"},
    {district: 66, name: "Zach Payne"},
    {district: 67, name: "Alex Zimmerman"},
    {district: 68, name: "Garrett Bascom"},
    {district: 69, name: "Jim Lucas"},
    {district: 70, name: "Karen Engleman"},
    {district: 71, name: "Wendy Dant Chesser"},
    {district: 72, name: "Edward Clere"},
    {district: 73, name: "Jennifer Meltzer"},
    {district: 74, name: "Steve Bartels"},
    {district: 75, name: "Cindy Ledbetter"},
    {district: 76, name: "Wendy McNamara"},
    {district: 77, name: "Alex Burton"},
    {district: 78, name: "Tim O'Brien"},
    {district: 79, name: "Matthew Lehman"},
    {district: 80, name: "Phil GiaQuinta"},
    {district: 81, name: "Martin Carbaugh"},
    {district: 82, name: "Kyle Miller"},
    {district: 83, name: "Christopher Judy"},
    {district: 84, name: "Bob Morris"},
    {district: 85, name: "David Heine"},
    {district: 86, name: "Edward DeLaney"},
    {district: 87, name: "Carey Hamilton"},
    {district: 88, name: "Chris Jeter"},
    {district: 89, name: "Mitch Gore"},
    {district: 90, name: "Andrew Ireland"},
    {district: 91, name: "Robert Behning"},
    {district: 92, name: "Renee Pack"},
    {district: 93, name: "Julie McGuire"},
    {district: 94, name: "Cherrish Pryor"},
    {district: 95, name: "John L. Bartlett"},
    {district: 96, name: "Gregory Porter"},
    {district: 97, name: "Justin Moed"},
    {district: 98, name: "Robin Shackleford"},
    {district: 99, name: "Vanessa Summers"},
    {district: 100, name: "Robert Johnson"}
];

const stateSenatorsData = [
    {district: 1, name: "Dan Dernulc"},
    {district: 2, name: "Lonnie Randolph"},
    {district: 3, name: "Mark Spencer"},
    {district: 4, name: "Rodney Pol Jr."},
    {district: 5, name: "Ed Charbonneau"},
    {district: 6, name: "Rick Niemeyer"},
    {district: 7, name: "Brian Buchanan"},
    {district: 8, name: "Mike Bohacek"},
    {district: 9, name: "Ryan Mishler"},
    {district: 10, name: "David Niezgodski"},
    {district: 11, name: "Linda Rogers"},
    {district: 12, name: "Blake Doriot"},
    {district: 13, name: "Susan Glick"},
    {district: 14, name: "Tyler Johnson"},
    {district: 15, name: "Liz Brown"},
    {district: 16, name: "Justin Busch"},
    {district: 17, name: "Andy Zay"},
    {district: 18, name: "Stacey Donato"},
    {district: 19, name: "Travis Holdman"},
    {district: 20, name: "Scott Baldwin"},
    {district: 21, name: "James Buck"},
    {district: 22, name: "Ronnie Alting"},
    {district: 23, name: "Spencer Deery"},
    {district: 24, name: "Brett A. Clark"},
    {district: 25, name: "Mike Gaskill"},
    {district: 26, name: "Scott Alexander"},
    {district: 27, name: "Jeff Raatz"},
    {district: 28, name: "Michael Crider"},
    {district: 29, name: "J.D. Ford"},
    {district: 30, name: "Fady Qaddoura"},
    {district: 31, name: "Kyle Walker"},
    {district: 32, name: "Aaron Freeman"},
    {district: 33, name: "Greg Taylor"},
    {district: 34, name: "La Keisha Jackson"},
    {district: 35, name: "Michael Young"},
    {district: 36, name: "Cyndi Carrasco"},
    {district: 37, name: "Rodric D. Bray"},
    {district: 38, name: "Greg Goode"},
    {district: 39, name: "Eric Bassler"},
    {district: 40, name: "Shelli Yoder"},
    {district: 41, name: "Greg Walker"},
    {district: 42, name: "Jean Leising"},
    {district: 43, name: "Randy Maxwell"},
    {district: 44, name: "Eric Koch"},
    {district: 45, name: "Chris Garten"},
    {district: 46, name: "Andrea Hunley"},
    {district: 47, name: "Gary Byrne"},
    {district: 48, name: "Daryl Schmitt"},
    {district: 49, name: "Jim Tomes"},
    {district: 50, name: "Vaneta Becker"}
];

// District cache to avoid frequent calls to GIS service
const districtCache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours

// Route to fetch legislators by address
app.get("/:year/address/legislators", async (req, res) => {
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
        
        // STEP 1: Convert address to coordinates using Census Geocoder
        const formattedAddress = `${street}, ${city}, Indiana ${zip || ''}`;
        const geocodeUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(formattedAddress)}&benchmark=Public_AR_Current&format=json`;
        
        console.log(`Geocoding URL: ${geocodeUrl}`);
        
        let geocodeResponse;
        try {
            geocodeResponse = await fetch(geocodeUrl);
            
            if (!geocodeResponse.ok) {
                throw new Error(`Geocoding API returned ${geocodeResponse.status}`);
            }
        } catch (error) {
            console.error('Error fetching from Census Geocoding API:', error);
            throw new Error(`Failed to geocode address: ${error.message}`);
        }
        
        let geocodeData;
        try {
            geocodeData = await geocodeResponse.json();
            console.log('Geocode response received');
        } catch (error) {
            console.error('Error parsing geocode response:', error);
            throw new Error('Failed to parse geocoding response');
        }
        
        // Check if address was found
        if (!geocodeData.result || !geocodeData.result.addressMatches || geocodeData.result.addressMatches.length === 0) {
            console.log('No address matches found in geocoding response');
            return res.status(404).json({
                error: "Address not found",
                details: "Could not locate the provided address"
            });
        }
        
        // Get coordinates from the first match
        const match = geocodeData.result.addressMatches[0];
        const longitude = match.coordinates.x;
        const latitude = match.coordinates.y;
        
        console.log(`Coordinates found: lon ${longitude}, lat ${latitude}`);
        
        // STEP 2: Query the Indiana GIS service to find the voting district
        let houseDistrict, senateDistrict;
        
        // Try to get district info from cache first
        const cacheKey = `${longitude},${latitude}`;
        const cachedDistricts = districtCache.get(cacheKey);
        
        if (cachedDistricts) {
            console.log('Using cached district information');
            houseDistrict = cachedDistricts.houseDistrict;
            senateDistrict = cachedDistricts.senateDistrict;
        } else {
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
                    houseDistrict = parseInt(feature.attributes.h);
                    senateDistrict = parseInt(feature.attributes.s);
                    
                    // Cache the results
                    districtCache.set(cacheKey, { houseDistrict, senateDistrict });
                    
                    console.log(`Districts found: House ${houseDistrict}, Senate ${senateDistrict}`);
                } else {
                    console.log('No district found for these coordinates');
                }
            } catch (error) {
                console.error('Error querying GIS service:', error);
            }
        }
        
        // STEP 3: Look up the legislators from our local data
        // Find House representative
        const houseRep = houseRepresentatives.find(rep => rep.district === houseDistrict);
        
        // Find Senator
        const senator = stateSenatorsData.find(sen => sen.district === senateDistrict);
        
        // Prepare the legislators in the format expected by the frontend
        const legislators = [];
        
        if (houseRep) {
            legislators.push({
                firstName: houseRep.name.split(' ')[0],
                lastName: houseRep.name.split(' ').slice(1).join(' '),
                district: houseRep.district.toString(),
                chamber: 'H',
                party: 'Republican', // Add actual party data if available
                link: `/legislators/${houseRep.name.replace(/\s+/g, '_').toLowerCase()}`
            });
        }
        
        if (senator) {
            legislators.push({
                firstName: senator.name.split(' ')[0],
                lastName: senator.name.split(' ').slice(1).join(' '),
                district: senator.district.toString(),
                chamber: 'S',
                party: 'Republican', // Add actual party data if available
                link: `/legislators/${senator.name.replace(/\s+/g, '_').toLowerCase()}`
            });
        }
        
        console.log(`Found ${legislators.length} legislators`);
        
        // Return the results
        res.json({
            items: legislators,
            count: legislators.length,
            houseDistrict,
            senateDistrict,
            address: match.matchedAddress,
            coordinates: { longitude, latitude }
        });
        
    } catch (error) {
        console.error('Error finding legislators by address:', error);
        res.status(500).json({
            error: "Failed to find legislators",
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

                    // Properly calculate timing
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