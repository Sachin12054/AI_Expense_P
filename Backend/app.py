from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from firebase_config import db
from firebase_admin import firestore
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --------------------- Categorize Expense (Imported Function) ---------------------
def categorize_expense(title):
    # Placeholder: Implement or import your categorization logic here
    categories = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Other"]
    return categories[hash(title) % len(categories)]  # Simple hash-based categorization

# --------------------- Add Expense ---------------------
@app.route('/add_expense', methods=['POST'])
def add_expense():
    try:
        data = request.get_json()
        logger.info(f"Received data: {data}")

        user_id = data.get("userId")
        amount = data.get("amount")
        description = data.get("description", "")
        category = data.get("category")
        date = data.get("date")

        if not user_id or amount is None or date is None:
            return jsonify({"success": False, "error": "Missing required fields (userId, amount, date)"}), 400

        # Categorize if not provided
        if not category and "description" in data:
            category = categorize_expense(description)

        amount = float(amount)

        # Reference to expense subcollection
        expense_ref = db.collection("users").document(user_id).collection("expenses").document()
        expense_data = {
            "id": expense_ref.id,
            "amount": amount,
            "category": category or "Other",
            "description": description,
            "date": datetime.utcnow() if not date else datetime.fromisoformat(date.replace("Z", "+00:00"))
        }
        expense_ref.set(expense_data)

        # Update user balance and totalExpenses atomically
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()

        if user_doc.exists:
            user_data = user_doc.to_dict()
            new_balance = float(user_data.get("balance", 0)) - amount
            new_total_expenses = float(user_data.get("totalExpenses", 0)) + amount
            user_ref.update({
                "balance": new_balance,
                "totalExpenses": new_total_expenses
            })
        else:
            # Initialize user with default name based on email or placeholder
            default_name = data.get("email", "Unknown User").split("@")[0] if "email" in data else "Unknown User"
            user_ref.set({
                "balance": 0 - amount,
                "totalExpenses": amount,
                "name": default_name
            })

        return jsonify({"success": True, "expense": expense_data, "category": category}), 200

    except Exception as e:
        logger.error("Error in /add_expense:", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

# --------------------- Get All Expenses ---------------------
@app.route('/get_expenses', methods=['GET'])
def get_expenses():
    try:
        user_id = request.args.get("user_id")

        if not user_id:
            return jsonify({"success": False, "error": "User ID required"}), 400

        expenses_ref = db.collection("users").document(user_id).collection("expenses").order_by("date", direction=firestore.Query.DESCENDING)
        expenses = []
        for doc in expenses_ref.stream():
            expense = doc.to_dict()
            # Convert timestamp to ISO format
            if isinstance(expense.get("date"), datetime):
                expense["date"] = expense["date"].isoformat()
            expenses.append(expense)

        return jsonify({"success": True, "expenses": expenses}), 200

    except Exception as e:
        logger.error("Error in /get_expenses:", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

# --------------------- Delete Expense ---------------------
@app.route('/delete_expense/<user_id>/<expense_id>', methods=['DELETE'])
def delete_expense(user_id, expense_id):
    try:
        expense_ref = db.collection("users").document(user_id).collection("expenses").document(expense_id)
        doc = expense_ref.get()

        if not doc.exists:
            return jsonify({"success": False, "error": "Expense not found"}), 404

        amount = doc.to_dict().get("amount", 0)
        expense_ref.delete()

        # Refund the amount back to balance and reduce totalExpenses
        db.collection("users").document(user_id).update({
            "balance": firestore.Increment(amount),
            "totalExpenses": firestore.Increment(-amount)
        })

        return jsonify({"success": True, "message": "Expense deleted"}), 200

    except Exception as e:
        logger.error("Error in /delete_expense:", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

# --------------------- Edit Expense ---------------------
@app.route('/edit_expense/<user_id>/<expense_id>', methods=['PUT'])
def edit_expense(user_id, expense_id):
    try:
        data = request.json
        expense_ref = db.collection("users").document(user_id).collection("expenses").document(expense_id)
        doc = expense_ref.get()

        if not doc.exists:
            return jsonify({"success": False, "error": "Expense not found"}), 404

        original = doc.to_dict()
        new_amount = float(data.get("amount", original["amount"]))

        # Adjust balance and totalExpenses
        diff = original["amount"] - new_amount
        db.collection("users").document(user_id).update({
            "balance": firestore.Increment(diff),
            "totalExpenses": firestore.Increment(-diff)
        })

        # Update expense
        updated_data = {
            "amount": new_amount,
            "category": data.get("category", original.get("category")),
            "description": data.get("description", original.get("description")),
        }
        expense_ref.update(updated_data)

        return jsonify({"success": True, "expense": updated_data}), 200

    except Exception as e:
        logger.error("Error in /edit_expense:", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

# --------------------- Get User Profile ---------------------
@app.route('/user_profile/<user_id>', methods=['GET'])
def get_user_profile(user_id):
    try:
        logger.info(f"Fetching profile for user ID: {user_id}")
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()

        if not user_doc.exists:
            logger.warning(f"User {user_id} not found.")
            return jsonify({"success": False, "error": "User not found"}), 404

        user_data = user_doc.to_dict()
        name = user_data.get("name", "Unknown User")
        logger.info(f"Fetched name: {name}")
        return jsonify({"success": True, "name": name}), 200

    except Exception as e:
        logger.error("Error in /user_profile:", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

# --------------------- Set Balance ---------------------
@app.route('/set_balance', methods=['POST'])
def set_balance():
    try:
        data = request.get_json()
        user_id = data.get("userId")
        balance = data.get("balance")

        if not user_id or balance is None:
            return jsonify({"success": False, "error": "User ID and balance are required"}), 400

        db.collection("users").document(user_id).set({
            "balance": float(balance),
            "totalExpenses": 0
        }, merge=True)

        return jsonify({"success": True}), 200

    except Exception as e:
        logger.error("Error in /set_balance:", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

# --------------------- Categorize Expense ---------------------
@app.route('/categorize', methods=['POST'])
def categorize():
    try:
        data = request.get_json()
        title = data.get("title")

        if not title:
            return jsonify({"success": False, "error": "Missing title"}), 400

        category = categorize_expense(title)
        return jsonify({"success": True, "category": category}), 200

    except Exception as e:
        logger.error("Error in /categorize:", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)