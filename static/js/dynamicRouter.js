document.addEventListener('DOMContentLoaded', function() {
    // Listen for clicks on bill links
    document.body.addEventListener('click', function(event) {
        // Check if we clicked a bill link
        if (event.target.matches('.bill-link') || event.target.closest('.bill-link')) {
            const link = event.target.matches('.bill-link') ? event.target : event.target.closest('.bill-link');
            event.preventDefault();
            
            const billId = link.dataset.bill;
            const year = link.dataset.year || '2025';
            
            // Update URL without navigating
            window.history.pushState(
                {billId, year}, 
                `Bill ${billId}`, 
                `/issues/${year}/${billId}`
            );
            
            // Load the bill content
            loadBillContent(billId, year);
        }
    });
    
    // Handle browser back/forward navigation
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.billId) {
            loadBillContent(event.state.billId, event.state.year);
        } else {
            // If no state, we're back at the main page
            document.getElementById('bill-detail-container').innerHTML = '';
        }
    });
    
    // Check if we're already on a bill page
    const path = window.location.pathname;
    const match = path.match(/\/issues\/(\d+)\/([A-Za-z0-9]+)/);
    if (match) {
        const year = match[1];
        const billId = match[2];
        loadBillContent(billId, year);
    }
});

function loadBillContent(billId, year) {
    // This function will be called by the bill-specific page
    console.log(`Loading bill ${billId} from ${year}`);
}