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
    """API endpoint to get today's menu (or a specific test date)"""
    try:
        # Check if there's a test_date parameter
        test_date_str = request.args.get('test_date')
        
        checker = LunchMenuChecker()
        
        # Override the date if test_date is provided
        if test_date_str:
            from datetime import datetime
            test_date = datetime.strptime(test_date_str, '%Y-%m-%d')
            # Temporarily override datetime.now() in the checker
            menu_result = checker.check_lunch_menu_for_date(test_date)
        else:
            # Get today's menu content
            menu_result = checker.check_lunch_menu()
        
        # Get menu info (includes URL and date range)
        menu_info = checker.get_current_week_menu_url_for_date(
            test_date if test_date_str else None
        )
        
        from datetime import datetime as dt
        response_data = {
            'success': True,
            'menu': menu_result,
            'timestamp': dt.now().isoformat(),
            'test_date': test_date_str if test_date_str else None
        }
        
        # Add menu URL and date range if available
        if menu_info:
            response_data['source_url'] = menu_info['url']
            response_data['menu_title'] = menu_info['text']
            
            # Extract date range from menu title
            import re
            date_match = re.search(r'(\d{1,2}\.\s*\d{1,2}\.\s*–\s*\d{1,2}\.\s*\d{1,2}\.\s*\d{4})', menu_info['text'])
            if date_match:
                response_data['date_range'] = date_match.group(1)
        
        return jsonify(response_data)
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
