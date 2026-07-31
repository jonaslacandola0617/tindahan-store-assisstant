/* ==========================================================================
   TINDAHAN MOCK DATA  (generated — see /gen/data.py for the source of truth)
   Sample data for a small Filipino sari-sari store ("Aling Rosa's Store").
   Used by interactions.js for the interactive demo behaviors (search, sale
   picker, filters). Static page content is authored directly in HTML.
   ========================================================================== */

const TINDAHAN_DATA = {
  store: {
    name: "Aling Rosa's Store",
    owner: "Rosa Santos",
    barangay: "Barangay San Roque, San Jose del Monte, Bulacan",
    currency: "₱"
  },
  categories: ["Snacks", "Beverages", "Instant Noodles", "Canned Goods", "Condiments", "Dairy & Eggs", "Personal Care", "Household", "Rice & Staples"],
  products: [
  {
    "id": "p01",
    "name": "Instant Pancit Canton (Chili Mansi)",
    "category": "Instant Noodles",
    "unit": "pack",
    "price": 16,
    "qty": 84,
    "reorderAt": 20,
    "supplier": "Golden Valley Distributors",
    "image": "assets/images/product-noodles.svg",
    "manufacturerBarcode": "4800016640017",
    "internalBarcode": null,
    "status": "ok"
  },
  {
    "id": "p02",
    "name": "Instant Pancit Canton (Original)",
    "category": "Instant Noodles",
    "unit": "pack",
    "price": 16,
    "qty": 12,
    "reorderAt": 20,
    "supplier": "Golden Valley Distributors",
    "status": "low"
  },
  {
    "id": "p03",
    "name": "Cup Noodles (Beef)",
    "category": "Instant Noodles",
    "unit": "cup",
    "price": 22,
    "qty": 30,
    "reorderAt": 15,
    "supplier": "Golden Valley Distributors",
    "status": "ok"
  },
  {
    "id": "p04",
    "name": "Powdered Milk, 33g",
    "category": "Dairy & Eggs",
    "unit": "sachet",
    "price": 14,
    "qty": 6,
    "reorderAt": 15,
    "supplier": "Northgate Grocery Supply",
    "lastUpdated": "Today",
    "status": "low"
  },
  {
    "id": "p05",
    "name": "Sterilized Milk, 300ml",
    "category": "Dairy & Eggs",
    "unit": "bottle",
    "price": 48,
    "qty": 18,
    "reorderAt": 10,
    "supplier": "Northgate Grocery Supply",
    "image": "assets/images/product-milk.svg",
    "lastUpdated": "Yesterday",
    "status": "ok"
  },
  {
    "id": "p06",
    "name": "Fresh Eggs (Medium)",
    "category": "Dairy & Eggs",
    "unit": "piece",
    "price": 8,
    "qty": 0,
    "reorderAt": 24,
    "supplier": "San Roque Egg Farm",
    "manufacturerBarcode": null,
    "internalBarcode": "2800000000068",
    "isTingi": true,
    "barcodeHistory": [
      {
        "value": "2800000000051",
        "status": "replaced",
        "date": "July 18, 2026"
      }
    ],
    "lastUpdated": "Today",
    "status": "out"
  },
  {
    "id": "p07",
    "name": "Corned Beef, 150g",
    "category": "Canned Goods",
    "unit": "can",
    "price": 42,
    "qty": 27,
    "reorderAt": 12,
    "supplier": "Metro Cannery Supply",
    "manufacturerBarcode": "4800024571501",
    "internalBarcode": "2800000000075",
    "status": "ok"
  },
  {
    "id": "p08",
    "name": "Sardines in Tomato Sauce, 155g",
    "category": "Canned Goods",
    "unit": "can",
    "price": 22,
    "qty": 9,
    "reorderAt": 18,
    "supplier": "Metro Cannery Supply",
    "status": "low"
  },
  {
    "id": "p09",
    "name": "Corned Tuna, 150g",
    "category": "Canned Goods",
    "unit": "can",
    "price": 28,
    "qty": 34,
    "reorderAt": 12,
    "supplier": "Metro Cannery Supply",
    "status": "ok"
  },
  {
    "id": "p10",
    "name": "Meat Loaf, 150g",
    "category": "Canned Goods",
    "unit": "can",
    "price": 24,
    "qty": 15,
    "reorderAt": 12,
    "supplier": "Metro Cannery Supply",
    "status": "ok"
  },
  {
    "id": "p11",
    "name": "Potato Chips, 55g",
    "category": "Snacks",
    "unit": "pack",
    "price": 22,
    "qty": 40,
    "reorderAt": 15,
    "supplier": "Golden Valley Distributors",
    "status": "ok"
  },
  {
    "id": "p12",
    "name": "Corn Snack, 85g",
    "category": "Snacks",
    "unit": "pack",
    "price": 15,
    "qty": 3,
    "reorderAt": 15,
    "supplier": "Golden Valley Distributors",
    "manufacturerBarcode": null,
    "internalBarcode": null,
    "status": "low"
  },
  {
    "id": "p13",
    "name": "Crackers, 250g",
    "category": "Snacks",
    "unit": "box",
    "price": 45,
    "qty": 20,
    "reorderAt": 8,
    "supplier": "Golden Valley Distributors",
    "status": "ok"
  },
  {
    "id": "p14",
    "name": "Instant Coffee, 3-in-1 Sachet",
    "category": "Beverages",
    "unit": "sachet",
    "price": 8,
    "qty": 96,
    "reorderAt": 30,
    "supplier": "Northgate Grocery Supply",
    "lastUpdated": "Today",
    "status": "ok"
  },
  {
    "id": "p15",
    "name": "Powdered Juice Drink, Sachet",
    "category": "Beverages",
    "unit": "sachet",
    "price": 7,
    "qty": 58,
    "reorderAt": 20,
    "supplier": "Northgate Grocery Supply",
    "status": "ok"
  },
  {
    "id": "p16",
    "name": "Soda, 1.5L",
    "category": "Beverages",
    "unit": "bottle",
    "price": 62,
    "qty": 14,
    "reorderAt": 10,
    "supplier": "Northgate Grocery Supply",
    "status": "ok"
  },
  {
    "id": "p17",
    "name": "Bottled Water, 500ml",
    "category": "Beverages",
    "unit": "bottle",
    "price": 15,
    "qty": 5,
    "reorderAt": 24,
    "supplier": "Northgate Grocery Supply",
    "manufacturerBarcode": "4800092555004",
    "internalBarcode": null,
    "status": "low"
  },
  {
    "id": "p18",
    "name": "Soy Sauce (Toyo), 200ml",
    "category": "Condiments",
    "unit": "bottle",
    "price": 18,
    "qty": 22,
    "reorderAt": 10,
    "supplier": "Home Table Foods",
    "status": "ok"
  },
  {
    "id": "p19",
    "name": "Vinegar (Suka), 200ml",
    "category": "Condiments",
    "unit": "bottle",
    "price": 16,
    "qty": 19,
    "reorderAt": 10,
    "supplier": "Home Table Foods",
    "status": "ok"
  },
  {
    "id": "p20",
    "name": "Cooking Oil, 1L",
    "category": "Condiments",
    "unit": "bottle",
    "price": 78,
    "qty": 11,
    "reorderAt": 8,
    "supplier": "Home Table Foods",
    "status": "ok"
  },
  {
    "id": "p21",
    "name": "Iodized Salt, 250g",
    "category": "Condiments",
    "unit": "pack",
    "price": 12,
    "qty": 25,
    "reorderAt": 10,
    "supplier": "Home Table Foods",
    "status": "ok"
  },
  {
    "id": "p22",
    "name": "Bath Soap, 90g",
    "category": "Personal Care",
    "unit": "piece",
    "price": 24,
    "qty": 16,
    "reorderAt": 12,
    "supplier": "Northgate Grocery Supply",
    "lastUpdated": "Yesterday",
    "status": "ok"
  },
  {
    "id": "p23",
    "name": "Shampoo, Sachet",
    "category": "Personal Care",
    "unit": "sachet",
    "price": 7,
    "qty": 70,
    "reorderAt": 24,
    "supplier": "Northgate Grocery Supply",
    "lastUpdated": "Today",
    "status": "ok"
  },
  {
    "id": "p24",
    "name": "Toothpaste, 80g",
    "category": "Personal Care",
    "unit": "piece",
    "price": 38,
    "qty": 2,
    "reorderAt": 10,
    "supplier": "Northgate Grocery Supply",
    "status": "low"
  },
  {
    "id": "p25",
    "name": "Laundry Powder, Sachet",
    "category": "Household",
    "unit": "sachet",
    "price": 9,
    "qty": 64,
    "reorderAt": 24,
    "supplier": "Home Table Foods",
    "status": "ok"
  },
  {
    "id": "p26",
    "name": "Dishwashing Liquid, 250ml",
    "category": "Household",
    "unit": "bottle",
    "price": 34,
    "qty": 0,
    "reorderAt": 8,
    "supplier": "Home Table Foods",
    "lastUpdated": "Today",
    "status": "out"
  },
  {
    "id": "p27",
    "name": "Candles, Pack of 6",
    "category": "Household",
    "unit": "pack",
    "price": 20,
    "qty": 13,
    "reorderAt": 6,
    "supplier": "San Roque Sundries",
    "status": "ok"
  },
  {
    "id": "p28",
    "name": "Well-Milled Rice",
    "category": "Rice & Staples",
    "unit": "kg",
    "price": 52,
    "qty": 8,
    "reorderAt": 20,
    "supplier": "Bulacan Rice Traders",
    "status": "low"
  },
  {
    "id": "p29",
    "name": "Sugar, White",
    "category": "Rice & Staples",
    "unit": "kg",
    "price": 78,
    "qty": 14,
    "reorderAt": 10,
    "supplier": "Bulacan Rice Traders",
    "status": "ok"
  },
  {
    "id": "p30",
    "name": "All-Purpose Flour",
    "category": "Rice & Staples",
    "unit": "kg",
    "price": 58,
    "qty": 6,
    "reorderAt": 8,
    "supplier": "Bulacan Rice Traders",
    "status": "low"
  }
],
  barcodeLabels: [
    {
      "productId": "p06",
      "value": "2800000000068",
      "template": "standard",
      "showPrice": true
    }
  ],
  unknownBarcode: "8999999999999",
  recentSales: [
  {
    "id": "s2201",
    "time": "9:42 AM",
    "items": [
      {
        "name": "Instant Pancit Canton (Chili Mansi)",
        "qty": 3
      },
      {
        "name": "Instant Coffee, 3-in-1 Sachet",
        "qty": 5
      }
    ],
    "total": 88
  },
  {
    "id": "s2200",
    "time": "9:18 AM",
    "items": [
      {
        "name": "Sterilized Milk, 300ml",
        "qty": 2
      }
    ],
    "total": 96
  },
  {
    "id": "s2199",
    "time": "8:55 AM",
    "items": [
      {
        "name": "Bottled Water, 500ml",
        "qty": 4
      },
      {
        "name": "Corn Snack, 85g",
        "qty": 1
      }
    ],
    "total": 75
  },
  {
    "id": "s2198",
    "time": "8:30 AM",
    "items": [
      {
        "name": "Fresh Eggs (Medium)",
        "qty": 6
      }
    ],
    "total": 48
  },
  {
    "id": "s2197",
    "time": "8:05 AM",
    "items": [
      {
        "name": "Well-Milled Rice",
        "qty": 2
      },
      {
        "name": "Corned Beef, 150g",
        "qty": 1
      }
    ],
    "total": 146
  }
],
  notifications: [
  {
    "id": "n01",
    "type": "warning",
    "title": "6 products are almost out",
    "meta": "Check Inventory to see what needs restocking",
    "time": "Today, 8:02 AM",
    "read": false
  },
  {
    "id": "n02",
    "type": "danger",
    "title": "Fresh Eggs (Medium) is out of stock",
    "meta": "Last sold this morning",
    "time": "Today, 8:00 AM",
    "read": false
  },
  {
    "id": "n03",
    "type": "info",
    "title": "Receipt from Home Table Foods is ready to review",
    "meta": "12 items detected",
    "time": "Yesterday, 4:41 PM",
    "read": false
  },
  {
    "id": "n04",
    "type": "success",
    "title": "Inventory updated from Northgate Grocery Supply receipt",
    "meta": "9 items added to stock",
    "time": "Yesterday, 11:20 AM",
    "read": true
  },
  {
    "id": "n05",
    "type": "info",
    "title": "Weekly summary is ready",
    "meta": "See how last week compared",
    "time": "Monday, 7:00 AM",
    "read": true
  }
]
};
