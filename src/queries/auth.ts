/**
 * src/server/queries/auth.ts
 * Server Functions de autenticação — PBKDF2 + Cookie HttpOnly + D1
 */
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { getDB, generateId } from "@/server/db";
import type { Role } from "@/server/types";

// ── Constantes ────────────────────────────────────────────────────────────────
const SESSION_COOKIE = "gizes_session";
const SESSION_DAYS   = 7;
const PBKDF2_ITER    = 100_000;

// ── Tipos exportados ──────────────────────────────────────────────────────────
export interface SessionUser {
  id:              string;
  email:           string;
  name:            string;
  role:            Role;
  avatar_initials: string | null;
}

// ── Utilitários de cripto (WebCrypto — compatível com Cloudflare Workers) ─────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Gera hash PBKDF2-SHA256 da senha com o salt fornecido. */
async function pbkdf2Hash(password: string, saltHex: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const hashBuf = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: hexToBytes(saltHex), iterations: PBKDF2_ITER, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return bytesToHex(hashBuf);
}

/** Gera salt aleatório de 32 bytes em hex. */
export function generateSalt(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return bytesToHex(buf.buffer);
}

// ── Helpers internos ──────────────────────────────────────────────────────────

function setCookieSession(sessionId: string, expiresAt: Date) {
  setCookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure:   true,
    sameSite: "strict",
    path:     "/",
    expires:  expiresAt,
  });
}

// ── Server Function: getSessionUser ───────────────────────────────────────────

/**
 * Lê o cookie de sessão e retorna o usuário autenticado (ou null).
 * Chamado no beforeLoad da rota raiz para injetar o usuário no contexto.
 */
export const getSessionUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionUser | null> => {
    try {
      const sessionId = getCookie(SESSION_COOKIE);
      if (!sessionId) return null;

      const db = getDB();
      const row = await db
        .prepare(
          `SELECT s.user_id, u.email, u.name, u.role, u.avatar_initials
           FROM auth_sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.id = ?1
             AND datetime(s.expires_at) > datetime('now')
             AND u.is_active = 1
           LIMIT 1`,
        )
        .bind(sessionId)
        .first<{
          user_id:         string;
          email:           string;
          name:            string;
          role:            string;
          avatar_initials: string | null;
        }>();

      if (!row) return null;

      return {
        id:              row.user_id,
        email:           row.email,
        name:            row.name,
        role:            row.role as Role,
        avatar_initials: row.avatar_initials,
      };
    } catch {
      return null;
    }
  },
);

// ── Server Function: loginUser ────────────────────────────────────────────────

const LoginInput = z.object({
  email:    z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

export const loginUser = createServerFn({ method: "POST" })
  .validator((d: unknown) => LoginInput.parse(d))
  .handler(async ({ data }) => {
    const db = getDB();

    const user = await db
      .prepare(
        `SELECT id, email, name, role, avatar_initials, password_hash, password_salt
         FROM users
         WHERE email = ?1 AND is_active = 1
         LIMIT 1`,
      )
      .bind(data.email.trim().toLowerCase())
      .first<{
        id: string; email: string; name: string; role: string;
        avatar_initials: string | null;
        password_hash: string; password_salt: string;
      }>();

    // Mensagem genérica para evitar enumeração de e-mails
    const invalidMsg = "E-mail ou senha inválidos.";

    if (!user) throw new Error(invalidMsg);

    // Verifica se o hash do password_salt está no formato esperado
    // (seed de dev usa PLACEHOLDER — permite bypass APENAS em dev local)
    let valid = false;
    if (user.password_salt === "PLACEHOLDER_SALT") {
      // Modo desenvolvimento: aceita qualquer senha se ainda usando placeholder
      valid = true;
      console.warn("[DEV] Usuário com hash placeholder — execute npm run db:setup para gerar hashes reais.");
    } else {
      const hash = await pbkdf2Hash(data.password, user.password_salt);
      valid = hash === user.password_hash;
    }

    if (!valid) throw new Error(invalidMsg);

    // Cria registro de sessão no D1
    const sessionId  = generateId();
    const expiresAt  = new Date(Date.now() + SESSION_DAYS * 86_400_000);

    await db
      .prepare(
        `INSERT INTO auth_sessions (id, user_id, expires_at) VALUES (?1, ?2, ?3)`,
      )
      .bind(sessionId, user.id, expiresAt.toISOString())
      .run();

    // Define o cookie HttpOnly
    setCookieSession(sessionId, expiresAt);

    return {
      id:              user.id,
      email:           user.email,
      name:            user.name,
      role:            user.role as Role,
      avatar_initials: user.avatar_initials,
    } satisfies SessionUser;
  });

// ── Server Function: logoutUser ───────────────────────────────────────────────

export const logoutUser = createServerFn({ method: "POST" }).handler(async () => {
  const sessionId = getCookie(SESSION_COOKIE);
  if (sessionId) {
    const db = getDB();
    await db
      .prepare(`DELETE FROM auth_sessions WHERE id = ?1`)
      .bind(sessionId)
      .run();
  }
  deleteCookie(SESSION_COOKIE, { path: "/" });
  return { ok: true };
});

// ── Utilitário exportado para scripts Node.js ─────────────────────────────────
// Usado pelo scripts/setup-db.mjs para gerar hashes no momento do seed.
export { pbkdf2Hash };
