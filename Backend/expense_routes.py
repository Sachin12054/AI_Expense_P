from flask import Blueprint, request, jsonify
from firebase_config import db
from firebase_admin import firestore
from datetime import datetime

expense_routes = Blueprint("expense_routes", __name__)

# --------------------- Add Expense ---------------------
@expense_routes.route("/add_expense", methods=["POST"])
def add_expense():
    try:
        data = request.json
        user_id = data.get("user_id")
        amount = float(data.get("amount", 0))

        if not user_id:
            return jsonify({"error": "User ID required"}), 400

        # Reference to expense subcollection
        expense_ref = db.collection("users").document(user_id).collection("expenses").document()
        expense_data = {
            "id": expense_ref.id,
            "amount": amount,
            "category": data.get("category"),
            "description": data.get("description", ""),
            "date": datetime.utcnow()  # Stored as timestamp
        }
        expense_ref.set(expense_data)

        # Decrease balance
        db.collection("users").document(user_id).update({
            "balance": firestore.Increment(-amount),
            "totalExpenses": firestore.Increment(amount)
        })

        return jsonify({"success": True, "expense": expense_data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --------------------- Get All Expenses ---------------------
@expense_routes.route("/get_expenses", methods=["GET"])
def get_expenses():
    try:
        user_id = request.args.get("user_id")

        if not user_id:
            return jsonify({"error": "User ID required"}), 400

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
        return jsonify({"error": str(e)}), 500

# --------------------- Delete Expense ---------------------
@expense_routes.route("/delete_expense/<user_id>/<expense_id>", methods=["DELETE"])
def delete_expense(user_id, expense_id):
    try:
        expense_ref = db.collection("users").document(user_id).collection("expenses").document(expense_id)
        doc = expense_ref.get()

        if not doc.exists:
            return jsonify({"error": "Expense not found"}), 404

        amount = doc.to_dict().get("amount", 0)
        expense_ref.delete()

        # Refund the amount back to balance and reduce totalExpenses
        db.collection("users").document(user_id).update({
            "balance": firestore.Increment(amount),
            "totalExpenses": firestore.Increment(-amount)
        })

        return jsonify({"success": True, "message": "Expense deleted"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --------------------- Edit Expense ---------------------
@expense_routes.route("/edit_expense/<user_id>/<expense_id>", methods=["PUT"])
def edit_expense(user_id, expense_id):
    try:
        data = request.json
        expense_ref = db.collection("users").document(user_id).collection("expenses").document(expense_id)
        doc = expense_ref.get()

        if not doc.exists:
            return jsonify({"error": "Expense not found"}), 404

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
        return jsonify({"error": str(e)}), 500
