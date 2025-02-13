import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Middleware to parse JSON
app.use(express.json());

// Base URL for MyIGA API
const MYIGA_API_URL = "https://api.iga.in.gov/2025";

// Function to fetch data from MyIGA API with error handling
const fetchIGAData = async (endpoint) => {
    try {
        const response = await fetch(`${MYIGA_API_URL}/${endpoint}`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "x-api-key": process.env.MYIGA_API_KEY,
                "User-Agent": `iga-api-client-${process.env.MYIGA_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
};

// Route to fetch all bills
app.get("/bills", async (req, res) => {
    try {
        const { number } = req.query;
        const endpoint = number ? `bills?number=${number}` : "bills";
        const data = await fetchIGAData(endpoint);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch data from MyIGA API" });
    }
});

// Route to fetch a specific bill by ID
app.get("/bills/:billId", async (req, res) => {
    try {
        const billId = req.params.billId;
        const data = await fetchIGAData(`bills/${billId}`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch bill details" });
    }
});

// Route to fetch all legislators
app.get("/legislators", async (req, res) => {
    try {
        const data = await fetchIGAData("legislators");
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch data from MyIGA API" });
    }
});

// Route to fetch a specific legislator by user ID
app.get("/legislators/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const data = await fetchIGAData(`legislators/${userId}`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch legislator details" });
    }
});

// Route to fetch committee reports
app.get("/committee-reports", async (req, res) => {
    try {
        const data = await fetchIGAData("committee-reports");
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch committee reports" });
    }
});

// Route to fetch a specific committee report by name
app.get("/committee-reports/:name", async (req, res) => {
    try {
        const name = req.params.name;
        const data = await fetchIGAData(`committee-reports/${name}`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch committee report details" });
    }
});

// Route to fetch all historical tables
app.get("/historical-tables", async (req, res) => {
    try {
        const data = await fetchIGAData("historical-tables");
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch historical tables" });
    }
});

// Route to fetch a specific historical table by RNS detail
app.get("/historical-tables/:rnsDetail", async (req, res) => {
    try {
        const rnsDetail = req.params.rnsDetail;
        const data = await fetchIGAData(`historical-tables/${rnsDetail}`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch historical table details" });
    }
});

// Route to fetch bills for a specific legislator
app.get("/:year/legislators/:userId/bills", async (req, res) => {
    try {
        const { year, userId } = req.params;
        const data = await fetchIGAData(`legislators/${userId}/bills`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch legislator bills" });
    }
});

// Route to fetch authored bills for a specific legislator
app.get("/:year/legislators/:userId/bills/authored", async (req, res) => {
    try {
        const { year, userId } = req.params;
        const data = await fetchIGAData(`legislators/${userId}/bills/authored`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch authored bills" });
    }
});

// Route to fetch coauthored bills for a specific legislator
app.get("/:year/legislators/:userId/bills/coauthored", async (req, res) => {
    try {
        const { year, userId } = req.params;
        const data = await fetchIGAData(`legislators/${userId}/bills/coauthored`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch coauthored bills" });
    }
});

// Route to fetch sponsored bills for a specific legislator
app.get("/:year/legislators/:userId/bills/sponsored", async (req, res) => {
    try {
        const { year, userId } = req.params;
        const data = await fetchIGAData(`legislators/${userId}/bills/sponsored`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch sponsored bills" });
    }
});

// Route to fetch cosponsored bills for a specific legislator
app.get("/:year/legislators/:userId/bills/cosponsored", async (req, res) => {
    try {
        const { year, userId } = req.params;
        const data = await fetchIGAData(`legislators/${userId}/bills/cosponsored`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch cosponsored bills" });
    }
});

// Route to fetch all bills for a specific year
app.get("/:year/bills", async (req, res) => {
    try {
        const { year } = req.params;
        const data = await fetchIGAData(`bills?session=${year}`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch bills" });
    }
});

// Route to fetch actions for a specific bill
app.get("/:year/bills/:name/actions", async (req, res) => {
    try {
        const { year, name } = req.params;
        const data = await fetchIGAData(`bills/${name}/actions`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch bill actions" });
    }
});

// Route to fetch details for a specific bill
app.get("/:year/bills/:name", async (req, res) => {
    try {
        const { year, name } = req.params;
        const data = await fetchIGAData(`bills/${name}`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch bill details" });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});