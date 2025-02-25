document.addEventListener('DOMContentLoaded', function() {
    // Get all issue items and issue details
    const issueItems = document.querySelectorAll('.issue-item');
    const issueDetails = document.querySelectorAll('.issue-detail');
    
    // Set active issue when clicked
    issueItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            issueItems.forEach(i => i.classList.remove('active'));
            issueDetails.forEach(d => d.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Show corresponding detail
            const issueId = this.getAttribute('data-issue');
            document.getElementById(issueId).classList.add('active');
            
            // If on mobile, scroll to content area
            if (window.innerWidth <= 768) {
                const contentArea = document.querySelector('.issues-content');
                contentArea.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Function to initialize issue content
    function initializeIssues() {
        // Ensure first issue is active on page load
        if (issueItems.length > 0 && issueDetails.length > 0) {
            const firstIssue = issueItems[0];
            const firstIssueId = firstIssue.getAttribute('data-issue');
            
            firstIssue.classList.add('active');
            document.getElementById(firstIssueId).classList.add('active');
        }
    }
    
    // Initialize the page
    initializeIssues();
});