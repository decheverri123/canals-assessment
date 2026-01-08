import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Clear existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Wireless Headphones",
        price: 79.99,
      },
    }),
    prisma.product.create({
      data: {
        name: "Smart Watch",
        price: 249.99,
      },
    }),
    prisma.product.create({
      data: {
        name: "Laptop Stand",
        price: 34.99,
      },
    }),
    prisma.product.create({
      data: {
        name: "USB-C Cable",
        price: 12.99,
      },
    }),
    prisma.product.create({
      data: {
        name: "Mechanical Keyboard",
        price: 129.99,
      },
    }),
  ]);

  console.log(`Created ${products.length} products`);

  // Create warehouses
  const warehouses = await Promise.all([
    prisma.warehouse.create({
      data: {
        name: "San Francisco",
        latitude: 37.7749,
        longitude: -122.4194,
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "New York City",
        latitude: 40.7128,
        longitude: -74.006,
      },
    }),
    prisma.warehouse.create({
      data: {
        name: "Austin",
        latitude: 30.2672,
        longitude: -97.7431,
      },
    }),
  ]);

  console.log(`Created ${warehouses.length} warehouses`);

  // Create inventory for all products at all warehouses
  const inventoryPromises: Promise<any>[] = [];

  for (const warehouse of warehouses) {
    for (const product of products) {
      // Random quantity between 50-150
      const quantity = Math.floor(Math.random() * 101) + 50;

      inventoryPromises.push(
        prisma.inventory.create({
          data: {
            warehouseId: warehouse.id,
            productId: product.id,
            quantity,
          },
        })
      );
    }
  }

  await Promise.all(inventoryPromises);

  console.log(`Created ${inventoryPromises.length} inventory entries`);
  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
