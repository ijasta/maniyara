import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const PROXY_URL         = import.meta.env.VITE_SUPABASE_PROXY_URL

// Simple reliable proxy — rewrites supabase.co calls through Cloudflare Worker
// Fixes Jio mobile data blocking of supabase.co
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  ...(PROXY_URL ? {
    global: {
      fetch: (url, options) => {
        const urlStr = url instanceof Request ? url.url : String(url)
        if (PROXY_URL && urlStr.includes('supabase.co')) {
          const proxied = urlStr.replace(SUPABASE_URL, PROXY_URL)
          const newOptions = { ...options }
          // Preserve headers but ensure apikey is always sent
          if (newOptions.headers) {
            if (newOptions.headers instanceof Headers) {
              newOptions.headers = Object.fromEntries(newOptions.headers.entries())
            }
          } else {
            newOptions.headers = {}
          }
          newOptions.headers['apikey'] = SUPABASE_ANON_KEY
          return fetch(proxied, newOptions)
        }
        return fetch(url, options)
      }
    }
  } : {})
})
export const COLORS  = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#C77DFF','#FF9A3C','#00D4AA']
export const AVATARS = ['🧔','👦','🧑','👨','🙍','🧒','👩','🧕','👱','🧑‍🦱']

// ── AUTH ──────────────────────────────────────────────────
export async function signUp(email, password, name, username, phone) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error

  if (data.user) {
    const { error: e2 } = await supabase.from('members').insert({
      id:       data.user.id,
      name,
      username: username.toLowerCase().trim(),
      phone,
      email,
      score:    0,
      streak:   0,
      is_admin: false,
      status:   'pending',   // ← admin must approve before they can enter
      color:    COLORS[Math.floor(Math.random() * COLORS.length)],
      avatar:   AVATARS[Math.floor(Math.random() * AVATARS.length)],
    })
    if (e2) throw e2
  }
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  await supabase.auth.signOut()
}

// ── MEMBERS ───────────────────────────────────────────────
export async function getMemberProfile(userId) {
  const { data, error } = await supabase
    .from('members').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export async function getMembers() {
  const { data, error } = await supabase
    .from('members').select('*').order('score', { ascending: false })
  if (error) throw error
  return data
}

export async function getPendingMembers() {
  const { data, error } = await supabase
    .from('members').select('*').eq('status', 'pending').order('created_at')
  if (error) throw error
  return data
}

export async function approveMember(memberId) {
  const { error } = await supabase
    .from('members').update({ status: 'approved' }).eq('id', memberId)
  if (error) throw error
}

export async function rejectMember(memberId) {
  const { error } = await supabase
    .from('members').update({ status: 'rejected' }).eq('id', memberId)
  if (error) throw error
}

export async function updateMember(userId, updates) {
  const { error } = await supabase
    .from('members').update(updates).eq('id', userId)
  if (error) throw error
}

export async function deleteMember(memberId) {
  const { error } = await supabase
    .from('members').delete().eq('id', memberId)
  if (error) throw error
}

// ── TASKS ─────────────────────────────────────────────────
export async function getTasks() {
  const { data, error } = await supabase
    .from('tasks').select('*').order('id')
  if (error) throw error
  return data
}

export async function updateTask(taskId, updates) {
  const { error } = await supabase
    .from('tasks').update(updates).eq('id', taskId)
  if (error) throw error
}

export async function addTask(task) {
  const { data, error } = await supabase
    .from('tasks').insert(task).select().single()
  if (error) throw error
  return data
}

export async function deleteTask(taskId) {
  const { error } = await supabase
    .from('tasks').delete().eq('id', taskId)
  if (error) throw error
}

// ── ASSIGNMENTS ───────────────────────────────────────────
export async function getCurrentAssignments() {
  const { data: s } = await supabase.from('settings').select('current_week').eq('id',1).single()
  const week = s?.current_week || 1
  const { data, error } = await supabase.from('assignments')
    .select('*, members(id,name,phone,avatar,color,score,streak), tasks(id,name,emoji,description,color)')
    .eq('week_number', week)
  if (error) throw error
  return { assignments: data || [], week }
}

export async function getMyAssignment(userId) {
  const { data: s } = await supabase.from('settings').select('current_week').eq('id',1).single()
  const week = s?.current_week || 1
  const { data, error } = await supabase.from('assignments')
    .select('*, tasks(*)')
    .eq('week_number', week).eq('member_id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function markTaskDone(assignmentId, memberId, proofFile) {
  let proof_url = null, proof_path = null

  if (proofFile) {
    const ext  = proofFile.name.split('.').pop()
    const path = `${memberId}/${Date.now()}.${ext}`
    const { error: ue } = await supabase.storage.from('task-proofs').upload(path, proofFile, { upsert: true })
    if (!ue) {
      const { data: ud } = supabase.storage.from('task-proofs').getPublicUrl(path)
      proof_url = ud.publicUrl; proof_path = path
    }
  }

  const deleteAt = new Date(Date.now() + 3 * 86400000).toISOString()
  await supabase.from('assignments').update({
    done: true, proof_url, proof_path, done_at: new Date().toISOString(), proof_expires_at: deleteAt
  }).eq('id', assignmentId)

  const { data: m } = await supabase.from('members').select('score,streak').eq('id', memberId).single()
  await supabase.from('members').update({ score: (m?.score||0)+10, streak: (m?.streak||0)+1 }).eq('id', memberId)
}

// ── ASSIGN & ROTATE ───────────────────────────────────────

// Admin assigns tasks to members for current week
// assigns = [{ member_id, task_id }]
export async function adminAssignTasks(assigns) {
  const { data: s } = await supabase.from('settings').select('current_week').eq('id',1).single()
  const week = s?.current_week || 1

  // Delete existing assignments for this week first (re-assign)
  await supabase.from('assignments').delete().eq('week_number', week)

  const rows = assigns.map(a => ({
    member_id:   a.member_id,
    task_id:     a.task_id,
    week_number: week,
    done:        false,
  }))
  const { error } = await supabase.from('assignments').insert(rows)
  if (error) throw error

  await supabase.from('logs').insert({
    action: `Tasks assigned for Week ${week}`,
    actor: 'Admin',
    details: `${rows.length} members assigned`
  })
  return week
}

// Admin clicks Rotate — shifts tasks UP the list, new week
export async function rotateToNextWeek() {
  const { data: s } = await supabase.from('settings').select('current_week').eq('id',1).single()
  const currentWeek = s?.current_week || 1
  const newWeek = currentWeek + 1

  // Get current week assignments
  const { data: currentAssigns, error: ae } = await supabase
    .from('assignments')
    .select('member_id, task_id')
    .eq('week_number', currentWeek)

  if (ae) throw new Error('Failed to load assignments: ' + ae.message)
  if (!currentAssigns?.length) throw new Error('No assignments found for current week. Assign tasks first.')

  // Get members ordered by created_at (consistent order)
  const { data: members, error: me } = await supabase
    .from('members')
    .select('id, name')
    .eq('status', 'approved')
    .order('created_at', { ascending: true })

  if (me) throw new Error('Failed to load members')
  if (!members?.length) throw new Error('No approved members')

  // Build task map: memberId → taskId
  const taskMap = {}
  currentAssigns.forEach(a => { taskMap[a.member_id] = a.task_id })

  const memberIds = members.map(m => m.id)

  // Rotate UP: member[i] gets task of member[i+1]
  // Last member gets task of first member
  const rows = memberIds.map((memberId, i) => {
    const fromMemberId = memberIds[(i + 1) % memberIds.length]
    return {
      member_id:   memberId,
      task_id:     taskMap[fromMemberId],
      week_number: newWeek,
      done:        false,
    }
  }).filter(r => r.task_id)

  if (!rows.length) throw new Error('Could not build rotation')

  // Bump week number
  await supabase.from('settings').update({ current_week: newWeek }).eq('id', 1)

  // Insert new week assignments
  const { error } = await supabase.from('assignments').insert(rows)
  if (error) throw error

  await supabase.from('logs').insert({
    action: `Rotated to Week ${newWeek}`,
    actor: 'Admin',
    details: `${rows.length} tasks rotated UP`
  })

  return newWeek
}

// Delete a single assignment
export async function deleteAssignment(assignmentId) {
  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId)
  if (error) throw error
}


// Clear ALL assignments across all weeks
export async function clearAllAssignments() {
  const { error } = await supabase.from('assignments').delete().gt('week_number', 0)
  if (error) throw error
}

// Clear only current week assignments
export async function clearWeekAssignments(week) {
  const { error } = await supabase.from('assignments').delete().eq('week_number', week)
  if (error) throw error
}

// Reset done status only (keep assignments, just mark all as not done)
export async function resetWeekDoneStatus(week) {
  const { error } = await supabase
    .from('assignments')
    .update({ done: false, proof_url: null, proof_path: null, done_at: null, proof_expires_at: null })
    .eq('week_number', week)
  if (error) throw error
}

export async function swapTasks(memberId1, memberId2, week) {
  const { data: a1 } = await supabase.from('assignments').select('id,task_id').eq('member_id', memberId1).eq('week_number', week).single()
  const { data: a2 } = await supabase.from('assignments').select('id,task_id').eq('member_id', memberId2).eq('week_number', week).single()
  if (!a1 || !a2) throw new Error('Assignments not found')
  await supabase.from('assignments').update({ task_id: a2.task_id }).eq('id', a1.id)
  await supabase.from('assignments').update({ task_id: a1.task_id }).eq('id', a2.id)
}

// ── SETTINGS ──────────────────────────────────────────────
export async function getSettings() {
  const { data, error } = await supabase.from('settings').select('*').eq('id',1).single()
  if (error) throw error
  return data
}

export async function updateSettings(updates) {
  const { error } = await supabase.from('settings').update(updates).eq('id',1)
  if (error) throw error
}

// Check if current user is task assigner or admin
export async function getMyRole(userId) {
  const { data, error } = await supabase
    .from('settings')
    .select('task_assigner_id, task_assigner:members!task_assigner_id(id,name,avatar,color)')
    .eq('id', 1).single()
  if (error) return { isAssigner: false, assigner: null }
  return {
    isAssigner: data?.task_assigner_id === userId,
    assigner:   data?.task_assigner || null,
    assignerId: data?.task_assigner_id
  }
}

// ── LOGS ──────────────────────────────────────────────────
export async function getLogs(limit = 60) {
  const { data, error } = await supabase.from('logs').select('*').order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return data
}

export async function addLog(action, actor, details = '') {
  await supabase.from('logs').insert({ action, actor, details })
}

export function buildWALink(phone, message) {
  return `https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`
}

// ── EXPENSES ──────────────────────────────────────────────
export async function getExpenses() {
  const { data, error } = await supabase
    .from('expenses')
    .select(`*, paid_by_member:members!paid_by(id,name,avatar,color), expense_splits(*, member:members(id,name,avatar,color))`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function addExpense(title, amount, category, paidById, note, splitMemberIds) {
  // Insert expense
  const { data: exp, error } = await supabase
    .from('expenses')
    .insert({ title, amount, category, paid_by: paidById, note })
    .select().single()
  if (error) throw error

  // Calculate each person's share
  const share = Math.round((amount / splitMemberIds.length) * 100) / 100
  const splits = splitMemberIds.map((mid, i) => ({
    expense_id: exp.id,
    member_id:  mid,
    // Give any rounding remainder to the last person
    amount: i === splitMemberIds.length - 1
      ? Math.round((amount - share * (splitMemberIds.length - 1)) * 100) / 100
      : share,
    // Person who paid is already "paid" for their own share
    paid: mid === paidById,
    paid_at: mid === paidById ? new Date().toISOString() : null,
  }))

  const { error: se } = await supabase.from('expense_splits').insert(splits)
  if (se) throw se
  return exp
}

export async function markSplitPaid(splitId) {
  const { error } = await supabase
    .from('expense_splits')
    .update({ paid: true, paid_at: new Date().toISOString() })
    .eq('id', splitId)
  if (error) throw error
}

export async function markSplitUnpaid(splitId) {
  const { error } = await supabase
    .from('expense_splits')
    .update({ paid: false, paid_at: null })
    .eq('id', splitId)
  if (error) throw error
}

export async function deleteExpense(expenseId) {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
  if (error) throw error
}

// Calculate who owes whom (simplified debt algorithm)
export function calcDebts(expenses) {
  // net[memberId] = positive means they are owed money, negative means they owe
  const net = {}

  expenses.forEach(exp => {
    exp.expense_splits?.forEach(split => {
      const mid = split.member_id
      if (!net[mid]) net[mid] = { id: mid, name: split.member?.name, avatar: split.member?.avatar, color: split.member?.color, balance: 0 }
      if (!split.paid) net[mid].balance -= split.amount  // they owe this much
    })
    // The payer is owed the sum of all unpaid splits (excluding their own)
    const unpaidByOthers = exp.expense_splits?.filter(s => !s.paid && s.member_id !== exp.paid_by).reduce((sum, s) => sum + Number(s.amount), 0) || 0
    if (exp.paid_by) {
      if (!net[exp.paid_by]) net[exp.paid_by] = { id: exp.paid_by, name: exp.paid_by_member?.name, avatar: exp.paid_by_member?.avatar, color: exp.paid_by_member?.color, balance: 0 }
      net[exp.paid_by].balance += unpaidByOthers
    }
  })

  // Simplify: generate minimum transactions
  const creditors = Object.values(net).filter(m => m.balance > 0.01).sort((a,b) => b.balance - a.balance)
  const debtors   = Object.values(net).filter(m => m.balance < -0.01).sort((a,b) => a.balance - b.balance)
  const txns = []

  let ci = 0, di = 0
  const cr = creditors.map(c => ({...c}))
  const dr = debtors.map(d => ({...d}))

  while (ci < cr.length && di < dr.length) {
    const amount = Math.min(cr[ci].balance, -dr[di].balance)
    if (amount > 0.01) {
      txns.push({ from: dr[di], to: cr[ci], amount: Math.round(amount * 100) / 100 })
    }
    cr[ci].balance -= amount
    dr[di].balance += amount
    if (cr[ci].balance < 0.01) ci++
    if (dr[di].balance > -0.01) di++
  }

  return txns
}

// ── COMMON FUND ───────────────────────────────────────────
export async function getFundData() {
  const [{ data: txns, error: te }, { data: settings, error: se }] = await Promise.all([
    supabase.from('fund_transactions')
      .select('*, added_by_member:members!added_by(id,name,avatar,color)')
      .order('created_at', { ascending: false }),
    supabase.from('fund_settings').select('*, treasurer:members!treasurer_id(id,name,avatar,color)').eq('id',1).single()
  ])
  if (te) throw te
  if (se && se.code !== 'PGRST116') throw se
  const balance = (txns||[]).reduce((sum, t) => t.type==='credit' ? sum+Number(t.amount) : sum-Number(t.amount), 0)
  return { txns: txns||[], settings: settings||{ monthly_target:1000, low_balance_alert:200 }, balance }
}

export async function addFundTransaction(type, amount, reason) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('fund_transactions').insert({ type, amount, reason, added_by: user.id })
  if (error) throw error
}

export async function updateFundTransaction(id, updates) {
  const { error } = await supabase.from('fund_transactions').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteFundTransaction(id) {
  const { error } = await supabase.from('fund_transactions').delete().eq('id', id)
  if (error) throw error
}

export async function updateFundSettings(updates) {
  const { error } = await supabase.from('fund_settings').update(updates).eq('id', 1)
  if (error) throw error
}

// ── COOKING PARTIES ───────────────────────────────────────
export async function getCookingParties() {
  const { data, error } = await supabase
    .from('cooking_parties')
    .select(`*,
      created_by_member:members!created_by(id,name,avatar,color),
      cooking_party_members(member_id, members(id,name,avatar,color)),
      cooking_items(*)`)
    .order('date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createCookingParty(name, date, memberIds) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('cooking_parties')
    .insert([{ name, date, created_by: user?.id }])
    .select().single()
  if (error) throw error
  if (memberIds.length > 0) {
    const { error: me } = await supabase
      .from('cooking_party_members')
      .insert(memberIds.map(mid => ({ party_id: data.id, member_id: mid })))
    if (me) throw me
  }
  return data
}

export async function updatePartyMembers(partyId, memberIds) {
  const { error: de } = await supabase
    .from('cooking_party_members').delete().eq('party_id', partyId)
  if (de) throw de
  if (memberIds.length > 0) {
    const { error: ie } = await supabase
      .from('cooking_party_members')
      .insert(memberIds.map(mid => ({ party_id: partyId, member_id: mid })))
    if (ie) throw ie
  }
}

export async function addCookingItem(partyId, name, rate, quantity, unit) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('cooking_items')
    .insert([{ party_id: partyId, name, rate, quantity, unit, added_by: user?.id }])
  if (error) throw error
}

export async function updateCookingItem(id, updates) {
  const { error } = await supabase
    .from('cooking_items').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteCookingItem(id) {
  const { error } = await supabase
    .from('cooking_items').delete().eq('id', id)
  if (error) throw error
}

export async function deleteCookingParty(id) {
  const { error } = await supabase
    .from('cooking_parties').delete().eq('id', id)
  if (error) throw error
}
