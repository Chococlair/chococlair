export type PromotionDiscountType = "percentage" | "fixed" | "free_shipping";

export interface PromotionProductLink {
  product_id: string;
}

export interface PromotionRecord {
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

export interface AppliedPromotion {
  promotionId: string;
  title: string;
  description: string | null;
  discountType: PromotionDiscountType;
  discountValue: number | null;
  freeShipping: boolean;
}

const toDate = (value: string | null) => (value ? new Date(value) : null);

export const isPromotionActive = (promotion: PromotionRecord, referenceDate = new Date()) => {
  if (!promotion.active) return false;

  const startDate = toDate(promotion.starts_at);
  const endDate = toDate(promotion.ends_at);

  if (startDate && referenceDate < startDate) return false;
  if (endDate && referenceDate > endDate) return false;

  return true;
};

export const getActivePromotions = (promotions: PromotionRecord[] = [], referenceDate = new Date()) =>
  promotions.filter((promotion) => isPromotionActive(promotion, referenceDate));

export const promotionAppliesToProduct = (promotion: PromotionRecord, productId: string) => {
  if (promotion.applies_to_all) return true;
  return (promotion.promotion_products ?? []).some((link) => link.product_id === productId);
};

const calculatePromotionDiscount = (
  promotion: PromotionRecord,
  unitPrice: number,
  quantity: number,
): { discountAmount: number; freeShipping: boolean } => {
  if (promotion.discount_type === "percentage" && promotion.discount_value !== null) {
    const discount = unitPrice * quantity * (promotion.discount_value / 100);
    return { discountAmount: Math.max(discount, 0), freeShipping: promotion.free_shipping };
  }

  if (promotion.discount_type === "fixed" && promotion.discount_value !== null) {
    const discount = promotion.discount_value * quantity;
    return { discountAmount: Math.max(discount, 0), freeShipping: promotion.free_shipping };
  }

  // Free shipping promotion (or any promotion that only toggles free shipping)
  return { discountAmount: 0, freeShipping: promotion.free_shipping || promotion.discount_type === "free_shipping" };
};

export const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const getBestPromotionForProduct = (
  productId: string,
  unitPrice: number,
  promotions: PromotionRecord[],
  quantity = 1,
): {
  discountedUnitPrice: number;
  discountTotal: number;
  appliedPromotion?: AppliedPromotion;
  freeShipping: boolean;
} => {
  const applicablePromotions = promotions.filter((promotion) => promotionAppliesToProduct(promotion, productId));

  if (applicablePromotions.length === 0) {
    return { discountedUnitPrice: unitPrice, discountTotal: 0, freeShipping: false };
  }

  let bestPromotion: PromotionRecord | undefined;
  let bestDiscount = 0;
  let bestFreeShipping = false;

  for (const promotion of applicablePromotions) {
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
      discountTotal: 0,
      freeShipping: applicablePromotions.some(
        (promotion) => promotion.discount_type === "free_shipping" || promotion.free_shipping,
      ),
    };
  }

  const discountPerUnit = quantity > 0 ? bestDiscount / quantity : 0;
  const discountedUnitPrice = Math.max(unitPrice - discountPerUnit, 0);

  return {
    discountedUnitPrice: roundCurrency(discountedUnitPrice),
    discountTotal: roundCurrency(bestDiscount),
    appliedPromotion: {
      promotionId: bestPromotion.id,
      title: bestPromotion.title,
      description: bestPromotion.description,
      discountType: bestPromotion.discount_type,
      discountValue: bestPromotion.discount_value,
      freeShipping: bestFreeShipping,
    },
    freeShipping: bestFreeShipping,
  };
};

export const hasFreeShippingPromotion = (
  promotions: PromotionRecord[],
  productIds?: string[],
) => {
  if (!promotions.length) return false;

  return promotions.some((promotion) => {
    if (!promotion.free_shipping && promotion.discount_type !== "free_shipping") {
      return false;
    }

    if (promotion.applies_to_all) return true;
    if (!productIds || productIds.length === 0) return false;

    const promotionProducts = promotion.promotion_products ?? [];
    return productIds.some((productId) =>
      promotionProducts.some((link) => link.product_id === productId),
    );
  });
};

