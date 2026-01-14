"use client"

import type React from "react"
import { useRef, useEffect } from "react"

interface TabsProps {
  tabs: string[]
  activeTab: string
  setActiveTab: (tab: string) => void
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, setActiveTab }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.querySelector(`[data-tab="${activeTab}"]`)
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
      }
    }
  }, [activeTab])

  return (
    <div className="bg-slate-100 border-t border-slate-200 w-full shrink-0 z-20">
      <div ref={scrollContainerRef} className="flex overflow-x-auto custom-scrollbar px-2 pt-2 gap-1 items-end">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab
          return (
            <button
              key={`tab-${index}-${tab}`}
              data-tab={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                relative flex-shrink-0 px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 rounded-t-lg border-t border-l border-r 
                ${
                  isActive
                    ? "bg-white text-primary border-slate-300 shadow-[0_-2px_5px_rgba(0,0,0,0.05)] translate-y-[1px] z-10"
                    : "bg-slate-200 text-slate-500 border-slate-300 hover:bg-slate-50 hover:text-slate-700 mb-[1px]"
                }
              `}
              style={{
                marginBottom: isActive ? "-1px" : "0",
              }}
            >
              {tab}
              {isActive && <div className="absolute top-0 left-0 w-full h-0.5 bg-primary rounded-t-lg"></div>}
            </button>
          )
        })}
        <div key="spacer" className="w-4 shrink-0"></div>
      </div>
    </div>
  )
}

export default Tabs
