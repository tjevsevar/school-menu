#!/usr/bin/env python3
"""
Simple Flask server for the School Lunch Menu Web App
"""

from flask import Flask, send_from_directory, jsonify, request
import sys
import os

# Import from same directory
from school_lunch_checker import LunchMenuChecker

# Serve frontend files from the frontend directory
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend')
app = Flask(__name__, static_folder=frontend_dir)

@app.route('/')
def index():
    """Serve the main web app"""
    return send_from_directory(frontend_dir, 'index.html')


@app.route('/<path:filename>')
def other_files(filename):
    """Serve other files"""
    return send_from_directory(frontend_dir, filename)

@app.route('/api/menu')
def get_menu():
    """API endpoint to get today's menu"""
    try:
        checker = LunchMenuChecker()
        menu_result = checker.check_lunch_menu()
        
        from datetime import datetime
        return jsonify({
            'success': True,
            'menu': menu_result,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500




if __name__ == '__main__':
    print("🚀 Starting School Lunch Menu Web App...")
    print("📱 Access at: http://localhost:8080")
    print("📋 This is a Progressive Web App - can be installed on phones!")
    print("")
    
    # Run on port 8080 to avoid conflicts
    app.run(host='0.0.0.0', port=8080, debug=True)
