from .conftest import create_user, run_sql

URL = "/api/v1/shops/me"

HOURS = [
    {"day_of_week": d, "is_closed": d == 5, "opens_at": "10:00", "closes_at": "20:00"}
    for d in range(7)
]


def shop_body(**overrides):
    body = {
        "name": "Rupa Beauty Lounge",
        "description": "Hair and skin care",
        "address": "House 12, Road 5, Dhanmondi",
        "area": "Dhanmondi",
        "phone": "01712345678",
        "gender_category": "women",
        "latitude": 23.7461,
        "longitude": 90.376,
        "working_hours": HOURS,
    }
    body.update(overrides)
    return body


def upload(client, headers, name="licence.pdf", content=b"%PDF-1.4 test"):
    return client.post(
        f"{URL}/documents", headers=headers, files={"file": (name, content, "application/pdf")}
    )


# --- who may call it ---------------------------------------------------------


def test_customer_cannot_use_shop_setup(client):
    _, headers = create_user("customer")
    assert client.get(URL, headers=headers).status_code == 403


def test_staff_and_admin_cannot_use_shop_setup(client):
    for role in ("staff", "admin"):
        _, headers = create_user(role)
        assert client.get(URL, headers=headers).status_code == 403


# --- get -----------------------------------------------------------------------


def test_first_get_makes_a_blank_draft(client):
    _, headers = create_user("owner", phone="01812345678")
    response = client.get(URL, headers=headers)
    assert response.status_code == 200
    shop = response.json()
    assert shop["status"] == "draft"
    assert shop["name"] == ""
    assert shop["phone"] == "01812345678"  # taken from the owner's profile
    assert shop["latitude"] is None and shop["longitude"] is None
    assert shop["documents"] == []
    assert shop["approval_reason"] is None
    assert [h["day_of_week"] for h in shop["working_hours"]] == list(range(7))
    assert shop["working_hours"][0] == {
        "day_of_week": 0,
        "is_closed": False,
        "opens_at": "10:00",
        "closes_at": "20:00",
    }


def test_get_twice_gives_the_same_shop(client):
    _, headers = create_user("owner")
    first = client.get(URL, headers=headers).json()
    second = client.get(URL, headers=headers).json()
    assert first["id"] == second["id"]
    assert run_sql("select count(*) from shops")[0][0] == 1


def test_owners_only_see_their_own_shop(client):
    _, headers_a = create_user("owner")
    _, headers_b = create_user("owner")
    client.patch(URL, headers=headers_a, json=shop_body(name="Shop A"))
    client.patch(URL, headers=headers_b, json=shop_body(name="Shop B"))
    assert client.get(URL, headers=headers_a).json()["name"] == "Shop A"
    assert client.get(URL, headers=headers_b).json()["name"] == "Shop B"
    assert run_sql("select count(*) from shops")[0][0] == 2


# --- save ----------------------------------------------------------------------


def test_save_then_get_returns_what_was_saved(client):
    _, headers = create_user("owner")
    response = client.patch(URL, headers=headers, json=shop_body())
    assert response.status_code == 200
    saved = response.json()
    assert saved["name"] == "Rupa Beauty Lounge"
    assert saved["gender_category"] == "women"
    assert saved["latitude"] == 23.7461
    assert saved["status"] == "draft"

    loaded = client.get(URL, headers=headers).json()
    assert loaded == saved
    friday = next(h for h in loaded["working_hours"] if h["day_of_week"] == 5)
    assert friday["is_closed"] is True


def test_save_trims_text(client):
    _, headers = create_user("owner")
    saved = client.patch(URL, headers=headers, json=shop_body(name="  Rupa  ", area=" ")).json()
    assert saved["name"] == "Rupa"
    assert saved["area"] == ""


def test_save_can_clear_the_map_pin(client):
    _, headers = create_user("owner")
    client.patch(URL, headers=headers, json=shop_body())
    saved = client.patch(URL, headers=headers, json=shop_body(latitude=None, longitude=None)).json()
    assert saved["latitude"] is None and saved["longitude"] is None


def test_save_rejects_bad_input(client):
    _, headers = create_user("owner")
    bad_bodies = [
        shop_body(phone="12345"),
        shop_body(phone=""),
        shop_body(name="   "),
        shop_body(address=""),
        shop_body(gender_category="ladies"),
        shop_body(latitude=95, longitude=90),
        shop_body(latitude=23.7, longitude=None),
        shop_body(description="x" * 501),
        shop_body(working_hours=HOURS[:6]),  # a day is missing
        shop_body(working_hours=HOURS[:6] + [{**HOURS[0]}]),  # day 0 twice
        shop_body(working_hours=[{**h, "is_closed": True} for h in HOURS]),  # all closed
        shop_body(working_hours=[{**h, "opens_at": "21:00"} for h in HOURS]),  # opens after closing
        shop_body(working_hours=[{**h, "opens_at": "9:00"} for h in HOURS]),  # bad time format
    ]
    for body in bad_bodies:
        assert client.patch(URL, headers=headers, json=body).status_code == 422, body


def test_closed_day_may_keep_any_times(client):
    _, headers = create_user("owner")
    hours = [{**h, "opens_at": "00:00", "closes_at": "00:00"} if h["is_closed"] else h for h in HOURS]
    assert client.patch(URL, headers=headers, json=shop_body(working_hours=hours)).status_code == 200


def test_phone_with_country_code_is_accepted(client):
    _, headers = create_user("owner")
    for phone in ("+8801712345678", "8801712345678"):
        assert client.patch(URL, headers=headers, json=shop_body(phone=phone)).status_code == 200


# --- documents -----------------------------------------------------------------


def test_upload_and_delete_a_document(client, storage):
    _, headers = create_user("owner")
    response = upload(client, headers)
    assert response.status_code == 201
    document = response.json()
    assert document["file_name"] == "licence.pdf"
    assert document["doc_type"] == "trade_licence"
    assert document["file_url"].startswith("https://files.test/shop-documents/")
    assert len(storage.files) == 1

    shop = client.get(URL, headers=headers).json()
    assert [d["id"] for d in shop["documents"]] == [document["id"]]

    assert client.delete(f"{URL}/documents/{document['id']}", headers=headers).status_code == 204
    assert client.get(URL, headers=headers).json()["documents"] == []
    assert storage.files == {}


def test_upload_rejects_wrong_type_empty_and_big_files(client):
    _, headers = create_user("owner")
    assert upload(client, headers, name="notes.txt").json()["code"] == "bad_file_type"
    assert upload(client, headers, name="noextension").json()["code"] == "bad_file_type"
    assert upload(client, headers, content=b"").json()["code"] == "empty_file"
    big = upload(client, headers, content=b"x" * (5 * 1024 * 1024 + 1))
    assert big.status_code == 400 and big.json()["code"] == "file_too_big"


def test_upload_keeps_at_most_five_documents(client):
    _, headers = create_user("owner")
    for _ in range(5):
        assert upload(client, headers).status_code == 201
    response = upload(client, headers)
    assert response.status_code == 409 and response.json()["code"] == "too_many_documents"


def test_unsafe_file_names_are_cleaned_in_the_path(client, storage):
    _, headers = create_user("owner")
    assert upload(client, headers, name="../../my licence (1).pdf").status_code == 201
    (path,) = storage.files
    assert ".." not in path and " " not in path and "(" not in path


def test_cannot_delete_someone_elses_document(client):
    _, headers_a = create_user("owner")
    _, headers_b = create_user("owner")
    document = upload(client, headers_a).json()
    response = client.delete(f"{URL}/documents/{document['id']}", headers=headers_b)
    assert response.status_code == 404
    assert response.json()["code"] == "document_not_found"
    assert len(client.get(URL, headers=headers_a).json()["documents"]) == 1


# --- submit --------------------------------------------------------------------


def test_submit_of_a_blank_shop_lists_what_is_missing(client):
    _, headers = create_user("owner")
    response = client.post(f"{URL}/submit", headers=headers)
    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "shop_incomplete"
    assert set(body["missing"]) == {"name", "address", "phone", "location", "licence"}
    assert client.get(URL, headers=headers).json()["status"] == "draft"


def test_submit_needs_the_licence_and_the_pin(client):
    _, headers = create_user("owner")
    client.patch(URL, headers=headers, json=shop_body(latitude=None, longitude=None))
    assert client.post(f"{URL}/submit", headers=headers).json()["missing"] == ["location", "licence"]


def test_full_flow_save_upload_submit(client):
    _, headers = create_user("owner")
    client.patch(URL, headers=headers, json=shop_body())
    upload(client, headers)
    response = client.post(f"{URL}/submit", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "pending"
    assert client.get(URL, headers=headers).json()["status"] == "pending"


def test_pending_shop_is_locked(client):
    _, headers = create_user("owner")
    client.patch(URL, headers=headers, json=shop_body())
    document = upload(client, headers).json()
    client.post(f"{URL}/submit", headers=headers)

    for response in (
        client.patch(URL, headers=headers, json=shop_body(name="Changed")),
        upload(client, headers),
        client.delete(f"{URL}/documents/{document['id']}", headers=headers),
        client.post(f"{URL}/submit", headers=headers),
    ):
        assert response.status_code == 409
    assert client.get(URL, headers=headers).json()["name"] == "Rupa Beauty Lounge"


def test_rejected_shop_can_be_fixed_and_submitted_again(client):
    owner_id, headers = create_user("owner")
    client.patch(URL, headers=headers, json=shop_body())
    upload(client, headers)
    client.post(f"{URL}/submit", headers=headers)
    # What the admin does in FR-10.1:
    run_sql(
        "update shops set status = 'rejected', approval_reason = 'Licence is not readable' "
        "where owner_id = %s",
        (owner_id,),
    )

    rejected = client.get(URL, headers=headers).json()
    assert rejected["status"] == "rejected"
    assert rejected["approval_reason"] == "Licence is not readable"

    assert client.patch(URL, headers=headers, json=shop_body(name="Rupa Beauty Lounge 2")).status_code == 200
    again = client.post(f"{URL}/submit", headers=headers).json()
    assert again["status"] == "pending"
    assert again["approval_reason"] is None


def test_approved_shop_can_still_be_edited_but_not_resubmitted(client):
    owner_id, headers = create_user("owner")
    client.get(URL, headers=headers)
    run_sql("update shops set status = 'approved' where owner_id = %s", (owner_id,))
    assert client.patch(URL, headers=headers, json=shop_body()).status_code == 200
    response = client.post(f"{URL}/submit", headers=headers)
    assert response.status_code == 409 and response.json()["code"] == "invalid_status"


def test_suspended_shop_is_locked(client):
    owner_id, headers = create_user("owner")
    client.get(URL, headers=headers)
    run_sql(
        "update shops set status = 'suspended', approval_reason = 'Complaints' where owner_id = %s",
        (owner_id,),
    )
    response = client.patch(URL, headers=headers, json=shop_body())
    assert response.status_code == 409 and response.json()["code"] == "shop_locked"
