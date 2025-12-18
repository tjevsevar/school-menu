"""
Tests for the Friday menu edge case fix.

These tests verify that when the school publishes next week's menu on Friday,
the current week's Friday menu is still correctly displayed.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import sys
import os

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from school_lunch_checker import LunchMenuChecker


class TestFridayMenuSelection:
    """Test the Friday edge case where next week's menu is already published."""
    
    def create_mock_link(self, text, href):
        """Create a mock BeautifulSoup link element."""
        mock = Mock()
        mock.get_text = Mock(return_value=text)
        mock.get = Mock(return_value=href)
        return mock
    
    @patch.object(LunchMenuChecker, '__init__', lambda x: None)
    def test_friday_with_next_week_menu_published(self):
        """
        Scenario: It's Friday (Dec 20, 2024) and school has published next week's menu.
        
        Available menus:
        - Current week: Dec 16-20, 2024 (includes today, Friday)
        - Next week: Dec 23-27, 2024 (just published)
        
        Expected: Should return current week's menu (Dec 16-20)
        """
        checker = LunchMenuChecker()
        checker.base_url = "https://ostrbovlje.si"
        checker.menu_url = "https://ostrbovlje.si/prehrana/"
        checker.session = Mock()
        
        # Mock the HTML response with both menus
        mock_html = """
        <html>
        <body>
            <a href="/jedilnik-23-12-27-12-2024/">Jedilnik 23.12.–27.12. 2024</a>
            <a href="/jedilnik-16-12-20-12-2024/">Jedilnik 16.12.–20.12. 2024</a>
        </body>
        </html>
        """
        
        mock_response = Mock()
        mock_response.content = mock_html.encode()
        mock_response.raise_for_status = Mock()
        checker.session.get = Mock(return_value=mock_response)
        
        # Mock datetime.now() to return Friday Dec 20, 2024
        friday_date = datetime(2024, 12, 20, 12, 0, 0)
        
        with patch('school_lunch_checker.datetime') as mock_datetime:
            mock_datetime.now.return_value = friday_date
            mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            result = checker.get_current_week_menu_url()
        
        assert result is not None
        assert '16.12.–20.12' in result['text'] or '16-12-20-12' in result['url']
        assert result['end_date'].day == 20
        assert result['end_date'].month == 12
    
    @patch.object(LunchMenuChecker, '__init__', lambda x: None)
    def test_normal_weekday_still_works(self):
        """
        Scenario: It's Wednesday (Dec 18, 2024), normal case.
        
        Available menus:
        - Current week: Dec 16-20, 2024 (includes today)
        
        Expected: Should return current week's menu
        """
        checker = LunchMenuChecker()
        checker.base_url = "https://ostrbovlje.si"
        checker.menu_url = "https://ostrbovlje.si/prehrana/"
        checker.session = Mock()
        
        mock_html = """
        <html>
        <body>
            <a href="/jedilnik-16-12-20-12-2024/">Jedilnik 16.12.–20.12. 2024</a>
        </body>
        </html>
        """
        
        mock_response = Mock()
        mock_response.content = mock_html.encode()
        mock_response.raise_for_status = Mock()
        checker.session.get = Mock(return_value=mock_response)
        
        # Mock datetime.now() to return Wednesday Dec 18, 2024
        wednesday_date = datetime(2024, 12, 18, 12, 0, 0)
        
        with patch('school_lunch_checker.datetime') as mock_datetime:
            mock_datetime.now.return_value = wednesday_date
            mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            result = checker.get_current_week_menu_url()
        
        assert result is not None
        assert '16.12.–20.12' in result['text']
    
    @patch.object(LunchMenuChecker, '__init__', lambda x: None)  
    def test_friday_only_next_week_available(self):
        """
        Scenario: It's Friday but only next week's menu is available.
        
        Available menus:
        - Next week: Dec 23-27, 2024 (current week menu removed/not found)
        
        Expected: Should return next week's menu as fallback
        """
        checker = LunchMenuChecker()
        checker.base_url = "https://ostrbovlje.si"
        checker.menu_url = "https://ostrbovlje.si/prehrana/"
        checker.session = Mock()
        
        mock_html = """
        <html>
        <body>
            <a href="/jedilnik-23-12-27-12-2024/">Jedilnik 23.12.–27.12. 2024</a>
        </body>
        </html>
        """
        
        mock_response = Mock()
        mock_response.content = mock_html.encode()
        mock_response.raise_for_status = Mock()
        checker.session.get = Mock(return_value=mock_response)
        
        # Mock datetime.now() to return Friday Dec 20, 2024
        friday_date = datetime(2024, 12, 20, 12, 0, 0)
        
        with patch('school_lunch_checker.datetime') as mock_datetime:
            mock_datetime.now.return_value = friday_date
            mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            result = checker.get_current_week_menu_url()
        
        # Should still return something (fallback)
        assert result is not None
        assert '23.12.–27.12' in result['text']


class TestMenuPriorityOrder:
    """Test that menu selection follows correct priority order."""
    
    @patch.object(LunchMenuChecker, '__init__', lambda x: None)
    def test_priority_1_exact_match(self):
        """Priority 1: Today falls within menu date range."""
        checker = LunchMenuChecker()
        checker.base_url = "https://ostrbovlje.si"
        checker.menu_url = "https://ostrbovlje.si/prehrana/"
        checker.session = Mock()
        
        mock_html = """
        <html>
        <body>
            <a href="/jedilnik-16-12-20-12-2024/">Jedilnik 16.12.–20.12. 2024</a>
            <a href="/jedilnik-23-12-27-12-2024/">Jedilnik 23.12.–27.12. 2024</a>
        </body>
        </html>
        """
        
        mock_response = Mock()
        mock_response.content = mock_html.encode()
        mock_response.raise_for_status = Mock()
        checker.session.get = Mock(return_value=mock_response)
        
        # Wednesday is within Dec 16-20 range
        wednesday_date = datetime(2024, 12, 18, 12, 0, 0)
        
        with patch('school_lunch_checker.datetime') as mock_datetime:
            mock_datetime.now.return_value = wednesday_date
            mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            result = checker.get_current_week_menu_url()
        
        assert result is not None
        assert '16.12.–20.12' in result['text']
