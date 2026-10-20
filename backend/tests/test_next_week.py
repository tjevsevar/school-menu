"""Next-week preview uses only the requested week and one menu-page request."""

from datetime import datetime
from unittest.mock import Mock
import importlib
from pathlib import Path
import sys

import pytest
import requests

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

checker_module = importlib.import_module("school_lunch_checker")
app_module = importlib.import_module("app")


def response(html):
    return Mock(content=html.encode(), raise_for_status=Mock())


def test_week_menu_reads_all_five_days_once():
    checker = checker_module.LunchMenuChecker()
    rows = "".join(
        f"<tr><th>{day}</th><td>kruh – G</td><td>kosilo {day}</td>"
        "<td>sadje</td></tr>"
        for day in ["PON", "TOR", "SRE", "ČET", "PET"]
    )
    checker.session.get = Mock(
        side_effect=[
            response('<a href="/next">Jedilnik 12.1.–16.1. 2026</a>'),
            response(f"<table>{rows}</table>"),
        ]
    )
    result = checker.get_week_menu(datetime(2026, 1, 12))
    assert result["success"] is True
    assert result["week_start"] == "2026-01-12"
    assert result["week_end"] == "2026-01-16"
    assert len(result["days"]) == 5
    assert all(day["success"] for day in result["days"])
    assert "kosilo PET" in result["days"][4]["menu"]
    assert checker.session.get.call_count == 2


def test_unpublished_week_does_not_use_another_week():
    checker = checker_module.LunchMenuChecker()
    checker.session.get = Mock(
        return_value=response(
            '<a href="/old">Jedilnik 5.1.–9.1. 2026</a>'
            '<a href="/later">Jedilnik 19.1.–23.1. 2026</a>'
            '<a href="/undated">Jedilnik</a>'
        )
    )
    result = checker.get_week_menu(datetime(2026, 1, 12))
    assert result["success"] is False
    assert result["reason"] == "not-published"
    assert checker.session.get.call_count == 1


def test_partial_school_week_marks_missing_days():
    checker = checker_module.LunchMenuChecker()
    checker.session.get = Mock(
        side_effect=[
            response('<a href="/next">Jedilnik 13.1. - 16.1. 2026</a>'),
            response(
                "<table><tr><th>TOR</th><td>kruh</td><td>juha</td>"
                "<td>sadje</td></tr></table>"
            ),
        ]
    )
    result = checker.get_week_menu(datetime(2026, 1, 12))
    assert result["success"] is True
    assert result["days"][0]["success"] is False
    assert result["days"][1]["success"] is True


def test_network_error_is_not_reported_as_unpublished():
    checker = checker_module.LunchMenuChecker()
    checker.session.get = Mock(side_effect=requests.ConnectionError("offline"))
    with pytest.raises(requests.ConnectionError):
        checker.get_week_menu(datetime(2026, 1, 12))


@pytest.mark.parametrize(
    "today, expected",
    [
        ("2026-01-09", datetime(2026, 1, 12)),
        ("2026-01-10", datetime(2026, 1, 12)),
        ("2026-01-11", datetime(2026, 1, 12)),
        ("2026-01-12", datetime(2026, 1, 19)),
        ("2026-12-31", datetime(2027, 1, 4)),
    ],
)
def test_flask_next_week_route(monkeypatch, today, expected):
    checker = Mock()
    checker.get_week_menu.return_value = {"success": True, "days": []}
    monkeypatch.setattr(app_module, "LunchMenuChecker", lambda: checker)
    result = app_module.app.test_client().get(f"/api/menu?week=next&test_date={today}")
    assert result.status_code == 200
    checker.get_week_menu.assert_called_once_with(expected)


@pytest.mark.parametrize("school_id", app_module.schools)
@pytest.mark.parametrize("weekly", [False, True])
def test_flask_school_selection(monkeypatch, school_id, weekly):
    checker = Mock()
    checker.get_week_menu.return_value = {"success": True, "days": []}
    checker.check_lunch_menu_for_date.return_value = "🥗 MALICA: kruh"
    checker.get_current_week_menu_url_for_date.return_value = None
    monkeypatch.setattr(app_module, "LunchMenuChecker", lambda: checker)
    week_query = "&week=next" if weekly else ""
    result = app_module.app.test_client().get(
        f"/api/menu?school={school_id}&test_date=2026-01-12{week_query}"
    )
    assert result.status_code == 200
    assert result.json["success"] is True
    assert result.json["school"] == app_module.schools[school_id]


def test_flask_rejects_unknown_school_before_fetching(monkeypatch):
    checker_factory = Mock()
    monkeypatch.setattr(app_module, "LunchMenuChecker", checker_factory)
    result = app_module.app.test_client().get("/api/menu?school=unknown")
    assert result.status_code == 400
    assert result.json["reason"] == "unknown-school"
    checker_factory.assert_not_called()
