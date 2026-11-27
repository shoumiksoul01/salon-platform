from .conftest import create_user, run_sql

URL = "/api/v1/shops/me/media"
PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 100


def add(client, headers, name="front.png", content=PNG, alt="Reception"):
    return client.post(
        f"{URL}/images",
        headers=headers,
        files={"file": (name, content, "image/png")},
        data={"alt_text": alt},
    )


def order(media):
    return [image["alt_text"] for image in media["images"]]


def test_customer_cannot_use_media(client):
    _, headers = create_user("customer")
    assert client.get(URL, headers=headers).status_code == 403


def test_empty_media_for_a_new_shop(client):
    _, headers = create_user("owner")
    assert client.get(URL, headers=headers).json() == {"images": [], "tour_url": None}


def test_add_photos_in_order(client, storage):
    _, headers = create_user("owner")
    first = add(client, headers, alt="One")
    assert first.status_code == 201
    media = add(client, headers, alt="Two").json()
    assert order(media) == ["One", "Two"]
    assert [i["sort_order"] for i in media["images"]] == [0, 1]
    assert media["images"][0]["url"].startswith("https://files.test/public/shop-images/")
    assert len(storage.files) == 2
    assert client.get(URL, headers=headers).json() == media


def test_photo_rules(client):
    _, headers = create_user("owner")
    assert add(client, headers, name="doc.pdf").json()["code"] == "bad_type"
    assert add(client, headers, name="noext").json()["code"] == "bad_type"
    assert add(client, headers, content=b"").json()["code"] == "bad_type"
    big = add(client, headers, content=b"x" * (2 * 1024 * 1024 + 1))
    assert big.status_code == 400 and big.json()["code"] == "too_big"
    assert add(client, headers, alt="x" * 121).json()["code"] == "alt_too_long"
    assert client.get(URL, headers=headers).json()["images"] == []


def test_at_most_ten_photos(client):
    _, headers = create_user("owner")
    for n in range(10):
        assert add(client, headers, alt=str(n)).status_code == 201
    response = add(client, headers)
    assert response.status_code == 409 and response.json()["code"] == "too_many"


def test_update_description(client):
    _, headers = create_user("owner")
    media = add(client, headers, alt="Old").json()
    image_id = media["images"][0]["id"]
    updated = client.patch(f"{URL}/images/{image_id}", headers=headers, json={"alt_text": " New "})
    assert order(updated.json()) == ["New"]
    too_long = client.patch(f"{URL}/images/{image_id}", headers=headers, json={"alt_text": "x" * 121})
    assert too_long.json()["code"] == "alt_too_long"


def test_move_photos(client):
    _, headers = create_user("owner")
    for alt in ("A", "B", "C"):
        add(client, headers, alt=alt)
    ids = {i["alt_text"]: i["id"] for i in client.get(URL, headers=headers).json()["images"]}

    moved = client.post(f"{URL}/images/{ids['C']}/move", headers=headers, json={"direction": -1})
    assert order(moved.json()) == ["A", "C", "B"]
    moved = client.post(f"{URL}/images/{ids['A']}/move", headers=headers, json={"direction": 1})
    assert order(moved.json()) == ["C", "A", "B"]
    # At the edge nothing changes and nothing fails.
    edge = client.post(f"{URL}/images/{ids['C']}/move", headers=headers, json={"direction": -1})
    assert order(edge.json()) == ["C", "A", "B"]
    last = client.post(f"{URL}/images/{ids['B']}/move", headers=headers, json={"direction": 1})
    assert order(last.json()) == ["C", "A", "B"]
    assert [i["sort_order"] for i in last.json()["images"]] == [0, 1, 2]
    bad = client.post(f"{URL}/images/{ids['B']}/move", headers=headers, json={"direction": 2})
    assert bad.status_code == 422


def test_remove_photo_closes_the_gap_and_deletes_the_file(client, storage):
    _, headers = create_user("owner")
    for alt in ("A", "B", "C"):
        add(client, headers, alt=alt)
    ids = {i["alt_text"]: i["id"] for i in client.get(URL, headers=headers).json()["images"]}
    response = client.delete(f"{URL}/images/{ids['B']}", headers=headers)
    assert response.status_code == 200
    assert order(response.json()) == ["A", "C"]
    assert [i["sort_order"] for i in response.json()["images"]] == [0, 1]
    assert len(storage.files) == 2


def test_unknown_photo_is_404(client):
    _, headers = create_user("owner")
    missing = "00000000-0000-4000-8000-000000000000"
    assert client.delete(f"{URL}/images/{missing}", headers=headers).json()["code"] == "not_found"
    assert (
        client.patch(f"{URL}/images/{missing}", headers=headers, json={"alt_text": "x"}).status_code
        == 404
    )
    assert (
        client.post(f"{URL}/images/{missing}/move", headers=headers, json={"direction": 1}).status_code
        == 404
    )


def test_cannot_touch_another_owners_photo(client):
    _, headers_a = create_user("owner")
    _, headers_b = create_user("owner")
    photo = add(client, headers_a).json()["images"][0]["id"]
    assert client.delete(f"{URL}/images/{photo}", headers=headers_b).status_code == 404
    assert (
        client.patch(f"{URL}/images/{photo}", headers=headers_b, json={"alt_text": "hacked"}).status_code
        == 404
    )
    assert len(client.get(URL, headers=headers_a).json()["images"]) == 1
    assert client.get(URL, headers=headers_b).json()["images"] == []


def test_photo_path_never_uses_the_uploaded_name(client, storage):
    _, headers = create_user("owner")
    add(client, headers, name="../../evil name.JPEG")
    (path,) = storage.files
    assert path.endswith(".jpg") and "evil" not in path and ".." not in path


def test_tour_link(client):
    owner_id, headers = create_user("owner")
    saved = client.put(f"{URL}/tour", headers=headers, json={"tour_url": " https://tour.example.com/rupa "})
    assert saved.json() == {"tour_url": "https://tour.example.com/rupa"}
    assert client.get(URL, headers=headers).json()["tour_url"] == "https://tour.example.com/rupa"
    assert run_sql("select tour_url from shops where owner_id = %s", (owner_id,))[0][0].startswith("https://")

    removed = client.put(f"{URL}/tour", headers=headers, json={"tour_url": "   "})
    assert removed.json() == {"tour_url": None}
    assert client.get(URL, headers=headers).json()["tour_url"] is None


def test_tour_link_rules(client):
    _, headers = create_user("owner")
    for bad in ("http://tour.example.com", "tour.example.com", "javascript:alert(1)", "https://", "https://x.com/" + "a" * 300):
        response = client.put(f"{URL}/tour", headers=headers, json={"tour_url": bad})
        assert response.status_code == 400 and response.json()["code"] == "bad_url", bad
