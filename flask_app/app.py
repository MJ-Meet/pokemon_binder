import os
from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename
from models import db, Binder, Card

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pokemon_binder.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join('static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit

db.init_app(app)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

with app.app_context():
    db.create_all()

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/binders', methods=['GET', 'POST'])
def handle_binders():
    if request.method == 'POST':
        data = request.json
        new_binder = Binder(name=data['name'], total_slots=data.get('total_slots', 60))
        db.session.add(new_binder)
        db.session.commit()
        return jsonify(new_binder.to_dict()), 201
    
    binders = Binder.query.all()
    return jsonify([b.to_dict() for b in binders])

@app.route('/api/binders/<int:id>', methods=['GET', 'DELETE'])
def binder_detail(id):
    binder = Binder.query.get_or_404(id)
    if request.method == 'DELETE':
        db.session.delete(binder)
        db.session.commit()
        return '', 204
    
    cards = {card.slot_number: card.to_dict() for card in binder.cards}
    result = binder.to_dict()
    result['cards'] = cards
    return jsonify(result)

@app.route('/api/cards', methods=['POST'])
def add_card():
    # Handle multipart form for image upload and json data
    binder_id = int(request.form.get('binder_id'))
    slot_number = int(request.form.get('slot_number'))
    name = request.form.get('name')
    card_type = request.form.get('type')
    rarity = request.form.get('rarity')
    notes = request.form.get('notes')
    
    # Check if card already exists in this slot
    existing_card = Card.query.filter_by(binder_id=binder_id, slot_number=slot_number).first()
    
    image_path = None
    if 'image' in request.files:
        file = request.files['image']
        if file and allowed_file(file.filename):
            filename = secure_filename(f"binder_{binder_id}_slot_{slot_number}_{file.filename}")
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            image_path = f"/static/uploads/{filename}"

    if existing_card:
        existing_card.name = name
        existing_card.type = card_type
        existing_card.rarity = rarity
        existing_card.notes = notes
        if image_path:
            existing_card.image_path = image_path
        db.session.commit()
        return jsonify(existing_card.to_dict())
    else:
        new_card = Card(
            binder_id=binder_id,
            slot_number=slot_number,
            name=name,
            type=card_type,
            rarity=rarity,
            notes=notes,
            image_path=image_path
        )
        db.session.add(new_card)
        db.session.commit()
        return jsonify(new_card.to_dict()), 201

@app.route('/api/cards/<int:id>', methods=['DELETE'])
def delete_card(id):
    card = Card.query.get_or_404(id)
    # Potentially delete the image file too
    if card.image_path:
        # relative path from app root
        try:
            os.remove(os.path.join(app.root_path, card.image_path.lstrip('/')))
        except:
            pass
            
    db.session.delete(card)
    db.session.commit()
    return '', 204

@app.route('/api/stats/<int:binder_id>')
def get_stats(binder_id):
    binder = Binder.query.get_or_404(binder_id)
    # Only count cards that have an image as 'filled'
    collected_cards = [c for c in binder.cards if c.image_path]
    filled = len(collected_cards)
    total = binder.total_slots
    percentage = round((filled / total * 100), 2) if total > 0 else 0
    return jsonify({
        'total': total,
        'filled': filled,
        'empty': total - filled,
        'percentage': percentage
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
