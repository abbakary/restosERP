import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing, Check, ChevronUp, Flame, Receipt, ShoppingCart, X, Plus, Clock, Users, ArrowLeft, QrCode, ConciergeBell, Brush, ChefHat,
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import { Order, RestaurantTable } from '../../types/erp';
import {
  CartLines, COURSES, FulfilmentCard, MenuBrowser, OrderQueue, ServiceSwitch, ServiceType, TableFloor, TotalsBlock,
  calcTotals, isOpenOrder, itemStatusCls, statusMeta, toOrderItems, tzs, useCart, useFulfilment,
} from '../front/shared';

/* ────────────────────────────────────────────────────────────────
   Ordering workspace — full-screen, same grammar as the POS
   ──────────────────────────────────────────────────────────────── */
const OrderingWorkspace: React.FC<{
  mode: ServiceType;
  existing: Order | null;
  initialTable: number | null;
  onClose: () => void;
  onSent: (msg: string, order: Order | null) => void;
}> = ({ mode, existing, initialTable, onClose, onSent }) => {
  const { tables, menuItems, addOrder, addItemsToOrder, currentSite } = useErp();
  const cart = useCart();
  const ful = useFulfilment(initialTable);
  const { f } = ful;
  const [sheet, setSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fee = existing ? existing.deliveryFee || 0 : mode === 'Delivery' ? ful.fee : 0;
  const totals = calcTotals((existing?.subtotal ?? 0) + cart.subtotal, mode, currentSite, fee, existing?.discount || 0);

  const submit = () => {
    if (cart.lines.length === 0) return;
    if (!existing && mode === 'Dine-in' && f.tableNumber == null) { setError('Choose a table.'); return; }
    if (!existing && mode === 'Delivery' && !f.address.trim()) { setError('Add the delivery address.'); return; }
    const items = toOrderItems(cart.lines);
    if (existing) {
      addItemsToOrder(existing.id, items);
      onSent(`Added ${cart.count} item${cart.count === 1 ? '' : 's'} · kitchen ticket fired`, existing);
    } else {
      const created = addOrder({
        type: mode,
        tableNumber: mode === 'Dine-in' ? f.tableNumber ?? undefined : undefined,
        guestCount: mode === 'Dine-in' ? f.guests : 1,
        customerName: mode === 'Dine-in' ? undefined : f.name.trim() || undefined,
        customerPhone: mode === 'Dine-in' ? undefined : f.phone.trim() || undefined,
        deliveryAddress: mode === 'Delivery' ? f.address.trim() : undefined,
        deliveryFee: mode === 'Delivery' ? ful.fee : 0,
        pickupToken: mode === 'Takeaway' ? f.token : undefined,
        serverName: 'Emmanuel K. (Waiter)',
        items,
      });
      onSent(`${mode === 'Dine-in' ? `Table ${f.tableNumber}` : created.pickupToken || created.orderNumber} sent to kitchen`, created);
    }
  };

  const title = existing
    ? `Add to ${existing.type === 'Dine-in' ? `Table ${existing.tableNumber}` : existing.pickupToken || existing.orderNumber}`
    : mode === 'Dine-in' ? `New order · ${f.tableNumber != null ? `Table ${f.tableNumber}` : 'choose table'}` : `New ${mode.toLowerCase()} order`;

  return (
    <div className="fixed inset-0 z-40 bg-slate-100 flex flex-col">
      <header className="shrink-0 h-[72px] bg-white border-b border-slate-200 px-4 flex items-center gap-4">
        <button onClick={onClose} className="h-12 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center gap-2 font-extrabold"><ArrowLeft className="w-5 h-5" /> Back</button>
        <div className="min-w-0">
          <h1 className="text-xl font-black leading-tight truncate">{title}</h1>
          <p className="text-sm text-slate-500">Tap <b>Add</b> on dishes · notes & courses in the cart</p>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex relative">
        <div className="flex-1 min-w-0 min-h-0 relative">
          <MenuBrowser items={menuItems} cart={cart} hideSoldOut />
          {cart.count > 0 && (
            <button onClick={() => setSheet(true)} className="lg:hidden absolute bottom-4 inset-x-4 h-16 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center justify-between px-5">
              <span className="flex items-center gap-3 text-lg font-black"><span className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center">{cart.count}</span> View ticket</span>
              <span className="flex items-center gap-2 text-lg font-black tabular-nums">{tzs(cart.subtotal)} <ChevronUp className="w-5 h-5" /></span>
            </button>
          )}
        </div>

        <aside className={`${sheet ? 'fixed inset-0 z-50 flex' : 'hidden'} lg:static lg:z-auto lg:flex w-full lg:w-[410px] xl:w-[450px] shrink-0 flex-col bg-white border-l border-slate-200 min-h-0`}>
          <div className="shrink-0 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center"><ShoppingCart className="w-6 h-6" /></div>
            <div className="min-w-0 flex-1">
              <div className="text-xl font-black leading-tight">Kitchen ticket</div>
              <div className="text-sm font-semibold text-slate-500">{cart.count} item{cart.count === 1 ? '' : 's'}</div>
            </div>
            {cart.lines.length > 0 && <button onClick={cart.clear} className="h-10 px-3 rounded-xl text-sm font-extrabold text-rose-600 hover:bg-rose-50">Clear</button>}
            <button onClick={() => setSheet(false)} className="lg:hidden w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center" aria-label="Close"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 space-y-4 bg-slate-50">
            <FulfilmentCard mode={mode} state={ful} tables={tables} locked={!!existing} />
            {cart.lines.length > 0 ? <CartLines cart={cart} /> : (
              <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
                <ShoppingCart className="w-14 h-14 mx-auto text-slate-300" />
                <div className="mt-3 text-lg font-extrabold text-slate-700">Nothing added yet</div>
                <div className="text-sm text-slate-500">Pick dishes from the menu.</div>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t-2 border-slate-200 bg-white p-4 space-y-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.2)]">
            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            {(cart.lines.length > 0 || existing) && <TotalsBlock t={totals} vatLabel={`VAT (${Math.round(currentSite.taxRate * 100)}%)`} />}
            <button
              onClick={submit}
              disabled={cart.lines.length === 0}
              className="w-full h-16 rounded-2xl bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xl font-black flex items-center justify-center gap-3 shadow-lg"
            >
              <Flame className="w-6 h-6" /> Send to kitchen
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────
   Front-house view
   ──────────────────────────────────────────────────────────────── */
export const WaiterView: React.FC = () => {
  const {
    tables, orders, currentSite, serviceMode, setServiceMode, updateOrderItemStatus, updateOrderStatus, requestBill, updateTableStatus,
  } = useErp();

  const [channel, setChannel] = useState<ServiceType>('Dine-in');
  const [selTable, setSelTable] = useState<number | null>(null);
  const [selOrderId, setSelOrderId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<{ mode: ServiceType; table: number | null; extra: boolean } | null>(null);
  const [detailSheet, setDetailSheet] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const siteOrders = useMemo(() => orders.filter(o => o.siteId === currentSite.id && isOpenOrder(o)), [orders, currentSite.id]);
  const counts: Record<ServiceType, number> = {
    'Dine-in': siteOrders.filter(o => o.type === 'Dine-in').length,
    Takeaway: siteOrders.filter(o => o.type === 'Takeaway').length,
    Delivery: siteOrders.filter(o => o.type === 'Delivery').length,
  };

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(t);
  }, [notice]);

  const hasReady = (o: Order) => o.status === 'ready' || o.items.some(i => i.status === 'ready');
  const readyOrders = siteOrders.filter(hasReady);
  const label = (o: Order) => (o.type === 'Dine-in' ? `Table ${o.tableNumber}` : o.pickupToken || o.orderNumber);

  const selected: Order | null = channel === 'Dine-in'
    ? siteOrders.find(o => o.type === 'Dine-in' && o.tableNumber === selTable) || null
    : siteOrders.find(o => o.id === selOrderId && o.type === channel) || null;
  const selectedTable: RestaurantTable | undefined = tables.find(t => t.number === selTable);

  const serveReady = (o: Order) => {
    const n = o.items.filter(i => i.status === 'ready').length;
    o.items.forEach(i => { if (i.status === 'ready') updateOrderItemStatus(o.id, i.id, 'served'); });
    updateOrderStatus(o.id, 'served');
    setNotice(`${n || 'All'} dish${n === 1 ? '' : 'es'} served · ${label(o)}`);
  };

  const onTable = (t: RestaurantTable) => {
    setChannel('Dine-in');
    if (t.status === 'dirty') { setNotice(`Table ${t.number} needs cleaning first`); return; }
    setSelTable(t.number);
    const hasOrder = siteOrders.some(o => o.type === 'Dine-in' && o.tableNumber === t.number);
    if (hasOrder) setDetailSheet(true);
    else setWorkspace({ mode: 'Dine-in', table: t.number, extra: false }); // one tap to start an order on a free table
  };

  const switchChannel = (c: ServiceType) => { setChannel(c); setSelOrderId(null); setDetailSheet(false); };

  const courseGroups = selected ? COURSES.map(c => ({ course: c, items: selected.items.filter(i => i.course === c) })).filter(g => g.items.length) : [];
  const readyCount = selected ? selected.items.filter(i => i.status === 'ready').length : 0;

  const detail = (
    <aside className={`${detailSheet ? 'fixed inset-0 z-40 flex' : 'hidden'} lg:static lg:z-auto lg:flex w-full lg:w-[410px] xl:w-[450px] shrink-0 flex-col bg-white border-l border-slate-200 min-h-0`}>
      <div className="shrink-0 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center"><ConciergeBell className="w-6 h-6" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-xl font-black leading-tight truncate">
            {selected ? label(selected) : channel === 'Dine-in' ? (selTable ? `Table ${selTable}` : 'Select a table') : 'Select an order'}
          </div>
          {selected && (
            <div className="text-sm font-semibold text-slate-500 flex items-center gap-3">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{selected.createdAt}</span>
              {selected.type === 'Dine-in' && <span className="flex items-center gap-1"><Users className="w-4 h-4" />{selected.guestCount}</span>}
            </div>
          )}
        </div>
        {selected && <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${statusMeta(selected).cls}`}>{statusMeta(selected).label}</span>}
        <button onClick={() => setDetailSheet(false)} className="lg:hidden w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center" aria-label="Close"><X className="w-5 h-5" /></button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 space-y-4 bg-slate-50">
        {!selected ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
            <ChefHat className="w-14 h-14 mx-auto text-slate-300" />
            <div className="mt-3 text-lg font-extrabold text-slate-700">{channel === 'Dine-in' ? 'Tap a table' : `Pick a ${channel.toLowerCase()} order`}</div>
            <div className="text-sm text-slate-500">{channel === 'Dine-in' ? 'Free tables start a new order in one tap.' : 'Or create a new one from the queue.'}</div>
          </div>
        ) : (
          <>
            {courseGroups.map(g => (
              <div key={g.course}>
                <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2">{g.course}</div>
                <ul className="rounded-2xl bg-white border-2 border-slate-200 divide-y divide-slate-100">
                  {g.items.map(it => (
                    <li key={it.id} className="flex items-center gap-3 p-3">
                      <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${itemStatusCls(it.status)}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-bold truncate">{it.quantity} × {it.name}</div>
                        <div className="text-xs text-slate-500 capitalize">{it.status}{it.specialNotes ? ` · ${it.specialNotes}` : ''}</div>
                      </div>
                      {it.status === 'ready' ? (
                        <button onClick={() => updateOrderItemStatus(selected.id, it.id, 'served')} className="h-11 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-sm font-extrabold flex items-center gap-1.5"><Check className="w-4 h-4" /> Serve</button>
                      ) : (
                        <span className="text-sm font-black tabular-nums">{tzs(it.price * it.quantity)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="rounded-2xl bg-white border-2 border-slate-200 p-4">
              <TotalsBlock t={calcTotals(selected.subtotal, selected.type, currentSite, selected.deliveryFee || 0, selected.discount || 0)} vatLabel={`VAT (${Math.round(currentSite.taxRate * 100)}%)`} />
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 border-t-2 border-slate-200 bg-white p-4 space-y-2.5 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.2)]">
        {selected ? (
          <>
            {readyCount > 0 && (
              <button onClick={() => serveReady(selected)} className="w-full h-16 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-lg font-black flex items-center justify-center gap-2.5 shadow-lg"><BellRing className="w-6 h-6" /> Serve {readyCount} ready dish{readyCount === 1 ? '' : 'es'}</button>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => setWorkspace({ mode: selected.type as ServiceType, table: selected.tableNumber ?? null, extra: true })} className="h-16 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-base font-black flex items-center justify-center gap-2"><Plus className="w-5 h-5" /> Add items</button>
              {selected.type === 'Dine-in' ? (
                <button onClick={() => { requestBill(selected.id); setNotice(`Bill requested · Table ${selected.tableNumber}`); }} disabled={!!selected.billRequested} className="h-16 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:bg-sky-200 disabled:text-sky-700 text-white text-base font-black flex items-center justify-center gap-2"><Receipt className="w-5 h-5" /> {selected.billRequested ? 'Bill sent' : 'Request bill'}</button>
              ) : selected.type === 'Delivery' && selected.status !== 'dispatched' ? (
                <button onClick={() => updateOrderStatus(selected.id, 'dispatched')} disabled={!hasReady(selected)} className="h-16 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-500 text-white text-base font-black">Dispatch rider</button>
              ) : (
                <button onClick={() => { updateOrderStatus(selected.id, 'served'); setNotice(`${label(selected)} handed over`); }} disabled={!hasReady(selected) && selected.status !== 'dispatched'} className="h-16 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-500 text-white text-base font-black">{selected.type === 'Delivery' ? 'Mark delivered' : 'Hand over'}</button>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-500 text-center">Payment is taken at the cashier POS.</p>
          </>
        ) : selectedTable && selectedTable.status === 'dirty' ? (
          <button onClick={() => updateTableStatus(selectedTable.id, 'vacant')} className="w-full h-16 rounded-2xl bg-rose-600 text-white text-lg font-black flex items-center justify-center gap-2"><Brush className="w-5 h-5" /> Mark table clean</button>
        ) : (
          <button
            onClick={() => setWorkspace({ mode: channel, table: channel === 'Dine-in' ? selTable ?? tables.find(t => t.status === 'vacant')?.number ?? null : null, extra: false })}
            className="w-full h-16 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-lg font-black flex items-center justify-center gap-2.5 shadow-lg"
          >
            <Plus className="w-6 h-6" /> New {channel === 'Dine-in' ? 'table' : channel.toLowerCase()} order
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div className="-m-2.5 sm:-m-4 lg:-m-5 h-[calc(100dvh-4rem)] flex flex-col bg-slate-100 overflow-hidden">
      {/* Sticky top bar */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ServiceSwitch value={channel} onChange={switchChannel} counts={counts} />
        <div className="ml-auto flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl" role="group" aria-label="Service mode">
          <button onClick={() => setServiceMode('full_service_waiter')} className={`h-14 px-4 rounded-xl text-sm font-extrabold flex items-center gap-2 ${serviceMode === 'full_service_waiter' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-white'}`}><ConciergeBell className="w-5 h-5" /><span className="hidden md:inline">Waiter service</span></button>
          <button onClick={() => setServiceMode('counter_qr_no_waiter')} className={`h-14 px-4 rounded-xl text-sm font-extrabold flex items-center gap-2 ${serviceMode === 'counter_qr_no_waiter' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-white'}`}><QrCode className="w-5 h-5" /><span className="hidden md:inline">QR self-order</span></button>
        </div>
      </div>

      {/* Sticky "ready to serve" strip */}
      {readyOrders.length > 0 && (
        <div className="shrink-0 bg-amber-50 border-b-2 border-amber-300 px-3 sm:px-4 py-2.5 flex items-center gap-3">
          <span className="shrink-0 flex items-center gap-2 text-sm font-black text-amber-900"><BellRing className="w-5 h-5 animate-pulse" /> Ready to serve</span>
          <div className="flex gap-2.5 overflow-x-auto scrollbar-none">
            {readyOrders.map(o => (
              <div key={o.id} className="shrink-0 flex items-center gap-2 rounded-2xl bg-white border-2 border-amber-300 pl-4 pr-1.5 py-1.5">
                <button onClick={() => { setChannel(o.type as ServiceType); if (o.type === 'Dine-in') setSelTable(o.tableNumber ?? null); else setSelOrderId(o.id); setDetailSheet(true); }} className="text-base font-black text-slate-900">{label(o)}</button>
                <span className="text-xs font-bold text-slate-500">{o.items.filter(i => i.status === 'ready').length || '✓'} dish</span>
                <button onClick={() => serveReady(o)} className="h-11 px-4 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-sm font-extrabold flex items-center gap-1.5"><Check className="w-4 h-4" /> Serve</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Work area */}
      <div className="flex-1 min-h-0 flex relative">
        <main className="flex-1 min-w-0 min-h-0">
          {channel === 'Dine-in' ? (
            <TableFloor selected={selTable} onSelect={onTable} emptyHint="Free table = start an order. Busy table = see its items, serve, add or request the bill." />
          ) : (
            <OrderQueue
              mode={channel}
              selectedId={selOrderId}
              onSelect={o => { setSelOrderId(o.id); setDetailSheet(true); }}
              onNew={() => setWorkspace({ mode: channel, table: null, extra: false })}
            />
          )}
        </main>
        {detail}
      </div>

      {notice && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-6 h-14 rounded-2xl bg-slate-900 text-white font-extrabold shadow-2xl flex items-center toast-enter">{notice}</div>}

      {workspace && (
        <OrderingWorkspace
          mode={workspace.mode}
          existing={workspace.extra ? selected : null}
          initialTable={workspace.table}
          onClose={() => setWorkspace(null)}
          onSent={(msg, order) => {
            setWorkspace(null);
            setNotice(msg);
            if (order) {
              if (order.type === 'Dine-in') setSelTable(order.tableNumber ?? null);
              else { setChannel(order.type as ServiceType); setSelOrderId(order.id); }
            }
          }}
        />
      )}
    </div>
  );
};
