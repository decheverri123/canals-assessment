# API Commands

## Get All Products

```bash
curl http://localhost:3000/products
```

## Create Order

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "email": "test@example.com"
    },
    "address": "123 Main St, New York, NY 10001",
    "paymentDetails": {
      "creditCard": "4111111111111111"
    },
    "items": [
      {
        "productId": "630ad0d3-92b7-424c-8845-41cea6e0fb3f",
        "quantity": 1
      }
    ]
  }'
```

## Create Order (single line for Windows)

```bash
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"customer\":{\"email\":\"test@example.com\"},\"address\":\"123 Main St, New York, NY 10001\",\"paymentDetails\":{\"creditCard\":\"4111111111111111\"},\"items\":[{\"productId\":\"630ad0d3-92b7-424c-8845-41cea6e0fb3f\",\"quantity\":1}]}"
```

## Test Payment Failure

Orders totaling exactly $99.99 (9999 cents) will trigger a payment failure:

```bash
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"customer\":{\"email\":\"test@example.com\"},\"address\":\"123 Main St, New York, NY 10001\",\"paymentDetails\":{\"creditCard\":\"4111111111111111\"},\"items\":[{\"productId\":\"PRODUCT_ID\",\"quantity\":QUANTITY_FOR_9999_CENTS}]}"
```
