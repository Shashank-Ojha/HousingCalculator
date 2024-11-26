from flask import Flask, render_template, request, jsonify
from calculator import calculate_mortgage_payments

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    data = request.get_json()
    
    result = calculate_mortgage_payments(
        home_price=float(data['home_price']),
        down_payment=float(data['down_payment']),
        interest_rate=float(data['interest_rate']),
        loan_term=int(data['loan_term']),
        property_tax_rate=float(data['property_tax_rate']),
        monthly_rent=float(data['monthly_rent']) if data.get('monthly_rent') is not None else None
    )
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
