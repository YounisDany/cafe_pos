# Bugs & Issues Found

## 1. Missing Company Fields in Auth Routes
- **login/route.ts**: Missing `snapchat`, `instagram`, `showQrCode`, `receiptFontSize`
- **me/route.ts**: Missing `snapchat`, `instagram`, `showQrCode`, `receiptFontSize`
- **setup/route.ts**: Missing `snapchat`, `instagram`, `showQrCode`, `receiptFontSize`
- **Impact**: Receipt printing uses these fields but they are never hydrated on login/session restore

## 2. CartItem Interface Missing kitchenPrint
- **store.ts**: `CartItem` interface doesn't include `kitchenPrint` field
- **page.tsx line 915**: `kitchenPrint: product.kitchenPrint` is passed but not typed
- **Impact**: TypeScript type mismatch, kitchen receipt relies on untyped data

## 3. Kitchen Receipt Depends on Temporary cartSnapshot
- **page.tsx line 461-463**: Kitchen items come from `invoice.cartSnapshot` (temp cart data)
- **Impact**: Kitchen receipt only works for new orders, not for reprints from history

## 4. Invoice Items Don't Store kitchenPrint
- **prisma/schema.prisma**: `InvoiceItem` model has no `kitchenPrint` field
- **Impact**: Cannot determine which items should print to kitchen from saved invoice data

## 5. CSS Print Conflict
- **globals.css**: Generic print styles that may conflict with receipt-specific print styles in page.tsx
- **Impact**: Potential double-hiding/showing of elements during print

## 6. Invoice List Shows Wrong Fields
- **page.tsx line 1317**: Shows `inv.cashierName` but API returns `inv.user.name`
- **page.tsx line 1319**: Shows `inv.paymentMethod` but API returns `inv.payments[0].method`
- **Impact**: Cashier name and payment method show as '-' in invoice list

## 7. Invoice Detail Shows Wrong Tax Field
- **page.tsx line 1366**: Shows `selectedInvoice.tax` but API returns `selectedInvoice.taxAmount`
- **Impact**: Tax shows as undefined/0 in invoice detail dialog
