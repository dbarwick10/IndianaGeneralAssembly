const App = () => {
    const [legislators, setLegislators] = React.useState([]);
    const [selectedLegislator, setSelectedLegislator] = React.useState('');
    const [bills, setBills] = React.useState([]);
    const [billDetails, setBillDetails] = React.useState({});
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const fetchLegislators = async () => {
            try {
                const response = await fetch('https://api.iga.in.gov/legislators');
                const data = await response.json();
                setLegislators(data.items || []);
            } catch (error) {
                console.error('Error fetching legislators:', error);
            }
        };

        fetchLegislators();
    }, []);

    const fetchBillDetails = async (billId) => {
        try {
            const response = await fetch(`https://api.iga.in.gov/bills/${billId}`);
            const data = await response.json();
            setBillDetails(prev => ({
                ...prev,
                [billId]: data
            }));
            return data;
        } catch (error) {
            console.error('Error fetching bill details:', error);
            return null;
        }
    };

    const fetchBills = async (legislatorId) => {
        setLoading(true);
        try {
            const response = await fetch(`https://api.iga.in.gov/legislators/${legislatorId}/authored`);
            const data = await response.json();
            setBills(data.items || []);
            
            // Fetch details for each bill
            for (const bill of data.items || []) {
                await fetchBillDetails(bill.billName);
            }
        } catch (error) {
            console.error('Error fetching bills:', error);
            setBills([]);
        }
        setLoading(false);
    };

    const countPartyAffiliation = (legislators) => {
        const count = { democrat: 0, republican: 0 };
        legislators?.forEach(legislator => {
            if (legislator.party?.toLowerCase().includes('democrat')) {
                count.democrat++;
            } else if (legislator.party?.toLowerCase().includes('republican')) {
                count.republican++;
            }
        });
        return count;
    };

    const renderPartyCount = (count) => {
        return (
            <span className="text-sm">
                (D: {count.democrat}, R: {count.republican})
            </span>
        );
    };

    const renderLegislatorList = (legislators, title) => {
        if (!legislators || legislators.length === 0) return null;
        const partyCount = countPartyAffiliation(legislators);
        
        return (
            <div className="mb-2">
                <div className="font-semibold">{title} {renderPartyCount(partyCount)}</div>
                <div className="pl-4">
                    {legislators.map((legislator, index) => (
                        <div key={index} className="text-sm">
                            {legislator.fullName} ({legislator.party?.[0]})
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="p-4 max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Indiana Legislature Bill Tracker</h1>
            
            <select 
                className="w-full p-2 mb-4 border rounded"
                value={selectedLegislator}
                onChange={(e) => {
                    setSelectedLegislator(e.target.value);
                    fetchBills(e.target.value);
                }}
            >
                <option value="">Select a legislator</option>
                {legislators.map((legislator) => (
                    <option key={legislator.link} value={legislator.link}>
                        {legislator.name}
                    </option>
                ))}
            </select>

            {loading ? (
                <div className="text-center p-4">Loading...</div>
            ) : bills.length > 0 ? (
                <div className="space-y-6">
                    {bills.map((bill) => {
                        const details = billDetails[bill.billName];
                        return (
                            <div key={bill.link} className="border rounded-lg p-4 shadow-sm">
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold mb-2">{bill.billName}</h2>
                                        <p className="text-gray-700 mb-2">{bill.description}</p>
                                        <div className="text-sm text-gray-600 mb-2">
                                            Latest Action: {bill.latestVersion?.action || 'No action recorded'}
                                        </div>
                                    </div>
                                    
                                    <div className="border-t pt-2">
                                        {renderLegislatorList(details?.authors, 'Authors')}
                                        {renderLegislatorList(details?.coauthors, 'Co-Authors')}
                                        {renderLegislatorList(details?.sponsors, 'Sponsors')}
                                        {renderLegislatorList(details?.cosponsors, 'Co-Sponsors')}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : selectedLegislator && (
                <div className="text-center p-4 text-gray-500">
                    No bills found for this legislator.
                </div>
            )}
        </div>
    );
};