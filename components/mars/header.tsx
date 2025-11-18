"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { OnePagerData, StatusColor } from "@/types/onepager"

interface HeaderProps {
  data: OnePagerData
  setData: (data: OnePagerData) => void
}

export function Header({ data, setData }: HeaderProps) {
  const cycleStatus = (current: StatusColor): StatusColor => {
    const cycle: StatusColor[] = ["green", "yellow", "red"]
    const idx = cycle.indexOf(current)
    return cycle[(idx + 1) % cycle.length]
  }

  const getStatusColor = (status: StatusColor) => {
    const colors = {
      green: "bg-[var(--status-green)]",
      yellow: "bg-[var(--status-yellow)]",
      red: "bg-[var(--status-red)]",
    }
    return colors[status]
  }

  const getStatusLabel = (status: StatusColor) => {
    const labels = {
      green: "On Track",
      yellow: "At Risk",
      red: "Delayed",
    }
    return labels[status]
  }

  return (
    <Card className="bg-[var(--mars-blue-primary)] text-white p-3 md:p-4 shadow-lg animate-slide-up">
      <div className="space-y-3">
        {/* Top row */}
        <div className="flex flex-wrap gap-3 items-start justify-between">
          <div className="flex-1 min-w-[200px]">
            <div className="text-xl font-bold tracking-wider mb-1">MARS</div>
            <Input
              value={data.projectName}
              onChange={(e) => setData({ ...data, projectName: e.target.value })}
              className="text-lg font-bold bg-transparent border-none text-white placeholder:text-white/60 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Project Name"
            />
            <div className="flex items-center gap-2 mt-1.5 text-xs">
              <span className="opacity-80 font-semibold">NIIC Date:</span>
              <Input
                type="month"
                value={data.niicDate}
                onChange={(e) => setData({ ...data, niicDate: e.target.value })}
                className="bg-white/15 border-none text-white w-36 h-6 px-2 rounded text-xs"
              />
            </div>
          </div>

          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/15 cursor-pointer hover:bg-white/25 transition-colors backdrop-blur-sm"
            onClick={() => setData({ ...data, projectStatus: cycleStatus(data.projectStatus) })}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(data.projectStatus)} shadow-md`} />
            <div className="flex flex-col">
              <span className="text-[8px] uppercase opacity-70 font-semibold leading-tight">Project Status</span>
              <span className="text-[11px] font-bold leading-tight">{getStatusLabel(data.projectStatus)}</span>
            </div>
          </div>
        </div>

        {/* KPIs and Roles */}
        <div className="flex flex-wrap gap-3 items-start">
          <div className="flex flex-wrap gap-2">
            {data.kpis.map((kpi, idx) => (
              <div key={idx} className="bg-white/15 rounded-lg px-2.5 py-1.5 min-w-[80px] text-center backdrop-blur-sm">
                <Input
                  value={kpi.value}
                  onChange={(e) => {
                    const newKpis = [...data.kpis]
                    newKpis[idx].value = e.target.value
                    setData({ ...data, kpis: newKpis })
                  }}
                  className="text-base font-bold bg-transparent border-none text-white text-center p-0 h-auto mb-0.5 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Input
                  value={kpi.label}
                  onChange={(e) => {
                    const newKpis = [...data.kpis]
                    newKpis[idx].label = e.target.value
                    setData({ ...data, kpis: newKpis })
                  }}
                  className="text-[8px] uppercase opacity-80 bg-transparent border-none text-white text-center p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(data.roles).map(([key, value]) => (
              <div key={key} className="bg-white/15 rounded-lg px-2.5 py-1.5 min-w-[100px] backdrop-blur-sm">
                <div className="text-[8px] uppercase opacity-80 mb-0.5 leading-tight">
                  {key === "sponsor" ? "Sponsor" : key === "productOwner" ? "Product Owner" : "Project Manager"}
                </div>
                <Input
                  value={value}
                  onChange={(e) => {
                    setData({
                      ...data,
                      roles: { ...data.roles, [key]: e.target.value },
                    })
                  }}
                  className="text-[11px] font-semibold bg-transparent border-none text-white p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
