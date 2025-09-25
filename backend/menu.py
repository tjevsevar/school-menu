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
        menu_result = checker.check_lunch_menu()
        
        response_data = {
            'success': True,
            'menu': menu_result,
            'timestamp': datetime.now().isoformat()
        }
        
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
