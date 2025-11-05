export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  options?: {
    boxSize?: number; // Para éclairs: 2, 3 ou 6
    flavors?: string[]; // Para éclairs: IDs dos sabores selecionados
    massType?: 'chocolate' | 'branca'; // Para rocamboles
  };
  image?: string;
}

const CART_STORAGE_KEY = 'chococlair_cart';

export const getCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(CART_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveCart = (items: CartItem[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
};

export const addToCart = (item: Omit<CartItem, 'id'>) => {
  const cart = getCart();
  const existingIndex = cart.findIndex(
    i => i.productId === item.productId && 
         JSON.stringify(i.options) === JSON.stringify(item.options)
  );

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += item.quantity;
  } else {
    cart.push({
      ...item,
      id: `${item.productId}-${Date.now()}`
    });
  }

  saveCart(cart);
  window.dispatchEvent(new CustomEvent('cart-updated'));
  return cart;
};

export const removeFromCart = (itemId: string) => {
  const cart = getCart().filter(item => item.id !== itemId);
  saveCart(cart);
  window.dispatchEvent(new CustomEvent('cart-updated'));
  return cart;
};

export const updateCartItemQuantity = (itemId: string, quantity: number) => {
  const cart = getCart();
  const item = cart.find(i => i.id === itemId);
  
  if (item) {
    if (quantity <= 0) {
      return removeFromCart(itemId);
    }
    item.quantity = quantity;
    saveCart(cart);
    window.dispatchEvent(new CustomEvent('cart-updated'));
  }
  
  return cart;
};

export const clearCart = () => {
  saveCart([]);
  window.dispatchEvent(new CustomEvent('cart-updated'));
};

export const getCartTotal = (cart: CartItem[]) => {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

export const getCartItemsCount = (cart: CartItem[]) => {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
};

/**
 * Valida produtos do carrinho contra a lista de produtos disponíveis
 * Remove produtos que não existem mais no banco
 */
export const validateCartProducts = async (availableProductIds: string[]): Promise<CartItem[] | { validCart: CartItem[]; removedItems: string[] }> => {
  const cart = getCart();
  const validCart: CartItem[] = [];
  const removedItems: string[] = [];

  for (const item of cart) {
    // Verificar se o productId principal existe
    let isValid = availableProductIds.includes(item.productId);
    
    // Para éclairs, verificar também os IDs dos sabores
    if (item.category === 'eclair' && item.options?.flavors) {
      const allFlavorsValid = item.options.flavors.every((flavorId: string) => 
        availableProductIds.includes(flavorId)
      );
      isValid = isValid && allFlavorsValid;
    }

    if (isValid) {
      validCart.push(item);
    } else {
      removedItems.push(item.name);
    }
  }

  // Se algum item foi removido, atualizar o carrinho
  if (removedItems.length > 0) {
    saveCart(validCart);
    window.dispatchEvent(new CustomEvent('cart-updated'));
    
    // Retornar objeto com itens removidos para notificar o usuário
    return { validCart, removedItems };
  }

  return validCart;
};