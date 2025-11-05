import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { items, customerData } = await req.json();

    console.log('Creating order for user:', user.id);
    console.log('Cart items:', items);

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Cart items are required');
    }

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

    // Validate payment method
    const validPaymentMethods = ['stripe', 'dinheiro', 'mbway'];
    const paymentMethod = customerData.paymentMethod;
    if (!validPaymentMethods.includes(paymentMethod)) {
      throw new Error(`Invalid payment method: ${paymentMethod}`);
    }

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
    console.error('Error in create-order function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    console.error('Error details:', error);
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
