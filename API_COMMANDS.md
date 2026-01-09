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
<<<<<<< HEAD
        "productId": "630ad0d3-92b7-424c-8845-41cea6e0fb3f",
=======
        "productId": "ef93a81b-d5b0-4d8a-86e6-38dedcd5ed96",
>>>>>>> origin/main
        "quantity": 1
      }
    ]
  }'
```

<<<<<<< HEAD
## Create Order (single line for Windows)

```bash
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"customer\":{\"email\":\"test@example.com\"},\"address\":\"123 Main St, New York, NY 10001\",\"paymentDetails\":{\"creditCard\":\"4111111111111111\"},\"items\":[{\"productId\":\"630ad0d3-92b7-424c-8845-41cea6e0fb3f\",\"quantity\":1}]}"
```

## Test Payment Failure

Orders totaling exactly $99.99 (9999 cents) will trigger a payment failure:

```bash
curl -X POST http://localhost:3000/orders -H "Content-Type: application/json" -d "{\"customer\":{\"email\":\"test@example.com\"},\"address\":\"123 Main St, New York, NY 10001\",\"paymentDetails\":{\"creditCard\":\"4111111111111111\"},\"items\":[{\"productId\":\"PRODUCT_ID\",\"quantity\":QUANTITY_FOR_9999_CENTS}]}"
```
=======
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
        "productId": "ef93a81b-d5b0-4d8a-86e6-38dedcd5ed96",
        "quantity": 1
      }
    ]
  }'
```

**Note:** First run `curl http://localhost:3000/products` to get a valid `productId` from the response.
>>>>>>> origin/main
