# ⚠️ VERIFICAR CONFIGURAÇÃO DO SUPABASE

## ❗ PROBLEMA: Logs não aparecem = Função pode não estar sendo executada

Se os logs não aparecem no Dashboard, pode ser:

1. **A função não está sendo deployada corretamente**
2. **Há um problema de autenticação no gateway do Supabase**
3. **As variáveis de ambiente não estão configuradas**

---

## ✅ VERIFICAR 1: Deploy da Função

1. Acesse: https://supabase.com/dashboard/project/thhdxxotwzfwdqjgxjiw/functions
2. Verifique se `create-order` aparece na lista
3. Clique em `create-order`
4. Veja se há algum erro ou aviso
5. Verifique se a função está **ATIVA**

---

## ✅ VERIFICAR 2: Variáveis de Ambiente

1. Acesse: https://supabase.com/dashboard/project/thhdxxotwzfwdqjgxjiw/settings/functions
2. Ou: Settings → Edge Functions → Environment Variables
3. Verifique se existem:
   - `SUPABASE_URL` = `https://hhurohtltxusbshnpqvw.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (sua service role key)
4. Se não existirem, **ADICIONE** elas

---

## ✅ VERIFICAR 3: Testar Diretamente no Dashboard

1. Acesse: https://supabase.com/dashboard/project/thhdxxotwzfwdqjgxjiw/functions/create-order
2. Clique na aba **"Invoke"** ou **"Test"**
3. Cole este JSON:
```json
{
  "items": [
    {
      "productId": "test-id",
      "quantity": 1,
      "category": "eclair",
      "options": {
        "boxSize": "2",
        "flavors": ["test-id"]
      }
    }
  ],
  "customerData": {
    "name": "Teste",
    "email": "teste@teste.com",
    "phone": "123456789",
    "deliveryType": "entrega",
    "deliveryAddress": "Teste",
    "paymentMethod": "mbway"
  }
}
```
4. Clique em "Invoke" ou "Test"
5. **VERIFIQUE OS LOGS** - devem aparecer agora!

---

## ✅ VERIFICAR 4: Configuração de Autenticação

1. No Dashboard, vá em: Settings → Edge Functions
2. Verifique se há alguma configuração de **"Require authentication"** ou **"Verify JWT"**
3. Se estiver ativado, pode estar bloqueando antes de executar a função

---

## 🔧 SOLUÇÃO ALTERNATIVA: Testar com função simples

Se nada funcionar, vamos criar uma função de teste super simples para ver se consegue executar:

1. No Dashboard, crie uma nova função chamada `test-simple`
2. Cole este código:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  console.log('TEST FUNCTION CALLED');
  return new Response(JSON.stringify({ success: true, message: 'It works!' }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```
3. Faça deploy
4. Teste no Dashboard
5. Veja se os logs aparecem

Se essa função simples funcionar, o problema está no código da `create-order`.
Se não funcionar, o problema está na configuração do Supabase.

---

**Por favor, verifique esses pontos e me diga o que encontrou!**

