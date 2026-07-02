from extensions import db  

class Workplace(db.Model):
    __tablename__ = 'workplaces'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False, unique=True)
    type = db.Column(db.Enum('School', 'College', 'Enterprise', 'Organization', 'Company'), nullable=False)
    district = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), default='India')
    address_metadata = db.Column(db.Text, nullable=True)

class Team(db.Model):
    __tablename__ = 'teams'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    team_code = db.Column(db.String(50), nullable=False, unique=True)
    project_name = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    workplace_id = db.Column(db.BigInteger, db.ForeignKey('workplaces.id'), nullable=False)
    max_team_size = db.Column(db.Integer, default=4, nullable=False)
    leader_code = db.Column(db.String(20), db.ForeignKey('users.user_code'), nullable=False)
    faculty_code = db.Column(db.String(50), nullable=True)
    
    declaration_status = db.Column(
        db.Enum('Pending_Peer_Signatures', 'Pending_Guide_Approval', 'Approved_Active', 'Rejected'), 
        default='Pending_Peer_Signatures',
        nullable=False
    )
    
    # 🛠️ FIXED: Added missing column definitions to match your MySQL database fields exactly!
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    timeline_value = db.Column(db.Integer, nullable=False, default=3)
    timeline_unit = db.Column(db.String(20), nullable=False, default='Months')
    target_industry = db.Column(db.String(100), nullable=False, default='Technology')
    workspace_visibility = db.Column(db.String(20), nullable=False, default='Public')

class TeamMembership(db.Model):
    __tablename__ = 'team_memberships'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    team_id = db.Column(db.BigInteger, db.ForeignKey('teams.id'), nullable=False)
    user_code = db.Column(db.String(20), db.ForeignKey('users.user_code'), nullable=False)
    slot_index = db.Column(db.Integer, nullable=False)
    approval_status = db.Column(db.Enum('Pending', 'Approved', 'Declined', 'Rejected'), default='Pending')

class WorkspaceTask(db.Model):
    __tablename__ = 'workspace_tasks'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    team_code = db.Column(db.String(50), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100), nullable=True, default='General')
    priority = db.Column(db.String(50), nullable=True, default='Medium')
    status = db.Column(db.String(50), nullable=False, default='To Do')
    assigned_to = db.Column(db.String(20), nullable=True)

class WorkspaceDocument(db.Model):
    __tablename__ = 'workspace_documents'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    team_code = db.Column(db.String(50), nullable=False, index=True)
    document_name = db.Column(db.String(255), nullable=False)
    document_url = db.Column(db.String(500), nullable=True)
    uploaded_by = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    file_path = db.Column(db.String(255), nullable=True)
    content_buffer = db.Column(db.Text, nullable=True)
    last_modified_at = db.Column(db.DateTime, nullable=True, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    version_string = db.Column(db.String(50), nullable=True, default='1.0')
    owner_code = db.Column(db.String(20), nullable=True)

class WorkspacePresentation(db.Model):
    __tablename__ = 'workspace_presentations'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    team_code = db.Column(db.String(50), nullable=False, index=True)
    presentation_name = db.Column(db.String(255), nullable=False)
    markdown_content = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class WorkspacePerformanceScore(db.Model):
    __tablename__ = 'workspace_performance_scores'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    team_code = db.Column(db.String(50), nullable=False, index=True)
    user_code = db.Column(db.String(20), nullable=False, index=True)
    score = db.Column(db.Integer, nullable=False, default=0)
    work_hours = db.Column(db.Float, nullable=False, default=0.0)
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

class WorkspaceChatMessage(db.Model):
    __tablename__ = 'workspace_chat_messages'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    team_code = db.Column(db.String(50), nullable=False, index=True)
    sender_code = db.Column(db.String(20), nullable=False)
    sender_name = db.Column(db.String(100), nullable=False)
    encrypted_text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

class WorkspaceImplementation(db.Model):
    __tablename__ = 'workspace_implementations'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    team_code = db.Column(db.String(50), nullable=False, index=True)
    image_url = db.Column(db.String(500), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100), nullable=False, default='General')
    uploaded_by = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    
    # Grading metadata fields
    grade_score = db.Column(db.Integer, nullable=True)
    grading_feedback = db.Column(db.Text, nullable=True)
    graded_by = db.Column(db.String(20), nullable=True)
    graded_at = db.Column(db.DateTime, nullable=True)

class WorkspaceCodeComment(db.Model):
    __tablename__ = 'workspace_code_comments'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    team_code = db.Column(db.String(50), nullable=False, index=True)
    file_path = db.Column(db.String(255), nullable=False, index=True)
    line_number = db.Column(db.Integer, nullable=False)
    comment_text = db.Column(db.Text, nullable=False)
    created_by = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

class UserAPIKey(db.Model):
    __tablename__ = 'user_api_keys'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(150), nullable=False)
    key_hash = db.Column(db.String(64), nullable=False, unique=True)
    key_preview = db.Column(db.String(30), nullable=False)
    device_name = db.Column(db.String(100), nullable=True, default='Developer Token')
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    last_used_at = db.Column(db.DateTime, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Integer, default=1, nullable=False)

class WorkspaceSetting(db.Model):
    __tablename__ = 'workspace_settings'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    team_code = db.Column(db.String(50), primary_key=True, nullable=False)
    preset_profile = db.Column(db.String(50), default='University/Capstone Mode', nullable=False)
    max_file_size_mb = db.Column(db.Float, default=2.0, nullable=False)
    allowed_extensions = db.Column(db.Text, nullable=False)
    ignored_folders = db.Column(db.Text, nullable=False)

class WorkspaceBoardColumn(db.Model):
    __tablename__ = 'workspace_board_columns'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    team_code = db.Column(db.String(50), nullable=False)
    column_name = db.Column(db.String(100), nullable=False)
    position = db.Column(db.Integer, nullable=False, default=0)

class SystemRequest(db.Model):
    __tablename__ = 'system_requests'

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    email = db.Column(db.String(150), nullable=False, index=True)
    subject = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(50), nullable=True, default='Normal')
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())