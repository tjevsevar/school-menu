#!/usr/bin/env python3
"""
Netlify serverless function for School Lunch Menu API
"""

import json
import sys
import os
from datetime import datetime

# Import from same directory
try:
    from school_lunch_checker import LunchMenuChecker
except ImportError:
    # Fallback error handling
    class LunchMenuChecker:
        def check_lunch_menu(self):
            return "❌ Error: Could not import school lunch checker module"

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
            import re
            date_match = re.search(r'(\d{1,2}\.\s*\d{1,2}\.\s*–\s*\d{1,2}\.\s*\d{1,2}\.\s*\d{4})', menu_info['text'])
            if date_match:
                response_data['date_range'] = date_match.group(1)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response_data, ensure_ascii=False)
        }
        
    except Exception as e:
        error_response = {
            'success': False,
            'error': str(e)
        }
        
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps(error_response, ensure_ascii=False)
        }
