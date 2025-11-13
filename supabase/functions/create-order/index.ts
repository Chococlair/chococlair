import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NATAL_CATEGORIES = new Set([
  "natal_doces",
  "natal_tabuleiros",
  "chocotone",
  "chocotones",
  "rocambole",
  "rocamboles",
  "tortas_chococlair",
  "trutas",
]);

const NATAL_SCHEDULE_DATE = '2024-12-24';

const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type PromotionDiscountType = "percentage" | "fixed" | "free_shipping";

interface PromotionProductLink {
  product_id: string;
}

interface PromotionRecord {
  id: string;
  title: string;
  description: string | null;
  discount_type: PromotionDiscountType;
  discount_value: number | null;
  applies_to_all: boolean;
  free_shipping: boolean;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  promotion_products?: PromotionProductLink[] | null;
}

type ProductRow = {
  id: string;
  name: string;
  base_price: number;
  category: string;
  available: boolean;
  product_categories?: {
    is_natal?: boolean | null;
  } | null;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const isPromotionActive = (promotion: PromotionRecord, referenceDate = new Date()) => {
  if (!promotion.active) return false;

  const startDate = promotion.starts_at ? new Date(promotion.starts_at) : null;
  const endDate = promotion.ends_at ? new Date(promotion.ends_at) : null;

  if (startDate && referenceDate < startDate) return false;
  if (endDate && referenceDate > endDate) return false;

  return true;
};

const promotionAppliesToProduct = (promotion: PromotionRecord, productId: string) => {
  if (promotion.applies_to_all) return true;
  const links = promotion.promotion_products ?? [];
  return links.some((link) => link.product_id === productId);
};

const calculatePromotionDiscount = (
  promotion: PromotionRecord,
  unitPrice: number,
  quantity: number,
) => {
  let discountAmount = 0;
  const freeShipping = promotion.free_shipping || promotion.discount_type === "free_shipping";

  if (promotion.discount_type === "percentage" && promotion.discount_value !== null) {
    discountAmount = unitPrice * quantity * (promotion.discount_value / 100);
  } else if (promotion.discount_type === "fixed" && promotion.discount_value !== null) {
    discountAmount = promotion.discount_value * quantity;
  }

  const maxDiscount = unitPrice * quantity;
  return {
    discountAmount: Math.min(Math.max(discountAmount, 0), maxDiscount),
    freeShipping,
  };
};

const getBestPromotionForProduct = (
  productId: string,
  unitPrice: number,
  promotions: PromotionRecord[],
  quantity = 1,
) => {
  let bestPromotion: PromotionRecord | null = null;
  let bestDiscount = 0;
  let bestFreeShipping = false;

  for (const promotion of promotions) {
    if (!promotionAppliesToProduct(promotion, productId)) continue;

    const { discountAmount, freeShipping } = calculatePromotionDiscount(promotion, unitPrice, quantity);

    if (
      discountAmount > bestDiscount ||
      (discountAmount === bestDiscount && freeShipping && !bestFreeShipping)
    ) {
      bestPromotion = promotion;
      bestDiscount = discountAmount;
      bestFreeShipping = freeShipping;
    }
  }

  if (!bestPromotion) {
    return {
      discountedUnitPrice: unitPrice,
      discountAmount: 0,
      appliedPromotion: null,
      freeShipping: false,
    };
  }

  const discountedUnit =
    quantity > 0 ? Math.max(unitPrice - bestDiscount / quantity, 0) : unitPrice;

  return {
    discountedUnitPrice: roundCurrency(discountedUnit),
    discountAmount: roundCurrency(bestDiscount),
    appliedPromotion: { id: bestPromotion.id, title: bestPromotion.title },
    freeShipping: bestFreeShipping,
  };
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

    const { items, customerData, scheduledFor } = body;

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
      .select('id, name, base_price, category, available, product_categories ( is_natal )')
      .in('id', Array.from(allProductIds));

    if (productsError) {
      console.error('Erro ao buscar produtos:', productsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch products' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Produtos encontrados:', products?.length || 0);

    const typedProducts = (products ?? []) as ProductRow[];
    const productMap = new Map<string, ProductRow>(typedProducts.map((p) => [p.id, p]));

    // Validar todos os produtos existem
    const missingProducts: string[] = [];
    const unavailableProducts: string[] = [];
    
    for (const productId of allProductIds) {
      const product = productMap.get(productId);
      if (!product) {
        console.error('Produto não encontrado:', productId);
        missingProducts.push(productId);
      } else if (!product.available) {
        console.error('Produto não disponível:', productId, product.name);
        unavailableProducts.push(product.name);
      }
    }

    if (missingProducts.length > 0) {
      console.error('Produtos faltando:', missingProducts);
      console.error('Produtos encontrados no banco:', Array.from(productMap.keys()));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Product not found: ${missingProducts[0]}`,
          missingProducts,
          availableProductIds: Array.from(productMap.keys())
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (unavailableProducts.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: `Product not available: ${unavailableProducts[0]}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let isNatalOrder = false;
    const today = getTodayDateString();
    const { data: dailyAvailability, error: dailyAvailabilityError } = await supabase
      .from('daily_product_availability')
      .select('product_id')
      .eq('available_date', today)
      .eq('is_active', true);

    if (dailyAvailabilityError) {
      console.error('Erro ao buscar disponibilidade diária:', dailyAvailabilityError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify daily availability' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      );
    }

    const dailyAvailabilitySet = new Set((dailyAvailability ?? []).map(({ product_id }) => product_id));
    const unavailableToday: string[] = [];
    const orderTypeSet = new Set<'natal' | 'regular'>();

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;
      const isNatal = Boolean(product.product_categories?.is_natal ?? NATAL_CATEGORIES.has(product.category));
      orderTypeSet.add(isNatal ? 'natal' : 'regular');
      if (!isNatal && dailyAvailabilitySet.size > 0 && !dailyAvailabilitySet.has(item.productId)) {
        unavailableToday.push(item.productId);
      }
    }

    if (orderTypeSet.size > 1) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Não é possível misturar produtos de Natal com outros produtos no mesmo pedido.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    isNatalOrder = orderTypeSet.has('natal');

    if (isNatalOrder) {
      if (scheduledFor && scheduledFor !== NATAL_SCHEDULE_DATE) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Pedidos de Natal devem ser agendados para ${NATAL_SCHEDULE_DATE}.`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
        );
      }
    } else if (scheduledFor) {
      console.warn('Pedido não natal enviou scheduledFor, ignorando valor:', scheduledFor);
    }

    if (unavailableToday.length > 0) {
      console.error('Produtos indisponíveis hoje:', unavailableToday);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Product not available for today',
          unavailableToday,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    const { data: promotionsData, error: promotionsError } = await supabase
      .from('promotions')
      .select(
        'id, title, description, discount_type, discount_value, applies_to_all, free_shipping, starts_at, ends_at, active, promotion_products ( product_id )',
      );

    if (promotionsError) {
      console.error('Erro ao buscar promoções:', promotionsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch promotions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
      );
    }

    const promotionsRaw = (promotionsData ?? []) as (PromotionRecord & {
      promotion_products: PromotionProductLink[] | null;
    })[];

    const normalizedPromotions = promotionsRaw.map((promotion) => ({
      ...promotion,
      discount_value: promotion.discount_value !== null ? Number(promotion.discount_value) : null,
    }));

    const activePromotions = normalizedPromotions.filter((promotion) => isPromotionActive(promotion));
    console.log('Promoções ativas:', activePromotions.length);

    let subtotal = 0;
    let discountTotal = 0;
    let freeShippingApplied = false;
    const appliedPromotionMap = new Map<string, { id: string; title: string; free_shipping: boolean }>();

    const orderItems: {
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      discount_amount: number;
      options: Record<string, unknown> | null;
    }[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      let unitPrice = Number(product.base_price);
      const quantity = item.quantity;
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

      const { discountedUnitPrice, discountAmount, appliedPromotion, freeShipping } =
        getBestPromotionForProduct(item.productId, unitPrice, activePromotions, quantity);

      const lineTotal = roundCurrency(discountedUnitPrice * quantity);
      const lineDiscount = roundCurrency(discountAmount);

      subtotal += lineTotal;
      discountTotal += lineDiscount;
      if (freeShipping) freeShippingApplied = true;
      if (appliedPromotion) {
        appliedPromotionMap.set(appliedPromotion.id, {
          id: appliedPromotion.id,
          title: appliedPromotion.title,
          free_shipping: freeShipping,
        });
      }

      orderItems.push({
        product_id: item.productId,
        product_name: productName,
        quantity,
        unit_price: unitPrice,
        total_price: lineTotal,
        discount_amount: lineDiscount,
        options: item.options || null,
      });
    }

    subtotal = roundCurrency(subtotal);
    discountTotal = roundCurrency(discountTotal);

    const appliedPromotionsList = Array.from(appliedPromotionMap.values());

    console.log('Subtotal (com descontos aplicados):', subtotal);
    console.log('Total de descontos aplicados:', discountTotal);
    console.log('Promoções aplicadas:', appliedPromotionsList);

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

    // Calcular taxa de entrega
    const deliveryFee = customerData.deliveryType === 'entrega' && !freeShippingApplied ? 1.5 : 0;
    const finalTotal = roundCurrency(subtotal + deliveryFee);
    const scheduledForDate = isNatalOrder ? NATAL_SCHEDULE_DATE : null;
    const baseNote =
      typeof customerData.notes === 'string' && customerData.notes.trim().length > 0
        ? customerData.notes.trim()
        : '';
    const natalNote = 'Encomenda de Natal agendada para 24/12 entre 09:00h e 16:30h.';
    const notesValue =
      [baseNote, isNatalOrder && !baseNote.includes('24/12') ? natalNote : null]
        .filter((value): value is string => Boolean(value && value.trim().length > 0))
        .join('\n') || null;

    console.log('Subtotal final:', subtotal);
    console.log('Delivery fee:', deliveryFee);
    console.log('Total final:', finalTotal);

    // Criar pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customerData.name,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        delivery_type: customerData.deliveryType,
        delivery_address: customerData.deliveryAddress || null,
        payment_method: paymentMethod,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        total: finalTotal,
        discount_total: discountTotal,
        applied_promotions: appliedPromotionsList.length ? appliedPromotionsList : null,
        notes: notesValue,
        scheduled_for: scheduledForDate,
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
        total: order.total,
        subtotal,
        discountTotal,
        deliveryFee,
        appliedPromotions: appliedPromotionsList,
        freeShipping: freeShippingApplied,
        scheduledFor: scheduledForDate,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
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
