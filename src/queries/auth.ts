/**
 * src/server/queries/auth.ts
 * Server Functions de autenticação — PBKDF2 + Cookie HttpOnly + D1 + Fallback Dev
 */
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { getDB, generateId } from "@/db/db";
import type { Role } from "@/db/types";

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

export interface DevUserCredential {
  user: SessionUser;
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
}

// ── Utilitários de cripto (WebCrypto — compatível com Cloudflare Workers) ─────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(u8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Gera hash PBKDF2-SHA256 da senha com o salt fornecido. */
export async function pbkdf2Hash(password: string, saltHex: string): Promise<string> {
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

// ── Store de Usuários e Sessões de Desenvolvimento em Memória ─────────

const DEV_CREDENTIALS: Record<string, DevUserCredential> = {
  "supervisora@gizeclinica.com.br": {
    user: {
      id: "u-admin-01",
      email: "supervisora@gizeclinica.com.br",
      name: "Marina Duarte",
      role: "admin",
      avatar_initials: "MD",
    },
    password: "Gizes@2025",
  },
  "ana.lopes@gizeclinica.com.br": {
    user: {
      id: "u-therapist-01",
      email: "ana.lopes@gizeclinica.com.br",
      name: "Ana Beatriz Lopes",
      role: "therapist",
      avatar_initials: "AB",
    },
    password: "Gizes@2025",
  },
  "carla.mendes@gizeclinica.com.br": {
    user: {
      id: "u-therapist-02",
      email: "carla.mendes@gizeclinica.com.br",
      name: "Carla Mendes",
      role: "therapist",
      avatar_initials: "CM",
    },
    password: "Gizes@2025",
  },
  "diego.ramos@gizeclinica.com.br": {
    user: {
      id: "u-therapist-03",
      email: "diego.ramos@gizeclinica.com.br",
      name: "Diego Ramos",
      role: "therapist",
      avatar_initials: "DR",
    },
    password: "Gizes@2025",
  },
  "fernanda.souza@gizeclinica.com.br": {
    user: {
      id: "u-therapist-04",
      email: "fernanda.souza@gizeclinica.com.br",
      name: "Fernanda Souza",
      role: "therapist",
      avatar_initials: "FS",
    },
    password: "Gizes@2025",
  },
  "mariana.almeida@email.com": {
    user: {
      id: "u-parent-01",
      email: "mariana.almeida@email.com",
      name: "Mariana Almeida",
      role: "parent",
      avatar_initials: "MA",
    },
    password: "Gizes@2025",
  },
  "rafael.pereira@email.com": {
    user: {
      id: "u-parent-02",
      email: "rafael.pereira@email.com",
      name: "Rafael Pereira",
      role: "parent",
      avatar_initials: "RP",
    },
    password: "Gizes@2025",
  },
};

const DEV_SESSIONS: Record<string, SessionUser> = {};

export function registerDevUser(
  user: SessionUser,
  password?: string,
  passwordHash?: string,
  passwordSalt?: string,
) {
  const emailKey = user.email.trim().toLowerCase();
  DEV_CREDENTIALS[emailKey] = {
    user,
    password,
    passwordHash,
    passwordSalt,
  };
}

// ── Server Function: getSessionUser ───────────────────────────────────────────

export const getSessionUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionUser | null> => {
    try {
      const sessionId = getCookie(SESSION_COOKIE);
      if (!sessionId) return null;

      // 1. Verifica no mapa de sessões em memória
      if (DEV_SESSIONS[sessionId]) {
        return DEV_SESSIONS[sessionId];
      }

      if (sessionId.startsWith("dev-sess-")) {
        const email = sessionId.replace("dev-sess-", "");
        if (DEV_CREDENTIALS[email]) return DEV_CREDENTIALS[email].user;
      }

      // 2. Consulta no D1
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

      if (row) {
        return {
          id:              row.user_id,
          email:           row.email,
          name:            row.name,
          role:            row.role as Role,
          avatar_initials: row.avatar_initials,
        };
      }

      return null;
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
    const cleanEmail = data.email.trim().toLowerCase();
    const db = getDB();

    let user: (SessionUser & { password_hash?: string; password_salt?: string }) | null = null;
    try {
      const row = await db
        .prepare(
          `SELECT id, email, name, role, avatar_initials, password_hash, password_salt
           FROM users
           WHERE email = ?1 AND is_active = 1
           LIMIT 1`,
        )
        .bind(cleanEmail)
        .first<{
          id: string; email: string; name: string; role: string;
          avatar_initials: string | null;
          password_hash: string; password_salt: string;
        }>();

      if (row) {
        user = {
          id:              row.id,
          email:           row.email,
          name:            row.name,
          role:            row.role as Role,
          avatar_initials: row.avatar_initials,
          password_hash:   row.password_hash,
          password_salt:   row.password_salt,
        };
      }
    } catch {
      // Ignora se D1 for mock
    }

    const invalidMsg = "E-mail ou senha inválidos.";
    let valid = false;

    if (user && user.password_salt && user.password_hash) {
      if (user.password_salt === "PLACEHOLDER_SALT" || user.password_salt.startsWith("dev_")) {
        valid = true;
      } else {
        const hash = await pbkdf2Hash(data.password, user.password_salt);
        valid = hash === user.password_hash;
      }
    }

    if (!valid) {
      const devCred = DEV_CREDENTIALS[cleanEmail];
      if (devCred) {
        if (devCred.password && devCred.password === data.password) {
          valid = true;
        } else if (devCred.passwordHash && devCred.passwordSalt) {
          const hash = await pbkdf2Hash(data.password, devCred.passwordSalt);
          valid = hash === devCred.passwordHash;
        } else if (!devCred.password && !devCred.passwordHash) {
          valid = true;
        }

        if (valid) {
          user = devCred.user;
        }
      }
    }

    if (!user || !valid) {
      throw new Error(invalidMsg);
    }

    // Cria a sessão e salva no D1 e no DEV_SESSIONS
    const sessionId = `sess-${generateId()}`;
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

    const sessionUser: SessionUser = {
      id:              user.id,
      email:           user.email,
      name:            user.name,
      role:            user.role as Role,
      avatar_initials: user.avatar_initials,
    };

    DEV_SESSIONS[sessionId] = sessionUser;
    DEV_SESSIONS[`dev-sess-${cleanEmail}`] = sessionUser;

    try {
      await db
        .prepare(
          `INSERT INTO auth_sessions (id, user_id, expires_at) VALUES (?1, ?2, ?3)`,
        )
        .bind(sessionId, user.id, expiresAt.toISOString())
        .run();
    } catch {
      // Ignora erro de inserção de sessão se a tabela D1 não estiver pronta
    }

    setCookieSession(sessionId, expiresAt);

    return sessionUser;
  });

// ── Server Function: logoutUser ───────────────────────────────────────────────

export const logoutUser = createServerFn({ method: "POST" }).handler(async () => {
  const sessionId = getCookie(SESSION_COOKIE);
  if (sessionId) {
    if (DEV_SESSIONS[sessionId]) {
      delete DEV_SESSIONS[sessionId];
    }
    try {
      const db = getDB();
      await db.prepare(`DELETE FROM auth_sessions WHERE id = ?1`).bind(sessionId).run();
    } catch {
      // Ignora se D1 não acessível
    }
  }

  deleteCookie(SESSION_COOKIE, { path: "/" });
  return { success: true };
});
