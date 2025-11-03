#!/usr/bin/env python3
"""
Netlify serverless function for School Lunch Menu API
"""

import json
import sys
import os
from datetime import datetime
import re

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(__file__))

# Import from same directory
try:
    from school_lunch_checker import LunchMenuChecker
    IMPORT_SUCCESS = True
except ImportError as e:
    IMPORT_SUCCESS = False
    IMPORT_ERROR = str(e)
    # Fallback error handling
    class LunchMenuChecker:
        def check_lunch_menu(self):
            return f"❌ Error: Could not import school lunch checker module: {IMPORT_ERROR}"
        def get_current_week_menu_url(self):
            return None

def handler(event, context):
    """
    Netlify function handler for menu API
    """
    
    # Handle CORS
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    }
    
    # Handle preflight requests
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    try:
        # Check if import was successful
        if not IMPORT_SUCCESS:
            return {
                'statusCode': 500,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': f'Module import failed: {IMPORT_ERROR}',
                    'debug': {
                        'python_path': sys.path,
                        'current_dir': os.path.dirname(__file__),
                        'files_in_dir': os.listdir(os.path.dirname(__file__)) if os.path.dirname(__file__) else []
                    }
                }, ensure_ascii=False)
            }
        
        # Get today's menu
        checker = LunchMenuChecker()
        
        # Get menu info (includes URL and date range)
        menu_info = checker.get_current_week_menu_url()
        
        # Get today's menu content
        menu_result = checker.check_lunch_menu()
        
        response_data = {
            'success': True,
            'menu': menu_result,
            'timestamp': datetime.now().isoformat()
        }
        
        # Add menu URL and date range if available
        if menu_info:
            response_data['source_url'] = menu_info['url']
            response_data['menu_title'] = menu_info['text']
            
            # Extract date range from menu title
            date_match = re.search(r'(\d{1,2}\.\s*\d{1,2}\.\s*–\s*\d{1,2}\.\s*\d{1,2}\.\s*\d{4})', menu_info['text'])
            if date_match:
                response_data['date_range'] = date_match.group(1)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response_data, ensure_ascii=False)
        }
        
    except Exception as e:
        import traceback
        error_response = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps(error_response, ensure_ascii=False)
        }
