import uuid

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_register_login_and_me_flow() -> None:
    unique = uuid.uuid4().hex[:8]
    email = f"auth_{unique}@example.com"
    password = "StrongPass123"

    register_payload = {
        "name": f"User {unique}",
        "email": email,
        "password": password,
    }
    register_response = client.post("/auth/register", json=register_payload)
    assert register_response.status_code == 201

    user_data = register_response.json()
    assert user_data["email"] == email
    assert "id" in user_data

    login_payload = {
        "username": email,
        "password": password,
    }
    login_response = client.post(
        "/auth/login",
        data=login_payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert login_response.status_code == 200

    token_data = login_response.json()
    assert token_data["token_type"] == "bearer"
    assert "access_token" in token_data

    me_response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token_data['access_token']}"},
    )
    assert me_response.status_code == 200

    me_data = me_response.json()
    assert me_data["email"] == email

    leaderboard_unauth = client.get("/leaderboard/overall")
    assert leaderboard_unauth.status_code == 401

    leaderboard_auth = client.get(
        "/leaderboard/overall",
        headers={"Authorization": f"Bearer {token_data['access_token']}"},
    )
    assert leaderboard_auth.status_code == 200


def test_register_duplicate_email_rejected() -> None:
    unique = uuid.uuid4().hex[:8]
    email = f"dup_{unique}@example.com"
    payload = {
        "name": "Duplicate User",
        "email": email,
        "password": "StrongPass123",
    }

    first = client.post("/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/auth/register", json=payload)
    assert second.status_code == 409


def test_logout_revokes_token() -> None:
    unique = uuid.uuid4().hex[:8]
    email = f"logout_{unique}@example.com"
    password = "StrongPass123"

    register_response = client.post(
        "/auth/register",
        json={"name": f"User {unique}", "email": email, "password": password},
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    logout_response = client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_response.status_code == 204

    me_response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 401
