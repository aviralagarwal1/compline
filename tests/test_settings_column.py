import json
from types import SimpleNamespace
from unittest import TestCase

from compline.user_data import get_user_settings_state_for_user, save_user_settings_state_for_user


class FakeTable:
    def __init__(self, rows):
        self.rows, self.selected, self.upserted = rows, None, None

    def select(self, columns):
        self.selected = columns
        return self

    def eq(self, *_):
        return self

    def limit(self, *_):
        return self

    def upsert(self, row):
        self.upserted = row
        return self

    def execute(self):
        return SimpleNamespace(data=self.rows)


class FakeClient:
    def __init__(self, rows=None):
        self.table_ = FakeTable(rows or [])

    def table(self, name):
        assert name == "user_settings"
        return self.table_


class SettingsColumnTests(TestCase):
    def test_reads_the_settings_column(self):
        stored = json.dumps({"profile": {"first_name": "Aviral"}, "cards": [], "hosted_usage": {}})
        client = FakeClient([{"settings": stored}])
        self.assertEqual(get_user_settings_state_for_user(client, "user-1")["profile"]["first_name"], "Aviral")
        self.assertEqual(client.table_.selected, "settings")

    def test_missing_row_gives_empty_settings(self):
        settings = get_user_settings_state_for_user(FakeClient([]), "user-1")
        self.assertEqual(settings["cards"], [])

    def test_writes_only_the_settings_column(self):
        client = FakeClient()
        save_user_settings_state_for_user(client, "user-1", {"profile": {"first_name": "Aviral"}, "cards": []})
        row = client.table_.upserted
        self.assertEqual(set(row), {"user_id", "settings"})
        self.assertEqual(json.loads(row["settings"])["profile"]["first_name"], "Aviral")
