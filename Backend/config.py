import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase Admin SDK
# Path to your Firebase service account key JSON file
FIREBASE_CREDENTIALS = "C:\Users\sachi\Desktop\Sachin\Project\AI_app\AI_Expense_Tracker\Backend\ai-expense-tracker-5bcce-firebase-adminsdk-fbsvc-065b5355b7.json"

# Initialize Firebase App
cred = credentials.Certificate(FIREBASE_CREDENTIALS)
firebase_admin.initialize_app(cred)
db = firestore.client()