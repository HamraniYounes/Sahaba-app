import { supabase } from '../lib/supabase'
import type { Database } from '../types/supabase'

export type OwnershipTransfer = Database['public']['Tables']['ownership_transfers']['Row']

export async function requestOwnershipTransfer(locationId: string, targetEmail: string, message = '') {
  const args: { p_location_id: string; p_target_email: string; p_message?: string } = {
    p_location_id: locationId,
    p_target_email: targetEmail,
  }
  if (message.trim()) args.p_message = message.trim()
  return supabase.rpc('request_ownership_transfer', args)
}

export async function getIncomingOwnershipTransfers(userId: string) {
  return supabase
    .from('ownership_transfers')
    .select('*')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
}

export async function getOutgoingOwnershipTransfers(userId: string) {
  return supabase
    .from('ownership_transfers')
    .select('*')
    .eq('from_owner_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
}

export async function acceptOwnershipTransfer(transferId: string) {
  return supabase.rpc('accept_ownership_transfer', { p_transfer_id: transferId })
}

export async function rejectOwnershipTransfer(transferId: string) {
  return supabase.rpc('reject_ownership_transfer', { p_transfer_id: transferId })
}

export async function cancelOwnershipTransfer(transferId: string) {
  return supabase.rpc('cancel_ownership_transfer', { p_transfer_id: transferId })
}
