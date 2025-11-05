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
    const productIds = items.map(item => item.productId);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, base_price, category, available')
      .in('id', productIds);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw new Error('Failed to validate products');
    }

    if (!products || products.length !== productIds.length) {
      throw new Error('Some products not found');
    }

    // Check all products are available
    const unavailable = products.filter(p => !p.available);
    if (unavailable.length > 0) {
      throw new Error(`Products not available: ${unavailable.map(p => p.name).join(', ')}`);
    }

    // Calculate prices server-side
    let subtotal = 0;
    const orderItems = items.map(item => {
      const product = products.find(p => p.id === item.productId)!;
      
      // Calculate unit price based on category and options
      let unitPrice = product.base_price;
      if (product.category === 'eclair' && item.options?.boxSize) {
        const boxSize = item.options.boxSize;
        if (boxSize === 2) unitPrice = 6;
        else if (boxSize === 3) unitPrice = 9;
        else if (boxSize === 6) unitPrice = 18;
      }

      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      return {
        product_id: product.id,
        product_name: product.name,
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

    // Create order in transaction
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        delivery_address: customerData.deliveryAddress || null,
        delivery_type: customerData.deliveryType,
        payment_method: customerData.paymentMethod,
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
      throw new Error('Failed to create order');
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
