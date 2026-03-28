"use client"

// 消息中心页负责把通知、互动、私信三类消息统一编排成一个用户可切换的视图。
import type React from "react"
import { Bell, Heart, Mail, Settings, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/actions/button"
import { useMessagesData, type MessageCategory } from "@/src/features/messages/hooks/use-messages-data"
import { formatRelativeTime } from "@/src/shared/utils/date"
import { Footer } from "@/src/shared/layout/footer"
import { Header } from "@/src/shared/layout/header"
import { ErrorBanner } from "@/src/shared/ui/error-banner"
import { MessageFeedCard } from "@/src/shared/ui/message-feed-card"
import { MobileNav } from "@/src/shared/layout/mobile-nav"
import { PageSectionShell } from "@/src/shared/ui/page-section-shell"
import { PageTitleBar } from "@/src/shared/ui/page-title-bar"
import { StatePanel } from "@/src/shared/ui/state-panel"

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

export function MessagesPage() {
  const { state, grouped, currentItems, unreadCount, setActiveTab, markAllRead } = useMessagesData()

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 lg:pb-8 lg:px-8">
        <PageSectionShell className="lg:bg-card/85 lg:p-6" padding="page">
          <PageTitleBar
            title="消息中心"
            size="hero"
            actions={
              <Button variant="outline" size="icon" className="h-9 w-9 border-border/70" aria-label="消息设置">
                <Settings className="h-4 w-4" />
              </Button>
            }
          />

          <div className="grid grid-cols-3 gap-2 rounded-[24px] bg-secondary/18 p-1.5 lg:rounded-xl lg:bg-secondary/35">
            {tabConfig.map((tab) => {
              // 未读数按当前 readIDs 实时计算，切 tab 时徽标同步刷新。
              const count = grouped[tab.key].filter((item) => !state.readIDs.includes(item.id)).length
              const active = state.activeTab === tab.key
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
            <p className="text-muted-foreground">{unreadCount} 条未读{tabConfig.find((item) => item.key === state.activeTab)?.label}</p>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
              onClick={markAllRead}
            >
              <CheckCheck className="h-4 w-4" />
              全部已读
            </button>
          </div>

          {state.error ? <ErrorBanner className="mt-4">{state.error}</ErrorBanner> : null}

          {state.loading ? (
            <StatePanel className="mt-4 lg:bg-background/50">
              加载中...
            </StatePanel>
          ) : currentItems.length === 0 ? (
            <StatePanel className="mt-4 lg:bg-background/50">
              暂无{tabConfig.find((item) => item.key === state.activeTab)?.label}消息
            </StatePanel>
          ) : (
            <div className="mt-4 space-y-3">
              {currentItems.map((item) => {
                const isRead = state.readIDs.includes(item.id)
                const icon =
                  state.activeTab === "notice" ? (
                    <Bell className="h-4 w-4" />
                  ) : state.activeTab === "interaction" ? (
                    <Heart className="h-4 w-4" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )
                return (
                  <MessageFeedCard
                    key={item.id}
                    title={item.title}
                    content={item.content}
                    icon={icon}
                    unread={!isRead}
                    timestampText={formatRelativeTime(item.createdAt)}
                  />
                )
              })}
            </div>
          )}
        </PageSectionShell>
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
