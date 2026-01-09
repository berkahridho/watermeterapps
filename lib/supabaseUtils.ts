import { supabase } from './supabase';

export interface FetchOptions {
  select?: string;
  filters?: Record<string, any>;
  order?: {
    column: string;
    ascending?: boolean;
  };
  limit?: number;
}

/**
 * Generic function to fetch data from Supabase
 * @param table - The name of the table to query
 * @param options - Options for the query including select, filters, order and limit
 */
export async function fetchData<T = any>(
  table: string,
  options: FetchOptions = {}
): Promise<{ data: T[] | null; error: any }> {
  try {
    let query = supabase.from(table).select(options.select || '*');
    
    // Apply filters if provided
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }
    
    // Apply ordering if provided
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending });
    }
    
    // Apply limit if provided
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return { data: data as T[] | null, error: null };
  } catch (error) {
    console.error(`Error fetching data from table ${table}:`, error);
    return { data: null, error };
  }
}

/**
 * Generic function to insert data into Supabase
 * @param table - The name of the table to insert into
 * @param data - The data to insert
 */
export async function insertData<T = any>(
  table: string,
  data: T
): Promise<{ data: T | null; error: any }> {
  try {
    const { data: insertedData, error } = await supabase
      .from(table)
      .insert([data])
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return { data: insertedData, error: null };
  } catch (error) {
    console.error(`Error inserting data into table ${table}:`, error);
    return { data: null, error };
  }
}

/**
 * Generic function to update data in Supabase
 * @param table - The name of the table to update
 * @param id - The ID of the record to update
 * @param data - The updated data
 * @param idColumn - The name of the ID column (default: 'id')
 */
export async function updateData<T = any>(
  table: string,
  id: string | number,
  data: Partial<T>,
  idColumn: string = 'id'
): Promise<{ data: T | null; error: any }> {
  try {
    const { data: updatedData, error } = await supabase
      .from(table)
      .update(data)
      .eq(idColumn, id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return { data: updatedData, error: null };
  } catch (error) {
    console.error(`Error updating data in table ${table}:`, error);
    return { data: null, error };
  }
}

/**
 * Generic function to delete data from Supabase
 * @param table - The name of the table to delete from
 * @param id - The ID of the record to delete
 * @param idColumn - The name of the ID column (default: 'id')
 */
export async function deleteData(
  table: string,
  id: string | number,
  idColumn: string = 'id'
): Promise<{ error: any }> {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(idColumn, id);
    
    if (error) {
      throw error;
    }
    
    return { error: null };
  } catch (error) {
    console.error(`Error deleting data from table ${table}:`, error);
    return { error };
  }
}