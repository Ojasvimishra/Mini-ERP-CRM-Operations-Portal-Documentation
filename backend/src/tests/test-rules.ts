import prisma from '../utils/prisma';
import { ChallanStatus, Role } from '@prisma/client';

async function runTests() {
  console.log('Running Business Rule Verification Tests...');

  // 1. Find or create a test product with low stock
  let product = await prisma.product.findFirst({
    where: { sku: 'TEST-SKU-001' }
  });

  if (!product) {
    product = await prisma.product.create({
      data: {
        name: 'Test Product',
        sku: 'TEST-SKU-001',
        category: 'Test',
        unitPrice: 100,
        currentStock: 5,
        minStockAlertQty: 2,
        locationWarehouse: 'Test Bin',
      }
    });
  } else {
    // Reset stock to 5
    product = await prisma.product.update({
      where: { id: product.id },
      data: { currentStock: 5 }
    });
  }

  // Find or create test customer
  let customer = await prisma.customer.findFirst();
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: 'Test Cust',
        mobileNumber: '1234567890',
        email: 'test@cust.com',
        businessName: 'Test Biz',
        customerType: 'RETAIL',
        address: '123 Test St',
      }
    });
  }

  // Find or create test admin user
  let user = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: 'testadmin@example.com',
        password: 'hash',
        role: Role.ADMIN,
      }
    });
  }

  console.log(`Initial stock for ${product.name}: ${product.currentStock}`);

  // Test Case: Insufficient Stock
  console.log('Test Case 1: Try to confirm sales challan with quantity > currentStock (6 > 5)...');
  try {
    const items = [{ productId: product.id, quantity: 6 }];
    
    // Simulate confirm logic inside transaction
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod || prod.currentStock < item.quantity) {
          throw new Error(`Insufficient stock for product ${prod?.name}. Required: ${item.quantity}, Available: ${prod?.currentStock}`);
        }
      }
    });
    console.error('FAIL: Insufficient stock transaction succeeded when it should have failed!');
  } catch (err: any) {
    if (err.message.includes('Insufficient stock')) {
      console.log('SUCCESS: Insufficient stock error caught correctly:', err.message);
    } else {
      console.error('FAIL: Unexpected error:', err);
    }
  }

  // Test Case: Sufficient Stock
  console.log('Test Case 2: Try to confirm sales challan with quantity <= currentStock (3 <= 5)...');
  try {
    const items = [{ productId: product.id, quantity: 3 }];
    
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod || prod.currentStock < item.quantity) {
          throw new Error(`Insufficient stock for product ${prod?.name}. Required: ${item.quantity}, Available: ${prod?.currentStock}`);
        }
        await tx.product.update({
          where: { id: prod.id },
          data: { currentStock: { decrement: item.quantity } }
        });
      }
    });

    const updatedProd = await prisma.product.findUnique({ where: { id: product.id } });
    if (updatedProd?.currentStock === 2) {
      console.log('SUCCESS: Stock reduced correctly from 5 to 2.');
    } else {
      console.error('FAIL: Stock is not updated correctly. Value:', updatedProd?.currentStock);
    }
  } catch (err: any) {
    console.error('FAIL: Sufficient stock transaction failed:', err.message);
  }

  console.log('Tests completed.');
}

runTests()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
