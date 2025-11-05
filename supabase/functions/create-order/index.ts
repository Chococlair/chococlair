import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // LOGS IMEDIATOS - DEVEM APARECER SEMPRE
  console.log('========================================');
  console.log('EDGE FUNCTION CHAMADA - INICIO');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('========================================');

  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - retornando CORS');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('INICIANDO PROCESSAMENTO...');

    // Variáveis de ambiente
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Supabase URL:', supabaseUrl ? 'OK' : 'FALTANDO');
    console.log('Service Key:', supabaseServiceKey ? 'OK' : 'FALTANDO');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('VARIAVEIS DE AMBIENTE FALTANDO!');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuration missing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Criar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Cliente Supabase criado');

    // Ler headers
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header:', authHeader ? 'PRESENTE' : 'AUSENTE');

    // Criar user genérico (sempre aceitar)
    let userId = 'anonymous-user';
    let userEmail = null;

    if (authHeader) {
      try {
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        const parts = token.split('.');
        if (parts.length === 3) {
          let payloadJson = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          while (payloadJson.length % 4) payloadJson += '=';
          const payload = JSON.parse(atob(payloadJson));
          userId = payload.sub || payload.user_id || payload.id || payload.aud || 'authenticated-user';
          userEmail = payload.email || null;
          console.log('User ID extraído:', userId);
        }
      } catch (e) {
        console.log('Erro ao decodificar token, usando user genérico:', e);
      }
    }

    console.log('User ID final:', userId);

    // Parse body
    let body;
    try {
      const bodyText = await req.text();
      console.log('Body recebido, tamanho:', bodyText.length);
      body = JSON.parse(bodyText);
      console.log('Body parseado com sucesso');
    } catch (e) {
      console.error('Erro ao parsear body:', e);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { items, customerData } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error('Items inválidos ou vazios');
      return new Response(
        JSON.stringify({ success: false, error: 'Cart items are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Items recebidos:', items.length);
    console.log('Customer data:', customerData ? 'OK' : 'FALTANDO');

    // Validar produtos
    const allProductIds = new Set<string>();
    items.forEach(item => {
      allProductIds.add(item.productId);
      if (item.category === 'eclair' && item.options?.flavors) {
        item.options.flavors.forEach((flavorId: string) => allProductIds.add(flavorId));
      }
    });

    console.log('Product IDs para validar:', Array.from(allProductIds));

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, base_price, category, available')
      .in('id', Array.from(allProductIds));

    if (productsError) {
      console.error('Erro ao buscar produtos:', productsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch products' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Produtos encontrados:', products?.length || 0);

    const productMap = new Map(products?.map(p => [p.id, p]) || []);

    // Validar todos os produtos existem
    for (const productId of allProductIds) {
      const product = productMap.get(productId);
      if (!product) {
        console.error('Produto não encontrado:', productId);
        return new Response(
          JSON.stringify({ success: false, error: `Product not found: ${productId}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      if (!product.available) {
        console.error('Produto não disponível:', productId);
        return new Response(
          JSON.stringify({ success: false, error: `Product not available: ${product.name}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Calcular total
    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      let unitPrice = Number(product.base_price);
      let quantity = item.quantity;
      let productName = product.name;

      if (product.category === 'eclair' && item.options?.boxSize) {
        const boxSize = item.options.boxSize;
        unitPrice = Number(product.base_price) * boxSize;

        if (item.options?.flavors && item.options.flavors.length > 0) {
          const flavorNames = item.options.flavors
            .map((flavorId: string) => productMap.get(flavorId)?.name || '')
            .filter(Boolean);
          productName = `Caixa de Éclairs (${boxSize} unidades) - ${flavorNames.join(', ')}`;
        } else {
          productName = `Caixa de Éclairs (${boxSize} unidades)`;
        }
      }

      const itemTotal = unitPrice * quantity;
      total += itemTotal;

      orderItems.push({
        product_id: item.productId,
        product_name: productName,
        quantity,
        unit_price: unitPrice,
        total_price: itemTotal,
        options: item.options || null,
      });
    }

    console.log('Total calculado:', total);

    // Validar método de pagamento
    const paymentMethod = customerData?.paymentMethod;
    const validMethods = ['stripe', 'dinheiro', 'mbway'];
    
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
      console.error('Método de pagamento inválido:', paymentMethod);
      return new Response(
        JSON.stringify({ success: false, error: `Invalid payment method: ${paymentMethod}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Método de pagamento:', paymentMethod);

    // Criar pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        delivery_type: customerData.deliveryType,
        delivery_address: customerData.deliveryAddress || null,
        payment_method: paymentMethod,
        total,
        status: 'pendente',
      })
      .select()
      .single();

    if (orderError) {
      console.error('Erro ao criar pedido:', orderError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create order: ${orderError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Pedido criado:', order.id);

    // Criar itens do pedido
    const itemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId);

    if (itemsError) {
      console.error('Erro ao criar itens:', itemsError);
      await supabase.from('orders').delete().eq('id', order.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create order items' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Itens criados com sucesso');
    console.log('PEDIDO CRIADO COM SUCESSO:', order.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderId: order.id,
        total: order.total 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('========================================');
    console.error('ERRO NA EDGE FUNCTION');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error:', error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('========================================');

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An error occurred',
        debug: 'Function executed but error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
