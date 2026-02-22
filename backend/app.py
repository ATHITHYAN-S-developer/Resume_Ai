"""
Flask Application Entry Point
AI Resume Analyzer Backend
"""

import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_app():
    # Point Flask to the root directory for HTML and static files
    # Note: 'static' folder is now in the project root, brother to 'backend'
    app = Flask(__name__, 
                static_folder='../static', 
                template_folder='..')
    
    app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")

    # Enable CORS
    CORS(app, origins=["*"])

    # Register blueprints
    from routes.resume import resume_bp
    app.register_blueprint(resume_bp, url_prefix="/api")

    # --- Frontend Routes ---
    
    @app.route("/")
    def index():
        from flask import send_from_directory
        return send_from_directory(app.template_folder, 'index.html')

    @app.route('/static/<path:path>')
    def send_static(path):
        from flask import send_from_directory
        return send_from_directory(app.static_folder, path)

    @app.route('/<path:filename>.html')
    def serve_html(filename):
        from flask import send_from_directory
        return send_from_directory(app.template_folder, f'{filename}.html')

    @app.route("/health")
    def health():
        return {"status": "ok", "message": "AI Resume Analyzer API is running"}, 200

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"

    if debug:
        # Development: use Flask's built-in dev server
        app.run(host="0.0.0.0", port=port, debug=True)
    else:
        # Production on Windows: use waitress (gunicorn is Linux-only)
        from waitress import serve
        print(f" * Waitress serving on http://0.0.0.0:{port}")
        serve(app, host="0.0.0.0", port=port)
