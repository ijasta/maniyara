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
export async function forceRotate() {
  const { data: s } = await supabase.from('settings').select('current_week').eq('id',1).single()
  const newWeek = (s?.current_week || 0) + 1
  await supabase.from('settings').update({ current_week: newWeek }).eq('id', 1)

  const { data: members } = await supabase.from('members').select('id').eq('status','approved').order('created_at')
  const { data: tasks }   = await supabase.from('tasks').select('id').eq('active', true).order('id')
  if (!members?.length || !tasks?.length) return

  const offset = (newWeek - 1) % tasks.length
  const rows = members.map((m, i) => ({
    member_id:   m.id,
    task_id:     tasks[(i + offset) % tasks.length].id,
    week_number: newWeek,
    done: false,
  }))
  await supabase.from('assignments').insert(rows)
  return newWeek
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
