#!/usr/bin/env node
/**
 * scripts/setup-db.mjs
 *
 * Configuração completa do banco D1 para desenvolvimento local.
 *
 * PASSO A PASSO:
 *   1. npm install
 *   2. npx wrangler login       (autenticar no Cloudflare)
 *   3. node scripts/setup-db.mjs
 *
 * O script irá:
 *   a) Criar o banco D1 no Cloudflare (se ainda não existir)
 *   b) Atualizar o database_id no wrangler.jsonc automaticamente
 *   c) Aplicar o schema no banco LOCAL (miniflare)
 *   d) Inserir os usuários de seed com hashes PBKDF2 reais
 *   e) Inserir os demais dados de seed (pacientes, vínculos, etc.)
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { webcrypto } from "crypto"; // disponível no Node.js 16+

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── Configuração ──────────────────────────────────────────────────────────────
const DB_NAME      = "gestao-clinica-gizes";
const DEV_PASSWORD = "Gizes@2025"; // senha padrão para TODOS os usuários de dev
const PBKDF2_ITER  = 100_000;

// ── Utilitários ───────────────────────────────────────────────────────────────

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  return execSync(cmd, { cwd: root, stdio: "pipe" }).toString().trim();
}
function runInteractive(cmd) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

function bytesToHex(buf) {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

async function generateSalt() {
  const bytes = new Uint8Array(32);
  webcrypto.getRandomValues(bytes);
  return bytesToHex(bytes.buffer);
}

async function pbkdf2Hash(password, saltHex) {
  const key = await webcrypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), { name: "PBKDF2" }, false, ["deriveBits"]
  );
  const hashBuf = await webcrypto.subtle.deriveBits(
    { name: "PBKDF2", salt: hexToBytes(saltHex), iterations: PBKDF2_ITER, hash: "SHA-256" },
    key, 256
  );
  return bytesToHex(hashBuf);
}

// ── Usuários de seed ──────────────────────────────────────────────────────────

const seedUsers = [
  { id: "u-admin-01",     email: "supervisora@gizeclinica.com.br", name: "Marina Duarte",     role: "admin",     registry: "CRP 06/77889",    avatar: "MD" },
  { id: "u-therapist-01", email: "ana.lopes@gizeclinica.com.br",  name: "Ana Beatriz Lopes", role: "therapist", registry: "CRP 06/12345",    avatar: "AB" },
  { id: "u-therapist-02", email: "carla.mendes@gizeclinica.com.br",name: "Carla Mendes",      role: "therapist", registry: "CRFa 2-98765",    avatar: "CM" },
  { id: "u-therapist-03", email: "diego.ramos@gizeclinica.com.br", name: "Diego Ramos",       role: "therapist", registry: "CRP 06/54321",    avatar: "DR" },
  { id: "u-therapist-04", email: "fernanda.souza@gizeclinica.com.br",name:"Fernanda Souza",   role: "therapist", registry: "CREFITO 3/11223", avatar: "FS" },
  { id: "u-parent-01",    email: "mariana.almeida@email.com",      name: "Mariana Almeida",   role: "parent",    registry: null,              avatar: "MA" },
  { id: "u-parent-02",    email: "rafael.pereira@email.com",       name: "Rafael Pereira",    role: "parent",    registry: null,              avatar: "RP" },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Tenta criar o banco D1
  console.log(`\n🗄️  Criando banco D1 '${DB_NAME}'...`);
  let createOutput = "";
  try {
    createOutput = run(`npx wrangler d1 create ${DB_NAME}`);
  } catch (e) {
    const errStr = e.stderr?.toString() || e.message || "";
    if (errStr.includes("already exists") || errStr.includes("already")) {
      console.log("⚠️  Banco já existe, continuando...");
      createOutput = run("npx wrangler d1 list");
    } else {
      throw e;
    }
  }

  // 2. Extrai e atualiza o database_id
  const idMatch = createOutput.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  if (idMatch) {
    const databaseId = idMatch[0];
    console.log(`✅ Database ID: ${databaseId}`);
    const wranglerPath = resolve(root, "wrangler.jsonc");
    let wc = readFileSync(wranglerPath, "utf-8");
    wc = wc.replace("SUBSTITUIR_APOS_CRIAR_O_BANCO_D1", databaseId);
    writeFileSync(wranglerPath, wc);
    console.log("✅ wrangler.jsonc atualizado!");
  } else {
    console.log("⚠️  Não foi possível extrair o database_id automaticamente.");
    console.log("   Copie o ID do output acima e cole no wrangler.jsonc → database_id.");
  }

  // 3. Aplica schema no banco local
  console.log("\n📋 Aplicando schema no banco LOCAL...");
  runInteractive(`npx wrangler d1 execute ${DB_NAME} --local --file=migrations/0000_init.sql`);
  console.log("✅ Schema aplicado!");

  // 4. Gera hashes PBKDF2 reais e insere usuários
  console.log(`\n🔐 Gerando hashes PBKDF2 para ${seedUsers.length} usuários...`);
  const insertStatements = [];

  for (const u of seedUsers) {
    const salt = await generateSalt();
    const hash = await pbkdf2Hash(DEV_PASSWORD, salt);
    const registry = u.registry ? `'${u.registry}'` : "NULL";
    insertStatements.push(
      `INSERT OR IGNORE INTO users (id, email, name, role, password_hash, password_salt, registry, avatar_initials) VALUES ('${u.id}','${u.email}','${u.name}','${u.role}','${hash}','${salt}',${registry},'${u.avatar}');`
    );
    console.log(`  ✓ ${u.name} (${u.role})`);
  }

  // Cria arquivo SQL temporário com os inserts reais
  const tempSqlPath = resolve(root, "migrations", "_temp_users_hashed.sql");
  writeFileSync(tempSqlPath, insertStatements.join("\n") + "\n");
  runInteractive(`npx wrangler d1 execute ${DB_NAME} --local --file=migrations/_temp_users_hashed.sql`);
  // Remove arquivo temporário
  execSync(`rm "${tempSqlPath}"`);
  console.log("✅ Usuários inseridos com hashes reais!");

  // 5. Aplica o restante do seed (pacientes, vínculos, repertório etc.)
  console.log("\n🌱 Aplicando seed de desenvolvimento...");
  runInteractive(`npx wrangler d1 execute ${DB_NAME} --local --file=migrations/0001_seed_dev.sql`);
  console.log("✅ Seed aplicado!");

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Banco configurado com sucesso!");
  console.log("");
  console.log(`📧  Usuários de teste:`);
  console.log(`    supervisora@gizeclinica.com.br  (admin)`);
  console.log(`    ana.lopes@gizeclinica.com.br    (therapist)`);
  console.log(`    mariana.almeida@email.com        (parent)`);
  console.log(`🔑  Senha de todos: ${DEV_PASSWORD}`);
  console.log("");
  console.log("▶  npm run dev  → iniciar o servidor de desenvolvimento");
  console.log("=".repeat(60) + "\n");
}

main().catch((err) => {
  console.error("\n❌ Erro no setup:", err.message);
  process.exit(1);
});
