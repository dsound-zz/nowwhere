import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Get all reviewed emails (where admin_outcome is set)
    const { data: reviewedEmails, error } = await supabase
      .from('email_queue')
      .select('admin_outcome, confidence, parsed_data')
      .not('admin_outcome', 'is', null)

    if (error) {
      console.error('[admin-accuracy] Error fetching reviewed emails:', error)
      return NextResponse.json(
        { error: 'Failed to fetch accuracy data' },
        { status: 500 }
      )
    }

    if (!reviewedEmails || reviewedEmails.length === 0) {
      return NextResponse.json({
        total_reviewed: 0,
        approved: 0,
        rejected: 0,
        approval_rate: 0,
        avg_confidence_approved: 0,
        avg_confidence_rejected: 0,
        by_category: {},
      })
    }

    // Calculate stats
    const approved = reviewedEmails.filter((e) => e.admin_outcome === 'approved')
    const rejected = reviewedEmails.filter((e) => e.admin_outcome === 'rejected')

    const approvedCount = approved.length
    const rejectedCount = rejected.length
    const totalReviewed = reviewedEmails.length

    // Calculate average confidence for approved and rejected
    const avgConfidenceApproved =
      approvedCount > 0
        ? approved.reduce((sum, e) => sum + (e.confidence || 0), 0) / approvedCount
        : 0

    const avgConfidenceRejected =
      rejectedCount > 0
        ? rejected.reduce((sum, e) => sum + (e.confidence || 0), 0) / rejectedCount
        : 0

    // Calculate by category
    const byCategory: Record<string, { approved: number; rejected: number }> = {}

    reviewedEmails.forEach((email) => {
      const parsedData = email.parsed_data as { category?: string } | null
      const category = parsedData?.category || 'unknown'

      if (!byCategory[category]) {
        byCategory[category] = { approved: 0, rejected: 0 }
      }

      if (email.admin_outcome === 'approved') {
        byCategory[category].approved++
      } else if (email.admin_outcome === 'rejected') {
        byCategory[category].rejected++
      }
    })

    return NextResponse.json({
      total_reviewed: totalReviewed,
      approved: approvedCount,
      rejected: rejectedCount,
      approval_rate: totalReviewed > 0 ? approvedCount / totalReviewed : 0,
      avg_confidence_approved: avgConfidenceApproved,
      avg_confidence_rejected: avgConfidenceRejected,
      by_category: byCategory,
    })
  } catch (err) {
    console.error('[admin-accuracy] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
