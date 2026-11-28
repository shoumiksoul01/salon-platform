from .conftest import create_user, run_sql

URL = "/api/v1/me"


def profile_row(user_id):
    return run_sql(
        "select full_name, phone, role, preferred_language from public.profiles where id = %s",
        (user_id,),
    )[0]


# --- get -----------------------------------------------------------------------


def test_me_needs_login(client):
    assert client.get(URL).status_code == 401
    assert client.patch(URL, json={"full_name": "X"}).status_code == 401


def test_get_own_profile(client):
    user_id, headers = create_user("customer", full_name="Nusrat Jahan", phone="01712345678")
    response = client.get(URL, headers=headers)
    assert response.status_code == 200
    assert response.json() == {
        "id": str(user_id),
        "full_name": "Nusrat Jahan",
        "phone": "01712345678",
        "email": "someone@example.com",  # from the login token
        "preferred_language": None,
    }


def test_every_role_has_a_profile(client):
    for role in ("customer", "owner", "staff", "admin"):
        _, headers = create_user(role)
        assert client.get(URL, headers=headers).status_code == 200


# --- update --------------------------------------------------------------------


def test_update_name_and_phone(client):
    user_id, headers = create_user("customer", full_name="Old Name", phone="01712345678")
    response = client.patch(
        URL, headers=headers, json={"full_name": "  New Name ", "phone": "01812345678"}
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "New Name"
    assert response.json()["phone"] == "01812345678"
    assert profile_row(user_id)[:2] == ("New Name", "01812345678")


def test_phone_is_stored_without_the_88_prefix(client):
    user_id, headers = create_user("customer")
    response = client.patch(URL, headers=headers, json={"phone": "+8801712345678"})
    assert response.status_code == 200
    assert profile_row(user_id)[1] == "01712345678"


def test_phone_can_be_removed(client):
    user_id, headers = create_user("customer", phone="01712345678")
    for value in (None, "  "):
        client.patch(URL, headers=headers, json={"phone": "01912345678"})
        response = client.patch(URL, headers=headers, json={"phone": value})
        assert response.status_code == 200
        assert response.json()["phone"] is None
        assert profile_row(user_id)[1] is None


def test_fields_that_are_not_sent_stay_as_they_are(client):
    user_id, headers = create_user("owner", full_name="Rupa", phone="01712345678")
    response = client.patch(URL, headers=headers, json={"preferred_language": "bn"})
    assert response.status_code == 200
    assert profile_row(user_id) == ("Rupa", "01712345678", "owner", "bn")


def test_language_can_be_saved_and_changed(client):
    user_id, headers = create_user("customer")
    for language in ("bn", "en"):
        response = client.patch(URL, headers=headers, json={"preferred_language": language})
        assert response.json()["preferred_language"] == language
        assert profile_row(user_id)[3] == language
    assert client.get(URL, headers=headers).json()["preferred_language"] == "en"


# --- the update policy ---------------------------------------------------------


def test_role_cannot_be_changed(client):
    user_id, headers = create_user("customer")
    for role in ("admin", "owner", "customer"):
        response = client.patch(URL, headers=headers, json={"role": role})
        assert response.status_code == 422
    # even next to allowed fields
    response = client.patch(URL, headers=headers, json={"full_name": "Sneaky", "role": "admin"})
    assert response.status_code == 422
    assert profile_row(user_id)[0] == "Test User"
    assert profile_row(user_id)[2] == "customer"


def test_email_and_id_cannot_be_changed(client):
    user_id, headers = create_user("customer")
    assert client.patch(URL, headers=headers, json={"email": "new@example.com"}).status_code == 422
    other = "00000000-0000-0000-0000-000000000001"
    assert client.patch(URL, headers=headers, json={"id": other}).status_code == 422
    assert str(client.get(URL, headers=headers).json()["id"]) == str(user_id)


def test_only_the_own_profile_changes(client):
    _, headers = create_user("customer", full_name="Me")
    other_id, _ = create_user("customer", full_name="Someone Else")
    client.patch(URL, headers=headers, json={"full_name": "Changed"})
    assert profile_row(other_id)[0] == "Someone Else"


# --- bad input -----------------------------------------------------------------


def test_bad_input_is_refused_and_nothing_is_saved(client):
    user_id, headers = create_user("customer", full_name="Keep Me", phone="01712345678")
    bad_bodies = [
        {"full_name": ""},
        {"full_name": "   "},
        {"full_name": None},
        {"full_name": "x" * 121},
        {"phone": "12345"},
        {"phone": "01012345678"},
        {"preferred_language": "fr"},
        {"preferred_language": None},
    ]
    for body in bad_bodies:
        assert client.patch(URL, headers=headers, json=body).status_code == 422, body
    assert profile_row(user_id) == ("Keep Me", "01712345678", "customer", None)


def test_empty_body_is_400(client):
    _, headers = create_user("customer")
    response = client.patch(URL, headers=headers, json={})
    assert response.status_code == 400
    assert response.json()["code"] == "nothing_to_update"
