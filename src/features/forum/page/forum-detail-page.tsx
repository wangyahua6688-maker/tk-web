"use client"

// 论坛详情页专门处理单篇帖子内容，不和论坛列表页混写，方便后续继续扩展评论与互动能力。
import Link from "next/link"
import { ArrowLeft, CalendarClock, MessageCircle, ThumbsUp } from "lucide-react"
import { Button } from "@/components/ui/actions/button"
import { Card, CardContent } from "@/components/ui/display/card"
import { useForumDetailData } from "@/src/features/forum/hooks/use-forum-detail-data"
import { formatDateTime, formatRelativeTime } from "@/src/shared/utils/date"
import { Footer } from "@/src/shared/layout/footer"
import { Header } from "@/src/shared/layout/header"
import { MobileNav } from "@/src/shared/layout/mobile-nav"
import { ErrorBanner } from "@/src/shared/ui/error-banner"
import { PageSectionShell } from "@/src/shared/ui/page-section-shell"
import { StatePanel } from "@/src/shared/ui/state-panel"

interface ForumDetailPageProps {
  postID: number
}

export function ForumDetailPage({ postID }: ForumDetailPageProps) {
  const { state } = useForumDetailData(postID)
  const { loading, error, detail } = state

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-6 pb-24 lg:pb-8 lg:px-8">
        <div className="mb-4">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href="/forum">
              <ArrowLeft className="h-4 w-4" />
              返回论坛
            </Link>
          </Button>
        </div>

        {loading ? (
          <StatePanel>
            加载中...
          </StatePanel>
        ) : error ? (
          <ErrorBanner>{error}</ErrorBanner>
        ) : !detail ? (
          <StatePanel>
            帖子不存在
          </StatePanel>
        ) : (
          <section className="space-y-4">
            <PageSectionShell as="article" className="lg:rounded-xl">
              {/* 第一块承接帖子正文与基础互动信息。 */}
              <h1 className="mb-3 text-xl font-bold md:text-2xl">{detail.topic.title}</h1>
              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{detail.author?.display_name || detail.topic.user?.nickname || "匿名用户"}</span>
                <span className="flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatDateTime(detail.topic.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {detail.topic.like_count}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {detail.comment_total}
                </span>
              </div>

              {detail.topic.cover_image ? (
                <img
                  src={detail.topic.cover_image}
                  alt={detail.topic.title}
                  className="mb-4 max-h-[420px] w-full rounded-lg object-cover"
                  loading="lazy"
                />
              ) : null}

              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-7 text-foreground">
                {detail.topic.content || detail.topic.content_preview || "暂无正文内容"}
              </div>
            </PageSectionShell>

            <Card className="border-border/60 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:shadow-none">
              <CardContent className="space-y-3 p-4">
                <h2 className="text-base font-semibold">评论预览</h2>
                {(detail.latest_comments || []).slice(0, 10).map((comment) => (
                  <div key={comment.id} className="rounded-lg border border-border/50 bg-secondary/20 p-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{comment.user?.nickname || comment.user?.username || `用户${comment.user_id}`}</span>
                      <span>{formatRelativeTime(comment.created_at)}</span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
