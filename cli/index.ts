#!/usr/bin/env node
/**
 * Canals Order CLI
 * Interactive CLI tool for submitting orders
 *
 * Usage: pnpm cli
 */

import * as p from '@clack/prompts';
import pc from 'picocolors';
import ora from 'ora';

import { fetchProducts, fetchWarehouses, submitOrder } from './services/api.service';
import { selectProducts, setQuantities } from './prompts/product.prompt';
import { promptCustomerInfo } from './prompts/customer.prompt';
import { promptPaymentInfo } from './prompts/payment.prompt';
import { displayOrderSummary, displayOrderSuccess, displayError, displayCurlCommand, displayRawResponse, displayWarehouseBoxes } from './ui/formatter';
import { generateCurlCommand } from './services/api.service';
import type { OrderRequest, Product, Warehouse, OrderItem } from './types/cli.types';

/**
 * Main CLI flow
 */
async function main(): Promise<void> {
  // Intro banner
  console.clear();
  p.intro(pc.bgCyan(pc.black(' Canals Order CLI ')));

  // Fetch products
  const fetchSpinner = ora('Fetching products...').start();
  let products: Product[];

  try {
    products = await fetchProducts();
    fetchSpinner.succeed(pc.green(`Loaded ${products.length} products`));
  } catch (error) {
    fetchSpinner.fail(pc.red('Failed to fetch products'));
    displayError(error instanceof Error ? error.message : String(error));
    p.outro(pc.dim('Make sure the server is running: pnpm dev'));
    process.exit(1);
  }

  if (products.length === 0) {
    displayError('No products available. Please seed the database first.');
    p.outro(pc.dim('Run: pnpm prisma db seed'));
    process.exit(1);
  }

  // Order loop (allows retry on cancel at confirmation)
  let orderComplete = false;

  while (!orderComplete) {
    // Step 1: Select products
    const selectedProducts = await selectProducts(products);

    // Step 2: Set quantities for each product
    const orderItems = await setQuantities(selectedProducts);

    // Step 3: Get customer info
    const customerInfo = await promptCustomerInfo();

    // Step 3.5: Fetch warehouse inventory (for display after order success)
    const fetchWarehouseSpinner = ora('Fetching warehouse inventory...').start();
    let warehouses: Warehouse[] = [];
    try {
      warehouses = await fetchWarehouses();
      fetchWarehouseSpinner.succeed(pc.green(`Loaded ${warehouses.length} warehouses`));
    } catch (error) {
      fetchWarehouseSpinner.fail(pc.yellow('Could not fetch warehouse inventory'));
      // Continue anyway - this is just informational
      if (process.env.DEBUG) {
        console.error(error);
      }
    }

    // Step 4: Get payment info
    const paymentInfo = await promptPaymentInfo();

    // Build the order request early to show curl command
    const orderRequest: OrderRequest = {
      customer: {
        email: customerInfo.email,
      },
      address: customerInfo.address,
      paymentDetails: {
        creditCard: paymentInfo.creditCard,
      },
      items: orderItems.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    };

    // Step 5: Display summary and confirm
    displayOrderSummary(
      orderItems,
      customerInfo.address,
      customerInfo.email,
      paymentInfo.creditCard
    );
    
    // Show the curl command that will be executed
    displayCurlCommand(generateCurlCommand(orderRequest));

    const confirmed = await p.confirm({
      message: 'Confirm and submit order?',
      initialValue: true,
    });

    if (p.isCancel(confirmed)) {
      p.cancel('Order cancelled.');
      process.exit(0);
    }

    if (!confirmed) {
      console.log(pc.dim('\nLet\'s try again...\n'));
      continue;
    }

    // Step 6: Submit order
    const submitSpinner = ora('Submitting order...').start();

    try {
      const result = await submitOrder(orderRequest);
      submitSpinner.succeed(pc.green('Order submitted successfully!'));
      
      // Display formatted result
      displayOrderSuccess(result.response);
      
      // Display warehouse selection boxes (shows which warehouse was chosen)
      if (warehouses.length > 0) {
        displayWarehouseBoxes(
          warehouses,
          orderItems,
          result.response.warehouse.id,
          customerInfo.address
        );
      }
      
      // Display raw curl command and response
      displayCurlCommand(result.curlCommand);
      displayRawResponse(result.rawResponse);
      
      orderComplete = true;
    } catch (error) {
      submitSpinner.fail(pc.red('Order submission failed'));
      displayError(error instanceof Error ? error.message : String(error));

      const retry = await p.confirm({
        message: 'Would you like to try again?',
        initialValue: true,
      });

      if (p.isCancel(retry) || !retry) {
        p.cancel('Order cancelled.');
        process.exit(1);
      }
    }
  }

  p.outro(pc.green('Thank you for your order!'));
}

// Run the CLI
main().catch((error) => {
  displayError(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
