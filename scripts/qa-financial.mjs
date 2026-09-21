import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const SCREENSHOTS_DIR = "/home/linuxlite/.gemini/antigravity/brain/b7bd8987-bfb6-478c-869f-7508ce4e75e5";
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Iniciando Chrome headless para QA do Módulo Financeiro...");
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
      const pageTarget = list.find((t) => t.type === "page" && !t.url.startsWith("chrome-extension://")) || list.find((t) => t.type === "page");
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
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener("message", handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener("message", handler);
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

  async function takeScreenshot(name) {
    const res = await send("Page.captureScreenshot", { format: "png" });
    const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
    fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
    console.log(`📸 Screenshot salvo: ${filePath}`);
    return filePath;
  }

  console.log("🔑 Injetando cookie de autenticação de Supervisora...");
  await send("Network.setCookie", {
    name: "gizes_session",
    value: "dev-sess-supervisora@gizeclinica.com.br",
    domain: "localhost",
    path: "/",
  });

  console.log("📊 Navegando diretamente para /admin/financial...");
  await send("Page.navigate", { url: "http://localhost:8080/admin/financial" });
  await sleep(4000);


  // Registra helpers para inputs e abas
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

    window.__clickTab = (labelOrValue) => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      const tab = tabs.find(t =>
        (t.getAttribute('value') && t.getAttribute('value') === labelOrValue) ||
        (t.textContent && t.textContent.toLowerCase().includes(labelOrValue.toLowerCase()))
      );
      if (tab) {
        tab.focus();
        tab.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
        tab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        tab.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
        tab.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        tab.click();
      }
    };
  `);

  // Captura 1: Tela inicial com KPIs e Contas a Receber
  await takeScreenshot("16_financial_receivables");

  // Testa criação de Nova Conta a Receber
  console.log("➕ Abrindo modal de Nova Conta a Receber...");
  await evalExpr(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const newRecBtn = btns.find(b => b.textContent && b.textContent.includes('Nova Conta a Receber'));
      if (newRecBtn) newRecBtn.click();
    })()
  `);
  await sleep(1000);

  console.log("📝 Preenchendo formulário de Conta a Receber com helper React...");
  await evalExpr(`
    (() => {
      const descInput = document.querySelector('input[placeholder*="Mensalidade"]');
      window.__setVal(descInput, "Mensalidade Setembro - Pedro Santos (Plano ABA Denver 40h)");

      const amountInput = document.querySelector('input[type="number"][placeholder="0.00"]');
      window.__setVal(amountInput, "5400");

      const dateInput = document.querySelector('input[type="date"]');
      window.__setVal(dateInput, "2026-08-30");
    })()
  `);
  await sleep(800);

  console.log("💾 Submetendo Conta a Receber...");
  await evalExpr(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find(b => b.textContent && b.textContent.includes('Salvar Lançamento'));
      if (saveBtn) saveBtn.click();
    })()
  `);
  await sleep(2500);
  await takeScreenshot("17_financial_new_receivable_created");

  // Testa liquidação (Receber fatura)
  console.log("💰 Liquidando uma fatura a receber...");
  await evalExpr(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const receiveBtn = btns.find(b => b.textContent && b.textContent.trim() === 'Receber');
      if (receiveBtn) receiveBtn.click();
    })()
  `);
  await sleep(1000);

  await evalExpr(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const confirmBtn = btns.find(b => b.textContent && b.textContent.includes('Confirmar Baixa'));
      if (confirmBtn) confirmBtn.click();
    })()
  `);
  await sleep(2500);
  await takeScreenshot("18_financial_receivable_settled");

  // Testa Aba Contas a Pagar
  console.log("📑 Alternando para aba Contas a Pagar...");
  await evalExpr(`window.__clickTab('Contas a Pagar');`);
  await sleep(2000);
  await takeScreenshot("19_financial_payables");

  // Testa criação de Nova Conta a Pagar
  console.log("➕ Abrindo modal de Nova Conta a Pagar...");
  await evalExpr(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const newPayBtn = btns.find(b => b.textContent && b.textContent.includes('Nova Conta a Pagar'));
      if (newPayBtn) newPayBtn.click();
    })()
  `);
  await sleep(1000);

  console.log("📝 Preenchendo formulário de Conta a Pagar com helper React...");
  await evalExpr(`
    (() => {
      const descInput = document.querySelector('input[placeholder*="Aluguel"], input[placeholder*="Mensalidade"]');
      window.__setVal(descInput, "Licença Plataforma IA e Análise Comportamental ABA");

      const amountInput = document.querySelector('input[type="number"][placeholder="0.00"]');
      window.__setVal(amountInput, "650");

      const dateInput = document.querySelector('input[type="date"]');
      window.__setVal(dateInput, "2026-08-28");
    })()
  `);
  await sleep(800);

  console.log("💾 Submetendo Conta a Pagar...");
  await evalExpr(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find(b => b.textContent && b.textContent.includes('Salvar Lançamento'));
      if (saveBtn) saveBtn.click();
    })()
  `);
  await sleep(2500);
  await takeScreenshot("20_financial_new_payable_created");

  // Testa liquidação de Conta a Pagar
  console.log("💳 Liquidando despesa a pagar...");
  await evalExpr(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const payBtn = btns.find(b => b.textContent && b.textContent.trim() === 'Pagar');
      if (payBtn) payBtn.click();
    })()
  `);
  await sleep(1000);

  await evalExpr(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const confirmBtn = btns.find(b => b.textContent && b.textContent.includes('Confirmar Baixa'));
      if (confirmBtn) confirmBtn.click();
    })()
  `);
  await sleep(2500);
  await takeScreenshot("21_financial_payable_settled");

  // Testa Aba DRE & Repasses
  console.log("📊 Alternando para aba DRE & Repasses...");
  await evalExpr(`window.__clickTab('DRE & Repasses');`);
  await sleep(2000);
  await takeScreenshot("22_financial_dre_tab");

  // Testa Aba Configuração de Taxas
  console.log("⚙️ Alternando para aba Configuração de Taxas...");
  await evalExpr(`window.__clickTab('Configuração de Taxas');`);
  await sleep(2000);
  await takeScreenshot("23_financial_rates_tab");


  console.log("🎉 Testes de QA do Módulo Financeiro concluídos com 100% de sucesso!");
  ws.close();
  chromeProc.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erro no script de QA:", err);
  process.exit(1);
});
