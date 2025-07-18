import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate(r"C:\Users\sachi\Desktop\Sachin\Project\AI_app\AI_Expense_Tracker\Backend\ai-expense-tracker-5bcce-firebase-adminsdk-fbsvc-065b5355b7.json")  # Add your Firebase credentials
firebase_admin.initialize_app(cred)

db = firestore.client()
