// Mapper 层用于把后台返回的原始结构转换成前端页面能稳定消费的视图模型。
import type {
  BannerItem,
  DashboardData,
  HomeOverviewResp,
  LotteryCardItem,
  LotteryCategoryItem,
  SpecialLotteryTab
} from "@/src/features/home/model/types"
import { sanitizeImageURL, sanitizeOutboundURL } from "@/src/shared/security/url"

export function normalizeHomeOverview(raw: HomeOverviewResp): HomeOverviewResp {
  // 广告与官方 banner 先合并做统一安全清洗，后面再按 type 分桶返回。
  const safeBanners = [
    ...((raw.banners?.official || []) as BannerItem[]),
    ...((raw.banners?.ad || []) as BannerItem[])
  ].map((item) => ({
    ...item,
    image_url: sanitizeImageURL(item.image_url) || "/placeholder.jpg",
    link_url: sanitizeOutboundURL(item.link_url)
  }))

  const categories = normalizeCategories(raw.lottery_categories || [])

  return {
    ...raw,
    lottery_categories: categories,
    banners: {
      // official 单独保留，方便首页轮播在需要时优先展示官方位。
      official: safeBanners.filter((item) => item.type === "official"),
      ad: safeBanners.filter((item) => item.type !== "official")
    },
    // 外链入口也统一在这里做 icon/url 安全清洗，页面层只管消费。
    external_links: (raw.external_links || []).map((item) => ({
      ...item,
      icon_url: sanitizeImageURL(item.icon_url),
      url: sanitizeOutboundURL(item.url)
    }))
  }
}

export function normalizeCategories(items: LotteryCategoryItem[]): LotteryCategoryItem[] {
  const result = new Map<string, LotteryCategoryItem>()
  // all 是首页固定兜底分类，不依赖后端是否返回。
  result.set("all", { key: "all", name: "全部", show_on_home: 1 })

  items.forEach((item) => {
    // key/name 都先做字符串标准化，避免后端给空值时污染分类栏。
    const key = String(item?.key || item?.name || "").trim()
    const name = String(item?.name || key).trim()
    if (!key || !name) return
    if (!result.has(key)) {
      // Map 只收第一次出现的 key，天然去重。
      result.set(key, { ...item, key, name })
    }
  })

  return Array.from(result.values())
}

export function normalizeTabs(items: SpecialLotteryTab[]): SpecialLotteryTab[] {
  return (items || [])
    // 非法 id tab 直接过滤，避免切换时 dashboard 接口报错。
    .filter((item) => Number(item?.id) > 0)
    .map((item) => ({
      ...item,
      id: Number(item.id)
    }))
}

export function normalizeCards(items: LotteryCardItem[]): LotteryCardItem[] {
  return (items || []).map((item) => ({
    ...item,
    // 图纸封面缺失时统一回退占位图，页面层不用再写兜底判断。
    cover_image_url: sanitizeImageURL(item.cover_image_url) || "/placeholder.jpg"
  }))
}

export function normalizeDashboard(dashboard: DashboardData | null): DashboardData | null {
  if (!dashboard) return null
  // numbers 优先使用后端直接聚合好的数组，缺失时再由普通号 + 特别号手动拼装。
  const numbers =
    dashboard.draw.numbers && dashboard.draw.numbers.length > 0
      ? dashboard.draw.numbers
      : [
          ...(dashboard.draw.normal_numbers || []),
          ...(typeof dashboard.draw.special_number === "number" ? [dashboard.draw.special_number] : [])
        ]

  return {
    ...dashboard,
    live: {
      ...dashboard.live,
      // 流地址必须经过外链过滤，避免把非法协议带进 video/player。
      stream_url: sanitizeOutboundURL(dashboard.live.stream_url)
    },
    draw: {
      ...dashboard.draw,
      playback_url: sanitizeOutboundURL(dashboard.draw.playback_url),
      // 统一把最终可展示号码回写到 draw.numbers，页面层只认一套字段。
      numbers
    }
  }
}
