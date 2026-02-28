from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Binder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    total_slots = db.Column(db.Integer, nullable=False, default=60)
    cards = db.relationship('Card', backref='binder', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'total_slots': self.total_slots,
            'filled_slots': len(self.cards)
        }

class Card(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    binder_id = db.Column(db.Integer, db.ForeignKey('binder.id'), nullable=False)
    slot_number = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50))
    rarity = db.Column(db.String(50))
    notes = db.Column(db.Text)
    image_path = db.Column(db.String(255))

    def to_dict(self):
        return {
            'id': self.id,
            'binder_id': self.binder_id,
            'slot_number': self.slot_number,
            'name': self.name,
            'type': self.type,
            'rarity': self.rarity,
            'notes': self.notes,
            'image_path': self.image_path
        }
