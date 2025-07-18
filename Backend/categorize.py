import joblib
import os

# ✅ List of valid categories
CATEGORIES = ["Food", "Transport", "Bills", "Entertainment", "Shopping", "Health", "Education", "Other"]

# 🔁 Fallback categorization logic
def fallback_rules(title: str) -> str:
    title = title.lower()
    if any(word in title for word in ["zomato", "swiggy", "pizza", "burger", "restaurant", "food"]):
        return "Food"
    elif any(word in title for word in ["uber", "bus", "train", "taxi", "metro"]):
        return "Transport"
    elif any(word in title for word in ["electricity", "water", "gas", "internet", "wifi"]):
        return "Bills"
    elif any(word in title for word in ["movie", "netflix", "spotify", "games", "concert"]):
        return "Entertainment"
    elif any(word in title for word in ["clothes", "shoes", "shopping", "amazon", "flipkart"]):
        return "Shopping"
    elif any(word in title for word in ["hospital", "doctor", "medicine", "pharmacy"]):
        return "Health"
    elif any(word in title for word in ["school", "college", "course", "book", "exam"]):
        return "Education"
    return "Other"

# 🧠 Categorization using trained model
def categorize_expense(title: str) -> str:
    try:
        model_path = os.path.join(os.path.dirname(__file__), r"C:\Users\sachi\Desktop\Sachin\Project\AI_app\AI_Expense_Tracker\Backend\ML Train\expense_classifier_model.pkl")
        vectorizer_path = os.path.join(os.path.dirname(__file__), r"C:\Users\sachi\Desktop\Sachin\Project\AI_app\AI_Expense_Tracker\Backend\ML Train\tfidf_vectorizer.pkl")

        model = joblib.load(model_path)
        vectorizer = joblib.load(vectorizer_path)

        title_vectorized = vectorizer.transform([title])
        category = model.predict(title_vectorized)[0]

        if category in CATEGORIES:
            return category
        else:
            return fallback_rules(title)

    except Exception as e:
        print("Model error:", e)
        return fallback_rules(title)
