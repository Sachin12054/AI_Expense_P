import firebase_admin
from firebase_admin import credentials, auth
from flask import Flask, request, jsonify

app = Flask(__name__)

# Initialize Firebase Admin SDK
cred = credentials.Certificate(r"C:\Users\sachi\Desktop\Sachin\Project\AI_app\AI_Expense_Tracker\Backend\ai-expense-tracker-5bcce-firebase-adminsdk-fbsvc-065b5355b7.json")  # Update with your Firebase Admin SDK JSON
firebase_admin.initialize_app(cred)

def verify_firebase_token(id_token):
    """Verify Firebase ID token"""
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token  # Returns user info if token is valid
    except Exception as e:
        return None

@app.route("/protected-route", methods=["POST"])
def protected():
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "ID Token is required"}), 401

    id_token = auth_header.split("Bearer ")[1]  # Extract the token

    user_data = verify_firebase_token(id_token)
    if not user_data:
        return jsonify({"error": "Invalid or expired token"}), 401

    return jsonify({"message": "Access granted", "user": user_data})

if __name__ == "__main__":
    app.run(debug=True)
