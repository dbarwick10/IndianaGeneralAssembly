export function showIssuesGuide(container) {
    // Markdown guide content
    const guideMarkdown = `

# How to Use This Page

The Issues page allows you to track important legislative bills in the Indiana General Assembly and take action by contacting your representatives.

### Step 1: Select an Issue
Choose any issue from the sidebar on the left to view its details, including bill descriptions, status updates, and call scripts.

### Step 2: Find Your Legislators
Once you select an issue, you will see the "Find My Legislators" button. Click this button to locate your State Representative and Senator based on your address.

### Step 3: Call Your Representatives
Once your legislators are saved, the call scripts will have a phone number for you to call and be personalized with their names. Use the tracking system to record your calls and track your daily progress.

## Features Available

### Bill Descriptions
Get detailed information about each bill, including its purpose and potential impact.

### Personalized Call Scripts
Scripts are automatically updated with your legislators' names when you save your representatives.

### Call Tracking
Record your calls and track which representatives you've contacted about each issue.

### Daily Resets
Call tracking resets daily, encouraging regular engagement with your representatives.

## Tips for Effective Calls

- **Be concise and specific** about which bill you're calling about
- **Be polite** to the staff member who answers the phone
- **Mention that you're a constituent** from their district
- **Share a brief personal story** if relevant to why you care about the issue
- **Thank them** for their time at the end of the call

Select an issue from the sidebar to get started!`;
    
    // Parse the markdown content
    const parsedGuide = marked.parse(guideMarkdown);
    
    // Display the guide
    container.innerHTML = `
        <div class="issue-detail active issues-guide">
            ${parsedGuide}
        </div>
    `;
}
