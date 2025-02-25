import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

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

// Enhanced fetch function
const fetchIGAData = async (year, endpoint) => {
    const url = `https://api.iga.in.gov/${year}/${endpoint}`;
    
    try {
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
        return data;
    } catch (error) {
        console.error(`Error fetching from ${url}:`, error);
        throw error;
    }
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

// Route to fetch bills for a specific legislator
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

// Route to fetch authored bills for a specific legislator
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

// Route to fetch coauthored bills for a specific legislator
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

// Route to fetch sponsored bills for a specific legislator
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

// Route to fetch cosponsored bills for a specific legislator
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
