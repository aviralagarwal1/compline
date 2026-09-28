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


def blob(first_name):
    return json.dumps({"profile": {"first_name": first_name}, "cards": [], "hosted_usage": {}})


class SettingsColumnMigrationTests(TestCase):
    def test_reads_the_new_column_first(self):
        client = FakeClient([{"settings": blob("New"), "anthropic_api_key": blob("Old")}])
        self.assertEqual(get_user_settings_state_for_user(client, "user-1")["profile"]["first_name"], "New")
        self.assertEqual(client.table_.selected, "settings,anthropic_api_key")

    def test_falls_back_to_the_old_column_until_copied(self):
        client = FakeClient([{"settings": None, "anthropic_api_key": blob("Old")}])
        self.assertEqual(get_user_settings_state_for_user(client, "user-1")["profile"]["first_name"], "Old")

    def test_writes_both_columns(self):
        client = FakeClient()
        save_user_settings_state_for_user(client, "user-1", {"profile": {"first_name": "Aviral"}, "cards": []})
        row = client.table_.upserted
        self.assertEqual(row["user_id"], "user-1")
        self.assertEqual(row["settings"], row["anthropic_api_key"])
        self.assertEqual(json.loads(row["settings"])["profile"]["first_name"], "Aviral")
