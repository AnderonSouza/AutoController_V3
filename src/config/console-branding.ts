/**
 * CONFIGURAÇÃO DE BRANDING DO CONSOLE ADMINISTRATIVO
 *
 * Edite este arquivo para personalizar a aparência do console.autocontroller.ai
 * Todas as alterações visuais da tela de login e dashboard admin estão centralizadas aqui.
 */

export const consoleBranding = {
  // ============================================
  // INFORMAÇÕES DA EMPRESA
  // ============================================
  company: {
    name: "AutoController",
    domain: "autocontroller.ai",
    tagline: "Plataforma de Gestão Financeira Inteligente",
    copyright: `© ${new Date().getFullYear()} AutoController. Todos os direitos reservados.`,
  },

  // ============================================
  // LOGOS
  // ============================================
  logos: {
    // Logo principal (usada no login e dashboard)
    primary: "/images/autocontroller-logo.png",
    // Logo branca (para fundos escuros) - pode ser a mesma se já for adequada
    white: "/images/autocontroller-logo.png",
    // Favicon
    favicon: "/favicon.ico",
    // Tamanhos recomendados
    sizes: {
      login: { width: 80, height: 80 },
      sidebar: { width: 40, height: 40 },
      header: { width: 32, height: 32 },
    },
  },

  // ============================================
  // CORES DO CONSOLE
  // ============================================
  colors: {
    // Cor primária (baseada na logo - azul escuro)
    primary: "#1e3a5f",
    primaryHover: "#2d4a6f",
    primaryLight: "#3b5a7f",

    // Cor secundária (cyan da logo)
    secondary: "#0891b2",
    secondaryHover: "#0e7490",
    secondaryLight: "#22d3ee",

    // Cor de destaque/accent
    accent: "#06b6d4",
    accentHover: "#0891b2",

    // Cores de fundo
    background: {
      primary: "#f8fafc",
      secondary: "#ffffff",
      dark: "#0f172a",
      gradient: "linear-gradient(135deg, #1e3a5f 0%, #0891b2 50%, #06b6d4 100%)",
    },

    // Cores de texto
    text: {
      primary: "#1e293b",
      secondary: "#64748b",
      muted: "#94a3b8",
      inverse: "#ffffff",
    },

    // Cores de status
    status: {
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3b82f6",
    },

    // Cores para cards de organizações (geradas automaticamente se não definidas)
    orgCards: [
      "#1e3a5f", // Azul escuro
      "#0891b2", // Cyan
      "#7c3aed", // Violeta
      "#059669", // Verde
      "#dc2626", // Vermelho
      "#ea580c", // Laranja
      "#4f46e5", // Indigo
      "#0d9488", // Teal
    ],
  },

  // ============================================
  // TELA DE LOGIN
  // ============================================
  login: {
    // Título principal
    title: "Console Administrativo",
    subtitle: "Gerencie suas organizações e usuários",

    // Texto do formulário
    form: {
      heading: "Acesso Restrito",
      description: "Entre com suas credenciais de administrador",
      emailLabel: "E-mail corporativo",
      emailPlaceholder: "seu.email@empresa.com",
      passwordLabel: "Senha",
      passwordPlaceholder: "••••••••",
      submitButton: "Entrar no Console",
      forgotPassword: "Esqueceu sua senha?",
      rememberMe: "Manter conectado",
    },

    // Painel lateral esquerdo
    sidePanel: {
      // Se true, mostra o painel lateral com branding
      enabled: true,
      // Estilo do fundo: "gradient" | "solid" | "image"
      backgroundStyle: "gradient" as const,
      // Se backgroundStyle = "image", use esta URL
      backgroundImage: "",
      // Itens de destaque/features
      features: [
        {
          icon: "Building2",
          title: "Multi-Tenant",
          description: "Gerencie múltiplas organizações em uma única plataforma",
        },
        {
          icon: "Users",
          title: "Controle de Acesso",
          description: "Defina permissões granulares para cada usuário",
        },
        {
          icon: "Palette",
          title: "White Label",
          description: "Personalize a identidade visual de cada organização",
        },
        {
          icon: "Shield",
          title: "Segurança",
          description: "Dados protegidos com criptografia de ponta a ponta",
        },
      ],
    },

    // Mensagens de erro personalizadas
    errors: {
      invalidCredentials: "E-mail ou senha incorretos",
      userNotFound: "Usuário não encontrado",
      accessDenied: "Acesso negado. Apenas administradores podem acessar o console.",
      networkError: "Erro de conexão. Tente novamente.",
    },
  },

  // ============================================
  // DASHBOARD
  // ============================================
  dashboard: {
    // Mensagem de boas-vindas
    welcomeMessage: "Bem-vindo ao Console",

    // Textos das seções
    sections: {
      organizations: "Organizações",
      newOrganization: "Nova Organização",
      statistics: "Visão Geral",
      recentActivity: "Atividade Recente",
    },

    // Labels das estatísticas
    stats: {
      totalOrgs: "Organizações",
      totalUsers: "Usuários",
      totalCompanies: "Empresas",
      activeOrgs: "Orgs Ativas",
    },
  },

  // ============================================
  // SIDEBAR DO CONSOLE
  // ============================================
  sidebar: {
    // Itens do menu
    menuItems: [
      { id: "home", label: "Início", icon: "Home" },
      { id: "organizations", label: "Organizações", icon: "Building2" },
      { id: "users", label: "Usuários", icon: "Users" },
      { id: "settings", label: "Configurações", icon: "Settings" },
      { id: "logs", label: "Logs", icon: "FileText" },
    ],
    // Largura do sidebar (colapsado/expandido)
    width: {
      collapsed: 64,
      expanded: 240,
    },
  },

  // ============================================
  // TIPOGRAFIA
  // ============================================
  typography: {
    // Fonte principal
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    // Tamanhos
    sizes: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
    },
  },

  // ============================================
  // ANIMAÇÕES
  // ============================================
  animations: {
    // Habilitar animações
    enabled: true,
    // Duração padrão
    duration: "200ms",
    // Easing padrão
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
}

// Tipo exportado para type-safety
export type ConsoleBranding = typeof consoleBranding
