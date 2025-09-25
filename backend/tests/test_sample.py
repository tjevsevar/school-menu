"""
Sample test file to verify pytest is working correctly.
"""


def test_basic_math():
    """Test basic mathematical operations."""
    assert 2 + 2 == 4


def test_string_operations():
    """Test basic string operations."""
    assert "hello" + " world" == "hello world"


def test_list_operations():
    """Test basic list operations."""
    test_list = [1, 2, 3]
    test_list.append(4)
    assert len(test_list) == 4
    assert 4 in test_list


def test_imports():
    """Test that we can import required modules."""
    import requests
    import bs4
    import flask
    
    # Just verify the modules can be imported
    assert requests is not None
    assert bs4 is not None
    assert flask is not None
