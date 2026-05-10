// Format number with commas
function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Parse formatted number string back to number
function parseFormattedNumber(string) {
    if (typeof string !== 'string') return 0;
    return parseFloat(string.replace(/,/g, '')) || 0;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format percent
function formatPercent(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value / 100);
}

// Calculate mortgage payments
function calculateMortgagePayments(homePrice, downPayment, interestRate, loanTerm, propertyTaxRate, monthlyRent, nwParams) {
    // Calculate loan amount
    const loanAmount = homePrice - downPayment;

    // Convert annual interest rate to monthly
    const monthlyRate = (interestRate / 100) / 12;

    // Calculate number of monthly payments
    const numPayments = loanTerm * 12;

    // Calculate monthly P&I payment
    let monthlyPayment;
    if (monthlyRate === 0) {
        monthlyPayment = loanAmount / numPayments;
    } else {
        monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    }

    // Calculate monthly property tax
    const annualPropertyTax = homePrice * (propertyTaxRate / 100);
    const monthlyPropertyTax = annualPropertyTax / 12;

    // Calculate amortization schedule
    let schedule = [];
    let remainingBalance = loanAmount;
    let totalInterest = 0;
    let totalPrincipalPaid = 0;

    // Net Worth Tracking
    let rentingLiquid = nwParams ? nwParams.initialNetWorth : 0;
    let buyingLiquid = nwParams ? (nwParams.initialNetWorth - downPayment) : 0;
    const monthlyMarketReturn = nwParams ? (nwParams.marketReturn / 100) / 12 : 0;

    for (let month = 1; month <= numPayments; month++) {
        // Calculate interest for this month
        const interestPayment = remainingBalance * monthlyRate;

        // Calculate principal for this month
        const principalPayment = monthlyPayment - interestPayment;

        // Update running totals
        totalInterest += interestPayment;
        remainingBalance -= principalPayment;
        totalPrincipalPaid += principalPayment;

        // Calculate cumulative interest rate
        const cumulativeRate = (totalInterest / loanAmount) * 100;

        // Calculate cumulative rent if provided
        const cumulativeRentPaid = monthlyRent ? monthlyRent * month : null;

        // Update Net Worth
        if (nwParams) {
            rentingLiquid = rentingLiquid * (1 + monthlyMarketReturn) + nwParams.monthlySavingsRent;
            buyingLiquid = buyingLiquid * (1 + monthlyMarketReturn) + nwParams.monthlySavingsBuy + (nwParams.annualTaxSaved / 12);
        }

        schedule.push({
            month: month,
            payment: monthlyPayment,
            principal: principalPayment,
            interest: interestPayment,
            remaining_balance: Math.max(0, remainingBalance),
            total_interest_paid: totalInterest,
            effective_rate: cumulativeRate,
            cumulative_rent: cumulativeRentPaid,
            property_tax: monthlyPropertyTax,
            net_worth_renting: rentingLiquid,
            net_worth_buying: buyingLiquid + totalPrincipalPaid
        });
    }

    return {
        monthly_payment: monthlyPayment,
        monthly_property_tax: monthlyPropertyTax,
        total_monthly_payment: monthlyPayment + monthlyPropertyTax,
        total_interest: totalInterest,
        total_cost: loanAmount + totalInterest,
        annual_property_tax: annualPropertyTax,
        loan_amount: loanAmount,
        nominal_rate: interestRate,
        amortization_schedule: schedule
    };
}

// Initialize chart variables
let expenseChart = null;
let savingsChart = null;

// Function to create chart options
function createChartOptions(yAxisLabel) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index',
        },
        elements: {
            point: {
                radius: 0,
                hitRadius: 10,
                hoverRadius: 6,
            },
            line: {
                tension: 0.4
            }
        },
        plugins: {
            title: {
                display: false
            },
            legend: {
                labels: {
                    color: '#f8fafc',
                    font: {
                        family: "'Inter', sans-serif",
                        size: 13
                    },
                    usePointStyle: true,
                    padding: 20
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#94a3b8',
                bodyColor: '#f8fafc',
                bodyFont: {
                    family: "'Inter', sans-serif",
                    size: 14
                },
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 12,
                boxPadding: 6,
                usePointStyle: true,
                callbacks: {
                    label: function (context) {
                        return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                    },
                    title: function (context) {
                        return 'Month ' + context[0].label;
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Month',
                    color: '#94a3b8'
                },
                grid: {
                    display: false,
                    drawBorder: false
                },
                ticks: {
                    color: '#94a3b8',
                    maxTicksLimit: 12
                }
            },
            y: {
                title: {
                    display: true,
                    text: yAxisLabel,
                    color: '#94a3b8'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    drawBorder: false
                },
                ticks: {
                    color: '#94a3b8',
                    callback: function (value) {
                        if (value >= 1000000) {
                            return '$' + (value / 1000000).toFixed(1) + 'M';
                        } else if (value >= 1000) {
                            return '$' + (value / 1000).toFixed(0) + 'k';
                        }
                        return '$' + value;
                    }
                }
            }
        }
    };
}

// Helper to create gradient
function getGradient(ctx, colorStart, colorEnd) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    return gradient;
}

// Function to update charts
function updateCharts(data) {
    const months = data.map(item => item.month);
    const totalInterest = data.map(item => parseFloat(item.total_interest_paid.toFixed(2)));
    const cumulativeRent = data.map(item => item.cumulative_rent !== null ? parseFloat(item.cumulative_rent.toFixed(2)) : null);

    // Update Expense Chart
    const expenseCtx = document.getElementById('expenseChart').getContext('2d');
    if (expenseChart) {
        expenseChart.destroy();
    }

    const interestGradient = getGradient(expenseCtx, 'rgba(239, 68, 68, 0.4)', 'rgba(239, 68, 68, 0.0)');

    expenseChart = new Chart(expenseCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Total Interest (Cost of Borrowing)',
                    data: totalInterest,
                    borderColor: '#ef4444',
                    backgroundColor: interestGradient,
                    borderWidth: 3,
                    fill: true
                }
            ]
        },
        options: createChartOptions('Money Spent ($)')
    });

    // Add rent dataset to expense chart if rent data exists
    if (cumulativeRent.some(value => value !== null)) {
        const rentGradient = getGradient(expenseCtx, 'rgba(59, 130, 246, 0.4)', 'rgba(59, 130, 246, 0.0)');
        expenseChart.data.datasets.push({
            label: 'Total Rent Paid',
            data: cumulativeRent,
            borderColor: '#3b82f6',
            backgroundColor: rentGradient,
            borderWidth: 3,
            fill: true
        });
        expenseChart.update();
    }

    // Update Savings Chart (Net Worth)
    const savingsCtx = document.getElementById('savingsChart').getContext('2d');
    if (savingsChart) {
        savingsChart.destroy();
    }

    const rentNW = data.map(item => parseFloat(item.net_worth_renting.toFixed(2)));
    const buyNW = data.map(item => parseFloat(item.net_worth_buying.toFixed(2)));

    const rentGradient = getGradient(savingsCtx, 'rgba(59, 130, 246, 0.4)', 'rgba(59, 130, 246, 0.0)');
    const buyGradient = getGradient(savingsCtx, 'rgba(16, 185, 129, 0.4)', 'rgba(16, 185, 129, 0.0)');

    savingsChart = new Chart(savingsCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Net worth if renting',
                    data: rentNW,
                    borderColor: '#3b82f6',
                    backgroundColor: rentGradient,
                    borderWidth: 3,
                    fill: true
                },
                {
                    label: 'Net worth if buying',
                    data: buyNW,
                    borderColor: '#10b981',
                    backgroundColor: buyGradient,
                    borderWidth: 3,
                    fill: true
                }
            ]
        },
        options: createChartOptions('Net Worth ($)')
    });
}

// Highlight active section in navigation
function highlightActiveSection() {
    // Don't update if user just clicked (within last 1000ms)
    if (Date.now() - lastClickTime < 1000) return;

    const sections = document.querySelectorAll('.card[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    // Find which section is most visible in the viewport
    let maxVisibleSection = '';
    let maxVisibleAmount = 0;

    sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const viewHeight = Math.min(window.innerHeight || document.documentElement.clientHeight);

        // Calculate how much of the section is visible
        const visibleHeight = Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0);

        if (visibleHeight > maxVisibleAmount && visibleHeight > 0) {
            maxVisibleAmount = visibleHeight;
            maxVisibleSection = section.getAttribute('id');
        }
    });

    // Update active state of nav links
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === maxVisibleSection) {
            link.classList.add('active');
        }
    });
}

// Track last click time
let lastClickTime = 0;

// Add click handlers for navigation links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
        // Update last click time
        lastClickTime = Date.now();
        // Remove active class from all links
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        // Add active class to clicked link
        this.classList.add('active');
    });
});

// Add scroll event listener
window.addEventListener('scroll', highlightActiveSection);

// Initialize number formatting when the page loads
document.addEventListener('DOMContentLoaded', function () {
    // Format initial values
    const homePrice = document.getElementById('homePrice');
    const downPayment = document.getElementById('downPayment');

    if (homePrice.value) {
        homePrice.value = formatNumber(parseFormattedNumber(homePrice.value));
    }
    if (downPayment.value) {
        downPayment.value = formatNumber(parseFormattedNumber(downPayment.value));
    }

    // Format new parameters
    const formatIds = ['initialNetWorth', 'monthlyRent', 'monthlySavingsRent', 'monthlySavingsBuy', 'annualTaxSaved'];
    formatIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value) {
            el.value = formatNumber(parseFormattedNumber(el.value));

            // Add input listeners to these new fields as well
            el.addEventListener('input', function (e) {
                let value = e.target.value.replace(/[^\d]/g, '');
                if (value) {
                    const number = parseInt(value);
                    if (!isNaN(number)) {
                        e.target.value = formatNumber(number);
                    }
                }
            });
        }
    });
});

// Format number inputs
const homePriceInput = document.getElementById('homePrice');
const downPaymentInput = document.getElementById('downPayment');

homePriceInput.addEventListener('input', function (e) {
    let value = e.target.value.replace(/[^\d]/g, '');
    if (value) {
        const number = parseInt(value);
        if (!isNaN(number)) {
            e.target.value = formatNumber(number);
        }
    }
});

downPaymentInput.addEventListener('input', function (e) {
    let value = e.target.value.replace(/[^\d]/g, '');
    if (value) {
        const number = parseInt(value);
        if (!isNaN(number)) {
            e.target.value = formatNumber(number);
        }
    }
});

// Handle form submission
document.getElementById('mortgageForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const nwParams = {
        initialNetWorth: parseFormattedNumber(document.getElementById('initialNetWorth').value),
        marketReturn: parseFloat(document.getElementById('marketReturn').value) || 0,
        monthlySavingsRent: parseFormattedNumber(document.getElementById('monthlySavingsRent').value),
        monthlySavingsBuy: parseFormattedNumber(document.getElementById('monthlySavingsBuy').value),
        annualTaxSaved: parseFormattedNumber(document.getElementById('annualTaxSaved').value)
    };

    const result = calculateMortgagePayments(
        parseFormattedNumber(homePriceInput.value),
        parseFormattedNumber(downPaymentInput.value),
        parseFloat(document.getElementById('interestRate').value),
        parseInt(document.getElementById('loanTerm').value),
        parseFloat(document.getElementById('propertyTax').value),
        parseFormattedNumber(document.getElementById('monthlyRent').value) || null,
        nwParams
    );

    // Update amortization table
    const tableBody = document.querySelector('.table tbody');
    tableBody.innerHTML = '';

    // Update Payment Summary section
    document.getElementById('monthlyPayment').textContent = formatCurrency(result.monthly_payment);
    document.getElementById('principalAndInterest').textContent = formatCurrency(result.monthly_payment);
    document.getElementById('propertyTaxPayment').textContent = formatCurrency(result.monthly_property_tax);
    document.getElementById('totalMonthlyPayment').textContent = formatCurrency(result.total_monthly_payment);

    document.getElementById('loanAmount').textContent = formatCurrency(result.loan_amount);
    document.getElementById('downPaymentAmount').textContent = formatCurrency(parseFormattedNumber(downPaymentInput.value));
    document.getElementById('interestRateDisplay').textContent = formatPercent(parseFloat(document.getElementById('interestRate').value));
    document.getElementById('loanTermDisplay').textContent = document.getElementById('loanTerm').value + ' years';
    document.getElementById('totalInterestPaid').textContent = formatCurrency(result.total_interest);
    document.getElementById('totalCost').textContent = formatCurrency(result.total_cost);

    let totalPrincipalPaid = 0;
    let totalAmountPaid = 0;

    result.amortization_schedule.forEach(month => {
        totalPrincipalPaid += month.principal;
        totalAmountPaid += month.payment + month.property_tax;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${month.month}</td>
            <td class="text-primary fw-bold">${formatCurrency(totalAmountPaid)}</td>
            <td>${formatCurrency(month.payment)}</td>
            <td class="text-success">${formatCurrency(month.principal)}</td>
            <td class="text-danger">${formatCurrency(month.interest)}</td>
            <td class="text-danger">${formatCurrency(month.total_interest_paid)}</td>
            <td class="text-success">${formatCurrency(totalPrincipalPaid)}</td>
            <td>${formatCurrency(month.remaining_balance)}</td>
            <td>${formatPercent(month.effective_rate)}</td>
            <td class="text-primary fw-bold">${formatCurrency(month.net_worth_renting)}</td>
            <td class="text-success fw-bold">${formatCurrency(month.net_worth_buying)}</td>
        `;
        tableBody.appendChild(row);
    });

    // Update charts
    updateCharts(result.amortization_schedule);

    // Show results with animation
    const resultsSection = document.getElementById('results');
    resultsSection.style.display = 'block';
    // Force a reflow to ensure the animation triggers
    void resultsSection.offsetWidth;
    resultsSection.classList.add('show');
});
