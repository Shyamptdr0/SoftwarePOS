import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions for database operations
export async function getStores() {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
}

export async function getProducts(storeId) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (
        name
      )
    `)
    .eq('store_id', storeId)
    .order('name');
  
  if (error) throw error;
  return data;
}

export async function getProductById(id, storeId) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories (
        name
      )
    `)
    .eq('id', id)
    .eq('store_id', storeId)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createProduct(productData) {
  const {
    sku, barcode, name, description, category_id, cost_price, 
    selling_price, tax_rate, stock_quantity, min_stock_level, 
    unit, image_url, store_id
  } = productData;
  
  // Generate UUID for the product
  const id = crypto.randomUUID();
  
  const { data, error } = await supabase
    .from('products')
    .insert({
      id, sku, barcode, name, description, category_id, cost_price, 
      selling_price, tax_rate, stock_quantity, min_stock_level, 
      unit, image_url, store_id
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateProduct(id, productData, storeId) {
  const {
    sku, barcode, name, description, category_id, cost_price, 
    selling_price, tax_rate, stock_quantity, min_stock_level, 
    unit, image_url, is_active
  } = productData;
  
  const { data, error } = await supabase
    .from('products')
    .update({
      sku, barcode, name, description, category_id, cost_price, 
      selling_price, tax_rate, stock_quantity, min_stock_level, 
      unit, image_url, is_active
    })
    .eq('id', id)
    .eq('store_id', storeId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteProduct(id, storeId) {
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('store_id', storeId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getCategories(storeId) {
  console.log('getCategories called with storeId:', storeId);
  
  try {
    // First ensure the store exists
    await ensureStoreExists(storeId);
    
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .order('name');
    
    if (error) {
      console.error('getCategories error:', error);
      throw error;
    }
    
    console.log('getCategories result:', data);
    return data;
  } catch (error) {
    console.error('getCategories failed:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
}

export async function createCategory(categoryData) {
  const { name, description, store_id } = categoryData;
  
  console.log('Creating category with data:', { name, description, store_id });
  
  // First ensure the store exists
  await ensureStoreExists(store_id);
  
  // Generate a UUID for the new category
  const id = crypto.randomUUID();
  
  const insertData = {
    id,
    name,
    description,
    store_id
  };
  
  console.log('Insert data prepared:', insertData);
  
  const { data, error } = await supabase
    .from('categories')
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    console.error('Supabase error:', error);
    throw error;
  }
  
  console.log('Category inserted successfully:', data);
  return data;
}

// Helper function to ensure store exists
async function ensureStoreExists(storeId) {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .single();
    
    if (error || !data) {
      console.log('Store not found, creating default store:', storeId);
      // Create the store if it doesn't exist - only use required columns
      const { error: insertError } = await supabase
        .from('stores')
        .insert({
          id: storeId,
          name: 'Default Store'
        });
      
      if (insertError) {
        console.error('Failed to create store:', insertError);
        throw insertError;
      }
      
      console.log('Store created successfully');
    } else {
      console.log('Store exists:', data);
    }
  } catch (error) {
    console.error('Error checking/creating store:', error);
    // Don't throw here, let the category creation proceed
  }
}

export async function getSales(storeId, limit = 50) {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      *,
      users (
        email
      )
    `)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

export async function createSale(saleData) {
  const {
    bill_number, customer_name, customer_phone, subtotal,
    discount_amount, tax_amount, total_amount, payment_method,
    payment_status, staff_id, store_id, notes, sale_items
  } = saleData;
  
  // Generate UUID for the sale
  const saleId = crypto.randomUUID();
  
  try {
    // First, create the sale record
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        id: saleId,
        bill_number,
        customer_name,
        customer_phone,
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        payment_method,
        payment_status,
        staff_id,
        store_id,
        notes
      })
      .select()
      .single();
    
    if (saleError) throw saleError;
    
    // Then, create the sale items
    const saleItemsWithId = sale_items.map(item => ({
      ...item,
      sale_id: saleId,
      id: crypto.randomUUID()
    }));
    
    const { data: items, error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItemsWithId)
      .select();
    
    if (itemsError) throw itemsError;
    
    // Update product stock quantities
    for (const item of sale_items) {
      const { error: stockError } = await supabase.rpc('decrement_stock', {
        product_id_param: item.product_id,
        quantity_param: item.quantity
      });
      
      if (stockError) {
        console.error('Failed to update stock for product:', item.product_id, stockError);
      }
    }
    
    return { ...sale, sale_items: items };
  } catch (error) {
    console.error('Create sale error:', error);
    throw error;
  }
}

export async function getInventoryTransactions(storeId, limit = 100) {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select(`
      *,
      products (
        name,
        sku
      )
    `)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

export async function createInventoryTransaction(transactionData) {
  const {
    product_id, transaction_type, quantity, reference_type,
    reference_id, notes, store_id
  } = transactionData;
  
  // Use Supabase RPC for transaction-like operations
  const { data, error } = await supabase.rpc('create_inventory_transaction', {
    p_product_id: product_id,
    p_transaction_type: transaction_type,
    p_quantity: quantity,
    p_reference_type: reference_type,
    p_reference_id: reference_id,
    p_notes: notes,
    p_store_id: store_id
  });
  
  if (error) throw error;
  return data;
}

export default supabase;
