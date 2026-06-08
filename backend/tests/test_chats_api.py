"""Sohbet geçmişi API testleri."""


def test_chats_flow(client, auth_headers):
    create = client.post("/api/chats", headers=auth_headers, json={"title": "Test sohbet"})
    assert create.status_code == 200
    sid = create.json()["id"]

    add_user = client.post(
        f"/api/chats/{sid}/messages",
        headers=auth_headers,
        json={"role": "user", "content": "Merhaba Argos"},
    )
    assert add_user.status_code == 200

    add_assistant = client.post(
        f"/api/chats/{sid}/messages",
        headers=auth_headers,
        json={"role": "assistant", "content": "Merhaba, nasıl yardımcı olayım?"},
    )
    assert add_assistant.status_code == 200

    listed = client.get("/api/chats", headers=auth_headers)
    assert listed.status_code == 200
    assert any(s["id"] == sid for s in listed.json()["sessions"])

    detail = client.get(f"/api/chats/{sid}", headers=auth_headers)
    assert detail.status_code == 200
    assert len(detail.json()["messages"]) == 2

    deleted = client.delete(f"/api/chats/{sid}", headers=auth_headers)
    assert deleted.status_code == 200
    assert deleted.json()["ok"] is True
