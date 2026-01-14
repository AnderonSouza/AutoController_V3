# Arquitetura Multi-Tenant - AutoController

## Roteamento por Subdomínio

### Como Funciona

Cada tenant (grupo econômico) pode ter seu próprio subdomínio:
- `viamar.autocontroller.com.br` → Grupo Viamar
- `faberge.autocontroller.com.br` → Grupo Faberge
- `console.autocontroller.com.br` → Console Admin (SUPER_ADMIN)

### Configuração DNS

Para habilitar subdomínios, configure um registro DNS wildcard:

```
Tipo: A ou CNAME
Nome: *.autocontroller.com.br
Valor: IP do servidor ou domínio do Replit
```

### Fluxo de Roteamento

1. Usuário acessa `viamar.autocontroller.com.br`
2. `getSubdomainFromUrl()` extrai "viamar"
3. `getTenantBySubdomain("viamar")` busca no banco
4. Sistema carrega dados e tema do Grupo Viamar
5. Usuário vê interface personalizada do tenant

### Configuração no Supabase

Execute o script `scripts/supabase_tenant_routing.sql` para:
- Criar coluna `subdomain` na tabela `organizacoes`
- Criar função RPC `get_tenant_by_subdomain`
- Configurar índice para busca rápida

### Desenvolvimento Local

Use parâmetro `?tenant=viamar` na URL:
```
http://localhost:5000?tenant=viamar
```

Ou configure no localStorage:
```javascript
localStorage.setItem("dev_tenant_subdomain", "viamar")
```

---

## Visão Geral

O AutoController utiliza uma arquitetura **Single Database, Shared Schema** com isolamento de dados por `grupo_economico_id`.

## Estrutura

```
┌─────────────────────────────────────────┐
│         SUPABASE DATABASE               │
├─────────────────────────────────────────┤
│  grupos_economicos (Tabela Raiz)        │
│  └── id (UUID)                          │
│  └── nome                               │
│  └── config_interface                   │
├─────────────────────────────────────────┤
│  Todas as outras tabelas:               │
│  └── grupo_economico_id (FK)            │
│  └── RLS habilitado                     │
└─────────────────────────────────────────┘
```

## Tabelas com Multi-Tenancy

| Tabela | Status |
|--------|--------|
| usuarios | Conforme |
| marcas | Conforme |
| empresas | Conforme |
| departamentos | Conforme |
| lancamentos_contabeis | Conforme |
| lancamentos_ajustes | Conforme |
| ciclos_fechamento | Conforme |
| chamados | Conforme |
| formulas_calculo | Conforme |
| modelos_relatorios | Conforme |
| linhas_relatorio | Conforme |
| notificacoes | Conforme |
| plano_contas | Conforme |
| temas_interface | Conforme |
| centros_resultado | Conforme |

## Funções Auxiliares

### `get_user_tenant_id()`
Retorna o `grupo_economico_id` do usuário autenticado.

### `is_admin_of_tenant(uuid)`
Verifica se o usuário é admin do tenant especificado.

## Políticas RLS

Cada tabela possui 4 políticas:
- `*_tenant_select`: Usuário vê apenas dados do seu tenant
- `*_tenant_insert`: Inserção validada por tenant
- `*_tenant_update`: Atualização validada por tenant
- `*_tenant_delete`: Apenas admins podem deletar

## Fluxo de Autenticação

1. Usuário faz login com Supabase Auth
2. Sistema busca perfil em `usuarios` por `auth.uid()`
3. `grupo_economico_id` é extraído e usado como `tenantId`
4. Todas as queries são automaticamente filtradas pelo RLS
