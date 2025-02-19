// services/api.js
import { API_BASE_URL } from '../config.js';

export const billDetailsCache = new Map();
export const billActionsCache = new Map();

export const fetchLegislators = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/legislators`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Error fetching legislators:', error);
        return [];
    }
};

export const fetchBillDetails = async (billName, year) => {
    if (billDetailsCache.has(billName)) {
        return billDetailsCache.get(billName);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${year}/bills/${billName}`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        
        billDetailsCache.set(billName, data);
        return data;
    } catch (error) {
        console.error('Error fetching bill details:', error);
        return null;
    }
};

export const fetchBillActions = async (billName, year) => {
    if (billActionsCache.has(billName)) {
        return billActionsCache.get(billName);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${year}/bills/${billName}/actions`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        
        billActionsCache.set(billName, data.items || []);
        return data.items || [];
    } catch (error) {
        console.error('Error fetching bill actions:', error);
        return [];
    }
};

export const fetchBillsByLegislator = async (legislatorId, year, type) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/${year}/legislators/${legislatorId}/bills/${type}`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Ensure we have an array of bills
        if (!data || !data.items || !Array.isArray(data.items)) {
            console.warn(`Invalid response format for ${type} bills:`, data);
            return [];
        }
        
        return data.items;
    } catch (error) {
        console.error(`Error fetching ${type} bills:`, error);
        return []; // Return empty array instead of throwing
    }
};

export const fetchAllBillsByLegislator = async (legislatorId, year) => {
    const types = ['authored', 'coauthored', 'sponsored', 'cosponsored'];
    try {
        const billsByType = await Promise.all(
            types.map(type => fetchBillsByLegislator(legislatorId, year, type))
        );

        return billsByType.map((bills, index) => ({
            type: types[index],
            bills: bills.filter(bill => 
                bill.billName.startsWith('SB') || bill.billName.startsWith('HB')
            )
        }));
    } catch (error) {
        console.error('Error fetching all bills:', error);
        return [];
    }
};

export const clearCaches = () => {
    billDetailsCache.clear();
    billActionsCache.clear();
};