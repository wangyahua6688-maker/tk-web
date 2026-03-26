// 历史接口层：负责开奖历史列表和历史开奖记录结构声明。
import { http } from "@/src/shared/api/http"

export interface LotteryHistoryItem {
  // id / issue / draw_at 是列表维度的主键与时间基础信息。
  id: number
  issue: string
  draw_at: string
  draw_time?: string
  // numbers 与 labels 组成基础开奖号展示；其余标签是进阶分析维度。
  numbers: number[]
  labels: string[]
  zodiac_labels?: string[]
  pair_labels?: string[]
  wuxing_labels?: string[]
  // 历史视频位、封面图等扩展字段允许后端按能力逐步补充。
  playback_url?: string
  video_url?: string
  cover_image_url?: string
}

export interface LotteryHistoryResp {
  // special_lottery_id 是必须字段，其余标题类字段允许接口按版本缺省。
  lottery_info_id?: number
  special_lottery_id: number
  special_lottery_name?: string
  title?: string
  year: number
  order_mode?: "asc" | "desc" | string
  show_five?: boolean
  items: LotteryHistoryItem[]
}

export const historyAPI = {
  getDrawHistory(
    specialLotteryID: number,
    params?: { order_mode?: "asc" | "desc"; show_five?: 0 | 1; limit?: number }
  ): Promise<LotteryHistoryResp> {
    // 历史列表按彩种 id 查询，并通过参数控制排序方向和五行等扩展信息。
    return http.get<LotteryHistoryResp>(`/public/special-lotteries/${specialLotteryID}/history`, {
      params
    })
  }
}
