from extensions import db

class User(db.Model):
    __tablename__ = 'users'  # Matches your MySQL table name

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    user_code = db.Column(db.String(20), nullable=False, unique=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    phone = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # ENUM fields matching your exact database options
    role = db.Column(db.Enum('student', 'faculty', 'mentor', 'admin'), nullable=False)
    gender = db.Column(db.Enum('male', 'female', 'other'), nullable=True)
    status = db.Column(db.Enum('active', 'inactive', 'suspended', 'pending'), default='pending')
    
    dob = db.Column(db.Date, nullable=True)
    profile_image = db.Column(db.String(500), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    github_url = db.Column(db.String(255), nullable=True)
    linkedin_url = db.Column(db.String(255), nullable=True)
    is_verified = db.Column(db.Integer, default=0)

    #  Sequoia Settings Integration Parameters
    telemetry_sync_mode = db.Column(db.String(50), default='Real-time')
    ignored_extensions = db.Column(db.Text, nullable=True)
    notify_on_faculty_review = db.Column(db.Integer, default=1)
    notification_routing = db.Column(db.String(255), default='In-app Dashboard')
    theme = db.Column(db.String(20), default='light')
    ide_font_family = db.Column(db.String(50), default='SF Mono')
    ide_font_size = db.Column(db.Integer, default=13)

    # 🔒 ADVANCED STATE TRACKING HARDENING COLUMNS
    otp_code = db.Column(db.String(6), nullable=True)
    otp_expiry = db.Column(db.DateTime, nullable=True)
    
    # Timestamps - Overhauled to safe database-driven timezone hooks
    last_login = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def to_dict(self):
        """Helper method to convert user object into JSON format easily"""
        return {
            "id": self.id,
            "user_code": self.user_code,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "role": self.role,
            "status": self.status,
            "profile_image": self.profile_image or "",
            "github_url": self.github_url or "",
            "telemetry_sync_mode": self.telemetry_sync_mode or "Real-time",
            "ignored_extensions": self.ignored_extensions or "",
            "notify_on_faculty_review": bool(self.notify_on_faculty_review) if self.notify_on_faculty_review is not None else True,
            "notification_routing": self.notification_routing or "In-app Dashboard",
            "theme": self.theme or "light",
            "ide_font_family": self.ide_font_family or "SF Mono",
            "ide_font_size": self.ide_font_size or 13,
            "phone": self.phone or "",
            "bio": self.bio or ""
        }