import { db } from './src/lib/db';
import { hashSync } from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...');

  // Create Company
  const company = await db.company.create({
    data: {
      name: 'مقهى الأرواح',
      email: 'info@al-arwah.com',
      phone: '+966501234567',
      address: 'الرياض، حي الملقا',
      taxRate: 15.0,
      currency: 'SAR',
    },
  });

  // Create Branches
  const branch1 = await db.branch.create({
    data: {
      name: 'فرع الملقا',
      address: 'الرياض، حي الملقا، شارع الأمير محمد بن عبدالعزيز',
      phone: '+966501234567',
      companyId: company.id,
    },
  });

  const branch2 = await db.branch.create({
    data: {
      name: 'فرع العليا',
      address: 'الرياض، حي العليا، شارع التحلية',
      phone: '+966507654321',
      companyId: company.id,
    },
  });

  // Create Users
  const owner = await db.user.create({
    data: {
      name: 'أحمد المالك',
      email: 'owner@cafe.com',
      password: hashSync('password123', 10),
      phone: '+966501111111',
      role: 'owner',
      companyId: company.id,
    },
  });

  const manager = await db.user.create({
    data: {
      name: 'سعيد المدير',
      email: 'manager@cafe.com',
      password: hashSync('password123', 10),
      phone: '+966502222222',
      role: 'manager',
      companyId: company.id,
      branchId: branch1.id,
    },
  });

  const cashier1 = await db.user.create({
    data: {
      name: 'محمد الكاشير',
      email: 'cashier@cafe.com',
      password: hashSync('password123', 10),
      phone: '+966503333333',
      role: 'cashier',
      companyId: company.id,
      branchId: branch1.id,
    },
  });

  // Create Categories
  const categories = await Promise.all([
    db.category.create({
      data: { name: 'Coffee', nameAr: 'قهوة', icon: '☕', color: '#8B4513', sortOrder: 1, companyId: company.id },
    }),
    db.category.create({
      data: { name: 'Tea', nameAr: 'شاي', icon: '🍵', color: '#2E8B57', sortOrder: 2, companyId: company.id },
    }),
    db.category.create({
      data: { name: 'Juices', nameAr: 'عصائر', icon: '🧃', color: '#FF6347', sortOrder: 3, companyId: company.id },
    }),
    db.category.create({
      data: { name: 'Desserts', nameAr: 'حلويات', icon: '🍰', color: '#DDA0DD', sortOrder: 4, companyId: company.id },
    }),
    db.category.create({
      data: { name: 'Sandwiches', nameAr: 'ساندويشات', icon: '🥪', color: '#DAA520', sortOrder: 5, companyId: company.id },
    }),
    db.category.create({
      data: { name: 'Pastries', nameAr: 'معجنات', icon: '🥐', color: '#F4A460', sortOrder: 6, companyId: company.id },
    }),
  ]);

  // Create Products
  const coffeeProducts = [
    { name: 'Espresso', nameAr: 'إسبريسو', price: 12, sku: 'COF-001' },
    { name: 'Americano', nameAr: 'أمريكانو', price: 15, sku: 'COF-002' },
    { name: 'Latte', nameAr: 'لاتيه', price: 18, sku: 'COF-003' },
    { name: 'Cappuccino', nameAr: 'كابتشينو', price: 20, sku: 'COF-004' },
    { name: 'Mocha', nameAr: 'موكا', price: 22, sku: 'COF-005' },
    { name: 'Turkish Coffee', nameAr: 'قهوة تركية', price: 15, sku: 'COF-006' },
    { name: 'Flat White', nameAr: 'فلات وايت', price: 20, sku: 'COF-007' },
    { name: 'Cold Brew', nameAr: 'كولد برو', price: 22, sku: 'COF-008' },
  ];

  const teaProducts = [
    { name: 'Black Tea', nameAr: 'شاي أحمر', price: 8, sku: 'TEA-001' },
    { name: 'Green Tea', nameAr: 'شاي أخضر', price: 10, sku: 'TEA-002' },
    { name: 'Chamomile', nameAr: 'بابونج', price: 10, sku: 'TEA-003' },
    { name: 'Mint Tea', nameAr: 'شاي بالنعناع', price: 8, sku: 'TEA-004' },
    { name: 'Matcha Latte', nameAr: 'ما تشا لاتيه', price: 20, sku: 'TEA-005' },
  ];

  const juiceProducts = [
    { name: 'Orange Juice', nameAr: 'عصير برتقال', price: 15, sku: 'JUI-001' },
    { name: 'Lemon Mint', nameAr: 'ليمون بالنعناع', price: 15, sku: 'JUI-002' },
    { name: 'Mango Juice', nameAr: 'عصير مانجو', price: 18, sku: 'JUI-003' },
    { name: 'Strawberry Smoothie', nameAr: 'سموذي فراولة', price: 20, sku: 'JUI-004' },
    { name: 'Avocado Juice', nameAr: 'عصير أفوكادو', price: 22, sku: 'JUI-005' },
  ];

  const dessertProducts = [
    { name: 'Chocolate Cake', nameAr: 'كيك شوكولاتة', price: 25, sku: 'DES-001' },
    { name: 'Cheesecake', nameAr: 'تشيز كيك', price: 28, sku: 'DES-002' },
    { name: 'Tiramisu', nameAr: 'تيراميسو', price: 30, sku: 'DES-003' },
    { name: 'Brownie', nameAr: 'براوني', price: 18, sku: 'DES-004' },
    { name: 'Kunafa', nameAr: 'كنافة', price: 20, sku: 'DES-005' },
  ];

  const sandwichProducts = [
    { name: 'Club Sandwich', nameAr: 'كلوب ساندويش', price: 30, sku: 'SAN-001' },
    { name: 'Chicken Panini', nameAr: 'باني ني دجاج', price: 28, sku: 'SAN-002' },
    { name: 'Grilled Cheese', nameAr: 'جبن مشوي', price: 20, sku: 'SAN-003' },
    { name: 'Turkey Sandwich', nameAr: 'ساندويش ديك رومي', price: 32, sku: 'SAN-004' },
  ];

  const pastryProducts = [
    { name: 'Croissant', nameAr: 'كرواسون', price: 12, sku: 'PAS-001' },
    { name: 'Pain au Chocolat', nameAr: 'بان أو شوكولا', price: 14, sku: 'PAS-002' },
    { name: 'Muffin', nameAr: 'مافن', price: 10, sku: 'PAS-003' },
    { name: 'Donut', nameAr: 'دونات', price: 8, sku: 'PAS-004' },
    { name: 'Cinnamon Roll', nameAr: 'رول القرفة', price: 15, sku: 'PAS-005' },
  ];

  const allProducts = [
    ...coffeeProducts.map(p => ({ ...p, categoryId: categories[0].id })),
    ...teaProducts.map(p => ({ ...p, categoryId: categories[1].id })),
    ...juiceProducts.map(p => ({ ...p, categoryId: categories[2].id })),
    ...dessertProducts.map(p => ({ ...p, categoryId: categories[3].id })),
    ...sandwichProducts.map(p => ({ ...p, categoryId: categories[4].id })),
    ...pastryProducts.map(p => ({ ...p, categoryId: categories[5].id })),
  ];

  const products = [];
  for (const p of allProducts) {
    const product = await db.product.create({
      data: {
        name: p.name,
        nameAr: p.nameAr,
        price: p.price,
        cost: Math.round(p.price * 0.4 * 100) / 100,
        sku: p.sku,
        categoryId: p.categoryId,
        companyId: company.id,
        isAvailable: true,
      },
    });
    products.push(product);
  }

  // Create Branch Products with stock
  for (const product of products) {
    await db.branchProduct.create({
      data: {
        branchId: branch1.id,
        productId: product.id,
        price: product.price,
        isAvailable: true,
        stock: Math.floor(Math.random() * 100) + 10,
      },
    });
  }

  // Create sample invoices
  const today = new Date();
  for (let i = 0; i < 15; i++) {
    const invoiceDate = new Date(today);
    invoiceDate.setDate(today.getDate() - i);
    invoiceDate.setHours(9 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));

    const itemCount = Math.floor(Math.random() * 5) + 1;
    const selectedProducts = [];
    const usedIndexes = new Set<number>();
    
    for (let j = 0; j < itemCount; j++) {
      let idx: number;
      do { idx = Math.floor(Math.random() * products.length); } while (usedIndexes.has(idx));
      usedIndexes.add(idx);
      selectedProducts.push(products[idx]);
    }

    const subtotal = selectedProducts.reduce((sum, p) => sum + p.price, 0);
    const tax = Math.round(subtotal * 0.15 * 100) / 100;
    const total = subtotal + tax;

    const invoiceNo = `INV-${String(1000 + i).padStart(4, '0')}`;
    
    await db.invoice.create({
      data: {
        invoiceNo,
        status: 'paid',
        subtotal,
        taxAmount: tax,
        discount: 0,
        total,
        paidAmount: total,
        changeAmount: 0,
        branchId: branch1.id,
        userId: i < 5 ? manager.id : cashier1.id,
        companyId: company.id,
        createdAt: invoiceDate,
        closedAt: invoiceDate,
        items: {
          create: selectedProducts.map(p => ({
            name: p.nameAr || p.name,
            price: p.price,
            quantity: 1,
            total: p.price,
            productId: p.id,
          })),
        },
        payments: {
          create: {
            method: i % 3 === 0 ? 'card' : 'cash',
            amount: total,
          },
        },
      },
    });
  }

  // Create Audit Logs
  await db.auditLog.create({
    data: {
      action: 'login',
      entity: 'user',
      entityId: owner.id,
      details: JSON.stringify({ message: 'تسجيل دخول المالك' }),
      userId: owner.id,
      companyId: company.id,
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log(`🏢 Company: ${company.name}`);
  console.log(`🏪 Branches: ${2}`);
  console.log(`👥 Users: ${3}`);
  console.log(`📂 Categories: ${categories.length}`);
  console.log(`📦 Products: ${products.length}`);
  console.log(`🧾 Invoices: 15`);
  console.log('\n📧 Login Credentials:');
  console.log('  Owner:   owner@cafe.com / password123');
  console.log('  Manager: manager@cafe.com / password123');
  console.log('  Cashier: cashier@cafe.com / password123');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
