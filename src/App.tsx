import { useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { UserMenu } from "./components/UserMenu.tsx";
import { ViewToggle } from "./components/ViewToggle.tsx";
import { loadProfiles } from "./lib/storage/profiles.ts";
import type { Profiles } from "./lib/storage/profiles.ts";
import { MonthPage } from "./pages/MonthPage.tsx";
import { SleepPage } from "./pages/SleepPage.tsx";
import { WeekPage } from "./pages/WeekPage.tsx";

function readProfiles(): { profiles: Profiles | null; error: string } {
  try {
    return { profiles: loadProfiles(localStorage), error: "" };
  } catch (error) {
    return {
      profiles: null,
      error:
        error instanceof Error
          ? error.message
          : "无法读取本地用户数据，请重试。",
    };
  }
}

function App() {
  const [account, setAccount] = useState(readProfiles);
  const { pathname } = useLocation();
  // 仅睡眠页整页自然滚动（标题可滑走）；月/周仍锁一屏。
  const lockViewport = pathname !== "/sleep";

  if (!account.profiles) {
    return (
      <div className="p-5">
        <p role="alert">{account.error}</p>
        <button
          type="button"
          onClick={() => setAccount(readProfiles())}
          className="cursor-pointer px-3 py-2 hover:bg-black/5"
        >
          重试
        </button>
      </div>
    );
  }

  const profiles = account.profiles;

  return (
    <div
      className={`relative flex min-h-svh flex-col px-5 pt-6 md:px-[2.2vw] md:pt-[2.6vw] ${
        lockViewport ? "md:h-svh" : ""
      }`}
    >
      <div className="absolute top-[1vw] right-[2.5vw] z-20 flex items-center gap-3 md:gap-[0.75vw]">
        <ViewToggle />
        <UserMenu
          profiles={profiles}
          onChange={(next) => setAccount({ profiles: next, error: "" })}
        />
      </div>

      <Routes>
        <Route path="/sleep" element={<SleepPage profiles={profiles} />} />
        <Route path="/" element={<WeekPage profiles={profiles} />} />
        <Route path="/month" element={<MonthPage profiles={profiles} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
