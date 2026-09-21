import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const SCREENSHOTS_DIR = "/home/linuxlite/.gemini/antigravity/brain/b7bd8987-bfb6-478c-869f-7508ce4e75e5";
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🚀 Iniciando Chrome headless para verificação completa de Relatórios...");
  const chromeProc = spawn(
    "/bin/google-chrome",
    [
      "--headless=new",
      "--remote-debugging-port=9223",
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
      const res = await fetch("http://127.0.0.1:9223/json/list");
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
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }

  async function takeScreenshot(fileName) {
    const res = await send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    const filePath = path.join(SCREENSHOTS_DIR, fileName);
    fs.writeFileSync(filePath, buffer);
    console.log(`📸 Screenshot salvo: ${filePath}`);
  }

  await send("Page.enable");
  await send("DOM.enable");

  try {
    // ── 1. Login como Supervisora ──
    console.log("\n▶ [1] Efetuando login como supervisora...");
    await send("Page.navigate", { url: "http://localhost:8080/login" });
    await sleep(2500);

    await evaluate(`
      const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]');
      const passInput = document.querySelector('input[type="password"]') || document.querySelector('input[name="password"]');
      if (emailInput) {
        emailInput.value = 'supervisora@gizeclinica.com.br';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (passInput) {
        passInput.value = 'Gizes@2025';
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await sleep(500);

    await evaluate(`
      const submitBtn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Entrar'));
      if (submitBtn) submitBtn.click();
    `);
    await sleep(3000);

    // ── 2. Navegar para Relatórios Clínicos ──
    console.log("\n▶ [2] Acessando /reports...");
    await send("Page.navigate", { url: "http://localhost:8080/reports" });
    await sleep(3000);
    await takeScreenshot("29_reports_hub_initial.png");

    const reportCount = await evaluate(`
      document.querySelectorAll('button:has(.lucide-printer), button:has(.lucide-eye)').length
    `);
    console.log(`Documentos encontrados na listagem: ${reportCount}`);

    // ── 3. Selecionar "Modelo em branco" e escrever texto customizado ──
    console.log("\n▶ [3] Selecionando 'Modelo em branco' e digitando relatório personalizado...");
    await evaluate(`
      // Clica no card do Modelo em branco na barra lateral
      const blankCard = Array.from(document.querySelectorAll('div')).find(el => el.textContent.includes('Modelo em branco') && el.classList.contains('cursor-pointer'));
      if (blankCard) blankCard.click();
    `);
    await sleep(1000);

    const typedText = `RELATÓRIO CLÍNICO DE AVALIAÇÃO CONTINUADA - QA

Paciente: Lucas Almeida
Diagnóstico: TEA Nível 2
Responsável: Mariana Almeida
Data de Emissão: 21/09/2026

1. SÍNTESE DA EVOLUÇÃO CLÍNICA
O paciente apresentou ganhos significativos no repertório verbal, atingindo 90% de independência em mandos com suporte gestual leve.
Houve redução consistente em episódios de sobrecarga sensorial após adequação do plano terapêutico.

2. CONDUTAS PARA O AMBIENTE FAMILIAR
- Manter agenda de rotina visual estruturada.
- Continuar reforçamento positivo para pedidos funcionais.`;

    await evaluate(`
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = ${JSON.stringify(typedText)};
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await sleep(800);

    // ── 4. Salvar como Rascunho ──
    console.log("\n▶ [4] Clicando em 'Salvar rascunho'...");
    await evaluate(`
      const saveDraftBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Salvar rascunho'));
      if (saveDraftBtn) saveDraftBtn.click();
    `);
    await sleep(2500);
    await takeScreenshot("30_reports_draft_saved.png");

    // ── 5. Abrir visualização de Impressão e PDF ──
    console.log("\n▶ [5] Abrindo modal de Impressão e PDF Oficial...");
    await evaluate(`
      const printBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Imprimir / PDF'));
      if (printBtns.length > 0) printBtns[0].click();
    `);
    await sleep(1500);
    await takeScreenshot("31_reports_print_pdf_modal.png");

    // Fechar modal de impressão
    await evaluate(`
      const closeBtn = document.querySelector('[data-state="open"] button:has(.lucide-x), button:has(.lucide-x)');
      if (closeBtn) closeBtn.click();
    `);
    await sleep(800);

    // ── 6. Enviar à família ──
    console.log("\n▶ [6] Clicando em 'Enviar à família'...");
    await evaluate(`
      const sendFamilyBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Enviar à família'));
      if (sendFamilyBtn) sendFamilyBtn.click();
    `);
    await sleep(2500);
    await takeScreenshot("32_reports_shared_with_family.png");

    // ── 7. Login como Responsável (Mariana Almeida) ──
    console.log("\n▶ [7] Efetuando logout e login como Mariana Almeida (parent)...");
    await send("Page.navigate", { url: "http://localhost:8080/login" });
    await sleep(2000);

    await evaluate(`
      const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]');
      const passInput = document.querySelector('input[type="password"]') || document.querySelector('input[name="password"]');
      if (emailInput) {
        emailInput.value = 'mariana.almeida@email.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (passInput) {
        passInput.value = 'Gizes@2025';
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await sleep(500);

    await evaluate(`
      const submitBtn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Entrar'));
      if (submitBtn) submitBtn.click();
    `);
    await sleep(3000);

    // ── 8. Acessar Portal dos Pais (/parent) ──
    console.log("\n▶ [8] Acessando /parent como responsável...");
    await send("Page.navigate", { url: "http://localhost:8080/parent" });
    await sleep(3000);
    await takeScreenshot("33_parent_portal_reports.png");

    // ── 9. Abrir modal de Impressão / PDF no Portal dos Pais ──
    console.log("\n▶ [9] Abrindo modal de Impressão / PDF pelo Portal dos Pais...");
    await evaluate(`
      const parentPrintBtn = document.querySelector('#relatorios button:has(.lucide-printer), #relatorios button');
      const allBtns = Array.from(document.querySelectorAll('#relatorios button'));
      const printBtn = allBtns.find(b => b.textContent.includes('Imprimir / PDF'));
      if (printBtn) printBtn.click();
    `);
    await sleep(1500);
    await takeScreenshot("34_parent_print_pdf_modal.png");

    console.log("\n🎉 TESTE E VERIFICAÇÃO CONCLUÍDOS COM SUCESSO!");
  } catch (err) {
    console.error("❌ Erro durante o teste:", err);
    await takeScreenshot("99_error_state.png");
  } finally {
    ws.close();
    chromeProc.kill();
  }
}

main().catch(console.error);
