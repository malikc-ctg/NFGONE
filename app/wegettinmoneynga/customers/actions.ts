'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/api-auth';
import { revalidatePath } from 'next/cache';

export async function deleteCustomerAction(customerId: string) {
  try {
    // Basic auth check
    const authError = await requireRole(['admin']);
    if (authError) return { success: false, error: 'Unauthorized' };

    const supabase = await createServiceClient();

    // 1. Get the customer to find their profile_id
    const { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('profile_id')
      .eq('id', customerId)
      .single();

    if (fetchError) {
      console.error('Error fetching customer for deletion:', fetchError);
      return { success: false, error: 'Customer not found' };
    }

    // 2. Delete the customer record first (so we don't just orphan it)
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (deleteError) {
      console.error('Error deleting customer:', deleteError);
      return { success: false, error: 'Failed to delete customer record' };
    }

    // 3. Delete the auth user if a profile was linked
    if (customer?.profile_id) {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(customer.profile_id);
      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError);
        // We still succeed overall since the customer record is gone, 
        // but log the error if auth deletion fails
      }
    }

    revalidatePath('/wegettinmoneynga/customers');
    return { success: true };
  } catch (err: any) {
    console.error('Action error deleting customer:', err);
    return { success: false, error: err.message || 'Internal server error' };
  }
}
