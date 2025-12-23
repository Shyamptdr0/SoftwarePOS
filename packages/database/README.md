# Shreem POS Database

This package contains the database schema, seed data, and migration scripts for the Shreem POS system.

## Files

- `schema.sql` - Clean PostgreSQL schema without any dummy data
- `seed-data.sql` - Realistic seed data for testing and development
- `migrations/001_initial_schema.sql` - Database schema migration
- `migrations/002_seed_data.sql` - Seed data migration

## Database Structure

### Core Tables
- **stores** - Store locations and settings
- **users** - Staff users linked to stores
- **categories** - Product categories per store
- **products** - Product inventory with real electronics data
- **sales** - Sales transactions
- **sale_items** - Individual items in each sale
- **inventory_transactions** - Stock movement tracking
- **settings** - Store-specific configuration
- **sync_log** - Offline sync tracking
- **license** - License management

## Real Data Included

### Stores
- **TechHub Electronics** - NYC electronics store
- **Mobile Zone** - California mobile device store

### Products (Real Electronics)
- **Smartphones**: iPhone 15, Samsung Galaxy S23 Ultra
- **Laptops**: MacBook Air M2, Dell XPS 13
- **Tablets**: iPad Pro, Samsung Tab S9
- **Accessories**: AirPods Pro, USB-C cables
- **Audio**: Sony headphones, JBL speakers
- **Gaming**: PlayStation 5, Xbox Series X

### Users
- Admin and staff accounts with realistic email addresses
- Proper role assignments per store

## Setup

1. Run the schema migration:
```sql
\i migrations/001_initial_schema.sql
```

2. Run the seed data migration:
```sql
\i migrations/002_seed_data.sql
```

## API Integration

The database is fully integrated with the Next.js API routes:
- `/api/products` - Product management
- `/api/sales` - Sales transactions
- `/api/inventory` - Stock management
- `/api/categories` - Category management
- `/api/stores` - Store information

All API routes require a `storeId` parameter for multi-store support.

## Features

- **Multi-store support** with proper data isolation
- **UUID primary keys** for better scalability
- **Proper foreign key constraints** with cascade deletes
- **Automatic timestamp updates** via triggers
- **Realistic electronics inventory** data
- **Comprehensive indexing** for performance
- **PostgreSQL-optimized** with proper data types
