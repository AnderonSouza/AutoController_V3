# Guia de Segurança - AutoController

## Credenciais do Supabase

### Variáveis de Ambiente (Recomendado)

Nunca commite credenciais no código. Use variáveis de ambiente:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
```

### Entendendo as Chaves

| Chave | Uso | Segurança |
|-------|-----|-----------|
| `anon key` | Operações públicas | Pode ser exposta (RLS protege) |
| `service_role key` | Operações admin | NUNCA expor no frontend |

### Row Level Security (RLS)

A verdadeira proteção vem do RLS:

```sql
-- Usuário só vê dados do seu tenant
CREATE POLICY tenant_select ON tabela
    FOR SELECT USING (grupo_economico_id = get_user_tenant_id());
```

## Boas Práticas

1. **Nunca** use `service_role_key` no frontend
2. **Sempre** habilite RLS em tabelas sensíveis
3. **Valide** inputs no backend/RLS
4. **Use** HTTPS em produção
5. **Rotacione** credenciais periodicamente
```

```.env.example file=".env.example"
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui

# NUNCA exponha a service_role_key no frontend!
# SUPABASE_SERVICE_ROLE_KEY=use-apenas-no-backend

# Redirect URL para desenvolvimento (usado no signUp)
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
