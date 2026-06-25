"""API tests for new-mortgage clocks endpoint."""


from fastapi.testclient import TestClient


def test_new_mortgage_clocks(client: TestClient) -> None:
    body = {
        "loan_type": "single_property",
        "property_source": "second_hand",
        "property_value": 2_000_000,
        "equity": 500_000,
        "borrowers": [
            {
                "full_name": "Test",
                "birth_date": "1985-06-15",
                "is_property_owner": True,
                "net_income": 25_000,
            }
        ],
        "additional_income": 0,
        "fixed_expenses": 0,
        "desired_min_payment": 6000,
        "desired_max_payment": 9500,
    }
    res = client.post("/new-mortgage/clocks", json=body)
    assert res.status_code == 200
    data = res.json()
    assert data["validation"]["ok"]
    assert len(data["clocks"]) == 5
    assert data["clocks"][0]["mix"]["first_pay"] > 0
