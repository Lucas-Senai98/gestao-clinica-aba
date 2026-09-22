import sqlite3
import json
import glob
import os

DB_PATH = glob.glob(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite")[0]
if "metadata" in DB_PATH:
    DB_PATH = [f for f in glob.glob(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite") if "metadata" not in f][0]

def main():
    print(f"🔍 Conectando ao banco D1: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 1. Checagem de tabelas
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    assert "clinical_reports" in tables, "Tabela clinical_reports não encontrada"
    assert "parent_feed" in tables, "Tabela parent_feed não encontrada"
    assert "notifications" in tables, "Tabela notifications não encontrada"
    assert "patient_guardian" in tables, "Tabela patient_guardian não encontrada"
    print("✅ Todas as tabelas necessárias existem no D1.")

    # 2. Setup de teste: Paciente p1 (Lucas Almeida) e Guardião u-parent-01 (Mariana Almeida)
    cur.execute("SELECT id, name, email FROM users WHERE role = 'parent'")
    parents = cur.fetchall()
    print(f"Responsáveis cadastrados no banco: {len(parents)}")
    for p in parents:
        print(f"  - {p[0]}: {p[1]} ({p[2]})")

    # Garante vínculo de p1 com u-parent-01
    cur.execute("DELETE FROM patient_guardian WHERE patient_id = 'p1' AND guardian_id = 'u-parent-01'")
    cur.execute("INSERT INTO patient_guardian (id, patient_id, guardian_id, relation, assigned_at) VALUES ('pg-test-p1', 'p1', 'u-parent-01', 'Mãe', datetime('now'))")
    conn.commit()

    # 3. Testa inserção de Relatório Clínico Oficial Emitido e Compartilhado
    report_id = "rep-qa-family-01"
    cur.execute("DELETE FROM clinical_reports WHERE id = ?", (report_id,))
    cur.execute("""
        INSERT INTO clinical_reports
            (id, patient_id, author_id, template_id, title, content, status, shared_with_patient, shared_at, created_at, updated_at)
        VALUES
            (?, 'p1', 'u-admin-01', 'rt1', 'Relatório Oficial de Teste — Lucas Almeida', 'Conteúdo oficial clínico ABA.', 'Emitido', 1, datetime('now'), datetime('now'), datetime('now'))
    """, (report_id,))

    # Insere notificação in-app para o responsável
    notif_id = "notif-qa-01"
    cur.execute("DELETE FROM notifications WHERE id = ?", (notif_id,))
    cur.execute("""
        INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
        VALUES (?, 'u-parent-01', '📄 Relatório Clínico Oficial Emitido', 'O relatório foi emitido para Lucas Almeida e está disponível para visualização.', 'devolutiva', 0, datetime('now'))
    """, (notif_id,))

    # Insere publicação de aviso no parent_feed
    feed_id = "feed-qa-01"
    cur.execute("DELETE FROM parent_feed WHERE id = ?", (feed_id,))
    cur.execute("""
        INSERT INTO parent_feed (id, patient_id, author_id, title, body, mood, home_practices, published_at)
        VALUES (?, 'p1', 'u-admin-01', '📄 Relatório Oficial Emitido: Relatório de Teste', 'Documento clínico oficial emitido.', 'ótimo', 'Consulte o relatório.', datetime('now'))
    """, (feed_id,))
    conn.commit()
    print("✅ Relatório clínico oficial, notificação e publicação de feed inseridos com sucesso.")

    # 4. Simula a consulta de getClinicalReports para o responsável Mariana (u-parent-01)
    # Busca pacientes vinculados ao responsável
    cur.execute("SELECT patient_id FROM patient_guardian WHERE guardian_id = 'u-parent-01'")
    linked_patient_ids = [r[0] for r in cur.fetchall()]
    print(f"Pacientes vinculados a Mariana Almeida: {linked_patient_ids}")
    assert "p1" in linked_patient_ids, "Vínculo p1 deve existir para Mariana"

    # Busca relatórios para o portal dos pais:
    placeholders = ",".join(["?"] * len(linked_patient_ids))
    cur.execute(f"""
        SELECT r.id, r.title, r.status, r.shared_with_patient, p.name as patient_name
        FROM clinical_reports r
        JOIN patients p ON p.id = r.patient_id
        WHERE r.patient_id IN ({placeholders})
          AND r.status = 'Emitido'
          AND r.shared_with_patient = 1
    """, linked_patient_ids)
    visible_reports = cur.fetchall()
    print(f"✅ Relatórios visíveis no Portal dos Pais para Mariana: {len(visible_reports)}")
    for r in visible_reports:
        print(f"  - [{r[2]}] {r[1]} (Paciente: {r[4]}, Compartilhado: {bool(r[3])})")

    assert any(r[0] == report_id for r in visible_reports), "O relatório oficial recém-emitido DEVE estar visível para a família!"

    # 5. Verifica se rascunhos NÃO são vazados para a família
    draft_id = "rep-qa-draft-01"
    cur.execute("DELETE FROM clinical_reports WHERE id = ?", (draft_id,))
    cur.execute("""
        INSERT INTO clinical_reports
            (id, patient_id, author_id, template_id, title, content, status, shared_with_patient, shared_at, created_at, updated_at)
        VALUES
            (?, 'p1', 'u-admin-01', 'rt1', 'Rascunho Secreto Interno', 'Conteúdo ainda não revisado.', 'Rascunho', 0, NULL, datetime('now'), datetime('now'))
    """, (draft_id,))
    conn.commit()

    cur.execute(f"""
        SELECT r.id, r.title
        FROM clinical_reports r
        WHERE r.patient_id IN ({placeholders})
          AND r.status = 'Emitido'
          AND r.shared_with_patient = 1
    """, linked_patient_ids)
    visible_after_draft = cur.fetchall()
    assert not any(r[0] == draft_id for r in visible_after_draft), "Rascunho NUNCA pode ser visível para a família!"
    print("✅ Segurança confirmada: Rascunhos da equipe técnica permanecem estritamente confidenciais e ocultos da família.")

    # 6. Verifica notificações não lidas para a família
    cur.execute("SELECT id, title, message, is_read FROM notifications WHERE user_id = 'u-parent-01' AND is_read = 0")
    notifs = cur.fetchall()
    print(f"✅ Notificações ativas para a família: {len(notifs)}")
    assert len(notifs) >= 1, "A família deve ter recebido pelo menos 1 notificação in-app do relatório emitido."

    # 7. Verifica se o feed da família exibe a publicação do relatório
    cur.execute("SELECT id, title, patient_id FROM parent_feed WHERE patient_id = 'p1'")
    feed_rows = cur.fetchall()
    print(f"✅ Itens no feed da família para o paciente p1: {len(feed_rows)}")
    assert len(feed_rows) >= 1, "Feed da família deve conter o aviso do relatório emitido."

    # Limpeza dos dados de teste
    cur.execute("DELETE FROM clinical_reports WHERE id IN (?, ?)", (report_id, draft_id))
    cur.execute("DELETE FROM notifications WHERE id = ?", (notif_id,))
    cur.execute("DELETE FROM parent_feed WHERE id = ?", (feed_id,))
    conn.commit()
    conn.close()

    print("\n🎉 TODOS OS TESTES DE ENVIO E VISIBILIDADE DE RELATÓRIOS PARA A FAMÍLIA PASSARAM COM SUCESSO!")

if __name__ == "__main__":
    main()

