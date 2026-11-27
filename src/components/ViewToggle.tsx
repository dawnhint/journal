import { NavLink } from "react-router-dom";

const base =
  "flex size-9 items-center justify-center rounded-full text-sm transition-colors md:size-[max(2.25rem,2.2vw)] md:text-[max(12px,0.95vw)]";

export function ViewToggle() {
  return (
    <nav
      aria-label="视图切换"
      className="flex items-center gap-2 md:gap-[0.5vw]"
    >
      <NavLink
        to="/sleep"
        className={({ isActive }) =>
          `${base} ${
            isActive ? "text-ink" : "text-[#808080] hover:text-[#555]"
          }`
        }
      >
        睡眠
      </NavLink>
      <NavLink
        to="/month"
        className={({ isActive }) =>
          `${base} ${
            isActive ? "text-ink" : "text-[#808080] hover:text-[#555]"
          }`
        }
      >
        月
      </NavLink>
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `${base} ${
            isActive ? "text-ink" : "text-[#808080] hover:text-[#555]"
          }`
        }
      >
        周
      </NavLink>
    </nav>
  );
}
