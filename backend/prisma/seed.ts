import { PrismaClient, Role, CustomerType, CustomerStatus, MovementType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.followUpNote.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.salesChallan.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});

  // Create Users
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: passwordHash,
      role: Role.ADMIN,
    },
  });

  const sales = await prisma.user.create({
    data: {
      name: 'Sales Executive',
      email: 'sales@example.com',
      password: passwordHash,
      role: Role.SALES,
    },
  });

  const warehouse = await prisma.user.create({
    data: {
      name: 'Warehouse Keeper',
      email: 'warehouse@example.com',
      password: passwordHash,
      role: Role.WAREHOUSE,
    },
  });

  const accounts = await prisma.user.create({
    data: {
      name: 'Accounts officer',
      email: 'accounts@example.com',
      password: passwordHash,
      role: Role.ACCOUNTS,
    },
  });

  console.log('Users seeded successfully:', {
    admin: admin.email,
    sales: sales.email,
    warehouse: warehouse.email,
    accounts: accounts.email,
  });

  // Create some Customers
  const customer1 = await prisma.customer.create({
    data: {
      name: 'John Doe Retailer',
      mobileNumber: '9876543210',
      email: 'john@retailer.com',
      businessName: 'JD Retail Store',
      gstNumber: '29ABCDE1234F1Z5',
      customerType: CustomerType.RETAIL,
      address: '123 Main Street, Bangalore',
      status: CustomerStatus.ACTIVE,
      notes: 'Prefers deliveries on weekends',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      name: 'Jane Smith Wholesaler',
      mobileNumber: '9123456780',
      email: 'jane@wholesale.com',
      businessName: 'JS Wholesale Ltd',
      customerType: CustomerType.WHOLESALE,
      address: '456 Business Ring Road, Mumbai',
      status: CustomerStatus.ACTIVE,
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'ACME Distribution',
      mobileNumber: '8887776665',
      email: 'info@acmedist.com',
      businessName: 'ACME Distributors',
      gstNumber: '27GHIJK5678L2Z9',
      customerType: CustomerType.DISTRIBUTOR,
      address: '789 Industrial Area, Delhi',
      status: CustomerStatus.LEAD,
      notes: 'Initial contact made, follow-up next week',
    },
  });

  console.log('Customers seeded');

  // Create Products
  const p1 = await prisma.product.create({
    data: {
      name: 'Premium Wireless Headphones',
      sku: 'WHP-001',
      category: 'Electronics',
      unitPrice: 2999.00,
      currentStock: 100,
      minStockAlertQty: 10,
      locationWarehouse: 'Aisle A-4',
    },
  });

  const p2 = await prisma.product.create({
    data: {
      name: 'Ergonomic Office Chair',
      sku: 'OFC-002',
      category: 'Furniture',
      unitPrice: 5499.00,
      currentStock: 15,
      minStockAlertQty: 5,
      locationWarehouse: 'Aisle B-1',
    },
  });

  const p3 = await prisma.product.create({
    data: {
      name: 'USB-C Fast Charger 65W',
      sku: 'CHG-003',
      category: 'Electronics',
      unitPrice: 999.00,
      currentStock: 4, // Trigger stock alert
      minStockAlertQty: 15,
      locationWarehouse: 'Aisle A-2',
    },
  });

  console.log('Products seeded');

  // Log initial stock movements
  await prisma.stockMovement.create({
    data: {
      productId: p1.id,
      quantity: 100,
      movementType: MovementType.IN,
      reason: 'Initial stock seeding',
      createdById: admin.id,
    },
  });

  await prisma.stockMovement.create({
    data: {
      productId: p2.id,
      quantity: 15,
      movementType: MovementType.IN,
      reason: 'Initial stock seeding',
      createdById: admin.id,
    },
  });

  await prisma.stockMovement.create({
    data: {
      productId: p3.id,
      quantity: 4,
      movementType: MovementType.IN,
      reason: 'Initial stock seeding',
      createdById: admin.id,
    },
  });

  console.log('Stock movements logged');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
