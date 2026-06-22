import eventlet
eventlet.monkey_patch()

import os
from app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    # Render assigns a dynamic port variable; this reads it natively
    port = int(os.environ.get("PORT", 5000))
    # This fires up the engine smoothly without needing Gunicorn routing
    socketio.run(app, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)