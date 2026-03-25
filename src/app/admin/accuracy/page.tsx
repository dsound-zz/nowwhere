'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/SupabaseProvider'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'

interface AccuracyStats {
   total_reviewed: number
   approved: number
   rejected: number
   approval_rate: number
   avg_confidence_approved: number
   avg_confidence_rejected: number
   by_category: Record<string, { approved: number; rejected: number }>
}

export default function AdminAccuracyPage() {
   const { user, loading: authLoading } = useAuth()
   const router = useRouter()
   const supabase = createClient()

   const [stats, setStats] = useState<AccuracyStats | null>(null)
   const [isLoading, setIsLoading] = useState(true)
   const [error, setError] = useState<string | null>(null)

   // Check auth on mount
   useEffect(() => {
      if (!authLoading && !user) {
         router.push('/')
         return
      }

      // Check if user is admin
      if (user) {
         const checkAdmin = async () => {
            const { data: isAdmin } = await supabase.rpc('is_admin_user')
            if (!isAdmin) {
               router.push('/')
            }
         }
         checkAdmin()
      }
   }, [user, authLoading, router, supabase])

   // Fetch accuracy stats
   useEffect(() => {
      const fetchStats = async () => {
         try {
            const response = await fetch('/api/admin/accuracy')

            if (!response.ok) {
               throw new Error('Failed to fetch accuracy stats')
            }

            const data = await response.json()
            setStats(data)
         } catch (err) {
            console.error('Error fetching accuracy stats:', err)
            setError(err instanceof Error ? err.message : 'Failed to load stats')
         } finally {
            setIsLoading(false)
         }
      }

      if (user) fetchStats()
   }, [user])

   if (authLoading || !user) {
      return (
         <div className="flex h-screen items-center justify-center bg-bg">
            <div className="text-muted">Loading...</div>
         </div>
      )
   }

   return (
      <div className="flex h-screen overflow-hidden">
         <Sidebar />

         <main className="flex-1 overflow-y-auto">
            <div className="p-7">
               <div className="flex items-center justify-between mb-6">
                  <h1 className="font-display font-bold text-2xl">
                     AI Accuracy <span className="text-teal">Dashboard</span>
                  </h1>
                  <div className="flex items-center gap-3">
                     <a
                        href="/admin/venues"
                        className="text-sm text-teal hover:underline font-medium"
                     >
                        ← Venue Admin
                     </a>
                     <span className="text-border">|</span>
                     <a
                        href="/admin/review"
                        className="text-sm text-teal hover:underline font-medium"
                     >
                        Email Review Queue
                     </a>
                  </div>
               </div>

               {isLoading ? (
                  <div className="text-muted text-sm">Loading stats...</div>
               ) : error ? (
                  <div className="bg-coral/10 border border-coral/20 rounded-lg p-4">
                     <div className="text-coral text-sm">{error}</div>
                  </div>
               ) : !stats ? (
                  <div className="text-muted text-sm">No data available</div>
               ) : stats.total_reviewed === 0 ? (
                  <div className="bg-surface2 border border-border rounded-lg p-8 text-center">
                     <div className="text-4xl mb-2">📊</div>
                     <div className="text-lg font-semibold mb-1">No reviews yet</div>
                     <div className="text-sm text-muted">
                        Start reviewing emails to see AI accuracy metrics
                     </div>
                  </div>
               ) : (
                  <div className="space-y-6">
                     {/* Overview Cards */}
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-surface2 border border-border rounded-lg p-4">
                           <div className="text-xs text-muted uppercase tracking-wider mb-1">
                              Total Reviewed
                           </div>
                           <div className="text-3xl font-bold">{stats.total_reviewed}</div>
                        </div>

                        <div className="bg-green/10 border border-green/20 rounded-lg p-4">
                           <div className="text-xs text-green/80 uppercase tracking-wider mb-1">
                              Approved
                           </div>
                           <div className="text-3xl font-bold text-green">{stats.approved}</div>
                           <div className="text-xs text-green/70 mt-1">
                              {((stats.approved / stats.total_reviewed) * 100).toFixed(1)}%
                           </div>
                        </div>

                        <div className="bg-coral/10 border border-coral/20 rounded-lg p-4">
                           <div className="text-xs text-coral/80 uppercase tracking-wider mb-1">
                              Rejected
                           </div>
                           <div className="text-3xl font-bold text-coral">{stats.rejected}</div>
                           <div className="text-xs text-coral/70 mt-1">
                              {((stats.rejected / stats.total_reviewed) * 100).toFixed(1)}%
                           </div>
                        </div>

                        <div className="bg-teal/10 border border-teal/20 rounded-lg p-4">
                           <div className="text-xs text-teal/80 uppercase tracking-wider mb-1">
                              Approval Rate
                           </div>
                           <div className="text-3xl font-bold text-teal">
                              {(stats.approval_rate * 100).toFixed(1)}%
                           </div>
                        </div>
                     </div>

                     {/* Confidence Analysis */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-surface2 border border-border rounded-lg p-6">
                           <h2 className="text-lg font-semibold mb-4">Confidence Analysis</h2>

                           <div className="space-y-4">
                              <div>
                                 <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted">Avg. Confidence (Approved)</span>
                                    <span className="text-sm font-semibold text-green">
                                       {(stats.avg_confidence_approved * 100).toFixed(1)}%
                                    </span>
                                 </div>
                                 <div className="w-full bg-surface rounded-full h-2">
                                    <div
                                       className="bg-green h-2 rounded-full transition-all"
                                       style={{ width: `${stats.avg_confidence_approved * 100}%` }}
                                    />
                                 </div>
                              </div>

                              <div>
                                 <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-muted">Avg. Confidence (Rejected)</span>
                                    <span className="text-sm font-semibold text-coral">
                                       {(stats.avg_confidence_rejected * 100).toFixed(1)}%
                                    </span>
                                 </div>
                                 <div className="w-full bg-surface rounded-full h-2">
                                    <div
                                       className="bg-coral h-2 rounded-full transition-all"
                                       style={{ width: `${stats.avg_confidence_rejected * 100}%` }}
                                    />
                                 </div>
                              </div>
                           </div>

                           <div className="mt-6 pt-4 border-t border-border">
                              <div className="text-xs text-muted mb-2">Insight</div>
                              <div className="text-sm">
                                 {stats.avg_confidence_approved > stats.avg_confidence_rejected + 0.1 ? (
                                    <span className="text-green">
                                       ✓ AI shows higher confidence for approved events, indicating good calibration
                                    </span>
                                 ) : stats.avg_confidence_approved < stats.avg_confidence_rejected - 0.1 ? (
                                    <span className="text-coral">
                                       ⚠ AI confidence is misaligned - rejected items have higher confidence
                                    </span>
                                 ) : (
                                    <span className="text-amber">
                                       → Similar confidence levels across approved and rejected items
                                    </span>
                                 )}
                              </div>
                           </div>
                        </div>

                        {/* Performance by Category */}
                        <div className="bg-surface2 border border-border rounded-lg p-6">
                           <h2 className="text-lg font-semibold mb-4">Performance by Category</h2>

                           {Object.keys(stats.by_category).length === 0 ? (
                              <div className="text-sm text-muted">No category data available</div>
                           ) : (
                              <div className="space-y-3">
                                 {Object.entries(stats.by_category)
                                    .sort(([, a], [, b]) => (b.approved + b.rejected) - (a.approved + a.rejected))
                                    .map(([category, data]) => {
                                       const total = data.approved + data.rejected
                                       const approvalRate = total > 0 ? (data.approved / total) * 100 : 0

                                       return (
                                          <div key={category} className="space-y-1">
                                             <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium capitalize">{category}</span>
                                                <span className="text-muted text-xs">
                                                   {data.approved} / {total} ({approvalRate.toFixed(0)}%)
                                                </span>
                                             </div>
                                             <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden">
                                                <div className="flex h-full">
                                                   <div
                                                      className="bg-green transition-all"
                                                      style={{ width: `${(data.approved / total) * 100}%` }}
                                                   />
                                                   <div
                                                      className="bg-coral transition-all"
                                                      style={{ width: `${(data.rejected / total) * 100}%` }}
                                                   />
                                                </div>
                                             </div>
                                          </div>
                                       )
                                    })}
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Recommendations */}
                     <div className="bg-teal/5 border border-teal/20 rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                           <span>💡</span>
                           Recommendations
                        </h2>

                        <div className="space-y-2 text-sm">
                           {stats.approval_rate < 0.5 ? (
                              <div className="text-coral">
                                 • Low approval rate ({(stats.approval_rate * 100).toFixed(1)}%) - Consider adjusting AI parsing prompts or training data
                              </div>
                           ) : stats.approval_rate > 0.9 ? (
                              <div className="text-green">
                                 • Excellent approval rate ({(stats.approval_rate * 100).toFixed(1)}%) - AI is performing well
                              </div>
                           ) : (
                              <div className="text-amber">
                                 • Moderate approval rate ({(stats.approval_rate * 100).toFixed(1)}%) - Room for improvement
                              </div>
                           )}

                           {stats.avg_confidence_approved < 0.6 && (
                              <div className="text-amber">
                                 • Average confidence for approved events is relatively low - AI may need more training
                              </div>
                           )}

                           {stats.avg_confidence_rejected > 0.7 && (
                              <div className="text-coral">
                                 • High confidence on rejected items suggests the AI is overconfident
                              </div>
                           )}

                           {Object.entries(stats.by_category).some(([, data]) => {
                              const total = data.approved + data.rejected
                              return total > 5 && (data.approved / total) < 0.4
                           }) && (
                                 <div className="text-amber">
                                    • Some categories have low approval rates - consider category-specific improvements
                                 </div>
                              )}

                           {stats.total_reviewed < 20 && (
                              <div className="text-muted">
                                 • Continue reviewing more emails to get more reliable accuracy metrics
                              </div>
                           )}
                        </div>
                     </div>
                  </div>
               )}
            </div>
         </main>
      </div>
   )
}
