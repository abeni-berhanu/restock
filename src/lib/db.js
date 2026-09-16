import { supabase } from './supabaseClient'

/* =========================================================
   AUTH
   ========================================================= */

export async function signUp({ email, password, shopName, fullName }) {
  // shop_name/full_name ride along as user metadata so that, if email
  // confirmation is required, we can finish creating the shop later —
  // once a real session exists — without asking the person to retype anything.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { shop_name: shopName, full_name: fullName } },
  })
  if (error) throw error

  if (!data.session) {
    return { needsEmailConfirmation: true }
  }

  const { error: rpcError } = await supabase.rpc('create_shop_with_owner', {
    shop_name: shopName,
    owner_name: fullName,
  })
  if (rpcError) throw rpcError

  return { needsEmailConfirmation: false }
}

// Called after login when a session exists but no profile row does yet.
// Two cases land here: an owner whose email confirmation delayed shop
// creation, or a staff member who signed up via an invite link. We read
// whichever metadata was stashed at signup time to figure out which.
export async function provisionShopFromMetadata() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const meta = user.user_metadata || {}

  if (meta.invite_code) {
    const { error } = await supabase.rpc('accept_invite', {
      invite_id: meta.invite_code,
      full_name: meta.full_name || '',
    })
    if (error) throw error
    return getMyProfile()
  }

  if (meta.shop_name) {
    const { error } = await supabase.rpc('create_shop_with_owner', {
      shop_name: meta.shop_name,
      owner_name: meta.full_name || '',
    })
    if (error) throw error
    return getMyProfile()
  }

  return null // nothing to auto-provision with
}

// Manual fallback if metadata is somehow missing — lets the person type
// the shop name themselves rather than getting stuck.
export async function completeShopSetup({ shopName, fullName }) {
  const { error } = await supabase.rpc('create_shop_with_owner', {
    shop_name: shopName,
    owner_name: fullName,
  })
  if (error) throw error
  return getMyProfile()
}

// Staff signup via an invite link. invite_code rides along as metadata,
// same pattern as the owner path, so it survives an email-confirmation trip.
export async function signUpWithInvite({ email, password, fullName, inviteId }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { invite_code: inviteId, full_name: fullName } },
  })
  if (error) throw error

  if (!data.session) {
    return { needsEmailConfirmation: true }
  }

  const { error: rpcError } = await supabase.rpc('accept_invite', {
    invite_id: inviteId,
    full_name: fullName,
  })
  if (rpcError) throw rpcError

  return { needsEmailConfirmation: false }
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

// Listen for login/logout, used to drive the app's top-level auth state.
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return data.subscription // caller should call .unsubscribe() on cleanup
}

/* =========================================================
   PROFILE  (who am I, which shop, what role)
   ========================================================= */

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, shop_id, role, full_name')
    .eq('id', user.id)
    .maybeSingle() // returns null instead of throwing when no row exists yet

  if (error) throw error
  return data
}

/* =========================================================
   ITEMS
   ========================================================= */

export async function getItems() {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data
}

export async function addItem({ shopId, name, category, qty, unit, cost, threshold }) {
  const { data, error } = await supabase
    .from('items')
    .insert({ shop_id: shopId, name, category, qty, unit, cost, threshold })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateItem(id, fields) {
  const { data, error } = await supabase
    .from('items')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteItem(id) {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}

/* =========================================================
   MOVEMENTS  (append-only activity log)
   ========================================================= */

export async function recordMovement({
  shopId, itemId, itemName, category, type, delta, qtyAfter, note, createdBy,
}) {
  const { data, error } = await supabase
    .from('movements')
    .insert({
      shop_id: shopId,
      item_id: itemId,
      item_name: itemName,
      category,
      type,
      delta,
      qty_after: qtyAfter,
      note: note || '',
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getMovements({ limit = 200 } = {}) {
  const { data, error } = await supabase
    .from('movements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/* =========================================================
   STAFF & INVITES
   ========================================================= */

// Public — callable before login, to show "You've been invited to join X"
export async function getInviteInfo(inviteId) {
  const { data, error } = await supabase.rpc('get_invite_info', { invite_id: inviteId })
  if (error) throw error
  return data && data[0] ? data[0] : null
}

export async function createInvite({ shopId, email, invitedBy }) {
  const { data, error } = await supabase
    .from('invites')
    .insert({ shop_id: shopId, email: email.toLowerCase().trim(), invited_by: invitedBy })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getInvites() {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function revokeInvite(id) {
  const { error } = await supabase.from('invites').delete().eq('id', id)
  if (error) throw error
}

export async function getTeam() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}
