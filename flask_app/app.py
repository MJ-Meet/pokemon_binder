import os
import uuid
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
from pymongo import MongoClient
import bcrypt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

app = Flask(__name__)
CORS(app)

# Configuration
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit
app.config['JWT_SECRET_KEY'] = 'super-secret-pokemon-key-change-me-later'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

jwt = JWTManager(app)

# MongoDB Connection
MONGO_URI = 'mongodb+srv://meetextra00_db_user:Meet@cluster0.pr3jxow.mongodb.net/?appName=Cluster0'
client = MongoClient(MONGO_URI)
db = client['pokemon_binder_db']
users_collection = db['users']
binders_collection = db['binders']

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

# --- AUTH ROUTES ---

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"message": "Username and password required"}), 400

    if users_collection.find_one({"username": username}):
        return jsonify({"message": "Username already exists"}), 400

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    
    user = {
        "_id": str(uuid.uuid4()),
        "username": username,
        "password": hashed_password.decode('utf-8')
    }
    users_collection.insert_one(user)

    access_token = create_access_token(identity=user["_id"])
    return jsonify({"message": "User created successfully", "token": access_token, "username": username}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    user = users_collection.find_one({"username": username})
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        return jsonify({"message": "Invalid credentials"}), 401

    access_token = create_access_token(identity=user["_id"])
    return jsonify({"token": access_token, "username": username}), 200

@app.route('/api/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = users_collection.find_one({"_id": user_id})
    if not user:
        return jsonify({"message": "User not found"}), 404
    return jsonify({"username": user["username"]}), 200

# --- BINDER / CARD ROUTES ---

@app.route('/api/binders', methods=['GET', 'POST'])
@jwt_required()
def handle_binders():
    user_id = get_jwt_identity()
    
    if request.method == 'POST':
        data = request.json
        new_binder = {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": data['name'],
            "total_slots": data.get('total_slots', 60),
            "cards": {}
        }
        binders_collection.insert_one(new_binder)
        
        new_binder['id'] = new_binder.pop('_id')
        new_binder['filled_slots'] = 0
        return jsonify(new_binder), 201
    
    binders_cursor = binders_collection.find({"user_id": user_id})
    binders = []
    for b in binders_cursor:
        b['id'] = b.pop('_id')
        b['filled_slots'] = len(b.get('cards', {}))
        binders.append(b)
    return jsonify(binders)

@app.route('/api/binders/<binder_id>', methods=['GET', 'DELETE'])
@jwt_required()
def binder_detail(binder_id):
    user_id = get_jwt_identity()
    binder = binders_collection.find_one({"_id": binder_id, "user_id": user_id})
    
    if not binder:
        return jsonify({"message": "Binder not found"}), 404
        
    if request.method == 'DELETE':
        binders_collection.delete_one({"_id": binder_id})
        return '', 204
    
    binder['id'] = binder.pop('_id')
    binder['filled_slots'] = len(binder.get('cards', {}))
    return jsonify(binder)

@app.route('/api/cards', methods=['POST'])
@jwt_required()
def add_card():
    user_id = get_jwt_identity()
    
    binder_id = request.form.get('binder_id')
    slot_number = request.form.get('slot_number')
    if not binder_id or not slot_number:
        return jsonify({"message": "Binder ID and Slot Number required"}), 400
        
    binder = binders_collection.find_one({"_id": binder_id, "user_id": user_id})
    if not binder:
        return jsonify({"message": "Binder not found"}), 404
        
    name = request.form.get('name')
    card_type = request.form.get('type')
    rarity = request.form.get('rarity')
    notes = request.form.get('notes')
    
    image_path = None
    existing_card = binder.get('cards', {}).get(slot_number)
    
    if 'image' in request.files:
        file = request.files['image']
        if file and allowed_file(file.filename):
            filename = secure_filename(f"user_{user_id}_binder_{binder_id}_slot_{slot_number}_{file.filename}")
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            image_path = f"/static/uploads/{filename}"
            
            if existing_card and existing_card.get('image_path'):
                try:
                    old_path = os.path.join(app.root_path, existing_card['image_path'].lstrip('/'))
                    if os.path.exists(old_path):
                        os.remove(old_path)
                except Exception as e:
                    print("Error deleting old image:", e)
                    
    if not image_path and existing_card:
        image_path = existing_card.get('image_path')

    card_data = {
        "id": existing_card.get('id', str(uuid.uuid4())) if existing_card else str(uuid.uuid4()),
        "name": name,
        "type": card_type,
        "rarity": rarity,
        "notes": notes,
        "image_path": image_path,
        "slot_number": int(slot_number),
        "binder_id": binder_id
    }
    
    binders_collection.update_one(
        {"_id": binder_id},
        {"$set": {f"cards.{slot_number}": card_data}}
    )
    
    return jsonify(card_data), 200

@app.route('/api/cards/<binder_id>/<slot_number>', methods=['DELETE'])
@jwt_required()
def delete_card(binder_id, slot_number):
    user_id = get_jwt_identity()
    binder = binders_collection.find_one({"_id": binder_id, "user_id": user_id})
    
    if not binder:
        return jsonify({"message": "Binder not found"}), 404
        
    card = binder.get('cards', {}).get(slot_number)
    if not card:
        return jsonify({"message": "Card not found"}), 404
        
    if card.get('image_path'):
        try:
            path_to_delete = os.path.join(app.root_path, card['image_path'].lstrip('/'))
            if os.path.exists(path_to_delete):
                os.remove(path_to_delete)
        except Exception as e:
            print("Error deleting image:", e)
            
    binders_collection.update_one(
        {"_id": binder_id},
        {"$unset": {f"cards.{slot_number}": 1}}
    )
    
    return '', 204

@app.route('/api/stats/<binder_id>')
@jwt_required()
def get_stats(binder_id):
    user_id = get_jwt_identity()
    binder = binders_collection.find_one({"_id": binder_id, "user_id": user_id})
    
    if not binder:
        return jsonify({"message": "Binder not found"}), 404
        
    cards = binder.get('cards', {})
    collected_cards = [c for c in cards.values() if c.get('image_path')]
    filled = len(collected_cards)
    total = binder.get('total_slots', 0)
    percentage = round((filled / total * 100), 2) if total > 0 else 0
    
    return jsonify({
        'total': total,
        'filled': filled,
        'empty': total - filled,
        'percentage': percentage
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
