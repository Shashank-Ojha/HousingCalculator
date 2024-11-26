def calculate_mortgage_payments(
    home_price: float,
    down_payment: float,
    interest_rate: float,
    loan_term: int,
    property_tax_rate: float,
    home_insurance: float = 0,
    pmi_rate: float = 0,
    monthly_rent: float = None
) -> dict:
    """
    Calculate monthly mortgage payments with complete amortization schedule.
    
    Args:
        home_price: Total price of the home
        down_payment: Down payment amount
        interest_rate: Annual interest rate (in percentage)
        loan_term: Loan term in years
        property_tax_rate: Annual property tax rate (in percentage)
        home_insurance: Annual home insurance amount (optional, default 0)
        pmi_rate: PMI rate in percentage (optional, default 0)
        monthly_rent: Monthly rent for comparison (optional, default None)
    
    Returns:
        Dictionary containing all payment components and total
    """
    # Calculate loan amount
    loan_amount = home_price - down_payment
    
    # Convert annual interest rate to monthly (APR to monthly rate)
    monthly_rate = (interest_rate / 100) / 12
    
    # Calculate number of monthly payments
    num_payments = loan_term * 12
    
    # Calculate monthly P&I payment
    if monthly_rate == 0:
        monthly_payment = loan_amount / num_payments
    else:
        monthly_payment = loan_amount * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
    
    # Calculate monthly property tax
    annual_property_tax = home_price * (property_tax_rate / 100)
    monthly_property_tax = annual_property_tax / 12
    
    # Calculate amortization schedule
    schedule = []
    remaining_balance = loan_amount
    total_interest = 0
    
    for month in range(1, num_payments + 1):
        # Calculate interest for this month
        interest_payment = remaining_balance * monthly_rate
        
        # Calculate principal for this month
        principal_payment = monthly_payment - interest_payment
        
        # Update running totals
        total_interest += interest_payment
        remaining_balance -= principal_payment
        
        # Calculate cumulative interest rate
        # This shows the total interest paid to date as a percentage of the original loan
        cumulative_rate = (total_interest / loan_amount) * 100
        
        # Calculate cumulative rent if provided
        cumulative_rent = None
        if monthly_rent is not None:
            cumulative_rent = monthly_rent * month
        
        # Add to schedule
        schedule.append({
            'month': month,
            'payment': monthly_payment,
            'principal': principal_payment,
            'interest': interest_payment,
            'remaining_balance': max(0, remaining_balance),
            'total_interest_paid': total_interest,
            'effective_rate': cumulative_rate,
            'cumulative_rent': cumulative_rent
        })
    
    # Return all calculation results
    return {
        'monthly_payment': round(monthly_payment, 2),
        'monthly_property_tax': round(monthly_property_tax, 2),
        'total_monthly_payment': round(monthly_payment + monthly_property_tax, 2),
        'total_interest': round(total_interest, 2),
        'total_cost': round(loan_amount + total_interest, 2),
        'annual_property_tax': round(annual_property_tax, 2),
        'loan_amount': round(loan_amount, 2),
        'nominal_rate': round(interest_rate, 3),  # The stated annual rate
        'amortization_schedule': [{
            'month': item['month'],
            'payment': round(item['payment'], 2),
            'principal': round(item['principal'], 2),
            'interest': round(item['interest'], 2),
            'remaining_balance': round(item['remaining_balance'], 2),
            'total_interest_paid': round(item['total_interest_paid'], 2),
            'effective_rate': round(item['effective_rate'], 3),
            'cumulative_rent': round(item['cumulative_rent'], 2) if item['cumulative_rent'] is not None else None
        } for item in schedule]
    }
