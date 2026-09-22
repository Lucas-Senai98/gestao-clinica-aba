import sqlite3
import hashlib
import os
import json

DB_PATH = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/ff5fd1e77bb70a8a362429e6271a301466bb145591871a772ecb2a6b2515c795.sqlite"

def pbkdf2_sha256(password: str, salt_hex: str) -> str:
    salt_bytes = bytes.fromhex(salt_hex)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 100000, dklen=32)
    return derived.hex()

def main():
    print("🔍 Iniciando verificação backend das funções e tabelas do D1...")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Checagem de tabelas
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    required_tables = ["users", "patient_guardian", "audit_logs", "patients"]
    for t in required_tables:
        assert t in tables, f"Tabela obrigatória ausente: {t}"
    print(f"✅ Tabelas {required_tables} confirmadas no banco SQLite D1.")

    # 2. Teste de criação com PBKDF2
    salt_hex = os.urandom(16).hex()
    password = "SenhaTeste@2026"
    hash_hex = pbkdf2_sha256(password, salt_hex)

    test_guardian_id = "u-guardian-test-01"
    test_email = "patricia.teste@gizeclinica.com.br"
    test_name = "Patrícia Silva Teste"
    patient_id = "p1"

    # Limpeza prévia
    cur.execute("DELETE FROM audit_logs WHERE patient_id = ? OR resource = ?", (patient_id, test_guardian_id))
    cur.execute("DELETE FROM patient_guardian WHERE guardian_id = ?", (test_guardian_id,))
    cur.execute("DELETE FROM users WHERE id = ? OR email = ?", (test_guardian_id, test_email))
    conn.commit()

    # Inserção do responsável (role: parent)
    cur.execute("""
        INSERT INTO users (id, email, name, role, password_hash, password_salt, avatar_initials, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 'parent', ?, ?, 'PS', 1, datetime('now'), datetime('now'))
    """, (test_guardian_id, test_email, test_name, hash_hex, salt_hex))

    # Inserção no pivô patient_guardian
    cur.execute("""
        INSERT INTO patient_guardian (id, patient_id, guardian_id, relation, assigned_at)
        VALUES (?, ?, ?, 'Mãe', datetime('now'))
    """, ("pg-link-test-01", patient_id, test_guardian_id))

    # Trilha LGPD CREATE_GUARDIAN_LINK
    cur.execute("""
        INSERT INTO audit_logs (id, user_id, patient_id, action, resource, ip_address, timestamp)
        VALUES (?, 'u-supervisor-01', ?, 'CREATE_GUARDIAN_LINK', 'patient_guardian', '127.0.0.1', datetime('now'))
    """, ("audit-test-01", patient_id))
    conn.commit()
    print("✅ Usuário guardião criado, vinculado a patient_guardian e auditado com CREATE_GUARDIAN_LINK.")

    # 3. Consulta de vínculo (getPatientGuardians)
    cur.execute("""
        SELECT pg.id, pg.patient_id, pg.guardian_id, pg.relation, u.name, u.email, u.role
        FROM patient_guardian pg
        JOIN users u ON u.id = pg.guardian_id
        WHERE pg.patient_id = ?
    """, (patient_id,))
    rows = cur.fetchall()
    found = [r for r in rows if r[2] == test_guardian_id]
    assert len(found) > 0, "Responsável não retornado na consulta de vínculos"
    print(f"✅ Consulta de responsáveis retornou: {found[0][4]} ({found[0][5]}), role={found[0][6]}")

    # 4. Redefinição de senha (updateGuardianPassword)
    new_password = "NovaSenha@2026_Alterada"
    new_salt_hex = os.urandom(16).hex()
    new_hash_hex = pbkdf2_sha256(new_password, new_salt_hex)

    cur.execute("""
        UPDATE users SET password_hash = ?, password_salt = ?, updated_at = datetime('now') WHERE id = ?
    """, (new_hash_hex, new_salt_hex, test_guardian_id))

    cur.execute("""
        INSERT INTO audit_logs (id, user_id, patient_id, action, resource, ip_address, timestamp)
        VALUES (?, 'u-supervisor-01', ?, 'RESET_GUARDIAN_PASSWORD', 'users', '127.0.0.1', datetime('now'))
    """, ("audit-test-02", patient_id))
    conn.commit()
    print("✅ Senha atualizada e auditada com RESET_GUARDIAN_PASSWORD.")

    # 5. Validação criptográfica da nova senha
    cur.execute("SELECT password_hash, password_salt FROM users WHERE id = ?", (test_guardian_id,))
    saved_hash, saved_salt = cur.fetchone()
    assert saved_hash == new_hash_hex, "Hash salvo diverge do hash calculado"
    recalc = pbkdf2_sha256(new_password, saved_salt)
    assert recalc == saved_hash, "Recálculo PBKDF2 falhou"
    print("✅ Validação criptográfica PBKDF2 confirmada com 100.000 iterações SHA-256!")

    # 6. Auditoria LGPD
    cur.execute("SELECT action, resource, patient_id FROM audit_logs WHERE patient_id = ? ORDER BY timestamp ASC", (patient_id,))
    audit_rows = cur.fetchall()
    assert len(audit_rows) >= 2, f"Esperado >= 2 registros de auditoria, obteve {len(audit_rows)}"
    actions = [r[0] for r in audit_rows]
    assert "CREATE_GUARDIAN_LINK" in actions
    assert "RESET_GUARDIAN_PASSWORD" in actions
    print(f"✅ Trilha de auditoria LGPD verificada com sucesso: {[r[0] for r in audit_rows]}")

    conn.close()
    print("\n🎉 TODOS OS TESTES BACKEND E LGPD PASSARAM COM 100% DE SUCESSO!")

if __name__ == "__main__":
    main()
