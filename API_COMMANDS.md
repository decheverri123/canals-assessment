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
        "productId": "dbffe9f5-abd4-4e65-ba95-7e69db696bf2",
        "quantity": 1
      }
    ]
  }'
```

## Quick Test POST Endpoint (with verbose output)

Test the POST endpoint with detailed response:

```bash
curl -v -X POST http://localhost:3000/orders \
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
        "productId": "dbffe9f5-abd4-4e65-ba95-7e69db696bf2",
        "quantity": 1
      }
    ]
  }'
```

**Note:** First run `curl http://localhost:3000/products` to get a valid `productId` from the response.
