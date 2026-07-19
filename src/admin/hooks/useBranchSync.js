import { useState } from 'react'
import { syncBranchAspects } from '../utils/branchSync.js'

export function useBranchSync() {
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [syncError, setSyncError] = useState('')

  async function runSync({ sourceBranchId, targetBranchIds, aspects }) {
    setSyncing(true)
    setSyncMessage('')
    setSyncError('')

    try {
      if (!sourceBranchId) throw new Error('اختر فرع المصدر')
      if (!targetBranchIds || targetBranchIds.length === 0) throw new Error('اختر فرعًا واحدًا على الأقل كوجهة')
      if (!aspects || aspects.length === 0) throw new Error('اختر عنصرًا واحدًا على الأقل للمزامنة')

      const synced = await syncBranchAspects({ sourceBranchId, targetBranchIds, aspects })
      setSyncMessage(`تمت المزامنة بنجاح إلى ${synced.length} فرع.`)
      return synced
    } catch (err) {
      console.error(err)
      setSyncError(err.message || 'صار خطأ أثناء المزامنة')
      throw err
    } finally {
      setSyncing(false)
    }
  }

  return { syncing, syncMessage, syncError, setSyncMessage, setSyncError, runSync }
}
