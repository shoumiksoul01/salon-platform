import { DEMO_ADMIN, moderation } from '../mocks/adminModeration'
import type { AuditAction, AuditEntity, AuditLog, Moderation } from '../mocks/adminModeration'
import { getMockMode, mockDelay } from './mock'

export type {
  AuditLog,
  Complaint,
  ComplaintStatus,
  Moderation,
  ReportStatus,
  ReviewReport,
} from '../mocks/adminModeration'

export type ReportDecision = 'keep' | 'hide'
export type ComplaintDecision = 'start' | 'resolve' | 'reject'

const USE_MOCK = true

// In memory only, so a page reload brings the fixtures back.
let store: Moderation = moderation

function logEntry(
  action: AuditAction,
  entityType: AuditEntity,
  entityId: string,
  target: string,
  note: string,
): AuditLog {
  return {
    id: crypto.randomUUID(),
    actor_id: DEMO_ADMIN.id,
    actor_name: DEMO_ADMIN.name,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: { target, note },
    created_at: new Date().toISOString(),
  }
}

export async function getModeration(): Promise<Moderation> {
  if (!USE_MOCK) throw new Error('The moderation API is not wired yet')

  return mockDelay<Moderation>(() => {
    const mode = getMockMode()
    if (mode === 'error') throw new Error('Mock error')
    return mode === 'empty' ? { reports: [], complaints: [], audit: [] } : store
  })
}

export async function handleReport(
  reportId: string,
  decision: ReportDecision,
): Promise<Moderation> {
  if (!USE_MOCK) throw new Error('The moderation API is not wired yet')

  return mockDelay<Moderation>(() => {
    const report = store.reports.find((item) => item.id === reportId)
    if (!report || report.status !== 'open') throw new Error('invalid_status')

    const status = decision === 'hide' ? 'review_hidden' : 'dismissed'
    const action = decision === 'hide' ? 'review_hidden' : 'report_dismissed'
    store = {
      ...store,
      reports: store.reports.map((item) =>
        item.id === reportId
          ? { ...item, status, handled_by: DEMO_ADMIN.id, handled_at: new Date().toISOString() }
          : item,
      ),
      audit: [logEntry(action, 'review_report', reportId, report.shop_name, ''), ...store.audit],
    }
    return store
  })
}

export async function handleComplaint(
  complaintId: string,
  decision: ComplaintDecision,
  resolution = '',
): Promise<Moderation> {
  if (!USE_MOCK) throw new Error('The moderation API is not wired yet')

  return mockDelay<Moderation>(() => {
    const complaint = store.complaints.find((item) => item.id === complaintId)
    const open = complaint?.status === 'open'
    const allowed = decision === 'start' ? open : open || complaint?.status === 'in_review'
    if (!complaint || !allowed) throw new Error('invalid_status')

    const note = decision === 'start' ? '' : resolution.trim()
    if (decision !== 'start' && !note) throw new Error('resolution_required')

    const next = {
      start: { status: 'in_review', action: 'complaint_in_review' },
      resolve: { status: 'resolved', action: 'complaint_resolved' },
      reject: { status: 'rejected', action: 'complaint_rejected' },
    } as const
    const { status, action } = next[decision]

    store = {
      ...store,
      complaints: store.complaints.map((item) =>
        item.id === complaintId
          ? {
              ...item,
              status,
              resolution: note || null,
              handled_by: DEMO_ADMIN.id,
              handled_at: new Date().toISOString(),
            }
          : item,
      ),
      audit: [
        logEntry(action, 'complaint', complaintId, complaint.customer_name, note),
        ...store.audit,
      ],
    }
    return store
  })
}