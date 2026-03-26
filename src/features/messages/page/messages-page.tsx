"use client"

// 消息中心页负责把通知、互动、私信三类消息统一编排成一个用户可切换的视图。
import { useEffect, useMemo, useState } from "react"
import { Bell, Heart, Mail, Settings, CheckCheck, Clock3 } from "lucide-react"
import { Button } from "@/components/ui/actions/button"
import { homeAPI } from "@/src/features/home/api/home-api"
import type { BroadcastItem } from "@/src/features/home/model/types"
import { formatRelativeTime } from "@/src/shared/utils/date"
import { Footer } from "@/src/shared/layout/footer"
import { Header } from "@/src/shared/layout/header"
import { MobileNav } from "@/src/shared/layout/mobile-nav"

type MessageCategory = "notice" | "interaction" | "private"

// UserMessage 是页面层内部使用的消息视图模型，基于广播数据二次归类。
interface UserMessage {
  id: number
  title: string
  content: string
  category: MessageCategory
  createdAt: string
}

interface TabConfig {
  key: MessageCategory
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const tabConfig: TabConfig[] = [
  { key: "notice", label: "通知", icon: Bell },
  { key: "interaction", label: "互动", icon: Heart },
  { key: "private", label: "私信", icon: Mail }
]

function classifyMessage(item: BroadcastItem): MessageCategory {
  // 广播原始结构没有明确消息分类，这里通过关键词做前端归类兜底。
  const fullText = `${item.title || ""} ${item.content || ""}`.toLowerCase()
  if (/(评论|回复|点赞|互动|提到|关注|收藏)/.test(fullText)) {
    return "interaction"
  }
  if (/(私信|站内信|对话|聊天|会话)/.test(fullText)) {
    return "private"
  }
  return "notice"
}

export function MessagesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<MessageCategory>("notice")
  const [items, setItems] = useState<UserMessage[]>([])
  const [readIDs, setReadIDs] = useState<number[]>([])

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const overview = await homeAPI.getOverview()
      const now = Date.now()
      // 当前消息中心先复用 broadcasts 做演示映射，后续可无缝替换成专门的消息接口。
      const nextItems: UserMessage[] = (overview.broadcasts || []).map((item, index) => ({
        id: item.id,
        title: item.title || "系统通知",
        content: item.content || "暂无内容",
        category: classifyMessage(item),
        // 这里人为错开时间，仅用于让消息流相对时间展示更自然。
        createdAt: new Date(now - index * 45 * 60 * 1000).toISOString()
      }))
      setItems(nextItems)
    } catch (error) {
      setError(error instanceof Error ? error.message : "消息加载失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const grouped = useMemo(() => {
    const initial: Record<MessageCategory, UserMessage[]> = {
      notice: [],
      interaction: [],
      private: []
    }

    for (const item of items) {
      // 分组结果由 activeTab 直接消费，减少渲染阶段重复 filter。
      initial[item.category].push(item)
    }

    return initial
  }, [items])

  const currentItems = grouped[activeTab]
  // 未读数完全来源于 readIDs 与当前 tab 数据的交集，逻辑简单且足够稳定。
  const unreadCount = currentItems.filter((item) => !readIDs.includes(item.id)).length

  const markAllRead = () => {
    if (currentItems.length === 0) return
    // Set 去重避免重复点击“全部已读”时 readIDs 无限追加相同 id。
    setReadIDs((prev) => Array.from(new Set([...prev, ...currentItems.map((item) => item.id)])))
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 lg:pb-8 lg:px-8">
        <section className="rounded-[28px] bg-gradient-to-b from-secondary/18 via-secondary/8 to-transparent px-4 py-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.24)] md:px-5 md:py-6 lg:rounded-2xl lg:border lg:border-border/60 lg:bg-card/85 lg:p-6 lg:shadow-none">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">消息中心</h1>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-9 w-9 border-border/70" aria-label="消息设置">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-[24px] bg-secondary/18 p-1.5 lg:rounded-xl lg:bg-secondary/35">
            {tabConfig.map((tab) => {
              // 未读数按当前 readIDs 实时计算，切 tab 时徽标同步刷新。
              const count = grouped[tab.key].filter((item) => !readIDs.includes(item.id)).length
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-background text-foreground shadow-[0_10px_25px_-15px_rgba(0,0,0,0.9)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  // 切 tab 不需要重新请求，直接消费 memo 过的 grouped 结果即可。
                  onClick={() => setActiveTab(tab.key)}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {count > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-accent-foreground">
                      {count}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-muted-foreground">{unreadCount} 条未读{tabConfig.find((item) => item.key === activeTab)?.label}</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
              onClick={markAllRead}
            >
              <CheckCheck className="h-4 w-4" />
              全部已读
            </button>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-4 rounded-[26px] bg-secondary/10 py-12 text-center text-sm text-muted-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-background/50 lg:shadow-none">
              加载中...
            </div>
          ) : currentItems.length === 0 ? (
            <div className="mt-4 rounded-[26px] bg-secondary/10 py-12 text-center text-sm text-muted-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-background/50 lg:shadow-none">
              暂无{tabConfig.find((item) => item.key === activeTab)?.label}消息
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {currentItems.map((item) => {
                const isRead = readIDs.includes(item.id)
                return (
                  <article
                    key={item.id}
                    // 已读与未读只通过边框和底色区分，不靠大面积颜色干扰阅读。
                    className={`rounded-[26px] p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] transition-all lg:rounded-2xl lg:shadow-none ${
                      isRead
                        ? "bg-secondary/10 lg:border lg:border-border/60 lg:bg-background/45"
                        : "bg-primary/8 hover:bg-primary/10 lg:border lg:border-primary/35 lg:bg-primary/5 lg:hover:border-primary/45"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                        {activeTab === "notice" ? (
                          <Bell className="h-4 w-4" />
                        ) : activeTab === "interaction" ? (
                          <Heart className="h-4 w-4" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="line-clamp-1 text-base font-semibold text-foreground">{item.title}</h2>
                          {!isRead ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" /> : null}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.content}</p>
                        <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatRelativeTime(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
