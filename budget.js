const categories = {
    'Education': [
      'Tuition Support', 
      'Other Higher Education',
      'Teacher Retirement',
      'State Student Assistance', 
      'Education Administration', 
      'Other Local Schools',
      'Other Education'
    ],
    'Health & Human Services': [
      'Medicaid',
      'Mental Health and Addictions', 
      'Family Resources',
      'Aging Services',
      'Disability and Rehabilitative Services', 
      'Department of Child Services', 
      'Public Health',
      'Other Health and Human Services', 
      'FSSA Administration'
    ],
    'Public Safety': [
      'Corrections', 
      'Other Public Safety'
    ],
    'Administration & Development': [
      'General Government',
      'Economic Development',
      'Transportation',
      'Conservation and Environment',
      'Distributions'
    ]
};

const data = [
    {
      year: 2016,
      'General Government': 574.9,
      'Corrections': 719.4,
      'Other Public Safety': 258.0,
      'Conservation and Environment': 77.2,
      'Economic Development': 72.7,
      'Transportation': 43.0,
      'FSSA Administration': 64.2,
      'Medicaid': 2027.2,
      'Mental Health and Addictions': 259.6,
      'Family Resources': 131.2,
      'Aging Services': 63.5,
      'Disability and Rehabilitative Services': 121.2,
      'Department of Child Services': 554.1,
      'Public Health': 32.6,
      'Other Health and Human Services': 31.5,
      'State Student Assistance': 363.4,
      'Other Higher Education': 1520.9,
      'Education Administration': 22.4,
      'Tuition Support': 6849.7,
      'Other Local Schools': 227.9,
      'Teacher Retirement': 836.8,
      'Other Education': 7.8,
      'Distributions': 261.4
    },
    {
      year: 2017,
      'General Government': 575.7,
      'Corrections': 719.9,
      'Other Public Safety': 250.9,
      'Conservation and Environment': 75.2,
      'Economic Development': 72.0,
      'Transportation': 44.0,
      'FSSA Administration': 63.7,
      'Medicaid': 2241.9,
      'Mental Health and Addictions': 270.0,
      'Family Resources': 131.1,
      'Aging Services': 63.5,
      'Disability and Rehabilitative Services': 121.1,
      'Department of Child Services': 554.3,
      'Public Health': 31.8,
      'Other Health and Human Services': 31.3,
      'State Student Assistance': 349.2,
      'Other Higher Education': 1552.4,
      'Education Administration': 21.9,
      'Tuition Support': 7017.4,
      'Other Local Schools': 233.4,
      'Teacher Retirement': 841.0,
      'Other Education': 7.7,
      'Distributions': 253.6
    },
    {
      year: 2020,
      'General Government': 642.2,
      'Corrections': 758.8,
      'Other Public Safety': 317.4,
      'Conservation and Environment': 83.6,
      'Economic Development': 124.8,
      'Transportation': 47.0,
      'FSSA Administration': 16.1,
      'Medicaid': 2568.7,
      'Mental Health and Addictions': 278.5,
      'Family Resources': 128.6,
      'Aging Services': 59.5,
      'Disability and Rehabilitative Services': 42.8,
      'Department of Child Services': 910.2,
      'Public Health': 29.6,
      'Other Health and Human Services': 89.6,
      'State Student Assistance': 378.9,
      'Other Higher Education': 1626.1,
      'Education Administration': 40.5,
      'Tuition Support': 7371.8,
      'Other Local Schools': 240.8,
      'Teacher Retirement': 919.0,
      'Other Education': 11.4,
      'Distributions': 60.2
    },
    {
      year: 2021,
      'General Government': 617.3,
      'Corrections': 761.8,
      'Other Public Safety': 317.7,
      'Conservation and Environment': 84.1,
      'Economic Development': 123.8,
      'Transportation': 47.0,
      'FSSA Administration': 16.1,
      'Medicaid': 2702.2,
      'Mental Health and Addictions': 277.7,
      'Family Resources': 128.6,
      'Aging Services': 59.5,
      'Disability and Rehabilitative Services': 42.8,
      'Department of Child Services': 900.2,
      'Public Health': 29.6,
      'Other Health and Human Services': 89.4,
      'State Student Assistance': 392.6,
      'Other Higher Education': 1673.9,
      'Education Administration': 40.5,
      'Tuition Support': 7554.7,
      'Other Local Schools': 237.3,
      'Teacher Retirement': 946.6,
      'Other Education': 11.4,
      'Distributions': 60.2
    },
    {
      year: 2022,
      'General Government': 628.8,
      'Corrections': 825.2,
      'Other Public Safety': 316.3,
      'Conservation and Environment': 82.5,
      'Economic Development': 149.4,
      'Transportation': 45.0,
      'FSSA Administration': 14.9,
      'Medicaid': 2707.4,
      'Mental Health and Addictions': 293.4,
      'Family Resources': 128.0,
      'Aging Services': 59.2,
      'Disability and Rehabilitative Services': 41.4,
      'Department of Child Services': 885.6,
      'Public Health': 9.7,
      'Other Health and Human Services': 83.9,
      'State Student Assistance': 382.4,
      'Other Higher Education': 1664.2,
      'Education Administration': 43.4,
      'Tuition Support': 7900.3,
      'Other Local Schools': 225.0,
      'Teacher Retirement': 975.0,
      'Other Education': 10.6,
      'Distributions': 60.4
    },
    {
      year: 2023,
      'General Government': 686.9,
      'Corrections': 830.6,
      'Other Public Safety': 320.4,
      'Conservation and Environment': 83.2,
      'Economic Development': 148.8,
      'Transportation': 45.0,
      'FSSA Administration': 14.9,
      'Medicaid': 3059.6,
      'Mental Health and Addictions': 292.7,
      'Family Resources': 128.0,
      'Aging Services': 59.2,
      'Disability and Rehabilitative Services': 41.4,
      'Department of Child Services': 885.6,
      'Public Health': 9.7,
      'Other Health and Human Services': 83.9,
      'State Student Assistance': 382.4,
      'Other Higher Education': 1685.3,
      'Education Administration': 44.0,
      'Tuition Support': 8240.3,
      'Other Local Schools': 235.9,
      'Teacher Retirement': 1005.0,
      'Other Education': 10.6,
      'Distributions': 60.4
    },
    {
      year: 2024,
      'General Government': 860.5,
      'Corrections': 931.4,
      'Other Public Safety': 450.6,
      'Conservation and Environment': 120.0,
      'Economic Development': 247.7,
      'Transportation': 45.0,
      'FSSA Administration': 20.0,
      'Medicaid': 3903.6,
      'Mental Health and Addictions': 358.2,
      'Family Resources': 154.6,
      'Aging Services': 61.8,
      'Disability and Rehabilitative Services': 57.7,
      'Department of Child Services': 976.9,
      'Public Health': 109.9,
      'Other Health and Human Services': 97.4,
      'State Student Assistance': 400.5,
      'Other Higher Education': 1768.3,
      'Education Administration': 168.9,
      'Tuition Support': 8884.5,
      'Other Local Schools': 314.8,
      'Teacher Retirement': 1035.2,
      'Other Education': 15.4,
      'Distributions': 50.5
    },
    {
      year: 2025,
      'General Government': 875.6,
      'Corrections': 937.6,
      'Other Public Safety': 453.5,
      'Conservation and Environment': 120.8,
      'Economic Development': 222.4,
      'Transportation': 45.0,
      'FSSA Administration': 20.0,
      'Medicaid': 4376.4,
      'Mental Health and Addictions': 358.2,
      'Family Resources': 155.7,
      'Aging Services': 61.8,
      'Disability and Rehabilitative Services': 55.7,
      'Department of Child Services': 952.2,
      'Public Health': 189.8,
      'Other Health and Human Services': 108.3,
      'State Student Assistance': 400.5,
      'Other Higher Education': 1788.4,
      'Education Administration': 172.4,
      'Tuition Support': 9082.5,
      'Other Local Schools': 314.8,
      'Teacher Retirement': 1066.3,
      'Other Education': 17.4,
      'Distributions': 50.5
    },
    {
      year: 2026,
      'General Government': 997.6,
      'Corrections': 1058.7,
      'Other Public Safety': 419.0,
      'Conservation and Environment': 114.2,
      'Economic Development': 183.2,
      'Transportation': 45.0,
      'FSSA Administration': 19.1,
      'Medicaid': 5028.3,
      'Mental Health and Addictions': 350.0,
      'Family Resources': 151.8,
      'Aging Services': 56.7,
      'Disability and Rehabilitative Services': 55.3,
      'Department of Child Services': 1127.2,
      'Public Health': 140.8,
      'Other Health and Human Services': 107.8,
      'State Student Assistance': 409.0,
      'Other Higher Education': 1777.1,
      'Education Administration': 121.1,
      'Tuition Support': 9423.7,
      'Other Local Schools': 212.3,
      'Teacher Retirement': 1066.3,
      'Other Education': 10.5,
      'Distributions': 50.5
    },
    {
      year: 2027,
      'General Government': 976.6,
      'Corrections': 1054.7,
      'Other Public Safety': 413.2,
      'Conservation and Environment': 114.2,
      'Economic Development': 183.2,
      'Transportation': 45.0,
      'FSSA Administration': 19.1,
      'Medicaid': 5367.6,
      'Mental Health and Addictions': 350.0,
      'Family Resources': 151.8,
      'Aging Services': 56.7,
      'Disability and Rehabilitative Services': 55.3,
      'Department of Child Services': 1127.2,
      'Public Health': 140.8,
      'Other Health and Human Services': 107.8,
      'State Student Assistance': 409.0,
      'Other Higher Education': 1769.7,
      'Education Administration': 121.1,
      'Tuition Support': 9614.6,
      'Other Local Schools': 212.3,
      'Teacher Retirement': 1066.3,
      'Other Education': 10.5,
      'Distributions': 50.5
    }
  ];
const descriptions = {
'General Government': {
    category: 'Administration',
    trend: 'Growing',
    description: 'Core state operations',
    examples: 'Governor, Legislature, Courts, Elections'
},
'Corrections': {
    category: 'Public Safety',
    trend: 'Growing',
    description: 'Prison system and rehabilitation',
    examples: 'State prisons, Parole, Prison education'
},
// Add descriptions for all other line items...
};

// Helper functions
const formatValue = (value) => {
if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}B`;
}
return `$${value.toFixed(0)}M`;
};

const getCategoryColor = (item) => {
const categoryColors = {
    'Education': '#2563eb',
    'Health & Human Services': '#16a34a',
    'Public Safety': '#dc2626',
    'Administration & Development': '#7c3aed'
};

for (const [category, items] of Object.entries(categories)) {
    if (items.includes(item)) {
    return categoryColors[category];
    }
}
return '#666666';
};

// Elements
const chartContainer = document.getElementById('chartCanvas');
const legendContainer = document.getElementById('legendContainer');
const categoryButtons = document.getElementById('categoryButtons');

// Chart instance
let chart;

// Event listeners
categoryButtons.addEventListener('click', (event) => {
if (event.target.classList.contains('category-button')) {
    const selectedCategory = event.target.dataset.category;
    updateChart(selectedCategory);
    updateActiveButton(selectedCategory);
}
});

// Initialize the chart
function initializeChart(selectedCategory) {
    const datasets = getDatasetsByCategory(selectedCategory);
  
    chart = new Chart(chartContainer, {
      type: 'line',
      data: {
        labels: data.map(d => d.year),
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
        x: {
            type: 'category',
            labels: ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027']
            },
          y: {
            ticks: {
              callback: formatValue
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = context.dataset.label;
                const currentValue = context.parsed.y;
                const previousYear = data.find((d) => d.year === context.label - 1);
                const previousValue = previousYear ? previousYear[item] : null;
                const yearChange = previousValue
                  ? ((currentValue - previousValue) / previousValue * 100).toFixed(1)
                  : null;
  
                let label = `${item}: ${formatValue(currentValue)}`;
                if (yearChange) {
                  label += ` (${yearChange}% change from previous year)`;
                }
                return label;
              }
            }
          },
          legend: {
            display: false,
            position: 'top'
          }
        }
      }
    });
  }

// Update the chart
function updateChart(selectedCategory) {
const datasets = getDatasetsByCategory(selectedCategory);
chart.data.datasets = datasets;
chart.update();
}

// Get datasets by category
function getDatasetsByCategory(selectedCategory) {
let items;
if (selectedCategory === 'all') {
    items = Object.keys(data[0]).filter((key) => key !== 'year');
} else {
    items = categories[selectedCategory] || [];
}

const datasets = items.map((item) => ({
    label: item,
    data: data.map((d) => d[item]),
    borderColor: getCategoryColor(item),
    fill: false
}));

return datasets;
}

// Create category buttons
function createCategoryButtons() {
const allButton = document.createElement('button');
allButton.textContent = 'All Categories';
allButton.classList.add('category-button');
allButton.dataset.category = 'all';
categoryButtons.appendChild(allButton);

Object.keys(categories).forEach((category) => {
    const button = document.createElement('button');
    button.textContent = category;
    button.classList.add('category-button');
    button.dataset.category = category;
    categoryButtons.appendChild(button);
});
}

// Update active button
function updateActiveButton(selectedCategory) {
const buttons = categoryButtons.querySelectorAll('.category-button');
buttons.forEach((button) => {
    if (button.dataset.category === selectedCategory) {
    button.classList.add('active');
    } else {
    button.classList.remove('active');
    }
});
}

// Create legend
function createLegend() {
const categoryGroups = {};

Object.keys(data[0])
    .filter((key) => key !== 'year')
    .forEach((item) => {
    let category = 'Other';
    for (const [cat, catItems] of Object.entries(categories)) {
        if (catItems.includes(item)) {
        category = cat;
        break;
        }
    }
    if (!categoryGroups[category]) {
        categoryGroups[category] = [];
    }
    categoryGroups[category].push(item);
    });

Object.entries(categoryGroups).forEach(([category, items]) => {
    const legendItem = document.createElement('div');
    legendItem.classList.add('legend-item');

    const legendItemTitle = document.createElement('div');
    legendItemTitle.classList.add('legend-item-title');
    legendItemTitle.textContent = category;
    legendItem.appendChild(legendItemTitle);

    items.forEach((item) => {
    const legendItemEntry = document.createElement('div');
    legendItemEntry.classList.add('legend-item-entry');

    const legendItemColor = document.createElement('div');
    legendItemColor.classList.add('legend-item-color');
    legendItemColor.style.backgroundColor = getCategoryColor(item);
    legendItemEntry.appendChild(legendItemColor);

    const legendItemLabel = document.createElement('div');
    legendItemLabel.classList.add('legend-item-label');
    legendItemLabel.textContent = item;
    legendItemEntry.appendChild(legendItemLabel);

    const itemData = data.map((year) => ({
        year: year.year,
        value: year[item]
    }));

    const startValue = itemData[0].value;
    const endValue = itemData[itemData.length - 1].value;
    const growth = ((endValue - startValue) / startValue * 100).toFixed(1);

    const legendItemValue = document.createElement('div');
    legendItemValue.classList.add('legend-item-value');
    legendItemValue.textContent = `2027: ${formatValue(endValue)} (${growth}% since 2018)`;
    legendItemEntry.appendChild(legendItemValue);

    legendItem.appendChild(legendItemEntry);
    });

    legendContainer.appendChild(legendItem);
});
}

// Initialize the app
function initialize() {
    createCategoryButtons();
    createLegend();
    initializeChart('all');
    updateActiveButton('all');
}

initialize();