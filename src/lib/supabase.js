import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

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

// ── ROTATION ──────────────────────────────────────────────

// Get members in rotation order (sort_order then created_at)
export async function getMembersOrdered() {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('status', 'approved')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

// Update member sort order
export async function updateMemberOrder(memberId, sortOrder) {
  const { error } = await supabase
    .from('members')
    .update({ sort_order: sortOrder })
    .eq('id', memberId)
  if (error) throw error
}

// Manual admin assign for week 1 (or any week)
export async function adminAssignTasks(assignments) {
  // assignments = [{ member_id, task_id }]
  const { data: s } = await supabase.from('settings').select('current_week').eq('id',1).single()
  const week = s?.current_week || 1
  const rows = assignments.map(a => ({
    member_id:   a.member_id,
    task_id:     a.task_id,
    week_number: week,
    done:        false,
  }))
  const { error } = await supabase.from('assignments').insert(rows)
  if (error) throw error
  return week
}

// Force rotate NOW (same logic as edge function — rotate UP)
export async function forceRotate() {
  const { data: s } = await supabase.from('settings').select('current_week').eq('id',1).single()
  const currentWeek = s?.current_week || 0
  const newWeek = currentWeek + 1

  // Get members in sort order
  const members = await getMembersOrdered()
  if (!members?.length) throw new Error('No approved members')

  if (currentWeek === 0) {
    // First time — just bump week, admin assigns manually
    await supabase.from('settings').update({ current_week: newWeek }).eq('id', 1)
    return newWeek
  }

  // Get current week assignments
  const { data: currentAssigns } = await supabase
    .from('assignments')
    .select('member_id, task_id')
    .eq('week_number', currentWeek)

  if (!currentAssigns?.length) throw new Error('No assignments for current week to rotate from')

  // Build task map: memberId → taskId
  const taskMap = {}
  currentAssigns.forEach(a => { taskMap[a.member_id] = a.task_id })

  const memberIds = members.map(m => m.id)

  // Rotate UP: member[i] gets task of member[i+1], last gets task of first
  const rows = memberIds.map((memberId, i) => {
    const nextMemberId = memberIds[(i + 1) % memberIds.length]
    return {
      member_id:   memberId,
      task_id:     taskMap[nextMemberId],
      week_number: newWeek,
      done:        false,
    }
  }).filter(r => r.task_id)

  if (!rows.length) throw new Error('Could not build rotation — no task data found')

  await supabase.from('settings').update({ current_week: newWeek }).eq('id', 1)
  const { error } = await supabase.from('assignments').insert(rows)
  if (error) throw error

  await supabase.from('logs').insert({
    action: `Manual rotation to Week ${newWeek}`,
    actor: 'Admin',
    details: `${rows.length} tasks rotated UP`
  })

  return newWeek
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
