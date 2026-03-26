"use client"

// 论坛详情页专门处理单篇帖子内容，不和论坛列表页混写，方便后续继续扩展评论与互动能力。
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, CalendarClock, MessageCircle, ThumbsUp } from "lucide-react"
import { Button } from "@/components/ui/actions/button"
import { Card, CardContent } from "@/components/ui/display/card"
import { forumAPI } from "@/src/features/forum/api/forum-api"
import type { ForumTopicDetailResp } from "@/src/features/forum/model/types"
import { formatDateTime, formatRelativeTime } from "@/src/shared/utils/date"
import { Footer } from "@/src/shared/layout/footer"
import { Header } from "@/src/shared/layout/header"
import { MobileNav } from "@/src/shared/layout/mobile-nav"

interface ForumDetailPageProps {
  postID: number
}

export function ForumDetailPage({ postID }: ForumDetailPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [detail, setDetail] = useState<ForumTopicDetailResp | null>(null)

  useEffect(() => {
    if (!Number.isFinite(postID) || postID <= 0) {
      // 路由参数非法时直接终止请求，避免发无意义详情接口。
      setLoading(false)
      setError("帖子 ID 无效")
      return
    }

    const run = async () => {
      setLoading(true)
      setError("")
      try {
        // 详情页只拉一次完整聚合数据，由后端同时返回帖子/作者/评论/开奖信息。
        const response = await forumAPI.topicDetail(postID)
        setDetail(response)
      } catch (error) {
        setError(error instanceof Error ? error.message : "帖子详情加载失败")
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [postID])

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
          <div className="rounded-[26px] bg-secondary/10 py-12 text-center text-sm text-muted-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-card lg:shadow-none">
            加载中...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : !detail ? (
          <div className="rounded-[26px] bg-secondary/10 py-12 text-center text-sm text-muted-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-card lg:shadow-none">
            帖子不存在
          </div>
        ) : (
          <section className="space-y-4">
            <article className="rounded-[28px] bg-gradient-to-b from-secondary/18 via-secondary/8 to-transparent p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.24)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-card lg:shadow-none">
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
            </article>

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
