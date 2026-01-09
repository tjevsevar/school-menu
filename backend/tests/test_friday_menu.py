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
import importlib
from pathlib import Path

# Ensure both backend and repository root are on sys.path so we can import
# both the desktop (backend) and Netlify function implementations.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = Path(__file__).resolve().parents[2]
for path in (str(BACKEND_ROOT), str(PROJECT_ROOT)):
    if path not in sys.path:
        sys.path.insert(0, path)

MODULE_PATHS = [
    ("backend", "school_lunch_checker"),
    ("netlify", "netlify.functions.school_lunch_checker"),
]


@pytest.fixture(params=MODULE_PATHS, ids=[name for name, _ in MODULE_PATHS])
def menu_module(request):
    """Provide each LunchMenuChecker implementation for parametrized tests."""
    _, module_path = request.param
    return importlib.import_module(module_path)


def _build_checker(menu_module):
    """Create a LunchMenuChecker instance with __init__ bypassed for testing."""
    with patch.object(menu_module.LunchMenuChecker, '__init__', lambda self: None):
        checker = menu_module.LunchMenuChecker()
    checker.base_url = "https://ostrbovlje.si"
    checker.menu_url = "https://ostrbovlje.si/prehrana/"
    checker.session = Mock()
    return checker


class TestFridayMenuSelection:
    """Test the Friday edge case where next week's menu is already published."""
    
    def create_mock_link(self, text, href):
        """Create a mock BeautifulSoup link element."""
        mock = Mock()
        mock.get_text = Mock(return_value=text)
        mock.get = Mock(return_value=href)
        return mock
    
    def test_friday_with_next_week_menu_published(self, menu_module):
        """
        Scenario: It's Friday (Dec 20, 2024) and school has published next week's menu.
        
        Available menus:
        - Current week: Dec 16-20, 2024 (includes today, Friday)
        - Next week: Dec 23-27, 2024 (just published)
        
        Expected: Should return current week's menu (Dec 16-20)
        """
        checker = _build_checker(menu_module)
        
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
        
        with patch(f'{menu_module.__name__}.datetime') as mock_datetime:
            mock_datetime.now.return_value = friday_date
            mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            result = checker.get_current_week_menu_url()
        
        assert result is not None
        assert '16.12.–20.12' in result['text'] or '16-12-20-12' in result['url']
        assert result['end_date'].day == 20
        assert result['end_date'].month == 12
    
    def test_normal_weekday_still_works(self, menu_module):
        """
        Scenario: It's Wednesday (Dec 18, 2024), normal case.
        
        Available menus:
        - Current week: Dec 16-20, 2024 (includes today)
        
        Expected: Should return current week's menu
        """
        checker = _build_checker(menu_module)
        
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
        
        with patch(f'{menu_module.__name__}.datetime') as mock_datetime:
            mock_datetime.now.return_value = wednesday_date
            mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            result = checker.get_current_week_menu_url()
        
        assert result is not None
        assert '16.12.–20.12' in result['text']
    
    def test_friday_only_next_week_available(self, menu_module):
        """
        Scenario: It's Friday but only next week's menu is available.
        
        Available menus:
        - Next week: Dec 23-27, 2024 (current week menu removed/not found)
        
        Expected: Should return next week's menu as fallback
        """
        checker = _build_checker(menu_module)
        
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
        
        with patch(f'{menu_module.__name__}.datetime') as mock_datetime:
            mock_datetime.now.return_value = friday_date
            mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            result = checker.get_current_week_menu_url()
        
        # Should still return something (fallback)
        assert result is not None
        assert '23.12.–27.12' in result['text']


class TestMenuPriorityOrder:
    """Test that menu selection follows correct priority order."""
    
    def test_priority_1_exact_match(self, menu_module):
        """Priority 1: Today falls within menu date range."""
        checker = _build_checker(menu_module)
        
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
        
        with patch(f'{menu_module.__name__}.datetime') as mock_datetime:
            mock_datetime.now.return_value = wednesday_date
            mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            result = checker.get_current_week_menu_url()
        
        assert result is not None
        assert '16.12.–20.12' in result['text']
