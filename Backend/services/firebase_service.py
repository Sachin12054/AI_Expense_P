from firebase_admin import auth

def register_user(email, password):
    """
    Registers a new user in Firebase Authentication.
    """
    try:
        user = auth.create_user(email=email, password=password)
        return {"message": "User registered successfully", "uid": user.uid}
    except Exception as e:
        return {"error": str(e)}

def login_user(id_token):
    """
    Verifies the Firebase ID token and returns user details.
    """
    try:
        decoded_token = auth.verify_id_token(id_token)
        return {"message": "Login successful", "user_id": decoded_token["uid"]}
    except Exception as e:
        return {"error": str(e)}
