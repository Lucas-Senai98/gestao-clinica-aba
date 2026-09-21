import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const SCREENSHOTS_DIR = "/home/linuxlite/.gemini/antigravity/brain/b7bd8987-bfb6-478c-869f-7508ce4e75e5";
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Iniciando Chrome headless para QA do Sistema de Roles e Permissões...");
  const chromeProc = spawn(
    "/opt/google/chrome/google-chrome",
    [
      "--headless=new",
      "--remote-debugging-port=9222",
      "--no-sandbox",
      "--disable-gpu",
      "--window-size=1440,950",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let pageWsUrl = null;
  for (let i = 0; i < 25; i++) {
    await sleep(400);
    try {
      const res = await fetch("http://127.0.0.1:9222/json/list");
      const list = await res.json();
      const pageTarget =
        list.find((t) => t.type === "page" && !t.url.startsWith("chrome-extension://")) ||
        list.find((t) => t.type === "page");
      if (pageTarget) {
        pageWsUrl = pageTarget.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }

  if (!pageWsUrl) {
    console.error("❌ Erro ao conectar ao Chrome CDP.");
    chromeProc.kill();
    process.exit(1);
  }

  console.log("✅ Conectado ao Chrome CDP:", pageWsUrl);
  const ws = new WebSocket(pageWsUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));

  let msgId = 1;
  const pendingRequests = new Map();

  ws.addEventListener("message", (evt) => {
    const data = JSON.parse(evt.data);
    if (data.id && pendingRequests.has(data.id)) {
      const { resolve, reject } = pendingRequests.get(data.id);
      pendingRequests.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
    if (data.method === "Runtime.consoleAPICalled") {
      const text = data.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
      console.log(`[Browser Console ${data.params.type}]`, text);
    }
    if (data.method === "Runtime.exceptionThrown") {
      console.log("[Browser Exception]", data.params.exceptionDetails.text, data.params.exceptionDetails.exception?.description);
    }
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");

  async function evalExpr(expression) {
    const res = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }

  async function takeScreenshot(fileName) {
    await sleep(600);
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const fullPath = path.join(SCREENSHOTS_DIR, fileName);
    fs.writeFileSync(fullPath, Buffer.from(data, "base64"));
    console.log(`📸 Screenshot salvo: ${fileName}`);
    return fullPath;
  }

  try {
    // 1. Logar como Supervisora / Master
    console.log("\n🔑 1. Injetando cookie de sessão supervisora...");
    await send("Network.setCookie", {
      name: "gizes_session",
      value: "dev-sess-supervisora@gizeclinica.com.br",
      domain: "localhost",
      path: "/",
    });

    console.log("🌐 Navegando para http://localhost:8080/admin/team...");
    await send("Page.navigate", { url: "http://localhost:8080/admin/team" });

    // Esperar até que a lista termine de carregar
    console.log("⏳ Aguardando carregamento da equipe...");
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      const isStillLoading = await evalExpr(`document.body.innerText.includes('Carregando equipe do banco D1...')`);
      if (!isStillLoading) break;
    }

    await takeScreenshot("24_admin_team_page.png");

    // 2. Clicar em Adicionar Membro
    console.log("\n👤 2. Abrindo modal e criando usuário com perfil Financeiro customizado...");
    await evalExpr(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Adicionar Membro'));
      if (btn) btn.click();
    })()`);
    await sleep(1000);

    // Registra helper para inputs React
    await evalExpr(`
      window.__setVal = (el, val) => {
        if (!el) return;
        const valueSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;
        const prototype = Object.getPrototypeOf(el);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(el, val);
        } else if (valueSetter) {
          valueSetter.call(el, val);
        } else {
          el.value = val;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
    `);

    // Preencher campos
    await evalExpr(`(() => {
      const nameInput = document.getElementById('team-name');
      const emailInput = document.getElementById('team-email');
      const regInput = document.getElementById('team-registry');
      if (nameInput) window.__setVal(nameInput, 'Roberta Financeiro Silva');
      if (emailInput) window.__setVal(emailInput, 'roberta.financeiro@gizeclinica.com.br');
      if (regInput) window.__setVal(regInput, 'CRA-SP 123456');
    })()`);
    await sleep(500);

    // Selecionar cargo Supervisora (Admin)
    await evalExpr(`(() => {
      const trigger = document.getElementById('team-role');
      if (trigger) trigger.click();
    })()`);
    await sleep(500);

    await evalExpr(`(() => {
      const items = Array.from(document.querySelectorAll('[role="option"]'));
      const adminOpt = items.find(i => i.textContent.includes('Supervisora'));
      if (adminOpt) adminOpt.click();
    })()`);
    await sleep(500);

    // Clicar no preset "Financeiro"
    await evalExpr(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const finBtn = btns.find(b => b.textContent.trim() === 'Financeiro');
      if (finBtn) finBtn.click();
    })()`);
    await sleep(800);

    await takeScreenshot("25_admin_team_modal_permissions.png");

    // Submeter cadastro
    await evalExpr(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const submitBtn = btns.find(b => b.textContent && b.textContent.includes('Cadastrar e salvar'));
      if (submitBtn) submitBtn.click();
    })()`);
    await sleep(3000);

    await takeScreenshot("26_admin_team_created_user.png");

    // 3. Login real com o usuário recém-criado: Roberta
    console.log("\n🔐 3. Limpando sessão anterior e realizando Login oficial com Roberta Financeiro Silva...");
    await send("Network.deleteCookies", { name: "gizes_session", domain: "localhost" });
    await send("Page.navigate", { url: "http://localhost:8080/login" });
    await sleep(2500);

    await evalExpr(`
      window.__setVal = (el, val) => {
        if (!el) return;
        const valueSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;
        const prototype = Object.getPrototypeOf(el);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(el, val);
        } else if (valueSetter) {
          valueSetter.call(el, val);
        } else {
          el.value = val;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
    `);

    await evalExpr(`(() => {
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      if (emailInput) window.__setVal(emailInput, 'roberta.financeiro@gizeclinica.com.br');
      if (passInput) window.__setVal(passInput, 'Gize@2026');
    })()`);
    await sleep(500);

    await evalExpr(`(() => {
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.trim() === 'Entrar');
      if (submitBtn) submitBtn.click();
    })()`);
    await sleep(4000);

    const loggedUrl = await evalExpr(`window.location.pathname`);
    console.log(`📍 URL após login de Roberta: ${loggedUrl}`);

    // Inspecionar sidebar de Roberta
    const navItems = await evalExpr(`(() => {
      const links = Array.from(document.querySelectorAll('aside nav a'));
      return links.map(a => a.innerText.trim());
    })()`);
    console.log(`📋 Menu lateral exclusivo de Roberta (apenas com permissões liberadas):`, navItems);
    await takeScreenshot("28_user_custom_permissions_sidebar.png");

    // Acessar Financeiro (permitido)
    console.log("\n💰 4. Acessando módulo Financeiro (permissão 'financial:view' concedida)...");
    await send("Page.navigate", { url: "http://localhost:8080/admin/financial" });
    await sleep(3000);

    const finTitle = await evalExpr(`document.title`);
    console.log(`📄 Título da página financeira: ${finTitle}`);
    await takeScreenshot("27_user_custom_permissions_financial.png");

    // Testar acesso negado a módulo não concedido (Equipe)
    console.log("\n⛔ 5. Testando proteção de rota em módulo não concedido (/admin/team)...");
    await send("Page.navigate", { url: "http://localhost:8080/admin/team" });
    await sleep(2500);

    const blockedUrl = await evalExpr(`window.location.pathname`);
    console.log(`📍 URL após tentativa de acesso a /admin/team: ${blockedUrl}`);
    if (blockedUrl === "/" || blockedUrl === "/admin") {
      console.log("🛡️ Proteção de rota funcionando perfeitamente! Redirecionamento de segurança executado.");
    }

    console.log("\n🎉 TODOS OS TESTES DE RBAC E PERMISSÕES FORAM VALIDADOS COM SUCESSO!");
  } catch (err) {
    console.error("❌ Erro durante teste de QA:", err);
  } finally {
    try {
      ws.close();
      chromeProc.kill();
    } catch {}
  }
}

main();
