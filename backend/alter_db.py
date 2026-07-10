from app import create_app
from extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN referral_code VARCHAR(20) UNIQUE NULL;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN referrals_count INTEGER DEFAULT 0;"))
            conn.commit()
            print("Successfully added referral_code and referrals_count to users table.")
    except Exception as e:
        print(f"Error altering table (it might already exist): {e}")
