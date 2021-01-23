from dataclasses import dataclass
from typing import Any, Optional, Union, get_args, get_origin

@dataclass
class User:
    created_at: 'str'
    id: 'str'
    is_admin: 'bool'
    karma: 'int'

    @classmethod
    def from_json(cls, data) -> "User":
        """
        Construct an instance of this class from parsed JSON data.
        """

        return cls(
            _from_json(str, data.get("createdAt")),
            _from_json(str, data.get("id")),
            _from_json(bool, data.get("isAdmin")),
            _from_json(int, data.get("karma")),
        )

    def to_json(self):
        """
        Generate JSON-ready data from an instance of this class.
        """

        out = {}
        out["createdAt"] = _to_json(self.created_at)
        out["id"] = _to_json(self.id)
        out["isAdmin"] = _to_json(self.is_admin)
        out["karma"] = _to_json(self.karma)
        return out

def _from_json(cls, data):
    if data is None or cls in [bool, int, float, str, object] or cls is Any:
        return data
    if get_origin(cls) is Union:
        return _from_json(get_args(cls)[0], data)
    if get_origin(cls) is list:
        return [_from_json(get_args(cls)[0], d) for d in data]
    if get_origin(cls) is dict:
        return { k: _from_json(get_args(cls)[1], v) for k, v in data.items() }
    return cls.from_json(data)

def _to_json(data):
    if data is None or type(data) in [bool, int, float, str, object]:
        return data
    if type(data) is list:
        return [_to_json(d) for d in data]
    if type(data) is dict:
        return { k: _to_json(v) for k, v in data.items() }
    return data.to_json()
