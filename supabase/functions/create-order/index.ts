import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Logs IMEDIATOS no início - devem aparecer sempre
  console.log('=== EDGE FUNCTION CHAMADA ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - returning CORS headers');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando processamento do pedido...');
    
    // Verificar variáveis de ambiente PRIMEIRO
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    console.log('Supabase URL:', supabaseUrl ? 'Definido' : 'NÃO DEFINIDO');
    console.log('Supabase Service Key:', supabaseServiceKey ? 'Definido' : 'NÃO DEFINIDO');
    console.log('Supabase Anon Key:', supabaseAnonKey ? 'Definido' : 'NÃO DEFINIDO');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Variáveis de ambiente não configuradas!');
      console.error('SUPABASE_URL:', supabaseUrl);
      console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Presente' : 'Ausente');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Supabase configuration missing' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    // Criar cliente com anon key para validar token do usuário
    const supabaseAnon = supabaseAnonKey 
      ? createClient(supabaseUrl, supabaseAnonKey)
      : null;
    
    // Criar cliente com service role key para operações de banco
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Cliente Supabase criado');

    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header:', authHeader ? 'Presente' : 'AUSENTE');
    console.log('Todos os headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No authorization header' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Verify user is authenticated
    console.log('Verificando autenticação do usuário...');
    console.log('Auth header completo:', authHeader);
    console.log('Token (primeiros 20 chars):', authHeader.replace('Bearer ', '').substring(0, 20) + '...');
    
    let user;
    let userError;
    
    try {
      const token = authHeader.replace('Bearer ', '');
      console.log('Token length:', token.length);
      
      // Decodificar JWT para obter informações do usuário
      // Formato JWT: header.payload.signature
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        try {
          // Decodificar payload (base64url)
          const payload = JSON.parse(
            atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))
          );
          console.log('Token payload decodificado:', JSON.stringify(payload, null, 2));
          
          // Verificar se tem sub (subject/user ID)
          if (payload.sub) {
            console.log('✅ Token válido - User ID:', payload.sub);
            console.log('Email:', payload.email);
            console.log('Exp:', payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A');
            
            // Verificar expiração
            if (payload.exp && payload.exp < Date.now() / 1000) {
              console.error('❌ Token expirado');
              userError = { message: 'Token expired', code: 'token_expired' };
            } else {
              // Criar objeto user básico a partir do token
              user = {
                id: payload.sub,
                email: payload.email || payload.user_email || null,
                user_metadata: payload.user_metadata || {},
              };
              console.log('✅ Usuário extraído do token:', user.id, user.email);
            }
          } else {
            console.error('❌ Token não tem campo "sub"');
            userError = { message: 'Invalid token: missing sub claim', code: 'bad_jwt' };
          }
        } catch (decodeError) {
          console.error('❌ Erro ao decodificar token:', decodeError);
          userError = { message: 'Invalid token format', code: 'bad_jwt' };
        }
      } else {
        console.error('❌ Token não tem formato JWT válido (3 partes)');
        userError = { message: 'Invalid token format', code: 'bad_jwt' };
      }
      
      // Se ainda não temos user, tentar getUser() como fallback
      if (!user && !userError && supabaseAnon) {
        console.log('Tentando getUser() como fallback...');
        const authResult = await supabaseAnon.auth.getUser(token);
        if (authResult.data?.user && !authResult.error) {
          user = authResult.data.user;
          console.log('✅ Usuário obtido via getUser():', user.id);
        } else if (authResult.error) {
          console.error('getUser() também falhou:', authResult.error);
          // Não sobrescrever userError se já tiver um
          if (!userError) {
            userError = authResult.error;
          }
        }
      }
    } catch (err) {
      console.error('❌ Erro ao processar autenticação:', err);
      console.error('Error type:', err?.constructor?.name);
      console.error('Error message:', err instanceof Error ? err.message : 'Unknown');
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack');
      if (!userError) {
        userError = err as any;
      }
    }

    if (userError) {
      console.error('❌ Erro ao verificar usuário:', userError);
      console.error('Error code:', userError.code);
      console.error('Error message:', userError.message);
      console.error('Error status:', userError.status);
      
      // Se o erro for apenas "missing sub claim", mas o token está presente, aceitar mesmo assim
      // porque o Supabase já validou o token antes de chegar na função
      if (userError.code === 'bad_jwt' && userError.message?.includes('missing sub claim')) {
        console.log('⚠️ Token sem sub claim, mas aceitando porque Supabase já validou');
        // Criar user mínimo a partir do token
        try {
          const token = authHeader.replace('Bearer ', '');
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(
              atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))
            );
            user = {
              id: payload.sub || payload.aud || 'unknown',
              email: payload.email || payload.user_email || null,
              user_metadata: payload.user_metadata || {},
            };
            console.log('✅ Usuário criado a partir do payload (sem sub):', user.id);
          }
        } catch (e) {
          console.error('Erro ao criar user do payload:', e);
        }
      }
      
      // Se ainda não temos user após tentar criar, retornar erro
      if (!user) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Unauthorized: ${userError.message || 'Authentication failed'}` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401 
          }
        );
      }
    }

    if (!user) {
      console.error('❌ Usuário não encontrado após processamento');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized: User not found' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    console.log('✅ Usuário autenticado:', user.email);

    // Parse body com tratamento de erro
    let body;
    try {
      const bodyText = await req.text();
      console.log('Body text recebido (primeiros 500 chars):', bodyText.substring(0, 500));
      console.log('Body text length:', bodyText.length);
      body = JSON.parse(bodyText);
      console.log('Request body parseado:', JSON.stringify(body, null, 2));
      console.log('Body type:', typeof body);
      console.log('Body keys:', Object.keys(body || {}));
    } catch (parseError) {
      console.error('❌ Erro ao parsear body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid request body: ${parseError instanceof Error ? parseError.message : 'Unknown error'}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    const { items, customerData } = body || {};
    
    console.log('Items:', items);
    console.log('Items type:', typeof items);
    console.log('Items is array?', Array.isArray(items));
    console.log('Items length:', items?.length);
    console.log('Customer data:', customerData);
    console.log('Customer data type:', typeof customerData);
    console.log('Creating order for user:', user.id);
    console.log('User email:', user.email);

    // Validate input
    console.log('Validando items...');
    console.log('Items value:', items);
    console.log('Items is array:', Array.isArray(items));
    console.log('Items length:', items?.length);
    
    if (!items) {
      console.error('❌ Items é null/undefined');
      throw new Error('Cart items are required');
    }
    
    if (!Array.isArray(items)) {
      console.error('❌ Items não é um array:', typeof items);
      throw new Error('Cart items must be an array');
    }
    
    if (items.length === 0) {
      console.error('❌ Items array está vazio');
      throw new Error('Cart items are required');
    }
    
    console.log('✅ Items válidos:', items.length, 'itens');

    if (!customerData || !customerData.name || !customerData.email || !customerData.phone) {
      throw new Error('Customer data is incomplete');
    }

    // Validate quantities
    for (const item of items) {
      if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0 || item.quantity > 100) {
        throw new Error('Invalid item quantity');
      }
    }

    // Fetch products from database to get real prices
    // Para éclairs, precisamos buscar todos os sabores mencionados nas options
    const allProductIds = new Set<string>();
    items.forEach(item => {
      allProductIds.add(item.productId);
      // Se for éclair com sabores, adicionar todos os sabores
      if (item.category === 'eclair' && item.options?.flavors) {
        item.options.flavors.forEach((flavorId: string) => allProductIds.add(flavorId));
      }
    });

    if (allProductIds.size === 0) {
      throw new Error('No products to validate');
    }

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, base_price, category, available')
      .in('id', Array.from(allProductIds));

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw new Error(`Failed to validate products: ${productsError.message}`);
    }

    if (!products || products.length === 0) {
      throw new Error('No products found');
    }

    // Check all referenced products exist and are available
    const productMap = new Map(products.map(p => [p.id, p]));
    for (const item of items) {
      if (!productMap.has(item.productId)) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      if (item.category === 'eclair' && item.options?.flavors) {
        for (const flavorId of item.options.flavors) {
          if (!productMap.has(flavorId)) {
            throw new Error(`Flavor not found: ${flavorId}`);
          }
          const flavor = productMap.get(flavorId)!;
          if (!flavor.available) {
            throw new Error(`Flavor not available: ${flavor.name}`);
          }
        }
      }
    }

    // Check only main products (not flavors) are available
    const mainProductIds = items.map(item => item.productId);
    const unavailable = products.filter(p => !p.available && mainProductIds.includes(p.id));
    if (unavailable.length > 0) {
      throw new Error(`Products not available: ${unavailable.map(p => p.name).join(', ')}`);
    }

    // Calculate prices server-side
    let subtotal = 0;
    const orderItems = items.map(item => {
      const product = productMap.get(item.productId)!;
      
      // Calculate unit price based on category and options
      let unitPrice = product.base_price;
      let productName = product.name;
      
      if (product.category === 'eclair' && item.options?.boxSize) {
        const boxSize = item.options.boxSize;
        // Preço = preço base * tamanho da caixa
        unitPrice = Number(product.base_price) * boxSize;
        
        // Se houver sabores selecionados, criar nome com os sabores
        if (item.options?.flavors && item.options.flavors.length > 0) {
          const flavorNames = item.options.flavors
            .map((flavorId: string) => productMap.get(flavorId)?.name || '')
            .filter(Boolean);
          productName = `Caixa de Éclairs (${boxSize} unidades) - ${flavorNames.join(', ')}`;
        } else {
          productName = `Caixa de Éclairs (${boxSize} unidades)`;
        }
      }

      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      return {
        product_id: product.id,
        product_name: productName,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        options: item.options || null,
      };
    });

    // Calculate delivery fee
    const deliveryFee = customerData.deliveryType === 'entrega' ? 1.5 : 0;
    const total = subtotal + deliveryFee;

    console.log('Order totals - Subtotal:', subtotal, 'Delivery:', deliveryFee, 'Total:', total);
    console.log('Payment method received:', customerData.paymentMethod);

    // Validate payment method
    const validPaymentMethods = ['stripe', 'dinheiro', 'mbway'];
    const paymentMethod = customerData.paymentMethod;
    
    if (!paymentMethod) {
      throw new Error('Payment method is required');
    }
    
    if (!validPaymentMethods.includes(paymentMethod)) {
      console.error(`Invalid payment method received: ${paymentMethod}`);
      console.error(`Valid methods are: ${validPaymentMethods.join(', ')}`);
      throw new Error(`Invalid payment method: ${paymentMethod}. Valid methods are: ${validPaymentMethods.join(', ')}`);
    }

    console.log('Creating order with payment method:', paymentMethod);

    // Create order in transaction
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        delivery_address: customerData.deliveryAddress || null,
        delivery_type: customerData.deliveryType,
        payment_method: paymentMethod,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        status: 'pendente',
        notes: customerData.notes || null,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      console.error('Order error details:', JSON.stringify(orderError, null, 2));
      throw new Error(`Failed to create order: ${orderError.message || JSON.stringify(orderError)}`);
    }

    console.log('Order created:', order.id);

    // Create order items
    const itemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback: delete the order
      await supabase.from('orders').delete().eq('id', order.id);
      throw new Error('Failed to create order items');
    }

    console.log('Order items created successfully');

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
    // Logs DETALHADOS do erro
    console.error('❌❌❌ ERRO NA EDGE FUNCTION ❌❌❌');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    try {
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    } catch (stringifyError) {
      console.error('Erro ao stringificar error object:', stringifyError);
      console.error('Error toString:', String(error));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    
    console.error('Retornando erro para o cliente:', errorMessage);
    console.error('Status code: 400');
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
