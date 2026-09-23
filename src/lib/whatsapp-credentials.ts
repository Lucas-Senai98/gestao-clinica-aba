/**
 * src/lib/whatsapp-credentials.ts
 *
 * Utilitário para geração de mensagens padronizadas e redirecionamento direto
 * para o WhatsApp Web com credenciais de acesso do Portal da Família.
 */

/**
 * Obtém a URL/Domínio de acesso do Portal dos Pais.
 * Suporta configuração prévia pelo menu Master (via localStorage ou window)
 * e possui fallback dinâmico para a origem atual da aplicação.
 */
export function getParentPortalUrl(): string {
  if (typeof window !== "undefined") {
    // 1. Verifica se há domínio configurado pelo Usuário Master
    const customDomain = localStorage.getItem("gizes_parent_portal_domain");
    if (customDomain && customDomain.trim()) {
      let domain = customDomain.trim();
      if (!domain.startsWith("http://") && !domain.startsWith("https://")) {
        domain = `https://${domain}`;
      }
      return domain.endsWith("/") ? `${domain}login` : `${domain}/login`;
    }

    // 2. Fallback padrão: URL atual da aplicação
    return `${window.location.origin}/login`;
  }
  return "https://gizeclinica.com.br/login";
}

/**
 * Higieniza número de telefone para o padrão internacional do WhatsApp.
 * Adiciona o código do Brasil (+55) caso não informado.
 */
export function sanitizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  // Se já começar com DDI 55 e tiver 12 ou 13 dígitos
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  // DDD + Número celular/fixo (10 ou 11 dígitos no Brasil)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

export interface GuardianCredentialsParams {
  guardianName: string;
  patientName: string;
  guardianEmail: string;
  guardianPhone?: string;
  password?: string;
  isPasswordReset?: boolean;
}

/**
 * Formata o texto afetuoso e formal com as credenciais de acesso.
 */
export function formatGuardianCredentialsText({
  guardianName,
  patientName,
  guardianEmail,
  password,
  isPasswordReset = false,
}: GuardianCredentialsParams): string {
  const portalUrl = getParentPortalUrl();
  const firstName = guardianName.split(" ")[0];

  if (isPasswordReset) {
    return (
`Olá, ${firstName}! 👋

Sua senha de acesso ao *Portal GiZé's ABA* do(a) paciente *${patientName}* foi redefinida com sucesso.

🌐 *Link de Acesso:* ${portalUrl}
📧 *Seu E-mail:* ${guardianEmail}
🔑 *Nova Senha:* ${password || "Definida pela clínica"}

Recomendamos que você altere sua senha no primeiro acesso para sua total segurança.
Qualquer dúvida, nossa equipe está à disposição! 💜
_Equipe Clínica GiZé's ABA_`
    );
  }

  return (
`Olá, ${firstName}! 👋

O acesso da sua família ao *Portal GiZé's ABA* do(a) paciente *${patientName}* está liberado!
Agora você pode acompanhar as devolutivas diárias das sessões, quadro de avisos e relatórios clínicos emitidos pela nossa equipe.

🌐 *Link de Acesso:* ${portalUrl}
📧 *Seu E-mail de Login:* ${guardianEmail}
🔑 *Sua Senha Inicial:* ${password || "Solicite à clínica"}

Recomendamos que você altere sua senha no primeiro acesso.
Qualquer dúvida, estamos à disposição! 💜
_Equipe Clínica GiZé's ABA_`
  );
}

/**
 * Gera a URL para redirecionamento direto ao WhatsApp Web.
 */
export function buildWhatsAppWebUrl(params: GuardianCredentialsParams): string {
  const cleanPhone = sanitizeWhatsAppPhone(params.guardianPhone || "");
  const text = formatGuardianCredentialsText(params);
  const encodedText = encodeURIComponent(text);

  if (cleanPhone) {
    return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
  }

  // Fallback caso não haja telefone: abre o WhatsApp Web permitindo escolher o contato
  return `https://web.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Dispara a abertura do WhatsApp Web em uma nova guia do navegador.
 */
export function openWhatsAppWeb(params: GuardianCredentialsParams): void {
  const url = buildWhatsAppWebUrl(params);
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

