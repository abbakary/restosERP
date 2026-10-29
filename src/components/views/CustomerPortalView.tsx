import React, { useState } from 'react';
import { 
  QrCode, 
  ShoppingBag, 
  Search, 
  UtensilsCrossed, 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  Receipt, 
  Plus, 
  Minus, 
  ArrowRight, 
  Sparkles, 
  Smartphone, 
  Monitor, 
  AlertCircle, 
  CreditCard, 
  Share2, 
  X,
  HelpCircle,
  BellRing
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { MenuItem, Order, OrderItem } from '../../types/erp';

export const CustomerPortalView: React.FC = () => {
  const { 
    currentSite, 
    menuItems, 
    orders, 
    tables, 
    serviceMode, 
    addOrder, 
    addItemsToOrder, 
    requestBill,
    payOrder
  } = useErp();

  // Simulated guest location & state
  const [selectedTableNumber, setSelectedTableNumber] = useState<number>(4);
  const [orderType, setOrderType] = useState<'Dine-in' | 'Takeaway'>('Dine-in');
  const [guestName, setGuestName] = useState<string>('Sarah M.');
  const [guestPhone, setGuestPhone] = useState<string>('+255 784 112 233');

  // Customer Cart
  const [cart, setCart] = useState<{ menuItem: MenuItem; quantity: number; notes: string }[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState<boolean>(false);

  // Active tracked order (persists across re-orders for the customer)
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Category filter and search
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItemDetail, setSelectedItemDetail] = useState<MenuItem | null>(null);
  const [itemNoteInput, setItemNoteInput] = useState<string>('');

  // Payment simulated modal
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState<'M-Pesa / Mobile Money' | 'Credit Card' | 'Cash'>('M-Pesa / Mobile Money');
  const [customerToast, setCustomerToast] = useState<string | null>(null);

  // View frame mode: 'mobile_shell' or 'expanded'
  const [viewDevice, setViewDevice] = useState<'mobile_shell' | 'expanded'>('expanded');

  const categories = ['All', 'Main Course', 'Steaks & Grill', 'Seafood', 'Starters & Salads', 'Desserts', 'Beverages & Cocktails'];

  // Look up existing order on this table if none selected yet
  const liveOrderOnTable = orders.find(o => 
    orderType === 'Dine-in' && 
    o.tableNumber === selectedTableNumber && 
    o.status !== 'paid' && 
    o.status !== 'voided'
  );

  // Current tracked order
  const currentTrackedOrder = orders.find(o => o.id === (activeOrderId || liveOrderOnTable?.id));

  const showToast = (msg: string) => {
    setCustomerToast(msg);
    setTimeout(() => setCustomerToast(null), 4000);
  };

  // Filter menu items
  const filteredMenu = menuItems.filter(item => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch && !item.is86;
  });

  const cartSubtotal = cart.reduce((sum, i) => sum + (i.menuItem.price * i.quantity), 0);
  const cartTax = Math.round(cartSubtotal * currentSite.taxRate);
  const cartServiceCharge = orderType === 'Dine-in' ? Math.round(cartSubtotal * currentSite.serviceChargeRate) : 0;
  const cartTotal = cartSubtotal + cartTax + cartServiceCharge;

  // Add to cart helper
  const handleAddToCart = (item: MenuItem, notes: string = '') => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.menuItem.id === item.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].quantity += 1;
        if (notes) copy[idx].notes = notes;
        return copy;
      }
      return [...prev, { menuItem: item, quantity: 1, notes }];
    });
    setSelectedItemDetail(null);
    setItemNoteInput('');
    showToast(`Added ${item.name} to cart!`);
  };

  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.menuItem.id === itemId) {
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : null;
      }
      return i;
    }).filter(Boolean) as { menuItem: MenuItem; quantity: number; notes: string }[]);
  };

  // Submit order
  const handlePlaceOrder = () => {
    if (cart.length === 0) return;

    const formattedItems: OrderItem[] = cart.map(c => ({
      id: `cit-${Math.random().toString(36).substring(2, 7)}`,
      menuItemId: c.menuItem.id,
      name: c.menuItem.name,
      imageUrl: c.menuItem.imageUrl,
      price: c.menuItem.price,
      quantity: c.quantity,
      station: c.menuItem.station,
      course: c.menuItem.category.includes('Starters') ? 'Starter' : (c.menuItem.category.includes('Desserts') ? 'Dessert' : (c.menuItem.category.includes('Beverages') ? 'Drinks' : 'Main')),
      specialNotes: c.notes || undefined,
      status: 'pending',
      firedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    if (currentTrackedOrder && currentTrackedOrder.status !== 'paid') {
      // Re-order on same open table session
      addItemsToOrder(currentTrackedOrder.id, formattedItems);
      showToast(`Extra items sent to the kitchen for Table ${selectedTableNumber}!`);
    } else {
      // Fresh new customer order
      const newOrder = addOrder({
        type: orderType,
        tableNumber: orderType === 'Dine-in' ? selectedTableNumber : undefined,
        customerName: guestName,
        customerPhone: guestPhone,
        serverName: serviceMode === 'counter_qr_no_waiter' ? 'Self-Service QR' : 'Assigned Waiter',
        items: formattedItems
      });
      setActiveOrderId(newOrder.id);
      showToast(`Order placed successfully! Order #${newOrder.orderNumber}`);
    }

    setCart([]);
    setCartDrawerOpen(false);
  };

  // Settle bill
  const handleSettleCustomerPayment = () => {
    if (!currentTrackedOrder) return;
    payOrder(currentTrackedOrder.id, selectedPayMethod);
    setPaymentModalOpen(false);
    showToast(`Payment of ${currentSite.currency} ${currentTrackedOrder.total.toLocaleString()} confirmed via ${selectedPayMethod}!`);
  };

  // Portal inner content
  const renderPortalContent = () => (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative">
      {/* Customer Header */}
      <div className="bg-gradient-to-r from-[#163a2b] via-[#1d4d38] to-[#132f23] text-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3cb371] text-slate-950 flex items-center justify-center font-extrabold text-base shadow-sm">
              R
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base leading-tight">{currentSite.name}</h2>
              <div className="text-xs text-emerald-200/80 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Contactless QR Ordering & Live Tracker</span>
              </div>
            </div>
          </div>

          {/* Table / Order Type Badge */}
          <div className="text-right">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-emerald-200 text-xs font-mono font-bold border border-white/10">
              <QrCode className="w-3.5 h-3.5 text-[#3cb371]" />
              <span>{orderType === 'Dine-in' ? `Table ${selectedTableNumber.toString().padStart(2, '0')}` : 'Takeaway'}</span>
            </div>
          </div>
        </div>

        {/* Operating Mode notification */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-emerald-100/90">
          <div className="flex items-center gap-2">
            <span className="text-2xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/20 text-[#3cb371]">
              {serviceMode === 'full_service_waiter' ? 'Full Dine-in Service' : 'Self-Service Pickup'}
            </span>
            <span className="text-xs hidden sm:inline">
              {serviceMode === 'full_service_waiter' ? 'Waiters deliver directly to your table.' : 'Pick up at the food counter when ready.'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <select
              value={selectedTableNumber}
              onChange={e => setSelectedTableNumber(Number(e.target.value))}
              className="bg-black/30 border border-white/20 rounded-md text-xs text-white px-2 py-1 focus:outline-none cursor-pointer"
            >
              {tables.map(t => (
                <option key={t.id} value={t.number} className="bg-slate-900 text-white">
                  Table {t.number} ({t.section})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Body: Track Active Order (if exists) OR Browse Menu */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        {/* Live Order Tracker Banner (if customer has an active order) */}
        {currentTrackedOrder && currentTrackedOrder.status !== 'paid' && (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#3cb371]/50 shadow-md space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">Live Order Engine</span>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900">
                    Order #{currentTrackedOrder.orderNumber}
                  </h3>
                  <span className="text-2xs font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    {currentTrackedOrder.createdAt}
                  </span>
                </div>
              </div>

              {/* Status Chip */}
              <div className="text-right">
                <span className={`text-xs px-2.5 py-1 rounded-lg font-bold font-mono ${
                  currentTrackedOrder.status === 'ready' 
                    ? 'bg-amber-500 text-slate-950 animate-pulse' 
                    : (currentTrackedOrder.status === 'served' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white')
                }`}>
                  {currentTrackedOrder.status === 'in_kitchen' && 'Cooking in Kitchen'}
                  {currentTrackedOrder.status === 'ready' && (serviceMode === 'full_service_waiter' ? 'Plated - Waiter Serving' : 'Ready at Pickup Counter!')}
                  {currentTrackedOrder.status === 'served' && 'Delivered to Table'}
                </span>
              </div>
            </div>

            {/* 4-Stage Progress Stepper */}
            <div className="grid grid-cols-4 gap-2 pt-2 pb-1 border-t border-slate-100 text-center">
              <div className="space-y-1">
                <div className="w-7 h-7 mx-auto rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  ✓
                </div>
                <div className="text-2xs font-bold text-slate-800">Order Placed</div>
              </div>

              <div className="space-y-1">
                <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
                  currentTrackedOrder.status === 'in_kitchen' || currentTrackedOrder.status === 'ready' || currentTrackedOrder.status === 'served'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  <ChefHat className="w-3.5 h-3.5" />
                </div>
                <div className="text-2xs font-bold text-slate-800">In Kitchen</div>
              </div>

              <div className="space-y-1">
                <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
                  currentTrackedOrder.status === 'ready' || currentTrackedOrder.status === 'served'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  <BellRing className="w-3.5 h-3.5" />
                </div>
                <div className="text-2xs font-bold text-slate-800">
                  {serviceMode === 'counter_qr_no_waiter' ? 'Ready for Pickup' : 'Ready at Pass'}
                </div>
              </div>

              <div className="space-y-1">
                <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${
                  currentTrackedOrder.status === 'served'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-2xs font-bold text-slate-800">Served</div>
              </div>
            </div>

            {/* Ready Callout for Counter Mode */}
            {serviceMode === 'counter_qr_no_waiter' && currentTrackedOrder.status === 'ready' && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
                  🛎️
                </div>
                <div>
                  <div className="font-extrabold text-sm">Please Collect Your Order at the Food Pass!</div>
                  <div>Show token <strong>#{currentTrackedOrder.orderNumber.slice(-4)}</strong> to the kitchen expeditor.</div>
                </div>
              </div>
            )}

            {/* List of items in active order with food photography */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Dishes on Table Session</div>
              {currentTrackedOrder.items.map(it => (
                <div key={it.id} className="flex items-center gap-2.5 py-1.5 border-b border-slate-200/60 last:border-0">
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                    {it.imageUrl ? (
                      <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-2xs text-emerald-800 bg-emerald-50">
                        {it.name.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 truncate">
                      <span className="text-emerald-700 mr-1.5">{it.quantity}x</span>
                      {it.name}
                    </div>
                    <div className="text-2xs text-slate-500 font-mono mt-0.5">
                      {currentSite.currency} {(it.price * it.quantity).toLocaleString()} · {it.station} Station
                    </div>
                  </div>
                  <span className={`text-2xs px-2.5 py-1 rounded-lg font-mono font-bold ${
                    it.status === 'ready' ? 'bg-amber-100 text-amber-800 animate-pulse' : (it.status === 'served' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600')
                  }`}>
                    {it.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill Action row */}
            <div className="flex items-center justify-between pt-1">
              <div className="font-mono">
                <span className="text-xs text-slate-500">Total: </span>
                <span className="text-sm font-extrabold text-emerald-800">
                  {currentSite.currency} {currentTrackedOrder.total.toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    requestBill(currentTrackedOrder.id);
                    showToast('Bill request sent to Waiter & Cashier!');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  Request Bill
                </button>
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#163a2b] hover:bg-[#1d4d38] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#3cb371]" />
                  <span>Pay Now (Mobile / Card)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Menu Search & Category Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900">
              {currentTrackedOrder ? 'Add Extra Items to Order' : 'Browse Restaurant Menu'}
            </h3>
            <span className="text-xs text-slate-400 font-mono">{filteredMenu.length} items</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search grilled steaks, seafood, cocktails..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 shadow-2xs"
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#163a2b] text-white font-bold shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid with Food Photography */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredMenu.map(dish => (
            <div
              key={dish.id}
              onClick={() => setSelectedItemDetail(dish)}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Image */}
                <div className="h-36 w-full relative bg-slate-100 overflow-hidden">
                  {dish.imageUrl ? (
                    <img
                      src={dish.imageUrl}
                      alt={dish.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-800 font-bold text-sm">
                      {dish.category}
                    </div>
                  )}
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-2xs font-mono">
                    {dish.preparationTimeMins} mins
                  </span>
                </div>

                {/* Details */}
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-900 leading-tight">
                      {dish.name}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {dish.description}
                  </p>
                </div>
              </div>

              {/* Price & Add bar */}
              <div className="px-3.5 pb-3.5 pt-1 flex items-center justify-between border-t border-slate-100">
                <span className="text-sm font-extrabold text-emerald-800 font-mono">
                  {currentSite.currency} {dish.price.toLocaleString()}
                </span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleAddToCart(dish);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-[#3cb371] text-emerald-800 hover:text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bottom Cart Bar (if basket has items) */}
      {cart.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-3.5 shadow-2xl flex items-center justify-between z-30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-[#163a2b] text-white flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5 text-[#3cb371]" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold text-2xs flex items-center justify-center font-mono">
                {cart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Your Basket</div>
              <div className="text-xs text-emerald-700 font-mono font-bold">
                {currentSite.currency} {cartTotal.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCartDrawerOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
            >
              Review
            </button>
            <button
              onClick={handlePlaceOrder}
              className="px-4 py-2 rounded-xl bg-[#163a2b] hover:bg-[#1d4d38] text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>{currentTrackedOrder ? 'Send to Kitchen' : 'Place Order'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#3cb371]" />
            </button>
          </div>
        </div>
      )}

      {/* Cart Review Drawer */}
      {cartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-base text-slate-900">Your Dining Basket</h3>
              </div>
              <button
                onClick={() => setCartDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {cart.map(item => (
                <div key={item.menuItem.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                      {item.menuItem.imageUrl ? (
                        <img src={item.menuItem.imageUrl} alt={item.menuItem.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-2xs text-emerald-800 bg-emerald-50">
                          {item.menuItem.name.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{item.menuItem.name}</div>
                      <div className="text-2xs text-slate-400 font-mono">
                        {currentSite.currency} {item.menuItem.price.toLocaleString()} each
                      </div>
                    </div>
                    <span className="font-bold font-mono text-xs text-emerald-700 shrink-0">
                      {currentSite.currency} {(item.menuItem.price * item.quantity).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQty(item.menuItem.id, -1)}
                        className="w-6 h-6 rounded bg-white border border-slate-200 text-xs font-bold flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold font-mono">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(item.menuItem.id, 1)}
                        className="w-6 h-6 rounded bg-white border border-slate-200 text-xs font-bold flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Special instructions (no salt, extra spicy)..."
                      value={item.notes}
                      onChange={e => {
                        const val = e.target.value;
                        setCart(prev => prev.map(c => c.menuItem.id === item.menuItem.id ? { ...c, notes: val } : c));
                      }}
                      className="text-2xs px-2 py-1 bg-white border border-slate-200 rounded-md w-48 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Financial summary */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>{currentSite.currency} {cartSubtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax VAT ({Math.round(currentSite.taxRate * 100)}%)</span>
                <span>{currentSite.currency} {cartTax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Service Charge</span>
                <span>{currentSite.currency} {cartServiceCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-extrabold text-slate-900 pt-1 border-t border-slate-200 text-sm">
                <span>Estimated Total</span>
                <span className="text-emerald-800">{currentSite.currency} {cartTotal.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              className="w-full py-3 rounded-xl bg-[#163a2b] hover:bg-[#1d4d38] text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ChefHat className="w-4 h-4 text-[#3cb371]" />
              <span>Confirm & Fire to Kitchen</span>
            </button>
          </div>
        </div>
      )}

      {/* Item Detail / Customization Modal */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {selectedItemDetail.imageUrl && (
              <img
                src={selectedItemDetail.imageUrl}
                alt={selectedItemDetail.name}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-2xs font-mono uppercase tracking-wider text-emerald-700 font-bold">
                    {selectedItemDetail.category}
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900">{selectedItemDetail.name}</h3>
                </div>
                <span className="font-extrabold text-sm text-emerald-800 font-mono">
                  {currentSite.currency} {selectedItemDetail.price.toLocaleString()}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedItemDetail.description}
              </p>

              {/* Special Instructions */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kitchen Notes & Preferences
                </label>
                <input
                  type="text"
                  placeholder="e.g. dressing on the side, well done, allergy alert..."
                  value={itemNoteInput}
                  onChange={e => setItemNoteInput(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedItemDetail(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAddToCart(selectedItemDetail, itemNoteInput)}
                  className="flex-1 py-2.5 rounded-xl bg-[#163a2b] hover:bg-[#1d4d38] text-white text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-[#3cb371]" />
                  <span>Add to Basket</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Settlement Modal */}
      {paymentModalOpen && currentTrackedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-base text-slate-900">Settle Order #{currentTrackedOrder.orderNumber}</h3>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-1">
              <div className="text-xs text-emerald-800 font-semibold">Total Amount Due</div>
              <div className="text-2xl font-black text-emerald-950 font-mono">
                {currentSite.currency} {currentTrackedOrder.total.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-700 font-mono">
                Includes VAT ({Math.round(currentSite.taxRate * 100)}%) & Service Charge
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Select Payment Channel</label>
              {[
                { id: 'M-Pesa / Mobile Money', label: 'M-Pesa / Airtel Money / Tigo Pesa' },
                { id: 'Credit Card', label: 'Visa / Mastercard / Contactless NFC' },
                { id: 'Cash', label: 'Cash at Counter / Waiter' }
              ].map(method => (
                <div
                  key={method.id}
                  onClick={() => setSelectedPayMethod(method.id as any)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedPayMethod === method.id
                      ? 'border-[#3cb371] bg-emerald-50/50 shadow-2xs font-bold text-slate-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs">{method.label}</span>
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedPayMethod === method.id ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                  }`}>
                    {selectedPayMethod === method.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleSettleCustomerPayment}
              className="w-full py-3 rounded-xl bg-[#163a2b] hover:bg-[#1d4d38] text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#3cb371]" />
              <span>Confirm & Receive Digital Receipt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {customerToast && (
        <div className="fixed top-18 right-6 z-50 bg-[#163a2b] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#3cb371] flex items-center gap-3 animate-in fade-in slide-in-from-top duration-200">
          <div className="p-1.5 bg-[#3cb371] rounded-lg text-slate-950 font-bold">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">{customerToast}</span>
        </div>
      )}

      {/* Simulator Control Header */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">Customer QR Self-Ordering Portal</h1>
            <p className="text-xs text-slate-500">
              Direct table/takeaway guest portal · Real-time single order engine · Kitchen tracking & bill settlement
            </p>
          </div>
        </div>

        {/* Viewport Framing Switcher (Mobile Mockup vs Full Screen) */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setViewDevice('expanded')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewDevice === 'expanded' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Responsive / Tablet</span>
          </button>
          <button
            onClick={() => setViewDevice('mobile_shell')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewDevice === 'mobile_shell' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Phone Shell</span>
          </button>
        </div>
      </div>

      {/* Viewport Frame */}
      {viewDevice === 'mobile_shell' ? (
        <div className="flex justify-center py-4">
          <div className="w-full max-w-[420px] h-[820px] bg-white rounded-[44px] shadow-2xl border-[10px] border-slate-800 overflow-hidden flex flex-col relative ring-1 ring-slate-900/10">
            {/* Phone speaker notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-800 rounded-full z-40" />
            <div className="pt-4 flex-1 flex flex-col min-h-0 overflow-hidden">
              {renderPortalContent()}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs min-h-[680px] flex flex-col">
          {renderPortalContent()}
        </div>
      )}
    </div>
  );
};
