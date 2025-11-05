# 🔍 VERIFICAR LOGS DA EDGE FUNCTION

## ❗ IMPORTANTE: Preciso ver os logs!

O erro continua sendo "Unauthorized". O token está sendo enviado, mas a autenticação está falhando.

**Por favor, verifique os logs da Edge Function:**

1. Acesse: https://supabase.com/dashboard/project/thhdxxotwzfwdqjgxjiw/functions/create-order
2. Clique na aba **"Logs"** (não "Editor")
3. Faça um pedido de teste
4. **IMEDIATAMENTE** volte para os logs
5. Copie e me envie **TUDO** que aparecer nos logs

Os logs devem mostrar:
- `=== EDGE FUNCTION CHAMADA ===`
- `Authorization header: Presente`
- `Token (primeiros 20 chars): ...`
- `Chamando supabase.auth.getUser()...`
- `Error: ...` (o erro específico)

**Sem ver os logs, não consigo identificar o problema exato!**

---

## 🔧 Solução Temporária

Também atualizei o código para tentar usar `SUPABASE_ANON_KEY` para validar o token (se disponível), o que pode resolver o problema.

Faça o deploy do código atualizado e teste novamente.

