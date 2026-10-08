import { useState } from "react";

import { currentTheme, setTheme } from "../lib/theme.ts";
import { MoonIcon, SunIcon } from "./icons.tsx";

export function ThemeButton() {
  const [theme, setState] = useState(currentTheme);
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      onClick={() => {
        setTheme(next);
        setState(next);
      }}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-line bg-surface text-ink sm:size-11"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
