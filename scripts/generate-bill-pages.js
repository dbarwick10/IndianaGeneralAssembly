// scripts/generate-bill-pages.js
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const API_BASE_URL = 'https://indianageneralassembly-production.up.railway.app';
const CONTENT_DIR = path.join(__dirname, '../content/issues');
const YEAR = '2025';

async function fetchBillData(billNumber) {
  const response = await fetch(`${API_BASE_URL}/${YEAR}/bills/${billNumber}`);
  return response.json();
}

async function generateBillPage(billNumber, category) {
  const billData = await fetchBillData(billNumber);
  
  // Determine sponsors
  const sponsors = billData.authors?.map(author => ({
    name: author.fullName,
    party: author.party.charAt(0)
  })) || [];
  
  // Get latest action
  const lastAction = billData.actions?.length ? 
    billData.actions[billData.actions.length - 1] : 
    { description: 'No actions recorded', date: new Date().toISOString() };
  
  // Create frontmatter
  const frontmatter = `---
title: "${billData.description || billNumber}"
billNumber: "${billNumber}"
year: ${YEAR}
category: "${category}"
status: "${billData.status || 'In Progress'}"
sponsors:
${sponsors.map(s => `  - name: "${s.name}"\n    party: "${s.party}"`).join('\n')}
description: "${billData.title || 'No description available'}"
lastAction: "${lastAction.description}"
lastActionDate: "${lastAction.date}"
callScript: |
  Hello, my name is [Your Name] and I'm a constituent from [Your City/Town].
  
  I'm calling about ${billNumber} regarding ${billData.description || 'this bill'}.
  
  [Your personal message about the bill]
  
  Thank you for your time.
---

## Bill Summary

${billData.title || 'No detailed summary available.'}

${billData.latestVersion?.digest ? `\n\n${billData.latestVersion.digest}` : ''}

## Current Status

${lastAction.description} on ${new Date(lastAction.date).toLocaleDateString()}.
`;

  // Ensure directory exists
  const dir = path.join(CONTENT_DIR, YEAR, category);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write file
  const filePath = path.join(dir, `${billNumber.toLowerCase()}.md`);
  fs.writeFileSync(filePath, frontmatter);
  
  console.log(`Generated page for ${billNumber} in ${category}`);
}

// Example usage
generateBillPage('HB1002', 'education')
  .catch(err => console.error('Error generating bill page:', err));