from app.core.security import hash_password, verify_password


def test_hash_password_no_guarda_texto_plano():
    hashed = hash_password("miClaveSegura123")
    assert hashed != "miClaveSegura123"


def test_verify_password_correcta_e_incorrecta():
    hashed = hash_password("miClaveSegura123")
    assert verify_password("miClaveSegura123", hashed) is True
    assert verify_password("otraClave", hashed) is False
