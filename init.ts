import { db } from './src/lib/db';
import { hashSync } from 'bcryptjs';

async function run() {
  try {
    const c = await db.company.create({
      data: { name: 'Cafe POS', email: 'owner@cafe.com', currency: 'SAR' }
    });
    await db.user.create({
      data: {
        name: 'Admin',
        email: 'owner@cafe.com',
        password: hashSync('password123', 10),
        role: 'owner',
        companyId: c.id
      }
    });
    console.log('✅ Admin user created!');
  } catch (e: any) {
    if (e.message.includes('unique constraint')) {
       console.log('✅ Admin user already exists.');
    } else {
       console.error('Error:', e.message);
    }
  } finally {
    await db.$disconnect();
  }
}
run();
