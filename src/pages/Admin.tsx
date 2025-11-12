import { useState, useEffect, useCallback, useMemo, ChangeEvent } from "react";
import type { ComponentType } from "react";
import type { ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, Package, Euro, Truck, CheckCircle, Clock, TrendingUp, Calendar, DollarSign, ShoppingBag, Filter, Trash2, Eye, Gift } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import type { RealtimeChannel, RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_type: string;
  delivery_address: string | null;
  payment_method: string;
  total: number;
  subtotal?: number;
  delivery_fee?: number;
  status: string;
  created_at: string;
  notes: string | null;
  scheduled_for?: string | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  options: Record<string, unknown> | null;
}

interface OrderItemRow {
  order_id: string;
  product_name: string;
  quantity: number;
  total_price: number;
}

interface ProductAggregate {
  product_name: string;
  quantity: number;
  revenue: number;
}

interface OrdersPerDaySummary {
  date: string;
  totalOrders: number;
  natalOrders: number;
  regularOrders: number;
  totalValue: number;
}

type PromotionDiscountType = "percentage" | "fixed" | "free_shipping";

interface Product {
  id: string;
  name: string;
  category: string;
  base_price: number;
  available: boolean;
  image_url?: string | null;
  description?: string;
}

interface PromotionProductLink {
  product_id: string;
}

interface Promotion {
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
  promotion_products?: PromotionProductLink[];
}

interface PromotionFormState {
  id?: string;
  title: string;
  description: string;
  discountType: PromotionDiscountType;
  discountValue: string;
  appliesToAll: boolean;
  freeShipping: boolean;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDateTimeLocalInput = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const fromDateTimeLocalInput = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  return date.toISOString();
};

const getTodayDateString = () => formatDateInput(new Date());

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);

const formatDateDisplay = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const defaultPromotionFormState: PromotionFormState = {
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  appliesToAll: true,
  freeShipping: false,
  startsAt: "",
  endsAt: "",
  active: true,
};

interface ProductFormState {
  id?: string;
  name: string;
  category: string;
  basePrice: string;
  description: string;
  imageUrl: string;
  available: boolean;
}

const defaultProductFormState: ProductFormState = {
  name: "",
  category: "eclair",
  basePrice: "",
  description: "",
  imageUrl: "",
  available: true,
};

const PRODUCT_CATEGORIES = [
  { value: "eclair", label: "Éclair" },
  { value: "chocotone", label: "Chocotone" },
  { value: "rocambole", label: "Rocambole" },
  { value: "natal_doces", label: "Doce de Natal" },
  { value: "natal_tabuleiros", label: "Tabuleiro de Natal" },
];

const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  eclair: "Éclairs",
  chocotone: "Chocotones",
  rocambole: "Rocamboles",
  natal_doces: "Doces de Natal",
  natal_tabuleiros: "Tabuleiros de Natal",
};

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [periodFilter, setPeriodFilter] = useState<string>("todos");
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedMenuDate, setSelectedMenuDate] = useState<string>(getTodayDateString());
  const [dailyProductIds, setDailyProductIds] = useState<string[]>([]);
  const [loadingDailySelection, setLoadingDailySelection] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [promotionForm, setPromotionForm] = useState<PromotionFormState>({ ...defaultPromotionFormState });
  const [promotionProductsSelection, setPromotionProductsSelection] = useState<string[]>([]);
  const [savingPromotion, setSavingPromotion] = useState(false);
  const [orderItemsSummary, setOrderItemsSummary] = useState<OrderItemRow[]>([]);
  const [productTotals, setProductTotals] = useState<ProductAggregate[]>([]);
  const [ordersPerDaySummary, setOrdersPerDaySummary] = useState<OrdersPerDaySummary[]>([]);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>({ ...defaultProductFormState });
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [productSaving, setProductSaving] = useState(false);
  const [productDeleting, setProductDeleting] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const loadAllProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select<Product[]>('id, name, category, base_price, available, image_url, description')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setAllProducts(data ?? []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    }
  }, []);

  const isNatalOrder = useCallback((order: Order) => Boolean(order.scheduled_for), []);

  const updateAnalytics = useCallback((ordersList: Order[], itemsList: OrderItemRow[]) => {
    const totalsMap = new Map<string, ProductAggregate>();
    itemsList.forEach((item) => {
      const entry = totalsMap.get(item.product_name) ?? {
        product_name: item.product_name,
        quantity: 0,
        revenue: 0,
      };
      entry.quantity += item.quantity;
      entry.revenue += Number(item.total_price);
      totalsMap.set(item.product_name, entry);
    });
    const totalsArray = Array.from(totalsMap.values()).sort((a, b) => b.quantity - a.quantity);
    setProductTotals(totalsArray);

    const perDayMap = new Map<string, OrdersPerDaySummary>();
    ordersList.forEach((orderItem) => {
      const dateKey = orderItem.created_at.slice(0, 10);
      const entry =
        perDayMap.get(dateKey) ?? {
          date: dateKey,
          totalOrders: 0,
          natalOrders: 0,
          regularOrders: 0,
          totalValue: 0,
        };
      entry.totalOrders += 1;
      entry.totalValue += Number(orderItem.total);
      if (isNatalOrder(orderItem)) {
        entry.natalOrders += 1;
      } else {
        entry.regularOrders += 1;
      }
      perDayMap.set(dateKey, entry);
    });
    setOrdersPerDaySummary(Array.from(perDayMap.values()).sort((a, b) => b.date.localeCompare(a.date)));
  }, [isNatalOrder]);

  const resetProductForm = useCallback(() => {
    setProductForm({ ...defaultProductFormState });
    if (productImagePreview) {
      URL.revokeObjectURL(productImagePreview);
    }
    setProductImageFile(null);
    setProductImagePreview(null);
  }, [productImagePreview]);

  const handleOpenNewProduct = useCallback(() => {
    resetProductForm();
    setProductDialogOpen(true);
  }, [resetProductForm]);

  const handleEditProduct = useCallback((product: Product) => {
    setProductForm({
      id: product.id,
      name: product.name,
      category: product.category,
      basePrice: product.base_price.toString(),
      description: product.description ?? "",
      imageUrl: product.image_url ?? "",
      available: product.available,
    });
    setProductImageFile(null);
    setProductImagePreview(product.image_url ?? null);
    setProductDialogOpen(true);
  }, []);

  const handleProductInputChange = useCallback((field: keyof ProductFormState, value: string | boolean) => {
    setProductForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleProductImageChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecione um ficheiro de imagem válido.");
      return;
    }
    if (productImagePreview) {
      URL.revokeObjectURL(productImagePreview);
    }
    setProductImageFile(file);
    setProductImagePreview(URL.createObjectURL(file));
  }, [productImagePreview]);

  const uploadProductImage = useCallback(
    async (file: File): Promise<string | null> => {
      const ext = file.name.split(".").pop();
      const path = `products/${crypto.randomUUID()}.${ext ?? "jpg"}`;
      const { error: uploadError } = await supabase.storage.from("products-images").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (uploadError) {
        console.error("Erro ao carregar imagem:", uploadError);
        toast.error("Não foi possível carregar a imagem. Verifique o bucket 'products-images'.");
        return null;
      }
      const { data: publicUrlData } = supabase.storage.from("products-images").getPublicUrl(path);
      return publicUrlData?.publicUrl ?? null;
    },
    [],
  );

  const handleSaveProduct = useCallback(async () => {
    if (!productForm.name.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    if (!productForm.basePrice.trim()) {
      toast.error("Informe o preço base.");
      return;
    }

    const parsedPrice = Number(productForm.basePrice.replace(",", "."));
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Informe um preço base válido.");
      return;
    }

    setProductSaving(true);

    try {
      let imageUrl = productForm.imageUrl || null;
      if (productImageFile) {
        const uploadedUrl = await uploadProductImage(productImageFile);
        if (!uploadedUrl) {
          setProductSaving(false);
          return;
        }
        imageUrl = uploadedUrl;
      }

      const payload = {
        name: productForm.name.trim(),
        category: productForm.category,
        base_price: parsedPrice,
        description: productForm.description.trim() || null,
        image_url: imageUrl,
        available: productForm.available,
      };

      if (productForm.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", productForm.id);
        if (error) throw error;
        toast.success("Produto atualizado com sucesso.");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast.success("Produto criado com sucesso.");
      }

      await loadAllProducts();
      resetProductForm();
      setProductDialogOpen(false);
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
      toast.error("Não foi possível salvar o produto.");
    } finally {
      setProductSaving(false);
    }
  }, [productForm, productImageFile, loadAllProducts, resetProductForm, uploadProductImage]);

  const handleDeleteProduct = useCallback(async () => {
    if (!productToDelete) return;
    setProductDeleting(true);
    try {
      const { error } = await supabase.from("products").delete().eq("id", productToDelete.id);
      if (error) throw error;
      toast.success("Produto removido com sucesso.");
      await loadAllProducts();
    } catch (error) {
      console.error("Erro ao remover produto:", error);
      toast.error("Não foi possível remover o produto.");
    } finally {
      setProductDeleting(false);
      setProductToDelete(null);
    }
  }, [productToDelete, loadAllProducts]);
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    allProducts.forEach((product) => {
      if (!groups[product.category]) {
        groups[product.category] = [];
      }
      groups[product.category].push(product);
    });
    Object.values(groups).forEach((products) => products.sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, [allProducts]);

  const loadOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select<Order[]>('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
      console.log('Orders loaded:', data?.length || 0);
      const ordersData = data || [];
      setOrders(ordersData);

      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from('order_items')
        .select<OrderItemRow[]>('order_id, product_name, quantity, total_price');

      if (orderItemsError) {
        console.error('Error fetching order items:', orderItemsError);
        throw orderItemsError;
      }

      const orderItemsList = orderItemsData ?? [];
      setOrderItemsSummary(orderItemsList);
      updateAnalytics(ordersData, orderItemsList);
      return ordersData;
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error("Erro ao carregar pedidos. Você pode continuar usando o painel.");
      // Não bloquear o acesso, apenas mostrar erro
      setOrders([]);
      setOrderItemsSummary([]);
      setProductTotals([]);
      setOrdersPerDaySummary([]);
      return [];
    }
  }, [updateAnalytics]);

  const loadDailyProducts = useCallback(async (date: string) => {
    setLoadingDailySelection(true);
    try {
      const { data, error } = await supabase
        .from('daily_product_availability')
        .select<{ product_id: string }[]>('product_id')
        .eq('available_date', date)
        .eq('is_active', true);

      if (error) throw error;
      setDailyProductIds((data ?? []).map((item) => item.product_id));
    } catch (error) {
      console.error('Erro ao carregar produtos do dia:', error);
      toast.error('Erro ao carregar produtos do dia');
    } finally {
      setLoadingDailySelection(false);
    }
  }, []);

  const handleToggleDailyProduct = useCallback(
    async (productId: string, enabled: boolean) => {
      try {
        if (enabled) {
          const { error } = await supabase
            .from('daily_product_availability')
            .upsert(
              {
                product_id: productId,
                available_date: selectedMenuDate,
                is_active: true,
              },
              { onConflict: 'product_id,available_date' },
            );

          if (error) throw error;
          setDailyProductIds((prev) => Array.from(new Set([...prev, productId])));
          toast.success("Produto adicionado ao menu do dia");
        } else {
          const { error } = await supabase
            .from('daily_product_availability')
            .delete()
            .eq('product_id', productId)
            .eq('available_date', selectedMenuDate);

          if (error) throw error;
          setDailyProductIds((prev) => prev.filter((id) => id !== productId));
          toast.success("Produto removido do menu do dia");
        }
      } catch (error) {
        console.error('Erro ao atualizar produtos do dia:', error);
        toast.error('Erro ao atualizar produtos do dia');
        await loadDailyProducts(selectedMenuDate);
      }
    },
    [loadDailyProducts, selectedMenuDate],
  );

  const loadPromotions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('id, title, description, discount_type, discount_value, applies_to_all, free_shipping, starts_at, ends_at, active, promotion_products ( product_id )')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData =
        (data as (Promotion & { promotion_products: PromotionProductLink[] | null })[] | null) ?? [];

      setPromotions(
        typedData.map((promotion) => ({
          ...promotion,
          promotion_products: promotion.promotion_products ?? [],
        })),
      );
    } catch (error) {
      console.error('Erro ao carregar promoções:', error);
      toast.error('Erro ao carregar promoções');
    }
  }, []);

  const resetPromotionFormState = useCallback(() => {
    setPromotionForm({ ...defaultPromotionFormState });
    setPromotionProductsSelection([]);
  }, []);

  const handleOpenNewPromotion = () => {
    resetPromotionFormState();
    setPromotionDialogOpen(true);
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setPromotionForm({
      id: promotion.id,
      title: promotion.title,
      description: promotion.description ?? "",
      discountType: promotion.discount_type,
      discountValue:
        promotion.discount_type === "free_shipping" || promotion.discount_value === null
          ? ""
          : String(promotion.discount_value),
      appliesToAll: promotion.applies_to_all,
      freeShipping: promotion.free_shipping,
      startsAt: toDateTimeLocalInput(promotion.starts_at),
      endsAt: toDateTimeLocalInput(promotion.ends_at),
      active: promotion.active,
    });
    setPromotionProductsSelection(
      promotion.applies_to_all ? [] : (promotion.promotion_products ?? []).map((link) => link.product_id),
    );
    setPromotionDialogOpen(true);
  };

  const handlePromotionProductsSelection = (productId: string, checked: boolean) => {
    setPromotionProductsSelection((prev) =>
      checked ? Array.from(new Set([...prev, productId])) : prev.filter((id) => id !== productId),
    );
  };

  const handleSavePromotion = async () => {
    try {
      if (!promotionForm.title.trim()) {
        toast.error("Informe o título da promoção");
        return;
      }

      if (promotionForm.discountType !== "free_shipping") {
        const numericValue = Number(promotionForm.discountValue);
        if (Number.isNaN(numericValue) || numericValue <= 0) {
          toast.error("Informe um valor de desconto válido");
          return;
        }
        if (promotionForm.discountType === "percentage" && numericValue > 100) {
          toast.error("O desconto percentual deve ser no máximo 100%");
          return;
        }
      }

      if (!promotionForm.appliesToAll && promotionProductsSelection.length === 0) {
        toast.error("Selecione pelo menos um produto para a promoção");
        return;
      }

      setSavingPromotion(true);

      const payload = {
        title: promotionForm.title.trim(),
        description: promotionForm.description.trim() || null,
        discount_type: promotionForm.discountType,
        discount_value:
          promotionForm.discountType === "free_shipping"
            ? null
            : Number(Number(promotionForm.discountValue).toFixed(2)),
        applies_to_all: promotionForm.appliesToAll,
        free_shipping: promotionForm.freeShipping || promotionForm.discountType === "free_shipping",
        starts_at: promotionForm.startsAt ? fromDateTimeLocalInput(promotionForm.startsAt) : null,
        ends_at: promotionForm.endsAt ? fromDateTimeLocalInput(promotionForm.endsAt) : null,
        active: promotionForm.active,
      };

      let promotionId = promotionForm.id;
      if (promotionForm.id) {
        const { error } = await supabase.from('promotions').update(payload).eq('id', promotionForm.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('promotions').insert(payload).select().single();
        if (error) throw error;
        promotionId = data?.id;
      }

      if (!promotionId) {
        throw new Error("Não foi possível obter o ID da promoção");
      }

      const { error: deleteLinksError } = await supabase.from('promotion_products').delete().eq('promotion_id', promotionId);
      if (deleteLinksError) throw deleteLinksError;

      if (!promotionForm.appliesToAll && promotionProductsSelection.length > 0) {
        const insertPayload = promotionProductsSelection.map((productId) => ({
          promotion_id: promotionId,
          product_id: productId,
        }));

        const { error: linkError } = await supabase.from('promotion_products').upsert(insertPayload);
        if (linkError) throw linkError;
      }

      toast.success(promotionForm.id ? "Promoção atualizada com sucesso" : "Promoção criada com sucesso");
      setPromotionDialogOpen(false);
      resetPromotionFormState();
      await loadPromotions();
    } catch (error) {
      console.error('Erro ao salvar promoção:', error);
      toast.error('Erro ao salvar promoção');
    } finally {
      setSavingPromotion(false);
    }
  };

  const handleTogglePromotionActive = async (promotionId: string, nextActive: boolean) => {
    try {
      const { error } = await supabase.from('promotions').update({ active: nextActive }).eq('id', promotionId);
      if (error) throw error;

      toast.success(nextActive ? "Promoção ativada" : "Promoção desativada");
      await loadPromotions();
    } catch (error) {
      console.error('Erro ao atualizar promoção:', error);
      toast.error('Erro ao atualizar promoção');
    }
  };

  const handleDeletePromotion = async (promotionId: string) => {
    try {
      if (!window.confirm("Deseja realmente excluir esta promoção?")) {
        return;
      }
      const { error } = await supabase.from('promotions').delete().eq('id', promotionId);
      if (error) throw error;

      toast.success("Promoção excluída com sucesso");
      await loadPromotions();
    } catch (error) {
      console.error('Erro ao excluir promoção:', error);
      toast.error('Erro ao excluir promoção');
    }
  };


  const checkAdminAccess = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('Session check:', { session: !!session, error: sessionError });
      
      if (!session) {
        console.log('No session found, redirecting to auth');
        toast.error("Por favor, faça login para continuar");
        setLoading(false);
        navigate("/auth");
        return;
      }

      console.log('User email:', session.user.email);

      // Check if user is admin
      const { data: adminCheck, error: adminError } = await supabase
        .rpc('is_admin');

      console.log('Admin check result:', { adminCheck, error: adminError });

      if (adminError) {
        console.error('Error calling is_admin:', adminError);
        toast.error(`Erro ao verificar permissões: ${adminError.message}`);
        setLoading(false);
        return;
      }

      if (!adminCheck) {
        console.log('User is not admin, email:', session.user.email);
        toast.error(`Acesso negado. Apenas administradores podem acessar esta página. Seu email: ${session.user.email}`);
        setLoading(false);
        navigate("/");
        return;
      }

      console.log('User is admin, loading orders');
      setIsAdmin(true);
      try {
        await loadOrders();
      } catch (error) {
        console.error('Error loading orders:', error);
        // Não bloquear o acesso se houver erro ao carregar pedidos
      }
      setLoading(false);
    } catch (error) {
      console.error('Error checking admin access:', error);
      toast.error(`Erro ao verificar permissões: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setLoading(false);
    }
  }, [loadOrders, navigate]);

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  useEffect(() => {
    if (isAdmin) {
      void loadAllProducts();
      void loadPromotions();
    }
  }, [isAdmin, loadAllProducts, loadPromotions]);

  useEffect(() => {
    if (isAdmin && selectedMenuDate) {
      void loadDailyProducts(selectedMenuDate);
    }
  }, [isAdmin, loadDailyProducts, selectedMenuDate]);

  useEffect(() => {
    if (promotionForm.appliesToAll && promotionProductsSelection.length > 0) {
      setPromotionProductsSelection([]);
    }
  }, [promotionForm.appliesToAll, promotionProductsSelection.length]);

  // Realtime subscription para atualizações automáticas
  useEffect(() => {
    if (!isAdmin) return;

    let channel: RealtimeChannel | null = null;

    // Função para tocar notificação sonora (estilo Uber Eats - longo e chamativo)
    const playNotificationSound = () => {
      try {
        const audioContextClass =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!audioContextClass) {
          console.warn('Web Audio API não suportada neste navegador.');
          return;
        }

        const audioContext = new audioContextClass();
        const now = audioContext.currentTime;
        
        // Primeira sequência: 3 notas ascendentes (estilo "novo pedido!")
        const playNote = (frequency: number, startTime: number, duration: number, volume: number) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = frequency;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05);
          gainNode.gain.setValueAtTime(volume, startTime + duration - 0.05);
          gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        };
        
        // Sequência 1: Notas ascendentes (800Hz -> 1000Hz -> 1200Hz)
        playNote(800, now, 0.2, 0.6);
        playNote(1000, now + 0.25, 0.2, 0.7);
        playNote(1200, now + 0.5, 0.25, 0.8);
        
        // Pausa curta
        const pauseTime = now + 0.85;
        
        // Sequência 2: Nota longa e forte (estilo "atenção!")
        playNote(1000, pauseTime, 0.4, 0.9);
        playNote(800, pauseTime + 0.45, 0.35, 0.85);
        
        // Sequência 3: Tremolo final (efeito de vibração)
        const tremoloStart = pauseTime + 0.9;
        for (let i = 0; i < 4; i++) {
          const t = tremoloStart + (i * 0.15);
          const freq = 900 + (i % 2 === 0 ? 200 : -200); // Alterna entre 1100Hz e 700Hz
          playNote(freq, t, 0.1, 0.6 - (i * 0.1));
        }
        
      } catch (error) {
        console.error('Erro ao tocar som de notificação:', error);
      }
    };

    // Configurar subscription para mudanças na tabela orders
    channel = supabase
      .channel(`orders_realtime_${Date.now()}`) // Nome único
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Apenas INSERT para novos pedidos
          schema: 'public',
          table: 'orders',
        },
        async (payload: RealtimePostgresInsertPayload<Order>) => {
          console.log('🔔🔔🔔 NOVO PEDIDO DETECTADO!', payload);
          console.log('Event type:', payload.eventType);
          console.log('New order:', payload.new);
          
          const newOrder = payload.new;
          
          // Tocar som IMEDIATAMENTE
          playNotificationSound();
          
          // Mostrar notificação grande e chamativa
          toast.success(`🆕 NOVO PEDIDO!`, {
            description: `Pedido #${newOrder.id.slice(0, 8).toUpperCase()}\n${newOrder.customer_name}\n${newOrder.total.toFixed(2)}€`,
            duration: 8000,
            style: {
              fontSize: '18px',
              fontWeight: 'bold',
            },
            descriptionClassName: 'text-foreground font-medium',
          });
          
          // Recarregar pedidos
          await loadOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        async () => {
          console.log('🔄 Order updated');
          await loadOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
        },
        async () => {
          console.log('🗑️ Order deleted');
          await loadOrders();
        }
      )
      .subscribe((status: string) => {
        console.log('📡📡📡 REALTIME SUBSCRIPTION STATUS:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅✅✅ REALTIME ATIVO - Aguardando novos pedidos...');
          toast.success('Conexão em tempo real ativa!', { duration: 2000 });
          
          // Carregar pedidos após subscription estar ativa
          loadOrders().then((loadedOrders) => {
            console.log(`Pedidos carregados: ${loadedOrders.length}`);
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('❌❌❌ ERRO NO REALTIME:', status);
          toast.error('Erro na conexão em tempo real. Recarregue a página.', { duration: 5000 });
        } else {
          console.log('⏳ Subscription status:', status);
        }
      });

    // Cleanup subscription ao desmontar
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isAdmin, loadOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: 'pendente' | 'confirmado' | 'em_preparacao' | 'a_caminho' | 'concluido') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast.success("Status atualizado com sucesso");
      await loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;

    setDeleteLoading(true);
    try {
      console.log('Deleting order:', orderToDelete.id);

      // Usar função RPC para deletar (bypassa problemas de RLS)
      console.log('Chamando função RPC para deletar pedido:', orderToDelete.id);
      
      const { data: deleted, error: rpcError } = await supabase
        .rpc('delete_order', { order_id: orderToDelete.id });

      console.log('Delete RPC result:', { deleted, rpcError });

      if (rpcError) {
        console.error('❌ Error deleting order via RPC:', rpcError);
        console.error('Error code:', rpcError.code);
        console.error('Error message:', rpcError.message);
        console.error('Error details:', JSON.stringify(rpcError, null, 2));
        throw new Error(`Erro ao excluir pedido: ${rpcError.message || 'Erro desconhecido'}`);
      }

      if (!deleted) {
        throw new Error('Pedido não foi deletado. Verifique se o pedido existe e se você tem permissão de admin.');
      }

      console.log('✅ Pedido deletado com sucesso via RPC');

      toast.success("Pedido excluído com sucesso");
      setOrderToDelete(null);
      await loadOrders();
    } catch (error: unknown) {
      console.error('Error deleting order:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro ao excluir pedido. Verifique se você tem permissão.";
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleQuickAction = async (order: Order, action: 'confirmar' | 'preparar' | 'sair' | 'pronto' | 'concluir') => {
    let newStatus: 'pendente' | 'confirmado' | 'em_preparacao' | 'a_caminho' | 'concluido';
    
    switch (action) {
      case 'confirmar':
        newStatus = 'confirmado';
        break;
      case 'preparar':
        newStatus = 'em_preparacao';
        break;
      case 'sair':
        newStatus = 'a_caminho';
        break;
      case 'pronto':
        // Para recolher, usar 'a_caminho' que será exibido como "Pronto para Recolher" no frontend
        // Para entrega, também usar 'a_caminho' normalmente
        newStatus = 'a_caminho';
        break;
      case 'concluir':
        newStatus = 'concluido';
        break;
      default:
        return;
    }

    await updateOrderStatus(order.id, newStatus);
  };

  const getQuickActions = (order: Order) => {
    const actions = [];
    
    if (order.status === 'pendente') {
      actions.push({
        label: 'Confirmar Pedido',
        action: 'confirmar' as const,
        icon: CheckCircle,
        variant: 'default' as const,
      });
    }
    
    if (order.status === 'confirmado') {
      actions.push({
        label: 'Em Preparação',
        action: 'preparar' as const,
        icon: Package,
        variant: 'default' as const,
      });
    }
    
    if (order.status === 'em_preparacao') {
      if (order.delivery_type === 'entrega') {
        actions.push({
          label: 'Sair para Entrega',
          action: 'sair' as const,
          icon: Truck,
          variant: 'default' as const,
        });
      } else {
        actions.push({
          label: 'Pronto para Recolher',
          action: 'pronto' as const,
          icon: CheckCircle,
          variant: 'default' as const,
        });
      }
    }
    
    if (order.status === 'a_caminho') {
      actions.push({
        label: 'Marcar como Entregue',
        action: 'concluir' as const,
        icon: CheckCircle,
        variant: 'default' as const,
      });
    }

    return actions;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const loadOrderItems = async (orderId: string) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select<OrderItem[]>('*')
        .eq('order_id', orderId);

      if (error) throw error;
      setOrderItems(data || []);
    } catch (error) {
      console.error('Erro ao carregar itens do pedido:', error);
      toast.error('Erro ao carregar itens do pedido');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    await loadOrderItems(order.id);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'secondary';
      case 'confirmado':
        return 'default';
      case 'em_preparacao':
        return 'default';
      case 'a_caminho':
        return 'outline';
      case 'concluido':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'confirmado':
        return 'Confirmado';
      case 'em_preparacao':
        return 'Em Preparação';
      case 'a_caminho':
        return 'A Caminho';
      case 'concluido':
        return 'Concluído';
      default:
        return status;
    }
  };

  const getFilteredOrders = () => {
    let filtered = [...orders];

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filtro por período
    const now = new Date();
    if (periodFilter === 'hoje') {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.toDateString() === now.toDateString();
      });
    } else if (periodFilter === 'semana') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(order => new Date(order.created_at) >= weekAgo);
    } else if (periodFilter === 'mes') {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      });
    }

    return filtered;
  };

  const getRevenueByDay = () => {
    const revenueByDay: Record<string, number> = {};
    
    orders.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: '2-digit'
      });
      revenueByDay[date] = (revenueByDay[date] || 0) + order.total;
    });

    return Object.entries(revenueByDay)
      .map(([day, revenue]) => ({ day, revenue: Number(revenue.toFixed(2)) }))
      .sort((a, b) => {
        const [dayA, monthA] = a.day.split('/');
        const [dayB, monthB] = b.day.split('/');
        if (monthA !== monthB) return parseInt(monthA) - parseInt(monthB);
        return parseInt(dayA) - parseInt(dayB);
      })
      .slice(-7); // Últimos 7 dias
  };

  const getOrdersByStatus = () => {
    const statusCounts: Record<string, number> = {};
    
    orders.forEach(order => {
      const statusLabel = getStatusLabel(order.status);
      statusCounts[statusLabel] = (statusCounts[statusLabel] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
  };

  const getMonthlyRevenue = () => {
    const now = new Date();
    return orders
      .filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, order) => sum + order.total, 0);
  };

  const filteredOrders = getFilteredOrders();
  const filteredDailyOrders = filteredOrders.filter((order) => !isNatalOrder(order));
  const filteredNatalOrders = filteredOrders.filter((order) => isNatalOrder(order));
  const filteredProductsList = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return allProducts;
    return allProducts.filter((product) => {
      const categoryLabel = PRODUCT_CATEGORY_LABELS[product.category] ?? product.category;
      return (
        product.name.toLowerCase().includes(term) ||
        categoryLabel.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
      );
    });
  }, [allProducts, productSearch]);

  const renderOrdersTable = (
    ordersToRender: Order[],
    title: string,
    Icon: ComponentType<{ className?: string }>,
    emptyMessage: string,
  ) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title} ({ordersToRender.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ordersToRender.length === 0 ? (
            <p className="text-center text-foreground py-8">{emptyMessage}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground font-semibold">Data</TableHead>
                    <TableHead className="text-foreground font-semibold">Cliente</TableHead>
                    <TableHead className="text-foreground font-semibold">Contacto</TableHead>
                    <TableHead className="text-foreground font-semibold">Entrega</TableHead>
                    <TableHead className="text-foreground font-semibold">Agendamento</TableHead>
                    <TableHead className="text-foreground font-semibold">Pagamento</TableHead>
                    <TableHead className="text-foreground font-semibold">Total</TableHead>
                    <TableHead className="text-foreground font-semibold">Status</TableHead>
                    <TableHead className="text-foreground font-semibold">Ação Rápida</TableHead>
                    <TableHead className="text-foreground font-semibold">Alterar Status</TableHead>
                    <TableHead className="text-foreground font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersToRender.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('pt-PT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{order.customer_name}</p>
                          <p className="text-sm text-foreground">{order.customer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{order.customer_phone}</TableCell>
                      <TableCell>
                        <div>
                          <Badge variant={order.delivery_type === 'entrega' ? 'default' : 'secondary'}>
                            {order.delivery_type === 'entrega' ? 'Entrega' : 'Recolher'}
                          </Badge>
                          {order.delivery_address && (
                            <p className="text-xs text-foreground mt-1 max-w-[200px]">
                              {order.delivery_address}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.scheduled_for
                          ? `${formatDateDisplay(order.scheduled_for)} (09:00 - 16:30)`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {order.payment_method === 'dinheiro' ? 'Dinheiro' : 'MB WAY'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-medium">
                          <Euro className="h-4 w-4" />
                          {order.total.toFixed(2)}€
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {getQuickActions(order).map((quickAction, idx) => {
                            const QuickIcon = quickAction.icon;
                            return (
                              <Button
                                key={idx}
                                size="sm"
                                variant={quickAction.variant}
                                onClick={() => handleQuickAction(order, quickAction.action)}
                                className="w-full justify-start"
                              >
                                <QuickIcon className="h-4 w-4 mr-2" />
                                {quickAction.label}
                              </Button>
                            );
                          })}
                          {getQuickActions(order).length === 0 && (
                            <span className="text-sm text-foreground/70">Sem ações</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status || 'pendente'}
                          onValueChange={(value) =>
                            updateOrderStatus(
                              order.id,
                              value as 'pendente' | 'confirmado' | 'em_preparacao' | 'a_caminho' | 'concluido',
                            )
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="confirmado">Confirmado</SelectItem>
                            <SelectItem value="em_preparacao">Em Preparação</SelectItem>
                            <SelectItem value="a_caminho">A Caminho</SelectItem>
                            <SelectItem value="concluido">Concluído</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(order)}
                            className="w-full"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setOrderToDelete(order)}
                            className="w-full"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Package className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-foreground font-medium">A verificar permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="mb-4 text-destructive font-semibold">Acesso Negado</p>
            <p className="text-sm text-foreground/70 mb-4">
              Apenas administradores podem acessar esta página.
            </p>
            <Button onClick={() => navigate("/")}>Voltar ao início</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Painel de Administração</h1>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
              <p className="text-xs text-foreground/70">
                Todos os pedidos registrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}€
              </div>
              <p className="text-xs text-foreground/70">
                Total de todos os pedidos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === 'pendente' || o.status === 'confirmado' || o.status === 'em_preparacao').length}
              </div>
              <p className="text-xs text-foreground/70">
                Aguardando processamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Concluídos</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {orders.filter(o => o.status === 'concluido').length}
              </div>
              <p className="text-xs text-foreground/70">
                Total finalizados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs para organizar */}
        <Tabs defaultValue="visao-geral" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="visao-geral">
              <TrendingUp className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="estatisticas">
              <Calendar className="h-4 w-4 mr-2" />
              Estatísticas
            </TabsTrigger>
            <TabsTrigger value="pedidos">
              <Package className="h-4 w-4 mr-2" />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="produtos-admin">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="gestao">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Menu do Dia
            </TabsTrigger>
          </TabsList>

          {/* Tab Visão Geral */}
          <TabsContent value="visao-geral" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Faturamento por Dia */}
              <Card>
                <CardHeader>
                  <CardTitle>Faturamento por Dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      revenue: {
                        label: "Faturamento",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <BarChart data={getRevenueByDay()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Pedidos por Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Pedidos por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      pedidos: {
                        label: "Pedidos",
                        color: "hsl(var(--primary))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <BarChart data={getOrdersByStatus()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-pedidos)" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Resumo de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Ticket Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {orders.length > 0 
                      ? (orders.reduce((sum, order) => sum + order.total, 0) / orders.length).toFixed(2) 
                      : '0.00'}€
                  </div>
                  <p className="text-xs text-foreground/70 mt-1">
                    Valor médio por pedido
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Taxa de Entrega</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {orders.length > 0 
                      ? ((orders.filter(o => o.delivery_type === 'entrega').length / orders.length) * 100).toFixed(0) 
                      : '0'}%
                  </div>
                  <p className="text-xs text-foreground/70 mt-1">
                    Pedidos com entrega
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Faturamento do Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {getMonthlyRevenue().toFixed(2)}€
                  </div>
                  <p className="text-xs text-foreground/70 mt-1">
                    Pedidos deste mês
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Produtos mais vendidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {productTotals.length === 0 ? (
                    <p className="text-sm text-foreground/70">
                      Ainda não há dados suficientes para mostrar os produtos mais vendidos.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {productTotals.slice(0, 5).map((item) => (
                        <li
                          key={item.product_name}
                          className="flex items-center justify-between text-sm border-b last:border-0 border-border/60 pb-2"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{item.product_name}</span>
                            <span className="text-xs text-foreground/70">
                              {item.quantity} unidades
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(item.revenue)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pedidos por dia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ordersPerDaySummary.length === 0 ? (
                    <p className="text-sm text-foreground/70">
                      Ainda não há dados suficientes para mostrar os pedidos por dia.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {ordersPerDaySummary.slice(0, 7).map((day) => (
                        <div
                          key={day.date}
                          className="flex items-center justify-between text-sm border-b last:border-0 border-border/60 pb-2"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {formatDateDisplay(day.date)}
                            </span>
                            <span className="text-xs text-foreground/70">
                              {day.regularOrders} pedidos do dia · {day.natalOrders} encomendas de Natal
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(day.totalValue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Estatísticas */}
          <TabsContent value="estatisticas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    vendas: {
                      label: "Vendas",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[400px]"
                >
                  <LineChart data={getRevenueByDay()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--color-vendas)" strokeWidth={2} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Método de Pagamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Dinheiro</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ 
                              width: `${orders.length > 0 ? (orders.filter(o => o.payment_method === 'dinheiro').length / orders.length) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {orders.filter(o => o.payment_method === 'dinheiro').length}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">MB WAY</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-accent h-2 rounded-full" 
                            style={{ 
                              width: `${orders.length > 0 ? (orders.filter(o => o.payment_method !== 'dinheiro').length / orders.length) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {orders.filter(o => o.payment_method !== 'dinheiro').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tipo de Entrega</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Entrega</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ 
                              width: `${orders.length > 0 ? (orders.filter(o => o.delivery_type === 'entrega').length / orders.length) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {orders.filter(o => o.delivery_type === 'entrega').length}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Recolher</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div 
                            className="bg-secondary h-2 rounded-full" 
                            style={{ 
                              width: `${orders.length > 0 ? (orders.filter(o => o.delivery_type === 'recolher').length / orders.length) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">
                          {orders.filter(o => o.delivery_type === 'recolher').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Pedidos */}
          <TabsContent value="pedidos" className="space-y-4">
            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                        <SelectItem value="em_preparacao">Em Preparação</SelectItem>
                        <SelectItem value="a_caminho">A Caminho</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-2 block">Período</label>
                    <Select value={periodFilter} onValueChange={setPeriodFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="hoje">Hoje</SelectItem>
                        <SelectItem value="semana">Última Semana</SelectItem>
                        <SelectItem value="mes">Este Mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {renderOrdersTable(
                filteredDailyOrders,
                "Pedidos do Dia",
                Package,
                "Nenhum pedido do dia encontrado.",
              )}
              {renderOrdersTable(
                filteredNatalOrders,
                "Encomendas de Natal",
                Gift,
                "Nenhuma encomenda de Natal encontrada.",
              )}
            </div>
          </TabsContent>

          {/* Tab Gestão do Dia */}
          <TabsContent value="gestao" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Produtos do dia</CardTitle>
                  <p className="text-sm text-foreground/70">
                    Selecione os produtos que ficarão visíveis na página inicial para os clientes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="menu-date" className="text-sm text-foreground/70">
                    Data
                  </Label>
                  <Input
                    id="menu-date"
                    type="date"
                    value={selectedMenuDate}
                    onChange={(event) => setSelectedMenuDate(event.target.value || getTodayDateString())}
                    className="w-auto"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loadingDailySelection ? (
                  <div className="py-6 text-center text-foreground/70">A carregar menu do dia...</div>
                ) : allProducts.length === 0 ? (
                  <p className="py-6 text-center text-foreground/70">
                    Nenhum produto cadastrado.
                  </p>
                ) : Object.keys(groupedProducts).length === 0 ? (
                  <p className="py-6 text-center text-foreground/70">
                    Nenhum produto disponível para esta data.
                  </p>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedProducts).map(([category, products]) => (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground">
                            {PRODUCT_CATEGORY_LABELS[category] ?? category}
                          </h3>
                          <span className="text-xs text-foreground/60">{products.length} produto(s)</span>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {products.map((product) => {
                            const isSelected = dailyProductIds.includes(product.id);
                            return (
                              <div
                                key={product.id}
                                className="flex items-start justify-between gap-4 rounded-lg border p-4"
                              >
                                <div>
                                  <p className="font-medium text-foreground">{product.name}</p>
                                  <p className="text-sm text-foreground/70">{formatCurrency(product.base_price)}</p>
                                </div>
                                <Switch
                                  checked={isSelected}
                                  onCheckedChange={(value) => handleToggleDailyProduct(product.id, value)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Promoções</CardTitle>
                  <p className="text-sm text-foreground/70">
                    Crie e gere promoções válidas para o dia, incluindo entregas grátis e descontos específicos.
                  </p>
                </div>
                <Button onClick={handleOpenNewPromotion}>Nova Promoção</Button>
              </CardHeader>
              <CardContent>
                {promotions.length === 0 ? (
                  <p className="py-6 text-center text-foreground/70">Nenhuma promoção cadastrada.</p>
                ) : (
                  <div className="space-y-4">
                    {promotions.map((promotion) => {
                      const productNames = promotion.applies_to_all
                        ? []
                        : (promotion.promotion_products ?? [])
                            .map((link) => allProducts.find((product) => product.id === link.product_id)?.name)
                            .filter(Boolean) as string[];

                      return (
                        <div key={promotion.id} className="rounded-lg border p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-foreground">{promotion.title}</h3>
                                <Badge variant={promotion.active ? "default" : "secondary"}>
                                  {promotion.active ? "Ativa" : "Inativa"}
                                </Badge>
                              </div>
                              {promotion.description && (
                                <p className="text-sm text-foreground/70">{promotion.description}</p>
                              )}
                              <div className="flex flex-wrap gap-2 text-sm text-foreground/80">
                                <span>
                                  {promotion.discount_type === "percentage" && promotion.discount_value !== null
                                    ? `Desconto de ${promotion.discount_value}%`
                                    : promotion.discount_type === "fixed" && promotion.discount_value !== null
                                    ? `Desconto de ${formatCurrency(promotion.discount_value)}`
                                    : "Entrega grátis"}
                                </span>
                                {promotion.free_shipping && promotion.discount_type !== "free_shipping" && (
                                  <Badge variant="outline">Entrega grátis</Badge>
                                )}
                              </div>
                              <div className="space-y-1 text-sm text-foreground/70">
                                <p>
                                  {promotion.starts_at
                                    ? `Início: ${new Date(promotion.starts_at).toLocaleString('pt-PT')}`
                                    : "Sem data inicial definida"}
                                </p>
                                <p>
                                  {promotion.ends_at
                                    ? `Fim: ${new Date(promotion.ends_at).toLocaleString('pt-PT')}`
                                    : "Sem data final definida"}
                                </p>
                                <p>
                                  {promotion.applies_to_all
                                    ? "Aplica-se a todos os produtos"
                                    : productNames.length > 0
                                      ? `Produtos: ${productNames.join(", ")}`
                                      : "Sem produtos associados"}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 md:items-end">
                              <Button variant="outline" size="sm" onClick={() => handleEditPromotion(promotion)}>
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTogglePromotionActive(promotion.id, !promotion.active)}
                              >
                                {promotion.active ? "Desativar" : "Ativar"}
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeletePromotion(promotion.id)}>
                                Excluir
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="produtos-admin" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Gestão de Produtos</CardTitle>
                  <p className="text-sm text-foreground/70">
                    Adicione, edite ou remova produtos disponívels no catálogo. Certifique-se de que o bucket <strong>products-images</strong> existe no Supabase Storage.
                  </p>
                </div>
                <Button onClick={handleOpenNewProduct}>Novo produto</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <Input
                    placeholder="Pesquisar por nome ou categoria"
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    className="md:w-72"
                  />
                  <span className="text-sm text-foreground/70">
                    A mostrar {filteredProductsList.length} de {allProducts.length} produtos
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-foreground font-semibold">Imagem</TableHead>
                        <TableHead className="text-foreground font-semibold">Produto</TableHead>
                        <TableHead className="text-foreground font-semibold">Categoria</TableHead>
                        <TableHead className="text-foreground font-semibold">Preço Base</TableHead>
                        <TableHead className="text-foreground font-semibold">Estado</TableHead>
                        <TableHead className="text-foreground font-semibold">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProductsList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-foreground/70">
                            Nenhum produto encontrado para o filtro aplicado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProductsList.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="h-16 w-16 rounded-md object-cover"
                                />
                              ) : (
                                <span className="text-xs text-foreground/50">Sem imagem</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">{product.name}</span>
                                {product.description && (
                                  <span className="text-xs text-foreground/70 line-clamp-2">
                                    {product.description}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {PRODUCT_CATEGORY_LABELS[product.category] ?? product.category}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(product.base_price)}</TableCell>
                            <TableCell>
                              <Badge variant={product.available ? "default" : "secondary"}>
                                {product.available ? "Disponível" : "Indisponível"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleEditProduct(product)}>
                                  Editar
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setProductToDelete(product)}>
                                  Remover
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog
        open={promotionDialogOpen}
        onOpenChange={(open) => {
          setPromotionDialogOpen(open);
          if (!open) {
            resetPromotionFormState();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{promotionForm.id ? "Editar promoção" : "Nova promoção"}</DialogTitle>
            <DialogDescription className="text-foreground">
              Configure descontos e vantagens que serão aplicados ao menu do dia.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="promotion-title">Título</Label>
              <Input
                id="promotion-title"
                value={promotionForm.title}
                onChange={(event) => setPromotionForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="promotion-description">Descrição</Label>
              <Textarea
                id="promotion-description"
                value={promotionForm.description}
                onChange={(event) => setPromotionForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2 md:gap-4">
              <div className="grid gap-2">
                <Label>Tipo de desconto</Label>
                <Select
                  value={promotionForm.discountType}
                  onValueChange={(value) =>
                    setPromotionForm((prev) => ({
                      ...prev,
                      discountType: value as PromotionDiscountType,
                      discountValue: value === "free_shipping" ? "" : prev.discountValue,
                      freeShipping: value === "free_shipping" ? true : prev.freeShipping,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (€)</SelectItem>
                    <SelectItem value="free_shipping">Entrega grátis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {promotionForm.discountType !== "free_shipping" && (
                <div className="grid gap-2">
                  <Label htmlFor="promotion-discount-value">
                    Valor do desconto {promotionForm.discountType === "percentage" ? "(%)" : "(€)"}
                  </Label>
                  <Input
                    id="promotion-discount-value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={promotionForm.discountValue}
                    onChange={(event) =>
                      setPromotionForm((prev) => ({ ...prev, discountValue: event.target.value }))
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="promotion-free-shipping"
                  checked={promotionForm.freeShipping || promotionForm.discountType === "free_shipping"}
                  onCheckedChange={(checked) =>
                    setPromotionForm((prev) => ({
                      ...prev,
                      freeShipping: prev.discountType === "free_shipping" ? true : checked,
                    }))
                  }
                  disabled={promotionForm.discountType === "free_shipping"}
                />
                <Label htmlFor="promotion-free-shipping" className="text-sm text-foreground">
                  Incluir entrega grátis
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="promotion-applies-all"
                  checked={promotionForm.appliesToAll}
                  onCheckedChange={(checked) => setPromotionForm((prev) => ({ ...prev, appliesToAll: checked }))}
                />
                <Label htmlFor="promotion-applies-all" className="text-sm text-foreground">
                  Aplica-se a todos os produtos
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="promotion-active"
                  checked={promotionForm.active}
                  onCheckedChange={(checked) => setPromotionForm((prev) => ({ ...prev, active: checked }))}
                />
                <Label htmlFor="promotion-active" className="text-sm text-foreground">
                  Promoção ativa
                </Label>
              </div>
            </div>

            {!promotionForm.appliesToAll && (
              <div className="grid gap-2">
                <Label>Selecionar produtos</Label>
                <div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border p-4">
                  {allProducts.length === 0 ? (
                    <p className="text-sm text-foreground/70">Nenhum produto disponível.</p>
                  ) : (
                    allProducts.map((product) => (
                      <label key={product.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-foreground">{product.name}</span>
                        <Checkbox
                          checked={promotionProductsSelection.includes(product.id)}
                          onCheckedChange={(checked) =>
                            handlePromotionProductsSelection(product.id, Boolean(checked))
                          }
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-2 md:grid-cols-2 md:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="promotion-start">Início</Label>
                <Input
                  id="promotion-start"
                  type="datetime-local"
                  value={promotionForm.startsAt}
                  onChange={(event) => setPromotionForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promotion-end">Fim</Label>
                <Input
                  id="promotion-end"
                  type="datetime-local"
                  value={promotionForm.endsAt}
                  onChange={(event) => setPromotionForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPromotionDialogOpen(false);
                resetPromotionFormState();
              }}
              disabled={savingPromotion}
            >
              Cancelar
            </Button>
            <Button onClick={handleSavePromotion} disabled={savingPromotion}>
              {savingPromotion ? "A guardar..." : "Guardar promoção"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes do Pedido */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription className="text-foreground">
              Informações completas do pedido
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Informações do Pedido */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground/70">Número do Pedido</span>
                    <span className="font-mono text-sm text-foreground font-medium">
                      {selectedOrder.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground/70">Data</span>
                    <span className="text-sm text-foreground">
                      {new Date(selectedOrder.created_at).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-foreground/70">Status</span>
                    <Badge variant={getStatusBadgeVariant(selectedOrder.status)}>
                      {getStatusLabel(selectedOrder.status)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Itens do Pedido */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Itens do Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingItems ? (
                    <div className="flex items-center justify-center py-8">
                      <Package className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : orderItems.length === 0 ? (
                    <p className="text-center text-foreground/70 py-4">Nenhum item encontrado</p>
                  ) : (
                    <div className="space-y-3">
                      {orderItems.map((item) => {
                        const discount = item.discount_amount ?? 0;
                        const hasDiscount = discount > 0;
                        return (
                          <div key={item.id} className="flex justify-between items-start py-2 border-b last:border-0">
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{item.product_name}</p>
                              <p className="text-sm text-foreground/70">
                                {item.quantity}x {item.unit_price.toFixed(2)}€
                              </p>
                              {hasDiscount && (
                                <p className="text-xs text-emerald-600">
                                  Promoção: -{discount.toFixed(2)}€
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {hasDiscount && (
                                <p className="text-xs text-foreground/60 line-through">
                                  {(item.unit_price * item.quantity).toFixed(2)}€
                                </p>
                              )}
                              <p className="font-medium text-foreground">
                                {item.total_price.toFixed(2)}€
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumo Financeiro */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-foreground/70">Subtotal</span>
                    <span className="text-foreground font-medium">
                      {(selectedOrder.subtotal || selectedOrder.total - (selectedOrder.delivery_fee || 0)).toFixed(2)}€
                    </span>
                  </div>
                  {(selectedOrder.discount_total ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 text-sm">
                      <span>Descontos</span>
                      <span>-{(selectedOrder.discount_total ?? 0).toFixed(2)}€</span>
                    </div>
                  )}
                  {selectedOrder.delivery_fee !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Taxa de Entrega</span>
                      <span className="text-foreground font-medium">
                        {selectedOrder.delivery_fee === 0 ? "Grátis" : `${selectedOrder.delivery_fee.toFixed(2)}€`}
                      </span>
                    </div>
                  )}
                  {selectedOrder.scheduled_for && (
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Agendado para</span>
                      <span className="text-foreground font-medium">
                        {`${new Date(selectedOrder.scheduled_for).toLocaleDateString('pt-PT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })} (09:00 - 16:30)`}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-foreground">Total</span>
                    <span className="text-primary">{selectedOrder.total.toFixed(2)}€</span>
                  </div>
                  {selectedOrder.applied_promotions && selectedOrder.applied_promotions.length > 0 && (
                    <div className="pt-2 text-sm text-foreground/70">
                      <p className="mb-1">Promoções aplicadas:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedOrder.applied_promotions.map((promotion) => (
                          <li key={promotion.id}>
                            {promotion.title}
                            {promotion.free_shipping ? " • Entrega grátis" : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Informações do Cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações do Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-foreground/70">Nome</span>
                    <p className="text-foreground font-medium">{selectedOrder.customer_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-foreground/70">Email</span>
                    <p className="text-foreground">{selectedOrder.customer_email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-foreground/70">Telefone</span>
                    <p className="text-foreground">{selectedOrder.customer_phone}</p>
                  </div>
                  {selectedOrder.delivery_address && (
                    <div>
                      <span className="text-sm text-foreground/70">Endereço de Entrega</span>
                      <p className="text-foreground">{selectedOrder.delivery_address}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-foreground/70">Tipo de Entrega</span>
                    <Badge variant={selectedOrder.delivery_type === 'entrega' ? 'default' : 'secondary'} className="ml-2">
                      {selectedOrder.delivery_type === 'entrega' ? 'Entrega' : 'Recolher'}
                    </Badge>
                  </div>
                  {selectedOrder.scheduled_for && (
                    <div>
                      <span className="text-sm text-foreground/70">Agendado para</span>
                      <p className="text-foreground">
                        {new Date(selectedOrder.scheduled_for).toLocaleDateString('pt-PT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })} (09:00 - 16:30)
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-foreground/70">Método de Pagamento</span>
                    <Badge variant="outline" className="ml-2">
                      {selectedOrder.payment_method === 'dinheiro' ? 'Dinheiro' : 'MB WAY'}
                    </Badge>
                  </div>
                  {selectedOrder.notes && (
                    <div>
                      <span className="text-sm text-foreground/70">Observações</span>
                      <p className="text-foreground">{selectedOrder.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground">
              <p className="mb-4">Tem certeza que deseja excluir este pedido?</p>
              <div className="space-y-2 mb-4">
                <p className="text-foreground">
                  <strong className="text-foreground">Pedido:</strong> #{orderToDelete?.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-foreground">
                  <strong className="text-foreground">Cliente:</strong> {orderToDelete?.customer_name}
                </p>
                <p className="text-foreground">
                  <strong className="text-foreground">Total:</strong> {orderToDelete?.total.toFixed(2)}€
                </p>
              </div>
              <p className="text-destructive font-semibold">
                Esta ação não pode ser desfeita!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Excluindo..." : "Excluir Pedido"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Produtos */}
      <Dialog
        open={productDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetProductForm();
            setProductDialogOpen(false);
          } else {
            setProductDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{productForm.id ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription className="text-foreground">
              Preencha as informações abaixo. Utilize o bucket <strong>products-images</strong> no Supabase Storage para armazenar as fotos.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Torta Chococlair"
                value={productForm.name}
                onChange={(event) => handleProductInputChange("name", event.target.value)}
              />
            </div>

            <div className="grid gap-2 md:grid-cols-2 md:gap-4">
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Select
                  value={productForm.category}
                  onValueChange={(value) => handleProductInputChange("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Preço base (€)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 25.00"
                  value={productForm.basePrice}
                  onChange={(event) => handleProductInputChange("basePrice", event.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Disponível</p>
                <p className="text-xs text-foreground/70">Controla a visibilidade do produto no catálogo.</p>
              </div>
              <Switch
                checked={productForm.available}
                onCheckedChange={(checked) => handleProductInputChange("available", checked)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Texto opcional para apresentar o produto"
                value={productForm.description}
                onChange={(event) => handleProductInputChange("description", event.target.value)}
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label>Imagem</Label>
              <Input type="file" accept="image/*" onChange={handleProductImageChange} />
              {(productImagePreview || productForm.imageUrl) && (
                <div className="mt-2">
                  <p className="text-xs text-foreground/70 mb-2">Pré-visualização:</p>
                  <img
                    src={productImagePreview ?? productForm.imageUrl}
                    alt={productForm.name || "Pré-visualização"}
                    className="h-40 w-full rounded-md object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetProductForm();
                setProductDialogOpen(false);
              }}
              disabled={productSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveProduct} disabled={productSaving}>
              {productSaving ? "A guardar..." : productForm.id ? "Guardar alterações" : "Criar produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão de Produto */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza de que deseja remover "{productToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={productDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} disabled={productDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {productDeleting ? "A remover..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
